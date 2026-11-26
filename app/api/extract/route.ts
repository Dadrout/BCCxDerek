import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { extract } from "@/lib/extract";
import { SCENARIOS } from "@/lib/scenarios";
import type { PaymentFields } from "@/lib/signals/validate";
import type { DocumentHints } from "@/lib/signals/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const sample = form.get("sample");
    let buf: Buffer;
    if (typeof sample === "string") {
      if (!SCENARIOS.some((s) => s.sample === sample)) return NextResponse.json({ error: "Неизвестный пример", code: "unknown_sample" }, { status: 400 });
      buf = await readFile(path.join(process.cwd(), "public", "samples", sample));
    } else {
      const file = form.get("file");
      if (!(file instanceof File)) return NextResponse.json({ error: "Файл не передан", code: "no_file" }, { status: 400 });
      if (file.size > 15 * 1024 * 1024) return NextResponse.json({ error: "Файл больше 15 МБ", code: "too_big" }, { status: 400 });
      buf = Buffer.from(await file.arrayBuffer());
      if (buf.subarray(0, 5).toString() !== "%PDF-") return NextResponse.json({ error: "Нужен PDF-файл", code: "not_pdf" }, { status: 400 });
    }
    const extraction = await extract(buf);
    const invoice = extraction.invoice_number.value;
    const fields: PaymentFields = {
      name: extraction.supplier_name.value ?? "",
      bin: extraction.bin.value ?? "",
      iban: extraction.iban.value ?? "",
      amount: extraction.amount.value ?? "",
      purpose: invoice ? "Оплата по счёту № " + invoice : "",
    };
    const hints: DocumentHints = {
      changeRequestText: extraction.change_request_text,
      phoneInDocument: extraction.phone_in_document.value,
    };
    return NextResponse.json({ fields, hints, extraction });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
