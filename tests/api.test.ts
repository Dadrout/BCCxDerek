import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { POST as checkPOST } from "@/app/api/check/route";
import { POST as payPOST } from "@/app/api/pay/route";
import { POST as approvalsPOST, DELETE as approvalsDELETE } from "@/app/api/approvals/route";
import { POST as extractPOST } from "@/app/api/extract/route";
import { DALA, FRAUD_IBAN, ZHYLDAM } from "@/lib/bank/fixtures";
import type { PaymentFields } from "@/lib/signals/validate";

const json = (url: string, body: unknown, method = "POST") =>
  new Request(`http://x/api/${url}`, { method, body: JSON.stringify(body), headers: { "content-type": "application/json" } });
const check = async (fields: PaymentFields) => (await checkPOST(json("check", { fields }))).json();
const pay = (body: unknown) => payPOST(json("pay", body));

const dalaFields: PaymentFields = { name: DALA.name, bin: DALA.bin, iban: DALA.iban, amount: "780000", purpose: "Оплата по счёту № ДТ-1" };
const zhyldamFields: PaymentFields = { name: ZHYLDAM.name, bin: ZHYLDAM.bin, iban: ZHYLDAM.iban, amount: "500000", purpose: "Оплата" };

const savedEnv = process.env.DEREK_APPROVALS_FILE;
let dir: string;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "derek-api-"));
  process.env.DEREK_APPROVALS_FILE = join(dir, "approvals.json");
});
afterAll(() => {
  if (savedEnv === undefined) delete process.env.DEREK_APPROVALS_FILE;
  else process.env.DEREK_APPROVALS_FILE = savedEnv;
  rmSync(dir, { recursive: true, force: true });
});

describe("api", () => {
  test("check returns fix_fields for IBAN with '!'", async () => {
    const r = await check({ ...dalaFields, iban: "KZ21856000001234567!" });
    expect(r.kind).toBe("fix_fields");
  });

  test("pay: edited IBAN after check → 409 needs_recheck", async () => {
    const c = await check(dalaFields);
    const r = await pay({ fields: { ...dalaFields, iban: FRAUD_IBAN }, fingerprint: c.fingerprint });
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual({ result: "needs_recheck" });
  });

  test("pay: invalid fields → 400 fix_fields", async () => {
    const r = await pay({ fields: { ...dalaFields, iban: "bad" }, fingerprint: "x" });
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ result: "fix_fields" });
  });

  test("pay: stop verdict → 403 blocked", async () => {
    const f = { ...dalaFields, iban: FRAUD_IBAN };
    const c = await check(f);
    expect(c.verdict).toBe("stop");
    const r = await pay({ fields: f, fingerprint: c.fingerprint, acknowledged: true });
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ result: "blocked" });
  });

  test("pay: check verdict needs acknowledged", async () => {
    const c = await check(zhyldamFields);
    expect(c.verdict).toBe("check");
    const r1 = await pay({ fields: zhyldamFields, fingerprint: c.fingerprint });
    expect(r1.status).toBe(409);
    expect(await r1.json()).toEqual({ result: "needs_ack" });
    const r2 = await pay({ fields: zhyldamFields, fingerprint: c.fingerprint, acknowledged: true });
    expect(r2.status).toBe(200);
    expect(await r2.json()).toEqual({ result: "sent" });
  });

  test("pay: hints dropped after the check → 409 needs_recheck", async () => {
    const hints = { changeRequestText: "Просим оплатить на новый счёт", phoneInDocument: null };
    const c = await (await checkPOST(json("check", { fields: zhyldamFields, hints }))).json();
    const r = await pay({ fields: zhyldamFields, fingerprint: c.fingerprint, acknowledged: true });
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual({ result: "needs_recheck" });
    const ok = await pay({ fields: zhyldamFields, hints, fingerprint: c.fingerprint, acknowledged: true });
    expect(ok.status).toBe(200);
  });

  test("hints.email changes the fingerprint; malformed hints.email is treated as no email", async () => {
    const base = { changeRequestText: null, phoneInDocument: null };
    const email = { fromAddress: "x@other.kz", replyTo: null, authFailed: false, pressure: [] };
    const plain = await (await checkPOST(json("check", { fields: dalaFields, hints: base }))).json();
    const withEmail = await (await checkPOST(json("check", { fields: dalaFields, hints: { ...base, email } }))).json();
    expect(withEmail.fingerprint).not.toBe(plain.fingerprint);
    expect(withEmail.signals.map((s: { id: string }) => s.id)).toContain("email_domain_differs");
    const bad = await checkPOST(json("check", { fields: dalaFields, hints: { ...base, email: { fromAddress: 5 } } }));
    expect(bad.status).toBe(200);
    const badBody = await bad.json();
    expect(badBody.fingerprint).toBe(plain.fingerprint);
    expect(badBody.signals.map((s: { id: string }) => s.id).filter((id: string) => id.startsWith("email_"))).toEqual([]);
  });

  test("hints.email without replyTo is accepted as replyTo null", async () => {
    const base = { changeRequestText: null, phoneInDocument: null };
    const email = { fromAddress: "x@other.kz", authFailed: false, pressure: [] };
    const r = await (await checkPOST(json("check", { fields: dalaFields, hints: { ...base, email } }))).json();
    expect(r.signals.map((s: { id: string }) => s.id)).toContain("email_domain_differs");
  });

  test("pay: ok verdict → 200 sent", async () => {
    const c = await check(dalaFields);
    expect(c.verdict).toBe("ok");
    const r = await pay({ fields: dalaFields, fingerprint: c.fingerprint });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ result: "sent" });
  });

  test("approvals: approve swap then check shows change_approved; DELETE resets", async () => {
    // Дала с другим IBAN той же компании: найдём такой счёт в банке через стоп-сценарий не получится,
    // поэтому проверяем сам механизм: утверждение записывается и попадает в check.
    const f = { ...dalaFields, iban: FRAUD_IBAN };
    const before = await check(f);
    expect(before.signals.some((s: { id: string }) => s.id === "change_approved")).toBe(false);
    const a = await approvalsPOST(json("approvals", { fields: f }));
    expect(await a.json()).toEqual({ ok: true });
    const after = await check(f);
    expect(after.signals.some((s: { id: string }) => s.id === "change_approved")).toBe(true);
    const d = await approvalsDELETE();
    expect(await d.json()).toEqual({ ok: true });
    const reset = await check(f);
    expect(reset.signals.some((s: { id: string }) => s.id === "change_approved")).toBe(false);
  });

  test("garbage bodies get 400 (invalid JSON, fields null/string)", async () => {
    const bad = (url: string) => new Request(`http://x/api/${url}`, { method: "POST", body: "{not json", headers: { "content-type": "application/json" } });
    const rc = await checkPOST(bad("check"));
    expect(rc.status).toBe(400);
    expect((await rc.json()).kind).toBe("fix_fields");
    const rp = await payPOST(bad("pay"));
    expect(rp.status).toBe(400);
    expect(await rp.json()).toEqual({ result: "fix_fields" });
    const rc2 = await checkPOST(json("check", { fields: null }));
    expect(rc2.status).toBe(400);
    const rp2 = await pay({ fields: null, fingerprint: "x" });
    expect(rp2.status).toBe(400);
    expect(await rp2.json()).toEqual({ result: "fix_fields" });
    const ra = await approvalsPOST(json("approvals", { fields: "x" }));
    expect(ra.status).toBe(400);
    expect(await ra.json()).toEqual({ ok: false });
  });

  test("extract rejects non-PDF and unknown sample", async () => {
    const fd = new FormData();
    fd.set("file", new File(["hello"], "a.pdf", { type: "application/pdf" }));
    const r1 = await extractPOST(new Request("http://x/api/extract", { method: "POST", body: fd }));
    expect(r1.status).toBe(400);
    expect((await r1.json()).code).toBe("not_pdf");
    const fd2 = new FormData();
    fd2.set("sample", "nope.pdf");
    const r2 = await extractPOST(new Request("http://x/api/extract", { method: "POST", body: fd2 }));
    expect(r2.status).toBe(400);
    expect((await r2.json()).code).toBe("unknown_sample");
  });

  describe("stage mode", () => {
    const env = { stage: process.env.DEREK_STAGE, groq: process.env.GROQ_API_KEY };
    const realFetch = globalThis.fetch;
    afterEach(() => {
      if (env.stage === undefined) delete process.env.DEREK_STAGE; else process.env.DEREK_STAGE = env.stage;
      if (env.groq === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = env.groq;
      globalThis.fetch = realFetch;
    });
    test("stage mode never calls the network", async () => {
      process.env.DEREK_STAGE = "1";
      process.env.GROQ_API_KEY = "fake";
      globalThis.fetch = (() => { throw new Error("network call in stage mode"); }) as typeof fetch;
      const fd = new FormData();
      fd.set("sample", "01_dala_obychnyj.pdf");
      const r = await extractPOST(new Request("http://x/api/extract", { method: "POST", body: fd }));
      expect(r.status).toBe(200);
      const j = await r.json();
      expect(j.fields.bin).toBe(DALA.bin);
      expect(j.fields.iban).not.toBe("");
      expect(j.extraction.mode).toBe("local");
    });
  });
});
