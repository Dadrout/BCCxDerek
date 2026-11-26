import { NextResponse } from "next/server";
import { addApproval, resetApprovals } from "@/lib/bank/approvals";
import { DEMO_CLIENT } from "@/lib/bank/fixtures";
import { DEMO_TODAY } from "@/lib/demo";
import { parsePayment } from "@/lib/signals/validate";
import { readBody } from "@/lib/signals/run";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const b = await readBody(req);
    if (!b) return NextResponse.json({ ok: false }, { status: 400 });
    const r = parsePayment(b.fields);
    if (!r.ok) return NextResponse.json({ ok: false, errors: r.errors }, { status: 400 });
    addApproval({
      clientBin: DEMO_CLIENT.bin,
      bin: r.value.bin,
      iban: r.value.iban,
      approvedAt: DEMO_TODAY,
      approvedBy: "Сапарова А.К., главный бухгалтер",
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    resetApprovals();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
