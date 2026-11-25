import type { CheckResult, Extraction } from "./types";
import { SUPPLIERS, PAYMENT_HISTORY } from "./registry";
import { DICT, bankName, type Lang } from "./i18n";
import { normalizeIban, normalizeBin, ibanChecksumOk, bankByIban } from "./iban";

export function check(ex: Extraction, lang: Lang = "ru"): CheckResult {
  const v = DICT[lang].v;
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
    if (!ex.readable) reasons.push(v.notReadable);
    if (!docIban) reasons.push(v.noIban);
    if (n.hasUnreadable) reasons.push(v.unreadableChars);
    if (docIban && !n.hasUnreadable && !checksumOk) reasons.push(v.checksum);
    if (ex.iban.confidence === "low" && docIban) reasons.push(v.lowConfidence);
    reasons.push(v.notChecked);
    return { ...base, status: "unreadable", headline: v.unreadableHead, reasons };
  }

  if (n.hadHomoglyphs) reasons.push(v.homoglyphs);

  // 2. Нет подтверждённой записи
  if (!supplier) {
    reasons.push(v.noSupplier);
    reasons.push(v.nothingToCompare);
    reasons.push(v.dontUsePhone);
    return { ...base, status: "new_supplier", headline: v.newHead, reasons };
  }

  // 3. Совпадение
  if (docIban === ref && !n.hadHomoglyphs) {
    reasons.push(v.matchCard(supplier.verifiedAt));
    reasons.push(v.matchPayments(base.bankSignal.paymentsToThisIban));
    if (base.bankSignal.amountVsAvg && base.bankSignal.amountVsAvg > 1.05)
      reasons.push(v.amountHigher(Math.round((base.bankSignal.amountVsAvg - 1) * 100)));
    return { ...base, status: "match", headline: v.matchHead, reasons };
  }

  // 4. Расхождение
  reasons.unshift(v.ibanDiffers(diffPositions.length));
  if (base.iban.documentBank && bankByIban(ref!) !== base.iban.documentBank)
    reasons.push(v.otherBank(bankName(base.iban.documentBank, lang)!, bankName(bankByIban(ref!), lang) ?? v.previous));
  reasons.push(v.neverPaid);
  if (ex.change_request_text) reasons.push(v.changeRequest(ex.change_request_text));
  const docPhone = (ex.phone_in_document.value ?? "").replace(/\D/g, "");
  if (docPhone && docPhone !== supplier.contact.phone.replace(/\D/g, ""))
    reasons.push(v.phoneDiffers);
  return { ...base, status: "mismatch", headline: v.mismatchHead, reasons };
}
