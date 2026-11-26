import { NextResponse } from "next/server";
import { runCheck } from "@/lib/signals/run";
import { fingerprint } from "@/lib/signals/engine";
import { DEMO_CLIENT } from "@/lib/bank/fixtures";
import type { PaymentFields } from "@/lib/signals/validate";
import type { DocumentHints } from "@/lib/signals/types";

export const runtime = "nodejs";

// Сервер заново проверяет платёж и не доверяет вердикту клиента.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { fields: PaymentFields; hints?: DocumentHints; fingerprint: string; acknowledged?: boolean };
    const { outcome, parsed } = runCheck(body.fields, body.hints);
    if (outcome.kind === "fix_fields" || !parsed) return NextResponse.json({ result: "fix_fields" }, { status: 400 });
    if (body.fingerprint !== fingerprint(DEMO_CLIENT.bin, parsed)) return NextResponse.json({ result: "needs_recheck" }, { status: 409 });
    if (outcome.verdict === "stop") return NextResponse.json({ result: "blocked" }, { status: 403 });
    if (outcome.verdict === "check" && !body.acknowledged) return NextResponse.json({ result: "needs_ack" }, { status: 409 });
    return NextResponse.json({ result: "sent" });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
