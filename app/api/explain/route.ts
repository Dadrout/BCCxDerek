import { NextResponse } from "next/server";
import { runCheck } from "@/lib/signals/run";
import { explainRisk, hasGroq, GROQ_MODEL } from "@/lib/groq";
import type { PaymentFields } from "@/lib/signals/validate";
import type { DocumentHints } from "@/lib/signals/types";
import type { Lang } from "@/lib/i18n";

export const runtime = "nodejs";

// Клиент присылает поля. Проверку сервер повторяет сам, чтобы ИИ объяснял настоящий результат.
export async function POST(req: Request) {
  if (!hasGroq()) return NextResponse.json({ text: null, code: "offline" });
  try {
    const { fields, hints, lang } = (await req.json()) as { fields: PaymentFields; hints?: DocumentHints; lang: Lang };
    const l: Lang = ["ru", "kk", "en"].includes(lang) ? lang : "ru";
    const { outcome } = runCheck(fields, hints);
    if (outcome.kind !== "verdict") return NextResponse.json({ text: null, code: "failed", error: "fix_fields" });
    const text = await explainRisk(outcome, l);
    return NextResponse.json({ text, model: GROQ_MODEL() });
  } catch (e) {
    return NextResponse.json({ text: null, code: "failed", error: (e as Error).message });
  }
}
