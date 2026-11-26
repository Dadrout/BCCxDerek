import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { extract } from "@/lib/extract";
import type { Extraction } from "@/lib/types";
import { SCENARIOS } from "@/lib/scenarios";
import { looksLikeEml, parseEml } from "@/lib/email/parse";
import { findPressure } from "@/lib/email/pressure";
import type { EmailView } from "@/lib/email/types";
import type { PaymentFields } from "@/lib/signals/validate";
import type { DocumentHints } from "@/lib/signals/types";

export const runtime = "nodejs";

const MAX_BYTES = 15 * 1024 * 1024;
const MAX_EMAIL_TEXT = 6000;
const EMPTY_FIELDS: PaymentFields = { name: "", bin: "", iban: "", amount: "", purpose: "" };

// Результат чтения PDF → поля платежа и подсказки документа (общее для PDF и вложения письма).
function fromExtraction(extraction: Extraction): { fields: PaymentFields; hints: DocumentHints } {
  const invoice = extraction.invoice_number.value;
  return {
    fields: {
      name: extraction.supplier_name.value ?? "",
      bin: extraction.bin.value ?? "",
      iban: extraction.iban.value ?? "",
      amount: extraction.amount.value ?? "",
      purpose: invoice ? "Оплата по счёту № " + invoice : "",
    },
    hints: {
      changeRequestText: extraction.change_request_text,
      phoneInDocument: extraction.phone_in_document.value,
    },
  };
}

async function handleEmail(buf: Buffer) {
  let parsed;
  try {
    parsed = await parseEml(buf);
  } catch {
    return NextResponse.json({ error: "Не удалось прочитать письмо", code: "bad_email" }, { status: 400 });
  }
  const text = parsed.text.slice(0, MAX_EMAIL_TEXT);
  const { items, mode } = await findPressure(text);
  const email: EmailView = {
    fromName: parsed.fromName,
    fromAddress: parsed.fromAddress,
    replyTo: parsed.replyTo,
    subject: parsed.subject,
    date: parsed.date,
    text,
    auth: parsed.auth,
    pressure: items,
    pressureMode: mode,
  };
  const emailHints = {
    fromAddress: parsed.fromAddress,
    replyTo: parsed.replyTo,
    authFailed: Object.values(parsed.auth).some((v) => v === "fail"),
    pressure: items,
  };
  if (!parsed.pdf) {
    // Письма без счёта во вложении — не ошибка сервера: экран покажет, что читать нечего.
    const hints: DocumentHints = { changeRequestText: null, phoneInDocument: null, email: emailHints };
    return NextResponse.json({ fields: { ...EMPTY_FIELDS }, hints, extraction: null, email, pdfBase64: null, code: "no_pdf_in_email" });
  }
  const extraction = await extract(parsed.pdf.content);
  const { fields, hints } = fromExtraction(extraction);
  return NextResponse.json({
    fields,
    hints: { ...hints, email: emailHints },
    extraction,
    email,
    pdfBase64: parsed.pdf.content.toString("base64"),
  });
}

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
      if (file.size > MAX_BYTES) return NextResponse.json({ error: "Файл больше 15 МБ", code: "too_big" }, { status: 400 });
      buf = Buffer.from(await file.arrayBuffer());
      if (buf.subarray(0, 5).toString() !== "%PDF-" && !looksLikeEml(buf)) return NextResponse.json({ error: "Нужен PDF-файл или письмо .eml", code: "not_pdf" }, { status: 400 });
    }
    if (buf.subarray(0, 5).toString() !== "%PDF-") return await handleEmail(buf);
    const extraction = await extract(buf);
    const { fields, hints } = fromExtraction(extraction);
    return NextResponse.json({ fields, hints, extraction });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
