import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findPressure, findPressureLocal, verifyQuotes, PRESSURE_KINDS } from "@/lib/email/pressure";

const DEMO =
  "Добрый день! В связи со сменой банка просим оплатить счёт по новым реквизитам сегодня до конца дня. Бухгалтер в отпуске, по телефону не дозвониться, пишите только сюда.";

const groqReply = (items: unknown) => ({
  ok: true,
  status: 200,
  json: async () => ({ choices: [{ message: { content: JSON.stringify({ items }) } }] }),
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

describe("findPressureLocal", () => {
  it("находит срочность, запрет звонить и новые реквизиты", () => {
    const kinds = findPressureLocal(DEMO).map((p) => p.kind);
    expect(kinds).toEqual(expect.arrayContaining(["urgency", "no_call", "new_details"]));
    expect(new Set(kinds).size).toBe(kinds.length);
  });
  it("нейтральный текст даёт пустой список", () => {
    expect(findPressureLocal("Счёт во вложении. Спасибо.")).toEqual([]);
  });
  it("цитата — предложение с совпадением, до 160 символов", () => {
    const q = findPressureLocal(DEMO).find((p) => p.kind === "no_call")!.quote;
    expect(q).toBe("Бухгалтер в отпуске, по телефону не дозвониться, пишите только сюда");
    const long = "Срочно " + "а".repeat(400);
    expect(findPressureLocal(long)[0].quote.length).toBe(160);
  });
  it("казахские фразы", () => {
    expect(findPressureLocal("Бүгін төлеңіз. Қоңырау шалмаңыз.").map((p) => p.kind).sort()).toEqual(["no_call", "urgency"]);
  });
  it("обычное письмо без давления не даёт находок", () => {
    expect(findPressureLocal("Счёт выставлен сегодня. Генеральный директор Ахметов Е.С.")).toEqual([]);
  });
  it("PRESSURE_KINDS экспортирован", () => {
    expect(PRESSURE_KINDS).toEqual(["urgency", "no_call", "new_details", "secrecy", "authority"]);
  });
});

describe("verifyQuotes", () => {
  it("отбрасывает выдуманную цитату и оставляет настоящую с другим регистром и пробелами", () => {
    const out = verifyQuotes(DEMO, [
      { kind: "urgency", quote: "оплатить   СЧЁТ по новым\nреквизитам" },
      { kind: "secrecy", quote: "никому не говорите" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe("urgency");
  });
  it("отбрасывает слишком короткую цитату", () => {
    expect(verifyQuotes(DEMO, [{ kind: "urgency", quote: "счёт" }])).toEqual([]);
    expect(verifyQuotes(DEMO, [{ kind: "urgency", quote: "сег" }])).toEqual([]);
  });
  it("не больше одной на тип", () => {
    const out = verifyQuotes(DEMO, [
      { kind: "urgency", quote: "сегодня" },
      { kind: "urgency", quote: "до конца дня" },
    ]);
    expect(out).toHaveLength(1);
  });
});

describe("findPressure", () => {
  it("в режиме стенда не обращается к сети", async () => {
    vi.stubEnv("DEREK_STAGE", "1");
    vi.stubEnv("GROQ_API_KEY", "test-key");
    const spy = vi.spyOn(globalThis, "fetch");
    const r = await findPressure(DEMO);
    expect(r.mode).toBe("local");
    expect(spy).not.toHaveBeenCalled();
  });
  it("без ключа — локально", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    expect((await findPressure(DEMO)).mode).toBe("local");
    expect(spy).not.toHaveBeenCalled();
  });
  it("ИИ: оставляет только дословную цитату", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-key");
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      groqReply([
        { kind: "urgency", quote: "сегодня до конца дня" },
        { kind: "secrecy", quote: "это тайна" },
      ]) as unknown as Response,
    );
    const r = await findPressure(DEMO);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(r.mode).toBe("ai");
    expect(r.items).toEqual([{ kind: "urgency", quote: "сегодня до конца дня" }]);
  });
  it.each([["не JSON", "это не json"], ["пустой объект", "{}"]])("ИИ вернул %s — локально", async (_n, content) => {
    vi.stubEnv("GROQ_API_KEY", "test-key");
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content } }] }),
      text: async () => "",
    } as unknown as Response);
    expect((await findPressure(DEMO)).mode).toBe("local");
  });
  it("ошибка сети — локально", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-key");
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("boom"));
    const r = await findPressure(DEMO);
    expect(r.mode).toBe("local");
    expect(r.items.length).toBeGreaterThan(0);
  });
});
