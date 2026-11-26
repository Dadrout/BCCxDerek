import { expect, test } from "vitest";
import { ibanChecksumOk, makeKzIban } from "@/lib/iban";

test("makeKzIban builds the known supplier IBAN", () => {
  expect(makeKzIban("856", "0000012345678")).toBe("KZ218560000012345678");
});

test("makeKzIban output passes the checksum", () => {
  expect(ibanChecksumOk(makeKzIban("601", "0000077712345"))).toBe(true);
});
