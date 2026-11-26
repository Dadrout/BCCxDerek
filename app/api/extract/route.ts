import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { extract, pdfText } from "@/lib/extract";
import type { Extraction } from "@/lib/types";
import { SCENARIOS } from "@/lib/scenarios";
import { looksLikeEml, parseEml } from "@/lib/email/parse";
import { findPressure } from "@/lib/email/pressure";
import type { EmailView } from "@/lib/email/types";
import type { PaymentFields } from "@/lib/signals/validate";
import type { DocumentHints } from "@/lib/signals/types";
import { compareWithContract, type ContractDoc } from "@/lib/contract/compare";
import { getBank } from "@/lib/bank/store";
import { DEMO_CLIENT } from "@/lib/bank/fixtures";
import { domainOf, sameOrg } from "@/lib/email/domains";
import type { Contract } from "@/lib/bank/types";

export const runtime = "nodejs";

const MAX_BYTES = 15 * 1024 * 1024;
const MAX_EMAIL_TEXT = 6000;
const MAX_INVOICE_TEXT = 6000;
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

// Договор клиента с поставщиком: сначала по БИН из счёта, для письма — ещё по домену отправителя.
function findContract(bin: string, senderAddress?: string): Contract | undefined {
  const contracts = getBank().contracts.filter((c) => c.clientBin === DEMO_CLIENT.bin);
  const byBin = bin ? contracts.find((c) => c.supplierBin === bin) : undefined;
  if (byBin) return byBin;
  const sender = senderAddress ? domainOf(senderAddress) : "";
  if (!sender) return undefined;
  return contracts.find((c) => c.email && sameOrg(sender, domainOf(c.email)));
}

// Сравнение документов с платёжными пунктами договора. Без договора или без текста сравнения нет.
async function contractCheck(bin: string, docs: ContractDoc[], senderAddress?: string) {
  const contract = findContract(bin, senderAddress);
  const nonEmpty = docs.filter((d) => d.text.trim() !== "");
  if (!contract || nonEmpty.length === 0) return { hint: null, panel: null };
  const { conflicts, mode } = await compareWithContract(nonEmpty, contract.paymentTerms);
  return {
    hint: { supplierBin: contract.supplierBin, conflicts, mode },
    // Данные для панели договора на экране.
    panel: { person: contract.person, source: contract.source, paymentTerms: contract.paymentTerms },
  };
}

// Текст счёта: сбой чтения PDF не должен ронять проверку.
const invoiceText = (pdf: Buffer) => pdfText(pdf).then((t) => t.slice(0, MAX_INVOICE_TEXT)).catch(() => "");

async function handleEmail(buf: Buffer) {
  let parsed;
  try {
    parsed = await parseEml(buf);
  } catch {
    return NextResponse.json({ error: "Не удалось прочитать письмо", code: "bad_email" }, { status: 400 });
  }
  const text = parsed.text.slice(0, MAX_EMAIL_TEXT);
  // Если во вложении есть PDF, чтение счёта и поиск давления идут параллельно.
  const [{ items, mode }, extraction, pdfBody] = await Promise.all([
    findPressure(text),
    parsed.pdf ? extract(parsed.pdf.content) : Promise.resolve(null),
    parsed.pdf ? invoiceText(parsed.pdf.content) : Promise.resolve(""),
  ]);
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
  if (!parsed.pdf || !extraction) {
    // Письма без счёта во вложении — не ошибка сервера: экран покажет, что читать нечего.
    const hints: DocumentHints = { changeRequestText: null, phoneInDocument: null, email: emailHints };
    return NextResponse.json({ fields: { ...EMPTY_FIELDS }, hints, extraction: null, email, pdfBase64: null, contract: null, code: "no_pdf_in_email" });
  }
  const { fields, hints } = fromExtraction(extraction);
  const { hint, panel } = await contractCheck(fields.bin, [{ source: "invoice", text: pdfBody }, { source: "email", text }], parsed.fromAddress);
  return NextResponse.json({
    fields,
    hints: { ...hints, email: emailHints, contract: hint },
    contract: panel,
    extraction,
    email,
    pdfBase64: parsed.pdf.content.toString("base64"),
    // Имя вложения — для заголовка над счётом на экране.
    pdfName: parsed.pdf.filename,
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
    // Чтение полей и текста счёта идут параллельно.
    const [extraction, bodyText] = await Promise.all([extract(buf), invoiceText(buf)]);
    const { fields, hints } = fromExtraction(extraction);
    const { hint, panel } = await contractCheck(fields.bin, [{ source: "invoice", text: bodyText }]);
    return NextResponse.json({ fields, hints: { ...hints, contract: hint }, extraction, contract: panel });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
