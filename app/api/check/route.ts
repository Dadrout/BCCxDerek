import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { extract } from "@/lib/extract";
import { check } from "@/lib/check";
import { SAMPLES } from "@/lib/registry";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const sample = form.get("sample");
    let buf: Buffer;
    if (typeof sample === "string") {
      if (!SAMPLES.some((s) => s.file === sample)) return NextResponse.json({ error: "Неизвестный пример", code: "unknown_sample" }, { status: 400 });
      buf = await readFile(path.join(process.cwd(), "public", "samples", sample));
    } else {
      const file = form.get("file");
      if (!(file instanceof File)) return NextResponse.json({ error: "Файл не передан", code: "no_file" }, { status: 400 });
      if (file.size > 15 * 1024 * 1024) return NextResponse.json({ error: "Файл больше 15 МБ", code: "too_big" }, { status: 400 });
      buf = Buffer.from(await file.arrayBuffer());
      if (buf.subarray(0, 5).toString() !== "%PDF-") return NextResponse.json({ error: "Нужен PDF-файл", code: "not_pdf" }, { status: 400 });
    }
    const extraction = await extract(buf);
    return NextResponse.json(check(extraction));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
