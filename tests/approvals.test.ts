import { existsSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, test } from "vitest";
import { evaluate } from "@/lib/signals/engine";
import type { Approval } from "@/lib/signals/types";
import type { ParsedPayment } from "@/lib/signals/validate";
import { makeBank } from "@/lib/bank/store";
import type { Account, Complaint, Company, Payment } from "@/lib/bank/types";
import { addApproval, readApprovals, resetApprovals } from "@/lib/bank/approvals";
import { makeKzIban } from "@/lib/iban";

const CLIENT = "100000000001";
const BIN = "180340021457";
const OLD_IBAN = makeKzIban("856", "0000012345678");
const NEW_IBAN = makeKzIban("856", "0000087654321");
const IND_IBAN = makeKzIban("856", "0000055500011");
const NAME = "ТОО «Дала Транс Логистик»";

const company: Company = { bin: BIN, name: NAME, registeredAt: "2018-03-14", status: "active" };
const accounts: Account[] = [
  { iban: OLD_IBAN, ownerId: BIN, ownerType: "company", ownerName: NAME, openedAt: "2019-01-15" },
  { iban: NEW_IBAN, ownerId: BIN, ownerType: "company", ownerName: NAME, openedAt: "2020-06-01" },
  { iban: IND_IBAN, ownerId: "900101300123", ownerType: "individual", ownerName: "Иванов И.И.", openedAt: "2020-01-01" },
];
const pay = (clientBin: string, iban: string, date: string): Payment => ({ date, clientBin, supplierBin: BIN, iban, amount: 800000 });
const payments: Payment[] = [
  ...["2026-06-10", "2026-07-10", "2026-08-10", "2026-09-10", "2026-10-10", "2026-11-10"].map((d) => pay(CLIENT, OLD_IBAN, d)),
  ...[1, 2, 3, 4, 5].map((i) => pay(`30000000000${i}`, OLD_IBAN, "2026-10-01")),
];
const mk = (extra: { complaints?: Complaint[]; registry?: Company[] } = {}) =>
  makeBank({
    payments,
    accounts,
    registry: [company, ...(extra.registry ?? [])],
    complaints: extra.complaints ?? [],
    contracts: [],
  });
const bank = mk();
const swap: ParsedPayment = { name: NAME, bin: BIN, iban: NEW_IBAN, amount: 800000, hadHomoglyphs: false };
const approval: Approval = { clientBin: CLIENT, bin: BIN, iban: NEW_IBAN, approvedAt: "2026-12-11", approvedBy: "Сидоров А." };
const opts = { clientBin: CLIENT };
const ids = (r: ReturnType<typeof evaluate>) => r.signals.map((s) => s.id);

const dir = mkdtempSync(join(tmpdir(), "derek-appr-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));
const tmp = (name: string) => join(dir, name);

describe("approvals in the engine", () => {
  test("without approval the swap is stopped by history signals", () => {
    const r = evaluate(swap, bank, opts);
    expect(ids(r)).toEqual(expect.arrayContaining(["own_history_changed", "crowd_mismatch"]));
  });

  test("approval for exact client+BIN+IBAN demotes own_history_changed and crowd_mismatch to info and adds change_approved", () => {
    const r = evaluate(swap, bank, { ...opts, approvals: [approval] });
    expect(ids(r)).toContain("change_approved");
    const sev = (id: string) => r.signals.find((s) => s.id === id)?.severity;
    expect(sev("own_history_changed")).toBe("info");
    expect(sev("crowd_mismatch")).toBe("info");
    expect(ids(r)).not.toContain("first_payment");
    expect(r.verdict).toBe("ok");
    expect(ids(r)).not.toContain("nothing_to_compare");
    expect(r.signals.find((s) => s.id === "change_approved")?.params).toEqual({ date: "11.12", by: "Сидоров А." });
  });

  test("approval never removes owner_individual", () => {
    const a = { ...approval, iban: IND_IBAN };
    const r = evaluate({ ...swap, iban: IND_IBAN }, bank, { ...opts, approvals: [a] });
    expect(ids(r)).toContain("owner_individual");
    expect(r.verdict).toBe("stop");
  });

  test("approval never removes owner_mismatch", () => {
    const other: Account = { iban: NEW_IBAN, ownerId: "190240000004", ownerType: "company", ownerName: "Чужая", openedAt: "2020-04-04" };
    const b = makeBank({ payments, accounts: [...accounts, other], registry: [company], complaints: [], contracts: [] });
    const r = evaluate(swap, b, { ...opts, approvals: [approval] });
    expect(ids(r)).toContain("owner_mismatch");
    expect(r.verdict).toBe("stop");
  });

  test("approval never removes iban_reported", () => {
    const b = mk({ complaints: [{ iban: NEW_IBAN, count: 2, lastAt: "2026-11-01" }] });
    const r = evaluate(swap, b, { ...opts, approvals: [approval] });
    expect(ids(r)).toContain("iban_reported");
    expect(r.verdict).toBe("stop");
  });

  test("approval never removes supplier_unreliable", () => {
    const b = mk({ registry: [{ ...company, status: "unreliable" }] });
    const r = evaluate(swap, b, { ...opts, approvals: [approval] });
    expect(ids(r)).toContain("supplier_unreliable");
    expect(r.verdict).toBe("stop");
  });

  test("approval for another IBAN, another client or another BIN has no effect", () => {
    for (const a of [
      { ...approval, iban: OLD_IBAN },
      { ...approval, clientBin: "100000000099" },
      { ...approval, bin: "210540000003" },
    ]) {
      const r = evaluate(swap, bank, { ...opts, approvals: [a] });
      expect(ids(r)).not.toContain("change_approved");
      expect(ids(r)).toEqual(expect.arrayContaining(["own_history_changed", "crowd_mismatch"]));
    }
  });
});

describe("approvals file store", () => {
  test("missing file reads as []", () => expect(readApprovals(tmp("nope.json"))).toEqual([]));

  test("corrupt JSON reads as []", () => {
    const f = tmp("bad.json");
    writeFileSync(f, "{oops");
    expect(readApprovals(f)).toEqual([]);
  });

  test("add then reset, creating the directory when missing", () => {
    const f = join(dir, "nested", "deeper", "a.json");
    addApproval(approval, f);
    addApproval({ ...approval, iban: OLD_IBAN }, f);
    expect(readApprovals(f)).toHaveLength(2);
    expect(readApprovals(f)[0]).toEqual(approval);
    resetApprovals(f);
    expect(readApprovals(f)).toEqual([]);
  });

  test("elements of the wrong shape are filtered out", () => {
    const f = tmp("shape.json");
    writeFileSync(f, JSON.stringify([null, {}, { ...approval, approvedBy: 5 }, approval]));
    expect(readApprovals(f)).toEqual([approval]);
    writeFileSync(f, JSON.stringify([null, {}]));
    expect(readApprovals(f)).toEqual([]);
  });

  test("on stage approvals stay in memory and never touch the file", () => {
    const f = tmp("stage.json");
    process.env.DEREK_STAGE = "1";
    try {
      resetApprovals(f);
      addApproval(approval, f);
      expect(readApprovals(f)).toEqual([approval]);
      expect(existsSync(f)).toBe(false);
      resetApprovals(f);
      expect(readApprovals(f)).toEqual([]);
    } finally {
      delete process.env.DEREK_STAGE;
    }
    expect(readApprovals(f)).toEqual([]);
  });

  test("DEREK_APPROVALS_FILE env var is used when no argument is given", () => {
    const f = tmp("env.json");
    process.env.DEREK_APPROVALS_FILE = f;
    try {
      addApproval(approval);
      expect(readApprovals(f)).toEqual([approval]);
    } finally {
      delete process.env.DEREK_APPROVALS_FILE;
    }
  });
});
