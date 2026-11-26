import { describe, expect, test } from "vitest";
import { evaluate, fingerprint } from "@/lib/signals/engine";
import { SEVERITY, SIGNAL_ORDER, type Approval, type DocumentHints, type EmailHints, type SignalId } from "@/lib/signals/types";
import type { ParsedPayment } from "@/lib/signals/validate";
import { makeBank } from "@/lib/bank/store";
import type { ContractConflict } from "@/lib/contract/compare";
import type { Account, BankRaw, Company, Payment } from "@/lib/bank/types";
import { makeKzIban } from "@/lib/iban";

// Маленький ручной банк. DEMO_TODAY = 2026-12-11.
const CLIENT = "100000000001";
const DALA_BIN = "180340021457";
const OTHER_REGISTERED_BIN = "200140000002";
const NEW_BIN = "210540000003";
const OTHER_CO_BIN = "190240000004";

const DALA_IBAN = makeKzIban("856", "0000012345678");
const DALA_IBAN2 = makeKzIban("856", "0000087654321");
const IND_IBAN = makeKzIban("856", "0000055500011");
const CO_IBAN = makeKzIban("856", "0000066600022");
const KASPI_IBAN = makeKzIban("722", "0000077700033");

const DALA_CO: Company = { bin: DALA_BIN, name: "ТОО «Дала Транс Логистик»", registeredAt: "2018-03-14", status: "active" };
const REGISTRY: Company[] = [
  DALA_CO,
  { bin: OTHER_REGISTERED_BIN, name: "ТОО «Алтын Сауда»", registeredAt: "2020-01-10", status: "active" },
  { bin: NEW_BIN, name: "ТОО «Новый Поставщик»", registeredAt: "2021-05-20", status: "active" },
  { bin: OTHER_CO_BIN, name: "ТОО «Чужая Фирма»", registeredAt: "2019-02-01", status: "active" },
];

const IND_ACCOUNT: Account = { iban: IND_IBAN, ownerId: "900101300123", ownerType: "individual", ownerName: "Иванов И.И.", openedAt: "2026-12-08" };
const ACCOUNTS: Account[] = [
  { iban: DALA_IBAN, ownerId: DALA_BIN, ownerType: "company", ownerName: DALA_CO.name, openedAt: "2019-01-15" },
  { iban: DALA_IBAN2, ownerId: DALA_BIN, ownerType: "company", ownerName: DALA_CO.name, openedAt: "2020-06-01" },
  IND_ACCOUNT,
  { iban: CO_IBAN, ownerId: OTHER_CO_BIN, ownerType: "company", ownerName: "ТОО «Чужая Фирма»", openedAt: "2020-04-04" },
];

const pay = (clientBin: string, supplierBin: string, iban: string, date: string, amount = 800000): Payment =>
  ({ date, clientBin, supplierBin, iban, amount });

const OWN_PAYMENTS = ["2026-06-10", "2026-07-10", "2026-08-10", "2026-09-10", "2026-10-10", "2026-11-10"]
  .map((d) => pay(CLIENT, DALA_BIN, DALA_IBAN, d));
const otherClient = (i: number) => `30000000000${i}`;
const CROWD_PAYMENTS = [1, 2, 3, 4, 5].map((i) => pay(otherClient(i), DALA_BIN, DALA_IBAN, "2026-10-01"));

const BASE: BankRaw = {
  payments: [...OWN_PAYMENTS, ...CROWD_PAYMENTS],
  accounts: ACCOUNTS,
  registry: REGISTRY,
  complaints: [],
  contracts: [{ clientBin: CLIENT, supplierBin: DALA_BIN, person: "Ахметов Б.", role: "директор", phone: "+7 701 111 22 33", email: "info@dalatrans.kz", source: "договор №12", paymentTerms: [] }],
};

// Добавляет записи к базе; более поздние записи реестра/счетов перекрывают ранние (Map по ключу).
function build(extra: Partial<BankRaw> = {}, replacePayments?: Payment[]) {
  return makeBank({
    payments: replacePayments ?? [...BASE.payments, ...(extra.payments ?? [])],
    accounts: [...BASE.accounts, ...(extra.accounts ?? [])],
    registry: [...BASE.registry, ...(extra.registry ?? [])],
    complaints: [...BASE.complaints, ...(extra.complaints ?? [])],
    contracts: [...BASE.contracts, ...(extra.contracts ?? [])],
  });
}

const bank = build();
const opts = { clientBin: CLIENT };
const dala: ParsedPayment = { name: "ТОО «Дала Транс Логистик»", bin: DALA_BIN, iban: DALA_IBAN, amount: 800000, hadHomoglyphs: false };
const newSupplierOtherBank: ParsedPayment = { name: "ТОО «Новый Поставщик»", bin: NEW_BIN, iban: KASPI_IBAN, amount: 500000, hadHomoglyphs: false };

const ids = (r: ReturnType<typeof evaluate>) => r.signals.map((s) => s.id);
const find = (r: ReturnType<typeof evaluate>, id: SignalId) => r.signals.find((s) => s.id === id);

describe("types", () => {
  test("SIGNAL_ORDER lists every signal in priority order with spec severities", () => {
    expect(SIGNAL_ORDER).toEqual([
      "owner_individual", "owner_mismatch", "account_not_found", "iban_reported", "homoglyphs", "email_lookalike", "bin_not_found", "supplier_unreliable",
      "own_history_changed", "crowd_mismatch", "contract_conflict", "account_new", "supplier_young", "supplier_inactive", "name_mismatch",
      "change_request", "phone_differs", "email_domain_differs", "email_free_mail", "email_reply_to", "email_auth_failed", "email_pressure", "nothing_to_compare", "change_approved", "first_payment", "owner_unknown",
      "amount_unusual", "crowd_confirms", "own_history_ok", "owner_ok",
    ]);
    expect(SEVERITY).toEqual({
      owner_individual: "stop", owner_mismatch: "stop", account_not_found: "stop", iban_reported: "stop", homoglyphs: "stop", email_lookalike: "stop", bin_not_found: "stop",
      supplier_unreliable: "stop", own_history_changed: "stop", crowd_mismatch: "stop",
      contract_conflict: "check", account_new: "check", supplier_young: "check", supplier_inactive: "check", name_mismatch: "check",
      change_request: "check", phone_differs: "check", email_domain_differs: "check", email_free_mail: "check", email_reply_to: "check",
      email_auth_failed: "check", email_pressure: "check", nothing_to_compare: "check",
      change_approved: "info", first_payment: "info", owner_unknown: "info", amount_unusual: "info",
      crowd_confirms: "ok", own_history_ok: "ok", owner_ok: "ok",
    });
  });
});

describe("baseline", () => {
  test("usual payment to the usual account is green with pay", () => {
    const r = evaluate(dala, bank, opts);
    expect(ids(r)).toEqual(["crowd_confirms", "own_history_ok", "owner_ok"]);
    expect(r.verdict).toBe("ok");
    expect(r.action).toBe("pay");
    expect(r.main.id).toBe("crowd_confirms");
  });
  test("signals carry the severity from SEVERITY and come sorted by SIGNAL_ORDER", () => {
    const r = evaluate({ ...dala, iban: IND_IBAN, hadHomoglyphs: true }, bank, { clientBin: CLIENT, hints: { changeRequestText: "новые реквизиты", phoneInDocument: "+7 777 000 00 00" } });
    for (const s of r.signals) expect(s.severity).toBe(SEVERITY[s.id]);
    const positions = ids(r).map((id) => SIGNAL_ORDER.indexOf(id));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});

describe("one test per signal", () => {
  test("owner_individual: BCC account owned by a private person; not for another company", () => {
    const r = evaluate({ ...dala, iban: IND_IBAN }, bank, opts);
    expect(ids(r)).toContain("owner_individual");
    expect(ids(r)).not.toContain("owner_mismatch");
    expect(ids(evaluate({ ...dala, iban: CO_IBAN }, bank, opts))).not.toContain("owner_individual");
  });

  test("owner_mismatch: BCC account owned by another company; not for a private person", () => {
    const r = evaluate({ ...dala, iban: CO_IBAN }, bank, opts);
    expect(find(r, "owner_mismatch")).toBeDefined();
    expect(ids(evaluate({ ...dala, iban: IND_IBAN }, bank, opts))).not.toContain("owner_mismatch");
  });

  test("account_not_found: BCC IBAN missing from accounts replaces owner signals; not for a known BCC account", () => {
    const ghost = makeKzIban("856", "0000099900044");
    const r = evaluate({ ...dala, iban: ghost }, bank, opts);
    expect(find(r, "account_not_found")?.params).toEqual({ bankName: "Банк ЦентрКредит" });
    for (const id of ["owner_unknown", "owner_ok", "owner_individual", "owner_mismatch", "account_new"] as const) {
      expect(ids(r)).not.toContain(id);
    }
    expect(r.verdict).toBe("stop");
    expect(r.main.id).toBe("account_not_found");
    expect(r.action).toBe("call_contract");
    expect(evaluate({ ...newSupplierOtherBank, iban: ghost }, bank, opts).action).toBe("find_phone");
    expect(ids(evaluate(dala, bank, opts))).not.toContain("account_not_found");
    expect(ids(evaluate(newSupplierOtherBank, bank, opts))).not.toContain("account_not_found");
  });

  test("iban_reported: complaints on this IBAN; not on a clean IBAN", () => {
    const b = build({ complaints: [{ iban: DALA_IBAN2, count: 3, lastAt: "2026-11-20" }] });
    const r = evaluate({ ...dala, iban: DALA_IBAN2 }, b, opts);
    expect(find(r, "iban_reported")?.params).toEqual({ count: 3 });
    expect(ids(evaluate(dala, b, opts))).not.toContain("iban_reported");
  });

  test("homoglyphs: from hadHomoglyphs; not without", () => {
    expect(ids(evaluate({ ...dala, hadHomoglyphs: true }, bank, opts))).toContain("homoglyphs");
    expect(ids(evaluate(dala, bank, opts))).not.toContain("homoglyphs");
  });

  test("bin_not_found: BIN missing from registry, and no supplier/name signals; not for a registered BIN", () => {
    const r = evaluate({ ...dala, bin: "999999999999" }, bank, opts);
    expect(ids(r)).toContain("bin_not_found");
    for (const id of ["supplier_unreliable", "supplier_young", "supplier_inactive", "name_mismatch"] as const) {
      expect(ids(r)).not.toContain(id);
    }
    expect(ids(evaluate(dala, bank, opts))).not.toContain("bin_not_found");
  });

  test("supplier_unreliable: registry status unreliable; not when active", () => {
    const b = build({ registry: [{ ...DALA_CO, status: "unreliable" }] });
    expect(ids(evaluate(dala, b, opts))).toContain("supplier_unreliable");
    expect(ids(evaluate(dala, bank, opts))).not.toContain("supplier_unreliable");
  });

  test("own_history_changed: client paid this BIN only to other accounts; not when paid to this one", () => {
    const r = evaluate({ ...dala, iban: DALA_IBAN2 }, bank, opts);
    expect(find(r, "own_history_changed")?.params).toEqual({ count: 6 });
    expect(ids(evaluate(dala, bank, opts))).not.toContain("own_history_changed");
  });

  test("crowd_mismatch: 5 other clients pay another IBAN, none this one; not when they pay this one", () => {
    const r = evaluate({ ...dala, iban: DALA_IBAN2 }, bank, opts);
    expect(find(r, "crowd_mismatch")?.params).toEqual({ count: 5 });
    expect(ids(evaluate(dala, bank, opts))).not.toContain("crowd_mismatch");
  });

  test("account_new: BCC account opened 3 days ago; not at 30 days", () => {
    const r = evaluate({ ...dala, iban: IND_IBAN }, bank, opts);
    expect(find(r, "account_new")?.params).toEqual({ days: 3 });
    const b = build({ accounts: [{ ...IND_ACCOUNT, openedAt: "2026-11-11" }] });
    expect(ids(evaluate({ ...dala, iban: IND_IBAN }, b, opts))).not.toContain("account_new");
  });

  test("supplier_young: registered 71 days ago; not at 90 days", () => {
    const young = build({ registry: [{ ...DALA_CO, registeredAt: "2026-10-01" }] });
    expect(find(evaluate(dala, young, opts), "supplier_young")?.params).toEqual({ days: 71 });
    const ninety = build({ registry: [{ ...DALA_CO, registeredAt: "2026-09-12" }] });
    expect(ids(evaluate(dala, ninety, opts))).not.toContain("supplier_young");
  });

  test("supplier_inactive: registry status inactive; not when active", () => {
    const b = build({ registry: [{ ...DALA_CO, status: "inactive" }] });
    expect(ids(evaluate(dala, b, opts))).toContain("supplier_inactive");
    expect(ids(evaluate(dala, bank, opts))).not.toContain("supplier_inactive");
  });

  test("name_mismatch: other name for this BIN with registryName; not for the same name written differently", () => {
    const r = evaluate({ ...dala, name: "ТОО «Алтын Сауда»" }, bank, opts);
    expect(find(r, "name_mismatch")?.params).toEqual({ registryName: DALA_CO.name });
    expect(ids(evaluate({ ...dala, name: "дала транс-логистик, тоо" }, bank, opts))).not.toContain("name_mismatch");
    expect(ids(evaluate({ ...dala, name: "АО Дала Транс Логистик" }, bank, opts))).not.toContain("name_mismatch");
  });

  test("change_request: text from hints; not without it", () => {
    const r = evaluate(dala, bank, { clientBin: CLIENT, hints: { changeRequestText: "Просим оплатить по новым реквизитам", phoneInDocument: null } });
    expect(find(r, "change_request")?.params).toEqual({ text: "Просим оплатить по новым реквизитам" });
    expect(ids(evaluate(dala, bank, { clientBin: CLIENT, hints: { changeRequestText: null, phoneInDocument: null } }))).not.toContain("change_request");
  });

  test("phone_differs: document phone differs from contract; not when only formatting differs, nor without contract", () => {
    const hint = (phone: string) => ({ clientBin: CLIENT, hints: { changeRequestText: null, phoneInDocument: phone } });
    expect(ids(evaluate(dala, bank, hint("+7 702 999 00 00")))).toContain("phone_differs");
    expect(ids(evaluate(dala, bank, hint("+7 (701) 111-22-33")))).not.toContain("phone_differs");
    expect(ids(evaluate(newSupplierOtherBank, bank, hint("+7 702 999 00 00")))).not.toContain("phone_differs");
  });

  test("nothing_to_compare: no ok signal; not when an ok signal exists", () => {
    expect(ids(evaluate(newSupplierOtherBank, bank, opts))).toContain("nothing_to_compare");
    expect(ids(evaluate(dala, bank, opts))).not.toContain("nothing_to_compare");
  });

  test("change_approved: emitted only for a matching approval, with DD.MM date and approver", () => {
    const approvals = [{ clientBin: CLIENT, bin: DALA_BIN, iban: DALA_IBAN2, approvedAt: "2026-11-26", approvedBy: "Сапарова А.К." }];
    expect(ids(evaluate({ ...dala, iban: DALA_IBAN2 }, bank, { clientBin: CLIENT, approvals }))).toContain("change_approved");
    expect(ids(evaluate({ ...dala, iban: DALA_IBAN2 }, bank, opts))).not.toContain("change_approved");
    expect(find(evaluate({ ...dala, iban: DALA_IBAN2 }, bank, { clientBin: CLIENT, approvals }), "change_approved")?.params).toEqual({ date: "26.11", by: "Сапарова А.К." });
  });

  test("approved change with no ok signal: verdict ok, main reason is the approval", () => {
    const approvals = [{ clientBin: CLIENT, bin: NEW_BIN, iban: KASPI_IBAN, approvedAt: "2026-12-11", approvedBy: "Сапарова А.К." }];
    const r = evaluate(newSupplierOtherBank, bank, { clientBin: CLIENT, approvals });
    expect(r.verdict).toBe("ok");
    expect(r.main?.id).toBe("change_approved");
  });

  test("first_payment: client never paid this BIN; not when it has", () => {
    expect(ids(evaluate(newSupplierOtherBank, bank, opts))).toContain("first_payment");
    expect(ids(evaluate(dala, bank, opts))).not.toContain("first_payment");
  });

  test("owner_unknown: IBAN outside BCC; not for a BCC IBAN", () => {
    const r = evaluate(newSupplierOtherBank, bank, opts);
    expect(find(r, "owner_unknown")?.params).toEqual({ bankName: "Kaspi Bank" });
    expect(ids(evaluate(dala, bank, opts))).not.toContain("owner_unknown");
  });

  test("amount_unusual: above 1.10 x client average with percent; not at exactly 1.10", () => {
    expect(find(evaluate({ ...dala, amount: 900000 }, bank, opts), "amount_unusual")?.params).toEqual({ percent: 13 });
    expect(ids(evaluate({ ...dala, amount: 880000 }, bank, opts))).not.toContain("amount_unusual");
  });

  test("crowd_confirms: other clients pay this IBAN; not when none do", () => {
    expect(find(evaluate(dala, bank, opts), "crowd_confirms")?.params).toEqual({ count: 5 });
    expect(ids(evaluate({ ...dala, iban: DALA_IBAN2 }, bank, opts))).not.toContain("crowd_confirms");
  });

  test("own_history_ok: client paid this IBAN before with count; not for a new supplier", () => {
    expect(find(evaluate(dala, bank, opts), "own_history_ok")?.params).toEqual({ count: 6 });
    expect(ids(evaluate(newSupplierOtherBank, bank, opts))).not.toContain("own_history_ok");
  });

  test("owner_ok: BCC owner equals BIN; not for another owner", () => {
    expect(ids(evaluate(dala, bank, opts))).toContain("owner_ok");
    expect(ids(evaluate({ ...dala, iban: CO_IBAN }, bank, opts))).not.toContain("owner_ok");
  });
});

describe("rules", () => {
  test("known name with a foreign BIN is not a match", () => {
    const r = evaluate({ ...dala, bin: OTHER_REGISTERED_BIN }, bank, opts);
    expect(r.signals.map((s) => s.id)).toContain("name_mismatch");
    expect(r.verdict).not.toBe("ok");
  });

  test("only info signals give check with nothing_to_compare, never green", () => {
    const r = evaluate(newSupplierOtherBank, bank, opts); // first_payment + owner_unknown
    expect(ids(r)).toEqual(["nothing_to_compare", "first_payment", "owner_unknown"]);
    expect(r.verdict).toBe("check");
    expect(r.main.id).toBe("nothing_to_compare");
  });

  test("supplier with two working IBANs: paying either one is not crowd_mismatch", () => {
    const b = build({ payments: [pay(otherClient(6), DALA_BIN, DALA_IBAN2, "2026-11-01")] });
    const second = evaluate({ ...dala, iban: DALA_IBAN2 }, b, opts);
    expect(ids(second)).not.toContain("crowd_mismatch");
    expect(find(second, "crowd_confirms")?.params).toEqual({ count: 1 });
    expect(ids(evaluate(dala, b, opts))).not.toContain("crowd_mismatch");
  });

  test("4 other clients on another IBAN is below threshold", () => {
    const b = build({}, [...OWN_PAYMENTS, ...CROWD_PAYMENTS.slice(0, 4), pay(otherClient(1), DALA_BIN, DALA_IBAN, "2026-11-01")]);
    expect(ids(evaluate({ ...dala, iban: DALA_IBAN2 }, b, opts))).not.toContain("crowd_mismatch");
  });

  test("payments older than 12 months are ignored", () => {
    const boundary = build({ payments: [pay(CLIENT, NEW_BIN, KASPI_IBAN, "2025-12-11"), pay(otherClient(1), NEW_BIN, KASPI_IBAN, "2025-12-11")] });
    const old = ids(evaluate(newSupplierOtherBank, boundary, opts));
    expect(old).toContain("first_payment");
    expect(old).not.toContain("crowd_confirms");
    const inside = build({ payments: [pay(CLIENT, NEW_BIN, KASPI_IBAN, "2025-12-12")] });
    expect(ids(evaluate(newSupplierOtherBank, inside, opts))).toContain("own_history_ok");
  });

  test("ok verdict's main is an ok signal: amount_unusual + crowd_confirms → main crowd_confirms", () => {
    const r = evaluate({ ...dala, amount: 900000 }, bank, opts);
    expect(ids(r)).toEqual(["amount_unusual", "crowd_confirms", "own_history_ok", "owner_ok"]);
    expect(r.verdict).toBe("ok");
    expect(r.main.id).toBe("crowd_confirms");
    expect(r.action).toBe("pay");
  });

  test("main reason follows SIGNAL_ORDER: owner_individual beats crowd_mismatch", () => {
    const r = evaluate({ ...dala, iban: IND_IBAN }, bank, opts);
    expect(ids(r)).toEqual(expect.arrayContaining(["owner_individual", "own_history_changed", "crowd_mismatch", "account_new"]));
    expect(r.verdict).toBe("stop");
    expect(r.main.id).toBe("owner_individual");
  });

  test("action: bin_not_found → check_bin; owner_mismatch with contract → call_contract; without → find_phone", () => {
    const unknownBin = evaluate({ ...newSupplierOtherBank, bin: "999999999999" }, bank, opts);
    expect(unknownBin.main.id).toBe("bin_not_found");
    expect(unknownBin.action).toBe("check_bin");

    const withContract = evaluate({ ...dala, iban: CO_IBAN }, bank, opts);
    expect(withContract.main.id).toBe("owner_mismatch");
    expect(withContract.action).toBe("call_contract");
    expect(withContract.contact).toEqual({ person: "Ахметов Б.", role: "директор", phone: "+7 701 111 22 33", source: "договор №12" });

    const without = evaluate({ ...newSupplierOtherBank, iban: CO_IBAN }, bank, opts);
    expect(without.main.id).toBe("owner_mismatch");
    expect(without.action).toBe("find_phone");
    expect(without.contact).toBeNull();
  });

  test("action: name_mismatch → check_bin; supplier_* → check_supplier; nothing_to_compare without contract → find_phone", () => {
    expect(evaluate({ ...dala, name: "ТОО «Алтын Сауда»" }, bank, opts).action).toBe("check_bin");
    const inactive = build({ registry: [{ ...DALA_CO, status: "inactive" }] });
    expect(evaluate(dala, inactive, opts).action).toBe("check_supplier");
    const unreliable = build({ registry: [{ ...DALA_CO, status: "unreliable" }] });
    expect(evaluate(dala, unreliable, opts).action).toBe("check_supplier");
    expect(evaluate(newSupplierOtherBank, bank, opts).action).toBe("find_phone");
  });

  test("fingerprint changes when any field except purpose changes", () => {
    const fp = fingerprint(CLIENT, dala);
    expect(fp).toMatch(/^[0-9a-f]{64}$/);
    expect(fingerprint(CLIENT, { ...dala })).toBe(fp);
    expect(fingerprint("100000000009", dala)).not.toBe(fp);
    expect(fingerprint(CLIENT, { ...dala, name: "ТОО «Дала»" })).not.toBe(fp);
    expect(fingerprint(CLIENT, { ...dala, bin: OTHER_REGISTERED_BIN })).not.toBe(fp);
    expect(fingerprint(CLIENT, { ...dala, iban: DALA_IBAN2 })).not.toBe(fp);
    expect(fingerprint(CLIENT, { ...dala, amount: 800001 })).not.toBe(fp);
    expect(evaluate(dala, bank, opts).fingerprint).toBe(fp);
    const h = { changeRequestText: "Просим оплатить на новый счёт", phoneInDocument: "+7 700 000 00 00" };
    expect(fingerprint(CLIENT, dala, h)).not.toBe(fp);
    expect(fingerprint(CLIENT, dala, { ...h, phoneInDocument: null })).not.toBe(fingerprint(CLIENT, dala, h));
    expect(evaluate(dala, bank, { ...opts, hints: h }).fingerprint).toBe(fingerprint(CLIENT, dala, h));
  });
});

describe("email signals", () => {
  const mail = (fromAddress: string, extra: Partial<EmailHints> = {}): DocumentHints => ({
    changeRequestText: null,
    phoneInDocument: null,
    email: { fromAddress, replyTo: null, authFailed: false, pressure: [], ...extra },
  });
  const run = (p: ParsedPayment, hints: DocumentHints, approvals?: Approval[]) => evaluate(p, bank, { ...opts, hints, approvals });
  const emailIds = (r: ReturnType<typeof evaluate>) => ids(r).filter((id) => id.startsWith("email_"));

  test("lookalike sender with an IBAN at another bank: stop, main reason is the lookalike", () => {
    const r = run({ ...dala, iban: KASPI_IBAN }, mail("buh@dalatrans-kz.com"));
    expect(r.verdict).toBe("stop");
    expect(r.main.id).toBe("email_lookalike");
    expect(find(r, "email_lookalike")?.params).toEqual({ domain: "dalatrans-kz.com", contractDomain: "dalatrans.kz" });
    expect(ids(r)).toContain("own_history_changed");
    expect(ids(r)).toContain("owner_unknown");
  });

  test("subdomain of the contract domain and the right IBAN: no email signal, verdict ok", () => {
    const r = run(dala, mail("info@mail.dalatrans.kz"));
    expect(emailIds(r)).toEqual([]);
    expect(r.verdict).toBe("ok");
  });

  test("free mail: email_free_mail, no email_domain_differs", () => {
    const r = run(dala, mail("x@gmail.com"));
    expect(find(r, "email_free_mail")?.params).toEqual({ domain: "gmail.com" });
    expect(ids(r)).not.toContain("email_domain_differs");
    expect(r.verdict).toBe("check");
  });

  test("another company domain: email_domain_differs", () => {
    const r = run(dala, mail("x@other.kz"));
    expect(find(r, "email_domain_differs")?.params).toEqual({ domain: "other.kz", contractDomain: "dalatrans.kz" });
    expect(ids(r)).not.toContain("email_lookalike");
  });

  test("Reply-To on a different domain: email_reply_to; same organisation: nothing", () => {
    expect(find(run(dala, mail("info@dalatrans.kz", { replyTo: "pay@evil.kz" })), "email_reply_to")?.params).toEqual({ replyTo: "pay@evil.kz" });
    expect(emailIds(run(dala, mail("info@dalatrans.kz", { replyTo: "buh@mail.dalatrans.kz" })))).toEqual([]);
  });

  test("empty or malformed From: no sender-domain signals, Reply-To and auth still apply", () => {
    for (const from of ["", "no-at-sign"]) {
      const r = run(dala, mail(from, { replyTo: "pay@evil.kz", authFailed: true }));
      expect(ids(r)).not.toContain("email_domain_differs");
      expect(ids(r)).not.toContain("email_free_mail");
      expect(ids(r)).not.toContain("email_lookalike");
      expect(ids(r)).toContain("email_reply_to");
      expect(ids(r)).toContain("email_auth_failed");
    }
  });

  test("address case does not matter", () => {
    expect(emailIds(run(dala, mail("Info@DalaTrans.KZ")))).toEqual([]);
  });

  test("authFailed: email_auth_failed", () => {
    expect(ids(run(dala, mail("info@dalatrans.kz", { authFailed: true })))).toContain("email_auth_failed");
  });

  test("pressure: email_pressure with the first quote and the count", () => {
    const pressure = [
      { kind: "urgency" as const, quote: "оплатите срочно" },
      { kind: "no_call" as const, quote: "не звоните" },
    ];
    expect(find(run(dala, mail("info@dalatrans.kz", { pressure })), "email_pressure")?.params).toEqual({ quote: "оплатите срочно", count: 2 });
  });

  test("approval for the IBAN does not demote email signals", () => {
    const approvals = [{ clientBin: CLIENT, bin: DALA_BIN, iban: KASPI_IBAN, approvedAt: "2026-11-26", approvedBy: "Сапарова А.К." }];
    const r = run({ ...dala, iban: KASPI_IBAN }, mail("buh@dalatrans-kz.com"), approvals);
    expect(find(r, "email_lookalike")?.severity).toBe("stop");
    expect(r.verdict).toBe("stop");
  });

  test("supplier without a contract: no domain signal", () => {
    const r = run(newSupplierOtherBank, mail("x@other.kz"));
    expect(emailIds(r)).toEqual([]);
  });

  test("fingerprint depends on the email hints", () => {
    const base = fingerprint(CLIENT, dala, { changeRequestText: null, phoneInDocument: null });
    expect(fingerprint(CLIENT, dala, mail("x@other.kz"))).not.toBe(base);
    expect(fingerprint(CLIENT, dala, { changeRequestText: null, phoneInDocument: null, email: null })).toBe(base);
  });
});

describe("contract_conflict", () => {
  const conflict = (extra: Partial<ContractConflict> = {}): ContractConflict => ({
    kind: "third_party", source: "email", docQuote: "направить нашему партнёру", clause: "4.3", contractQuote: "Оплата третьим лицам не допускается.", ...extra,
  });
  const withContract = (conflicts: ContractConflict[], supplierBin = DALA_BIN): DocumentHints => ({
    changeRequestText: null, phoneInDocument: null, contract: { supplierBin, conflicts, mode: "local" },
  });
  const run = (p: ParsedPayment, hints: DocumentHints, approvals?: Approval[]) => evaluate(p, bank, { ...opts, hints, approvals });

  test("a conflict gives a check signal with the first conflict params and the count; it is the main reason without a stop", () => {
    const r = run(dala, withContract([conflict(), conflict({ kind: "details_change", source: "invoice", clause: "4.2" })]));
    expect(find(r, "contract_conflict")).toEqual({
      id: "contract_conflict", severity: "check",
      params: { source: "email", docQuote: "направить нашему партнёру", clause: "4.3", contractQuote: "Оплата третьим лицам не допускается.", count: 2 },
    });
    expect(r.verdict).toBe("check");
    expect(r.main.id).toBe("contract_conflict");
  });

  test("no conflicts: no signal", () => {
    expect(ids(run(dala, withContract([])))).not.toContain("contract_conflict");
  });

  test("with a stop present the main reason stays the stop", () => {
    const r = run({ ...dala, iban: IND_IBAN }, withContract([conflict()]));
    expect(ids(r)).toContain("contract_conflict");
    expect(r.verdict).toBe("stop");
    expect(r.main.id).toBe("owner_individual");
  });

  test("approval does not remove or demote contract_conflict", () => {
    const approvals = [{ clientBin: CLIENT, bin: DALA_BIN, iban: DALA_IBAN2, approvedAt: "2026-11-26", approvedBy: "Сапарова А.К." }];
    const r = run({ ...dala, iban: DALA_IBAN2 }, withContract([conflict()]), approvals);
    expect(find(r, "contract_conflict")?.severity).toBe("check");
  });

  test("unknown BIN with hints.contract.supplierBin of a real contract: contact and call_contract come from that contract", () => {
    // Поставщик есть в реестре, но договора с этим клиентом нет (как партнёр в демо-сценарии).
    const unknown = newSupplierOtherBank;
    const without = run(unknown, withContract([], "999999999999"));
    expect(without.contact).toBeNull();
    expect(without.action).toBe("find_phone");
    const r = run(unknown, withContract([conflict()]));
    expect(r.contact?.person).toBe("Ахметов Б.");
    expect(r.action).toBe("call_contract");
  });

  test("hints.contract for a supplier with no contract with this client: no contact substitution", () => {
    const b = build({ contracts: [{ clientBin: "999000000009", supplierBin: OTHER_CO_BIN, person: "Чужой П.", role: "директор", phone: "+7 700 000 00 00", email: "a@b.kz", source: "договор", paymentTerms: [] }] });
    const r = evaluate(newSupplierOtherBank, b, { ...opts, hints: withContract([conflict()], OTHER_CO_BIN) });
    expect(r.contact).toBeNull();
    expect(r.action).not.toBe("call_contract");
  });

  test("a substituted contract feeds phone_differs and the email domain checks", () => {
    // Поставщик есть в реестре, но договора с этим клиентом нет (как партнёр в демо-сценарии).
    const unknown = newSupplierOtherBank;
    const hints: DocumentHints = {
      ...withContract([]), phoneInDocument: "+7 777 000 00 00",
      email: { fromAddress: "x@other.kz", replyTo: null, authFailed: false, pressure: [] },
    };
    const r = run(unknown, hints);
    expect(ids(r)).toContain("phone_differs");
    expect(ids(r)).toContain("email_domain_differs");
  });

  test("fingerprint depends on the contract hints", () => {
    const base = fingerprint(CLIENT, dala, { changeRequestText: null, phoneInDocument: null });
    expect(fingerprint(CLIENT, dala, withContract([conflict()]))).not.toBe(base);
    expect(fingerprint(CLIENT, dala, withContract([conflict()]))).not.toBe(fingerprint(CLIENT, dala, withContract([])));
    expect(fingerprint(CLIENT, dala, { changeRequestText: null, phoneInDocument: null, contract: null })).toBe(base);
  });
});
