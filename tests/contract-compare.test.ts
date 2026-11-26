import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { compareLocal, compareWithContract, verifyConflicts, CONFLICT_KINDS } from "@/lib/contract/compare";
import { DALA_CONTRACT } from "@/lib/bank/fixtures";

const TERMS = DALA_CONTRACT.paymentTerms;
const EMAIL = "Добрый день! В этот раз просим направить нашему партнёру ТОО «Арна Карго», счёт во вложении.";
const INVOICE = "Счёт № 5. Просим оплачивать по новым реквизитам.";
const DOCS = [{ source: "email" as const, text: EMAIL }];

const groqReply = (conflicts: unknown) => ({
  ok: true,
  status: 200,
  json: async () => ({ choices: [{ message: { content: JSON.stringify({ conflicts }) } }] }),
  text: async () => "",
});

beforeEach(() => {
  // Никогда не ходим в реальную сеть, даже если .env.local содержит ключ.
  vi.stubEnv("GROQ_API_KEY", "");
  vi.stubEnv("DEREK_STAGE", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("compareLocal", () => {
  it("третье лицо: партнёр и пункт 4.3", () => {
    const r = compareLocal(DOCS, TERMS);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ kind: "third_party", source: "email", clause: "4.3", contractQuote: TERMS[2].text });
    expect(r[0].docQuote).toContain("нашему партнёру");
  });
  it("смена реквизитов и пункт 4.2", () => {
    const r = compareLocal([{ source: "invoice", text: INVOICE }], TERMS);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ kind: "details_change", source: "invoice", clause: "4.2", contractQuote: TERMS[1].text });
  });
  it("нейтральный текст даёт пустой список", () => {
    expect(compareLocal([{ source: "email", text: "Счёт во вложении, оплата по договору." }], TERMS)).toEqual([]);
  });
  it("без подходящего пункта договора ничего не находит", () => {
    expect(compareLocal(DOCS, [TERMS[0]])).toEqual([]);
  });
  it("CONFLICT_KINDS", () => {
    expect(CONFLICT_KINDS).toEqual(["details_change", "third_party"]);
  });
});

describe("verifyConflicts", () => {
  const ok = { kind: "third_party", source: "email", docQuote: "направить нашему партнёру", clause: "4.3", contractQuote: TERMS[2].text };
  it("оставляет верную пару с другим регистром и пробелами", () => {
    const out = verifyConflicts(DOCS, TERMS, [
      { ...ok, docQuote: "НАПРАВИТЬ   нашему\nпартнёру", contractQuote: "Оплата третьим   лицам по настоящему ДОГОВОРУ не допускается." },
    ]);
    expect(out).toHaveLength(1);
  });
  it("отбрасывает перефразированную цитату договора", () => {
    expect(verifyConflicts(DOCS, TERMS, [{ ...ok, contractQuote: "Платить третьим лицам нельзя совсем" }])).toEqual([]);
  });
  it("отбрасывает цитату из чужого пункта", () => {
    expect(verifyConflicts(DOCS, TERMS, [{ ...ok, clause: "4.2" }])).toEqual([]);
  });
  it("отбрасывает цитату, которой нет в документе", () => {
    expect(verifyConflicts(DOCS, TERMS, [{ ...ok, docQuote: "перечислите деньги на карту" }])).toEqual([]);
    expect(verifyConflicts(DOCS, TERMS, [{ ...ok, source: "invoice" }])).toEqual([]);
  });
  it("отбрасывает неизвестный вид и мусор", () => {
    expect(verifyConflicts(DOCS, TERMS, [{ ...ok, kind: "fraud" }, null, 5, "x", { ...ok, docQuote: 1 }])).toEqual([]);
  });
  it("не больше одной пары на вид, цитата не короче 8 символов", () => {
    expect(verifyConflicts(DOCS, TERMS, [ok, ok])).toHaveLength(1);
    expect(verifyConflicts(DOCS, TERMS, [{ ...ok, docQuote: "счёт" }])).toEqual([]);
  });
});

describe("compareWithContract", () => {
  it("в режиме стенда не обращается к сети", async () => {
    vi.stubEnv("DEREK_STAGE", "1");
    vi.stubEnv("GROQ_API_KEY", "test-key");
    const spy = vi.spyOn(globalThis, "fetch");
    const r = await compareWithContract(DOCS, TERMS);
    expect(r.mode).toBe("local");
    expect(r.conflicts).toHaveLength(1);
    expect(spy).not.toHaveBeenCalled();
  });
  it("без ключа — локально", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    expect((await compareWithContract(DOCS, TERMS)).mode).toBe("local");
    expect(spy).not.toHaveBeenCalled();
  });
  it("ответ ИИ: верная пара остаётся, выдуманная отбрасывается", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-key");
    const good = { kind: "third_party", source: "email", docQuote: "направить нашему партнёру", clause: "4.3", contractQuote: TERMS[2].text };
    const bad = { kind: "details_change", source: "email", docQuote: "новые реквизиты банка", clause: "4.2", contractQuote: TERMS[1].text };
    vi.stubGlobal("fetch", vi.fn(async () => groqReply([good, bad])));
    const r = await compareWithContract(DOCS, TERMS);
    expect(r.mode).toBe("ai");
    expect(r.conflicts).toHaveLength(1);
    expect(r.conflicts[0].kind).toBe("third_party");
  });
  it("ошибка сети — локально", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("сеть"); }));
    const r = await compareWithContract(DOCS, TERMS);
    expect(r.mode).toBe("local");
    expect(r.conflicts).toHaveLength(1);
  });
  it("ответ не JSON — локально", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "не json" } }] }), text: async () => "" })));
    expect((await compareWithContract(DOCS, TERMS)).mode).toBe("local");
  });
});
