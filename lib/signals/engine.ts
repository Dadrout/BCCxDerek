// Движок сигналов: чистая функция. Поля платежа + данные банка → сигналы, вердикт, главная причина, действие.
// Не читает файлы и часы: «сегодня» — DEMO_TODAY, всё остальное приходит через параметры.
import { createHash } from "node:crypto";
import type { BankContext, Payment } from "@/lib/bank/types";
import { DEMO_TODAY } from "@/lib/demo";
import { bankByIban } from "@/lib/iban";
import { domainOf, isFreeMail, isLookalike, sameOrg } from "@/lib/email/domains";
import type { ParsedPayment } from "./validate.ts";
import {
  SEVERITY,
  SIGNAL_ORDER,
  type Action,
  type Approval,
  type CheckOutcome,
  type Contact,
  type DocumentHints,
  type Severity,
  type Signal,
  type SignalId,
  type Verdict,
} from "./types.ts";

const BCC_CODE = "856";
const ACCOUNT_NEW_DAYS = 30;
const SUPPLIER_YOUNG_DAYS = 90;
const CROWD_MISMATCH_MIN = 5;
const LEGAL_FORMS = new Set(["тоо", "ао", "ип"]);
const DAY_MS = 24 * 60 * 60 * 1000;

// Целые дни от даты (YYYY-MM-DD) до DEMO_TODAY.
function daysBeforeToday(date: string): number {
  return Math.floor((Date.parse(DEMO_TODAY) - Date.parse(date)) / DAY_MS);
}

// Начало окна истории: тот же календарный день годом раньше; учитываются даты строго позже.
function historyStart(): string {
  return `${Number(DEMO_TODAY.slice(0, 4)) - 1}${DEMO_TODAY.slice(4)}`;
}

// Нижний регистр, только буквы и цифры, без организационно-правовой формы.
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w !== "" && !LEGAL_FORMS.has(w))
    .join("");
}

const phoneDigits = (phone: string): string => phone.replace(/\D/g, "").slice(-10);

function chooseAction(main: Signal, verdict: Verdict, hasContract: boolean): Action {
  if (verdict === "ok") return "pay";
  switch (main.id) {
    case "bin_not_found":
    case "name_mismatch":
      return "check_bin";
    case "supplier_unreliable":
    case "supplier_inactive":
    case "supplier_young":
      return "check_supplier";
    default:
      return hasContract ? "call_contract" : "find_phone";
  }
}

export function fingerprint(clientBin: string, p: ParsedPayment, hints?: DocumentHints): string {
  const parts = [clientBin, p.name, p.bin, p.iban, p.amount, hints?.changeRequestText ?? "", hints?.phoneInDocument ?? "", JSON.stringify(hints?.email ?? null), JSON.stringify(hints?.contract ?? null)];
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

export function evaluate(
  p: ParsedPayment,
  bank: BankContext,
  opts: { clientBin: string; hints?: DocumentHints; approvals?: Approval[] },
): Extract<CheckOutcome, { kind: "verdict" }> {
  const found = new Map<SignalId, Signal["params"]>();
  const add = (id: SignalId, params: Signal["params"] = {}) => found.set(id, params);
  const demoted = new Set<SignalId>();

  // Владелец счёта: проверяем только счета BCC. Счёта BCC нет в базе — значит, такого счёта не существует.
  const account = bank.accounts.get(p.iban);
  if (p.iban.slice(4, 7) === BCC_CODE && !account) {
    add("account_not_found", { bankName: bankByIban(p.iban) ?? "" });
  } else if (account) {
    if (account.ownerId === p.bin) add("owner_ok");
    else if (account.ownerType === "individual") add("owner_individual");
    else add("owner_mismatch", { name: p.name });
    const age = daysBeforeToday(account.openedAt);
    if (age < ACCOUNT_NEW_DAYS) add("account_new", { days: age });
  } else {
    const bankName = bankByIban(p.iban);
    add("owner_unknown", bankName ? { bankName } : {});
  }

  const complaint = bank.complaints.get(p.iban);
  if (complaint && complaint.count > 0) add("iban_reported", { count: complaint.count });

  if (p.hadHomoglyphs) add("homoglyphs");

  // Госреестр: без записи о БИН остальные проверки фирмы не имеют смысла.
  const company = bank.registry.get(p.bin);
  if (!company) {
    add("bin_not_found", { bin: p.bin });
  } else {
    if (company.status === "unreliable") add("supplier_unreliable", { registryName: company.name });
    if (company.status === "inactive") add("supplier_inactive", { registryName: company.name });
    const age = daysBeforeToday(company.registeredAt);
    if (age < SUPPLIER_YOUNG_DAYS) add("supplier_young", { days: age });
    if (normalizeName(company.name) !== normalizeName(p.name)) add("name_mismatch", { registryName: company.name });
  }

  // История платежей этому БИН за 12 месяцев.
  const start = historyStart();
  const history = (bank.paymentsBySupplier.get(p.bin) ?? []).filter((x) => x.date > start);
  const own = history.filter((x) => x.clientBin === opts.clientBin);
  // Утверждённая смена реквизитов: ровно этот клиент + БИН + IBAN. Понижает сигналы по истории платежей до info.
  const approval = opts.approvals?.find((a) => a.clientBin === opts.clientBin && a.bin === p.bin && a.iban === p.iban);
  const ownHere = own.filter((x) => x.iban === p.iban).length;
  if (ownHere > 0) add("own_history_ok", { count: ownHere });
  else if (own.length > 0) {
    add("own_history_changed", { count: own.length });
    if (approval) demoted.add("own_history_changed");
  } else add("first_payment");

  if (own.length > 0) {
    const average = own.reduce((sum, x) => sum + x.amount, 0) / own.length;
    if (p.amount * 10 > average * 11) add("amount_unusual", { percent: Math.round((p.amount / average - 1) * 100) });
  }

  const others = history.filter((x) => x.clientBin !== opts.clientBin);
  const distinctClients = (list: Payment[]) => new Set(list.map((x) => x.clientBin)).size;
  const crowdHere = distinctClients(others.filter((x) => x.iban === p.iban));
  const crowdElsewhere = distinctClients(others.filter((x) => x.iban !== p.iban));
  if (crowdHere > 0) add("crowd_confirms", { count: crowdHere });
  else if (crowdElsewhere >= CROWD_MISMATCH_MIN) {
    add("crowd_mismatch", { count: crowdElsewhere });
    if (approval) demoted.add("crowd_mismatch");
  }

  if (approval) {
    // approvedAt хранится как YYYY-MM-DD; в сигнале — ДД.ММ.
    add("change_approved", { date: `${approval.approvedAt.slice(8, 10)}.${approval.approvedAt.slice(5, 7)}`, by: approval.approvedBy });
  }

  // Документ и договор.
  if (opts.hints?.changeRequestText) add("change_request", { text: opts.hints.changeRequestText });
  // Договор: по БИН платежа; если его нет — по БИН поставщика из подсказок (только договор этого клиента).
  const contractFor = (bin: string) => bank.contracts.find((c) => c.clientBin === opts.clientBin && c.supplierBin === bin);
  const hintBin = opts.hints?.contract?.supplierBin;
  const contract = contractFor(p.bin) ?? (hintBin ? contractFor(hintBin) : undefined);
  const conflicts = opts.hints?.contract?.conflicts ?? [];
  if (conflicts.length > 0) {
    const first = conflicts[0];
    add("contract_conflict", { source: first.source, docQuote: first.docQuote, clause: first.clause, contractQuote: first.contractQuote, count: conflicts.length });
  }
  const docPhone = opts.hints?.phoneInDocument;
  if (contract?.phone && docPhone && phoneDigits(contract.phone) !== phoneDigits(docPhone)) {
    add("phone_differs", { phone: docPhone, contractPhone: contract.phone });
  }

  // Письмо: адрес отправителя против договора, Reply-To, проверка подлинности, давление. Утверждение смены реквизитов эти сигналы не понижает.
  const mail = opts.hints?.email;
  if (mail) {
    const domain = domainOf(mail.fromAddress);
    const contractDomain = contract?.email ? domainOf(contract.email) : "";
    // Пустой домен (нет From или адрес без «@»): проверки домена отправителя пропускаем.
    if (!domain) {
      // нечего сравнивать
    } else if (isFreeMail(domain)) add("email_free_mail", { domain });
    else if (contractDomain && !sameOrg(domain, contractDomain)) {
      add(isLookalike(domain, contractDomain) ? "email_lookalike" : "email_domain_differs", { domain, contractDomain });
    }
    const replyDomain = mail.replyTo ? domainOf(mail.replyTo) : "";
    if (replyDomain && !sameOrg(replyDomain, domain)) add("email_reply_to", { replyTo: mail.replyTo! });
    if (mail.authFailed) add("email_auth_failed");
    if (mail.pressure.length > 0) add("email_pressure", { quote: mail.pressure[0].quote, count: mail.pressure.length });
  }

  // Без единого подтверждения зелёного быть не может (подтверждённая смена реквизитов тоже подтверждение).
  const hasOk = [...found.keys()].some((id) => SEVERITY[id] === "ok");
  if (!hasOk && !found.has("change_approved")) add("nothing_to_compare");

  const signals: Signal[] = SIGNAL_ORDER.filter((id) => found.has(id)).map((id) => ({
    id,
    severity: demoted.has(id) ? "info" : SEVERITY[id],
    params: found.get(id)!,
  }));
  // Вердикт по самому серьёзному уровню; главная причина объясняет именно его (info вердиктом не бывает).
  const has = (level: Severity) => signals.some((s) => s.severity === level);
  const verdict: Verdict = has("stop") ? "stop" : has("check") ? "check" : "ok";
  // Зелёный без ok-сигнала бывает только при утверждённой смене реквизитов: тогда главная причина — само утверждение.
  const main = signals.find((s) => s.severity === verdict) ?? signals.find((s) => s.id === "change_approved") ?? signals[0];
  const contact: Contact | null = contract
    ? { person: contract.person, role: contract.role, phone: contract.phone, source: contract.source }
    : null;

  return {
    kind: "verdict",
    verdict,
    main,
    action: chooseAction(main, verdict, contract !== undefined),
    signals,
    contact,
    fingerprint: fingerprint(opts.clientBin, p, opts.hints),
  };
}
