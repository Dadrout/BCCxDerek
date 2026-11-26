import { NextResponse } from "next/server";
import { runCheck, readBody } from "@/lib/signals/run";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const b = await readBody(req);
    if (!b) return NextResponse.json({ kind: "fix_fields", errors: [] }, { status: 400 });
    return NextResponse.json(runCheck(b.fields, b.hints).outcome);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
