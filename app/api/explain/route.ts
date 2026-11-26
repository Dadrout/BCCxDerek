import { NextResponse } from "next/server";
import { runCheck, readBody } from "@/lib/signals/run";
import { explainRisk, hasGroq, GROQ_MODEL } from "@/lib/groq";
import type { Lang } from "@/lib/i18n";

export const runtime = "nodejs";

// Клиент присылает поля. Проверку сервер повторяет сам, чтобы ИИ объяснял настоящий результат.
export async function POST(req: Request) {
  if (!hasGroq()) return NextResponse.json({ text: null, code: "offline" });
  try {
    const b = await readBody(req);
    if (!b) return NextResponse.json({ text: null, code: "failed" }, { status: 400 });
    const lang = b.body.lang as Lang;
    const l: Lang = ["ru", "kk", "en"].includes(lang) ? lang : "ru";
    const { outcome } = runCheck(b.fields, b.hints);
    if (outcome.kind !== "verdict") return NextResponse.json({ text: null, code: "failed", error: "fix_fields" });
    const text = await explainRisk(outcome, l);
    return NextResponse.json({ text, model: GROQ_MODEL() });
  } catch (e) {
    return NextResponse.json({ text: null, code: "failed", error: (e as Error).message });
  }
}
