import { NextResponse } from "next/server";
import { check } from "@/lib/check";
import { explainRisk, hasGroq, GROQ_MODEL } from "@/lib/groq";
import type { Extraction } from "@/lib/types";
import type { Lang } from "@/lib/i18n";

export const runtime = "nodejs";

// Клиент присылает извлечённые реквизиты. Сверку сервер повторяет сам, чтобы ИИ объяснял настоящий результат.
export async function POST(req: Request) {
  if (!hasGroq()) return NextResponse.json({ text: null, code: "offline" });
  try {
    const { extraction, lang } = (await req.json()) as { extraction: Extraction; lang: Lang };
    const l: Lang = ["ru", "kk", "en"].includes(lang) ? lang : "ru";
    const result = check(extraction, l);
    const text = await explainRisk(result, l);
    return NextResponse.json({ text, model: GROQ_MODEL() });
  } catch (e) {
    return NextResponse.json({ text: null, code: "failed", error: (e as Error).message });
  }
}
