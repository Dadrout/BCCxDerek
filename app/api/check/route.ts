import { NextResponse } from "next/server";
import { runCheck } from "@/lib/signals/run";
import type { PaymentFields } from "@/lib/signals/validate";
import type { DocumentHints } from "@/lib/signals/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { fields, hints } = (await req.json()) as { fields: PaymentFields; hints?: DocumentHints };
    return NextResponse.json(runCheck(fields, hints).outcome);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
