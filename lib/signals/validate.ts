// Строгий разбор полей платежа: ничего не отбрасывается молча, каждая проблема — ошибка поля.
import { HOMOGLYPHS, ibanChecksumOk } from "@/lib/iban";

export type PaymentFields = { name: string; bin: string; iban: string; amount: string; purpose: string };

export type FieldError = {
  field: "name" | "bin" | "iban" | "amount";
  code: "empty" | "bad_chars" | "unreadable" | "length" | "checksum" | "not_positive";
};

export type ParsedPayment = { name: string; bin: string; iban: string; amount: number; hadHomoglyphs: boolean };

const IBAN_LENGTH = 20;
const BIN_LENGTH = 12;

function parseIban(raw: string): { iban: string; hadHomoglyphs: boolean; error?: FieldError["code"] } {
  let hadHomoglyphs = false;
  const iban = raw
    .toUpperCase()
    .split("")
    .map((ch) => {
      if (HOMOGLYPHS[ch]) { hadHomoglyphs = true; return HOMOGLYPHS[ch]; }
      return ch;
    })
    .join("")
    .replace(/[ \-.]/g, "");
  if (iban === "") return { iban, hadHomoglyphs, error: "empty" };
  if (!/^[A-Z0-9?]+$/.test(iban)) return { iban, hadHomoglyphs, error: "bad_chars" };
  if (iban.includes("?")) return { iban, hadHomoglyphs, error: "unreadable" };
  if (iban.length !== IBAN_LENGTH) return { iban, hadHomoglyphs, error: "length" };
  if (!ibanChecksumOk(iban)) return { iban, hadHomoglyphs, error: "checksum" };
  return { iban, hadHomoglyphs };
}

function parseBin(raw: string): { bin: string; error?: FieldError["code"] } {
  const bin = raw.replace(/\s/g, "");
  if (bin === "") return { bin, error: "empty" };
  if (!/^\d+$/.test(bin)) return { bin, error: "bad_chars" };
  if (bin.length !== BIN_LENGTH) return { bin, error: "length" };
  return { bin };
}

function parseAmount(raw: string): { amount: number; error?: FieldError["code"] } {
  const compact = raw.replace(/\s/g, ""); // включая неразрывные пробелы
  if (compact === "") return { amount: 0, error: "empty" };
  const whole = compact.split(/[.,]/)[0]; // дробная часть отбрасывается
  if (!/^\d+$/.test(whole)) return { amount: 0, error: "bad_chars" };
  const amount = Number(whole);
  if (amount <= 0) return { amount, error: "not_positive" };
  return { amount };
}

export function parsePayment(f: PaymentFields): { ok: true; value: ParsedPayment } | { ok: false; errors: FieldError[] } {
  const errors: FieldError[] = [];
  const name = f.name.trim();
  if (name === "") errors.push({ field: "name", code: "empty" });

  const b = parseBin(f.bin);
  if (b.error) errors.push({ field: "bin", code: b.error });

  const i = parseIban(f.iban);
  if (i.error) errors.push({ field: "iban", code: i.error });

  const a = parseAmount(f.amount);
  if (a.error) errors.push({ field: "amount", code: a.error });

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { name, bin: b.bin, iban: i.iban, amount: a.amount, hadHomoglyphs: i.hadHomoglyphs } };
}
