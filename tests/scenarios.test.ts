import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { POST as checkPOST } from "@/app/api/check/route";
import { POST as extractPOST } from "@/app/api/extract/route";
import { ALTYN, DALA, FRAUD_IBAN, TAU } from "@/lib/bank/fixtures";
import { SCENARIOS, type Scenario } from "@/lib/scenarios";
import { scenarioHint, scenarioTitle } from "@/lib/signals/texts";

const savedA = process.env.DEREK_APPROVALS_FILE;
const savedS = process.env.DEREK_STAGE;
let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "derek-scn-"));
  process.env.DEREK_APPROVALS_FILE = join(dir, "approvals.json");
  process.env.DEREK_STAGE = "1";
});
afterAll(() => {
  if (savedA === undefined) delete process.env.DEREK_APPROVALS_FILE; else process.env.DEREK_APPROVALS_FILE = savedA;
  if (savedS === undefined) delete process.env.DEREK_STAGE; else process.env.DEREK_STAGE = savedS;
  rmSync(dir, { recursive: true, force: true });
});

const sc = (id: string) => SCENARIOS.find((s) => s.id === id) as Scenario;
async function extract(sample: string) {
  const fd = new FormData();
  fd.set("sample", sample);
  return (await extractPOST(new Request("http://x/api/extract", { method: "POST", body: fd }))).json();
}
const check = async (fields: unknown, hints: unknown) =>
  (await checkPOST(new Request("http://x/api/check", { method: "POST", body: JSON.stringify({ fields, hints }), headers: { "content-type": "application/json" } }))).json();
async function run(s: Scenario) {
  let fields = s.fields, hints = s.hints;
  if (s.sample) ({ fields, hints } = await extract(s.sample));
  return check(fields, hints);
}
type Sig = { id: string; params: Record<string, unknown> };
const ids = (o: { signals: Sig[] }): string[] => o.signals.map((x) => x.id);
const sig = (o: { signals: Sig[] }, id: string) => o.signals.find((x) => x.id === id);

describe("scenarios", () => {
  test("order and stage flags", () => {
    expect(SCENARIOS.map((s) => s.id)).toEqual(["normal", "swap", "new_to_you", "young_firm", "blurry", "manual", "known_new"]);
    expect(SCENARIOS.filter((s) => s.onStage).map((s) => s.id)).toEqual(["normal", "swap", "new_to_you"]);
    for (const id of ["new_to_you", "young_firm", "manual"]) expect(sc(id).sample).toBeUndefined();
    for (const id of ["normal", "swap", "blurry", "known_new"]) expect(sc(id).sample).toBeTruthy();
  });

  test("titles and hints exist in all languages", () => {
    for (const s of SCENARIOS) for (const l of ["kk", "ru", "en"] as const) {
      expect(scenarioTitle(s.id, l).length).toBeGreaterThan(0);
      expect(scenarioHint(s.id, l).length).toBeGreaterThan(0);
    }
  });

  test("normal → ok, own_history_ok/crowd_confirms, amount_unusual present", async () => {
    const o = await run(sc("normal"));
    expect(o.verdict).toBe("ok");
    expect(["own_history_ok", "crowd_confirms"]).toContain(o.main.id);
    expect(ids(o)).toContain("amount_unusual");
  });

  test("swap → stop, main owner_individual, plus the rest", async () => {
    const o = await run(sc("swap"));
    expect(o.verdict).toBe("stop");
    expect(o.main.id).toBe("owner_individual");
    for (const id of ["own_history_changed", "crowd_mismatch", "account_new", "change_request", "phone_differs"]) expect(ids(o)).toContain(id);
  });

  test("new_to_you → stop, crowd_mismatch 48, owner_unknown, first_payment, no contact", async () => {
    const o = await run(sc("new_to_you"));
    expect(o.verdict).toBe("stop");
    expect(o.main.id).toBe("crowd_mismatch");
    expect(sig(o, "crowd_mismatch")?.params.count).toBe(TAU.otherClients);
    expect(ids(o)).toContain("owner_unknown");
    expect(ids(o)).toContain("first_payment");
    expect(o.contact ?? null).toBeNull();
  });

  test("young_firm → check, supplier_young and account_new, main account_new, find_phone", async () => {
    const o = await run(sc("young_firm"));
    expect(o.verdict).toBe("check");
    expect(ids(o)).toContain("supplier_young");
    expect(ids(o)).toContain("account_new");
    expect(o.main.id).toBe("account_new");
    expect(o.action).toBe("find_phone");
  });

  test("blurry (local mode, no text layer) → empty fields, check gives fix_fields iban empty", async () => {
    const { fields, hints } = await extract(sc("blurry").sample!);
    expect(fields.iban).toBe("");
    const o = await check(fields, hints);
    expect(o.kind).toBe("fix_fields");
    expect(o.errors.some((e: { field: string; code: string }) => e.field === "iban" && e.code === "empty")).toBe(true);
  });

  test("manual and blurry hints carry Dala details; blurry shows the typo example that fails the checksum", async () => {
    const { formatIban } = await import("@/lib/iban");
    const { parsePayment } = await import("@/lib/signals/validate");
    for (const l of ["kk", "ru", "en"] as const) {
      const h = scenarioHint("manual", l);
      expect(h).toContain(DALA.bin);
      expect(h).toContain(DALA.name);
      expect(h).toContain(formatIban(DALA.iban));
      expect(scenarioHint("blurry", l)).toContain("KZ21 8560 0000 1234 5679");
    }
    const r = parsePayment({ name: DALA.name, bin: DALA.bin, iban: "KZ21 8560 0000 1234 5679", amount: "1000", purpose: "" });
    expect(r.ok).toBe(false);
    expect(sc("blurry").fallback).toEqual({ name: DALA.name, bin: DALA.bin, amount: "780000" });
    expect(sc("blurry").fallback).not.toHaveProperty("iban");
  });

  test("manual → empty fields", () => {
    expect(Object.values(sc("manual").fields!).every((v) => v === "")).toBe(true);
  });

  test("known_new (Altyn) → ok, crowd_confirms 12, first_payment, owner_unknown", async () => {
    const o = await run(sc("known_new"));
    expect(o.verdict).toBe("ok");
    expect(o.main.id).toBe("crowd_confirms");
    expect(sig(o, "crowd_confirms")?.params.count).toBe(ALTYN.otherClients);
    expect(ids(o)).toContain("first_payment");
    expect(ids(o)).toContain("owner_unknown");
  });

  test("PDF 02 contains FRAUD_IBAN, Dala BIN, change request and phone", async () => {
    const { fields, hints } = await extract("02_dala_podmena_iban.pdf");
    expect(fields.iban.replace(/\s/g, "")).toBe(FRAUD_IBAN);
    expect(fields.bin).toBe(DALA.bin);
    expect(hints.changeRequestText).toContain("сменой расчётного счёта");
    expect(hints.phoneInDocument).toBe("+7 707 412 90 66");
  });
});
