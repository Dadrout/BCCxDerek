import { expect, test } from "vitest";
import { parsePayment, type FieldError } from "@/lib/signals/validate";

const base = { name: "ТОО «Дала Транс Логистик»", bin: "180340021457", iban: "KZ218560000012345678", amount: "840000", purpose: "" };

test("lowercase, spaces and dashes in IBAN are accepted", () => {
  const r = parsePayment({ ...base, iban: "kz21 8560-0000 1234 5678" });
  expect(r).toEqual({ ok: true, value: expect.objectContaining({ iban: "KZ218560000012345678" }) });
});
test("unexpected symbol in IBAN is a field error, not silently dropped", () => {
  expect(parsePayment({ ...base, iban: "KZ218560000012345678!" })).toEqual({ ok: false, errors: [{ field: "iban", code: "bad_chars" }] });
});
test("unreadable ? in IBAN", () => expect(parsePayment({ ...base, iban: "KZ2185600000123?5678" })).toMatchObject({ ok: false, errors: [{ field: "iban", code: "unreadable" }] }));
test("one wrong digit fails checksum", () => expect(parsePayment({ ...base, iban: "KZ218560000012345679" })).toMatchObject({ ok: false, errors: [{ field: "iban", code: "checksum" }] }));
test("wrong length is a length error", () => expect(parsePayment({ ...base, iban: "KZ2185600000123456" })).toMatchObject({ ok: false, errors: [{ field: "iban", code: "length" }] }));
test("Cyrillic look-alikes are normalised and flagged", () => {
  const r = parsePayment({ ...base, iban: "КZ218560000012345678" }); // К кириллица
  expect(r).toMatchObject({ ok: true, value: { iban: "KZ218560000012345678", hadHomoglyphs: true } });
});
test("BIN with spaces accepted; 11 digits is length error", () => {
  expect(parsePayment({ ...base, bin: "180 340 021 457" })).toMatchObject({ ok: true, value: { bin: "180340021457" } });
  expect(parsePayment({ ...base, bin: "18034002145" })).toMatchObject({ ok: false, errors: [{ field: "bin", code: "length" }] });
});
test("amount formats", () => {
  expect(parsePayment({ ...base, amount: "1 250 000,00" })).toMatchObject({ ok: true, value: { amount: 1250000 } });
  expect(parsePayment({ ...base, amount: "1250000.50" })).toMatchObject({ ok: true, value: { amount: 1250000 } });
  expect(parsePayment({ ...base, amount: "0" })).toMatchObject({ ok: false, errors: [{ field: "amount", code: "not_positive" }] });
});
test("empty fields are reported together", () => {
  const r = parsePayment({ name: "", bin: "", iban: "", amount: "", purpose: "" });
  expect(r.ok).toBe(false);
  expect((r as { errors: FieldError[] }).errors.map((e) => e.field).sort()).toEqual(["amount", "bin", "iban", "name"]);
});
