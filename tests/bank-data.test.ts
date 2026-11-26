import { describe, expect, test } from "vitest";
import { getBank, makeBank } from "@/lib/bank/store";
import { generate } from "@/scripts/gen-bank";
import { ibanChecksumOk } from "@/lib/iban";
import { DEMO_TODAY } from "@/lib/demo";
import { ALTYN, DALA, DALA_CONTRACT, DEMO_CLIENT, FRAUD_IBAN, REPORTED_IBAN, TAU, ZHYLDAM } from "@/lib/bank/fixtures";

const bank = getBank();
const dala = bank.paymentsBySupplier.get(DALA.bin)!;
const others = (iban: string, bin: string) =>
  new Set(
    (bank.paymentsBySupplier.get(bin) ?? []).filter((p) => p.iban === iban && p.clientBin !== DEMO_CLIENT.bin).map((p) => p.clientBin),
  ).size;
const all = [...bank.paymentsBySupplier.values()].flat();

describe("bank data", () => {
  test("demo client paid Dala 6 times to the real IBAN", () =>
    expect(dala.filter((p) => p.clientBin === DEMO_CLIENT.bin && p.iban === DALA.iban)).toHaveLength(6));
  test("47 other clients pay Dala; 12 pay Altyn", () => {
    expect(others(DALA.iban, DALA.bin)).toBe(47);
    expect(others(ALTYN.iban, ALTYN.bin)).toBe(12);
  });
  test("Tau is paid by exactly 48 other clients to its real IBAN, none to the invoice IBAN", () => {
    expect(others(TAU.iban, TAU.bin)).toBe(48);
    expect(others(TAU.invoiceIban, TAU.bin)).toBe(0);
  });
  test("demo client never paid Tau, Zhyldam or Altyn", () => {
    for (const bin of [TAU.bin, ZHYLDAM.bin, ALTYN.bin]) {
      expect((bank.paymentsBySupplier.get(bin) ?? []).filter((p) => p.clientBin === DEMO_CLIENT.bin)).toHaveLength(0);
    }
  });
  test("Dala demo payments average about 733 000", () => {
    const mine = dala.filter((p) => p.clientBin === DEMO_CLIENT.bin);
    expect(Math.round(mine.reduce((s, p) => s + p.amount, 0) / mine.length)).toBe(733333);
  });
  test("FRAUD_IBAN belongs to an individual opened 2026-12-08", () =>
    expect(bank.accounts.get(FRAUD_IBAN)).toMatchObject({ ownerType: "individual", openedAt: "2026-12-08" }));
  test("Dala and Zhyldam accounts belong to their companies; reported IBAN has 3 complaints", () => {
    expect(bank.accounts.get(DALA.iban)).toMatchObject({ ownerId: DALA.bin, ownerType: "company" });
    expect(bank.accounts.get(ZHYLDAM.iban)).toMatchObject({ ownerId: ZHYLDAM.bin, openedAt: "2026-12-08" });
    expect(bank.registry.get(ZHYLDAM.bin)?.registeredAt).toBe("2026-11-27");
    expect(bank.complaints.get(REPORTED_IBAN)?.count).toBe(3);
  });
  test("accounts are BCC only", () => {
    for (const a of bank.accounts.values()) expect(a.iban.slice(4, 7)).toBe("856");
  });
  test("every generated IBAN passes checksum", () => {
    for (const p of all) expect(ibanChecksumOk(p.iban)).toBe(true);
    for (const a of bank.accounts.values()) expect(ibanChecksumOk(a.iban)).toBe(true);
  });
  test("payments fall within 12 months before DEMO_TODAY", () => {
    for (const p of all) {
      expect(p.date <= DEMO_TODAY).toBe(true);
      expect(p.date >= "2025-12-11").toBe(true);
    }
  });
  test("some suppliers have two working IBANs each paid by at least 5 clients", () => {
    const ok = [...bank.paymentsBySupplier.values()].filter((list) => {
      const per = new Map<string, Set<string>>();
      for (const p of list) {
        if (!per.has(p.iban)) per.set(p.iban, new Set());
        per.get(p.iban)!.add(p.clientBin);
      }
      return [...per.values()].filter((s) => s.size >= 5).length >= 2;
    });
    expect(ok.length).toBeGreaterThanOrEqual(3);
  });
  test("contracts only for the demo client", () => {
    expect(bank.contracts.length).toBeGreaterThan(0);
    expect(bank.contracts.every((c) => c.clientBin === DEMO_CLIENT.bin)).toBe(true);
    expect(bank.contracts).toContainEqual(DALA_CONTRACT);
  });
  test("generator is deterministic", () => {
    expect(JSON.stringify(generate())).toBe(JSON.stringify(generate()));
  });
  test("makeBank indexes manual data", () => {
    const b = makeBank({
      payments: [{ date: "2026-01-01", clientBin: "1", supplierBin: "2", iban: "X", amount: 5 }],
      accounts: [],
      registry: [],
      complaints: [],
      contracts: [],
    });
    expect(b.paymentsBySupplier.get("2")).toHaveLength(1);
  });
});
