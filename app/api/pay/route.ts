import { NextResponse } from "next/server";
import { runCheck, readBody } from "@/lib/signals/run";
import { fingerprint } from "@/lib/signals/engine";
import { DEMO_CLIENT } from "@/lib/bank/fixtures";

export const runtime = "nodejs";

// Сервер заново проверяет платёж и не доверяет вердикту клиента.
export async function POST(req: Request) {
  try {
    const b = await readBody(req);
    if (!b) return NextResponse.json({ result: "fix_fields" }, { status: 400 });
    const body = { fingerprint: b.body.fingerprint, acknowledged: b.body.acknowledged === true };
    const { outcome, parsed } = runCheck(b.fields, b.hints);
    if (outcome.kind === "fix_fields" || !parsed) return NextResponse.json({ result: "fix_fields" }, { status: 400 });
    if (body.fingerprint !== fingerprint(DEMO_CLIENT.bin, parsed)) return NextResponse.json({ result: "needs_recheck" }, { status: 409 });
    if (outcome.verdict === "stop") return NextResponse.json({ result: "blocked" }, { status: 403 });
    if (outcome.verdict === "check" && !body.acknowledged) return NextResponse.json({ result: "needs_ack" }, { status: 409 });
    return NextResponse.json({ result: "sent" });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
