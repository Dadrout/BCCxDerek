import type { CheckResult, Extraction } from "./types";
import { SUPPLIERS, PAYMENT_HISTORY } from "./registry";
import { normalizeIban, normalizeBin, ibanChecksumOk, bankByIban } from "./iban";

export function check(ex: Extraction): CheckResult {
  const bin = normalizeBin(ex.bin.value);
  const nameKey = (ex.supplier_name.value ?? "").toLowerCase().replace(/[^a-zа-яәіңғүұқөһ0-9]/gi, "");
  const supplier =
    SUPPLIERS.find((s) => s.bin === bin) ??
    (nameKey ? SUPPLIERS.find((s) => s.name.toLowerCase().replace(/[^a-zа-яәіңғүұқөһ0-9]/gi, "") === nameKey) : undefined) ??
    null;

  const n = normalizeIban(ex.iban.value);
  const docIban = n.value || null;
  const checksumOk = docIban ? ibanChecksumOk(docIban) : false;
  const ref = supplier?.iban ?? null;
  const diffPositions: number[] = [];
  if (docIban && ref) for (let i = 0; i < Math.max(docIban.length, ref.length); i++) if (docIban[i] !== ref[i]) diffPositions.push(i);

  const history = PAYMENT_HISTORY.filter((p) => !supplier || p.supplierBin === supplier.bin);
  const toThisIban = PAYMENT_HISTORY.filter((p) => p.iban === docIban);
  const avg = history.length ? history.reduce((a, p) => a + p.amount, 0) / history.length : null;
  const amount = Number((ex.amount.value ?? "").replace(/\D/g, "")) || null;

  const base = {
    extraction: ex,
    supplier,
    iban: { document: docIban, reference: ref, checksumOk, homoglyphs: n.hadHomoglyphs, diffPositions, documentBank: docIban ? bankByIban(docIban) : null },
    bankSignal: {
      ibanSeenBefore: toThisIban.length > 0,
      paymentsToThisIban: toThisIban.length,
      paymentsToSupplier: supplier ? history.length : 0,
      lastPayment: supplier ? history[history.length - 1] ?? null : null,
      amountVsAvg: amount && avg ? amount / avg : null,
    },
  };

  const reasons: string[] = [];

  // 1. Не удалось уверенно прочитать
  const unreadable =
    !ex.readable || !docIban || n.hasUnreadable || !checksumOk || ex.iban.confidence === "low";
  if (unreadable) {
    if (!ex.readable) reasons.push("Документ не читается: размытый скан или нет текста.");
    if (!docIban) reasons.push("IBAN получателя не найден в документе.");
    if (n.hasUnreadable) reasons.push("Часть символов IBAN не распознана (отмечены «?»).");
    if (docIban && !n.hasUnreadable && !checksumOk) reasons.push("Контрольная сумма IBAN не сходится: скорее всего, символ прочитан неверно.");
    if (ex.iban.confidence === "low" && docIban) reasons.push("Модель не уверена в каждом символе IBAN.");
    reasons.push("Сверка не выполнена. Загрузите оригинал PDF или введите IBAN вручную посимвольно.");
    return { ...base, status: "unreadable", headline: "Не удалось уверенно прочитать реквизиты", reasons };
  }

  if (n.hadHomoglyphs) reasons.push("В IBAN найдены кириллические буквы, похожие на латинские. Это частый приём подделки.");

  // 2. Нет подтверждённой записи
  if (!supplier) {
    reasons.push("Поставщика с таким БИН нет в подтверждённых карточках компании.");
    reasons.push("Сравнивать не с чем. Перед первым платежом проведите первичную проверку реквизитов по независимому источнику.");
    reasons.push("Телефон из этого счёта для проверки не используйте.");
    return { ...base, status: "new_supplier", headline: "Нет подтверждённой записи для сравнения", reasons };
  }

  // 3. Совпадение
  if (docIban === ref && !n.hadHomoglyphs) {
    reasons.push(`IBAN совпадает с подтверждённой карточкой от ${supplier.verifiedAt}.`);
    reasons.push(`На этот счёт уже было ${base.bankSignal.paymentsToThisIban} платежей.`);
    if (base.bankSignal.amountVsAvg && base.bankSignal.amountVsAvg > 1.05)
      reasons.push(`Сумма выше средней на ${Math.round((base.bankSignal.amountVsAvg - 1) * 100)}%, но реквизиты прежние.`);
    return { ...base, status: "match", headline: "Реквизиты совпадают с подтверждённой карточкой", reasons };
  }

  // 4. Расхождение
  reasons.unshift(`IBAN в счёте отличается от подтверждённой карточки (${diffPositions.length} символов).`);
  if (base.iban.documentBank && bankByIban(ref!) !== base.iban.documentBank)
    reasons.push(`Счёт открыт в другом банке: ${base.iban.documentBank} вместо ${bankByIban(ref!) ?? "прежнего"}.`);
  reasons.push("На этот IBAN компания раньше не платила.");
  if (ex.change_request_text) reasons.push(`В счёте есть просьба платить по новым реквизитам: «${ex.change_request_text}».`);
  const docPhone = (ex.phone_in_document.value ?? "").replace(/\D/g, "");
  if (docPhone && docPhone !== supplier.contact.phone.replace(/\D/g, ""))
    reasons.push("Телефон в счёте не совпадает с контактом из договора. Звонить нужно только по сохранённому номеру.");
  return { ...base, status: "mismatch", headline: "Реквизиты изменились. Этот счёт у поставщика ещё не подтверждён", reasons };
}
