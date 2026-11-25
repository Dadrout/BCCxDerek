import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { extractText, getDocumentProxy } from "unpdf";
import type { Extraction, Field } from "./types";

const FieldSchema = z.object({
  value: z.string().nullable(),
  fragment: z.string().nullable(),
  confidence: z.enum(["high", "medium", "low"]),
});

const ExtractionSchema = z.object({
  readable: z.boolean(),
  supplier_name: FieldSchema,
  bin: FieldSchema,
  iban: FieldSchema,
  bank_name: FieldSchema,
  amount: FieldSchema,
  invoice_number: FieldSchema,
  phone_in_document: FieldSchema,
  change_request_text: z.string().nullable(),
});

const PROMPT = `Ты извлекаешь реквизиты ПОЛУЧАТЕЛЯ платежа (поставщика) из счёта на оплату. Документ может быть на русском или казахском, с любой вёрсткой, иногда это скан.

Для каждого поля верни:
- value: значение ровно как в документе (для IBAN/ИИК — посимвольно, без исправлений);
- fragment: дословная строка документа, из которой взято значение (чтобы бухгалтер мог сверить глазами);
- confidence: high / medium / low — насколько уверенно ты прочитал КАЖДЫЙ символ.

Правила:
- Поставщик — тот, кто выставил счёт и получает деньги (бенефициар), а не покупатель.
- bin — 12-значный БИН/ИИН поставщика.
- iban — ИИК/IBAN получателя (в Казахстане начинается с KZ, 20 символов). Если какой-то символ нельзя прочитать уверенно, поставь вместо него «?». Никогда не угадывай и не достраивай цифры.
- amount — итоговая сумма к оплате, только число в тенге (например «840000»).
- phone_in_document — телефон, указанный в самом счёте.
- change_request_text — дословный текст, если в документе просят платить по новым/изменённым реквизитам, иначе null.
- readable = false, если документ в целом не читается (сильно размыт, пустой, не счёт).
- Если поля нет, value и fragment = null, confidence = "low".`;

export async function extractWithClaude(pdf: Buffer): Promise<Extraction> {
  const client = new Anthropic();
  const response = await client.messages.parse({
    model: process.env.CLAUDE_MODEL || "claude-opus-5-5",
    max_tokens: 4000,
    output_config: { effort: "low", format: zodOutputFormat(ExtractionSchema) },
    messages: [
      {
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdf.toString("base64") } },
          { type: "text", text: PROMPT },
        ],
      },
    ],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error("Модель не вернула структурированный ответ");
  }
  return { mode: "claude", ...response.parsed_output };
}

// Локальный режим без ключа API: текстовый слой PDF + регулярные выражения.
// Сканы без текстового слоя здесь честно считаются нечитаемыми.
const empty = (): Field => ({ value: null, fragment: null, confidence: "low" });

function lineOf(text: string, idx: number): string {
  const start = text.lastIndexOf("\n", idx) + 1;
  const end = text.indexOf("\n", idx);
  return text.slice(start, end === -1 ? undefined : end).trim();
}

function find(text: string, re: RegExp, group = 1): Field {
  const m = re.exec(text);
  if (!m) return empty();
  return { value: m[group].trim(), fragment: lineOf(text, m.index), confidence: "high" };
}

export async function extractLocally(pdf: Buffer): Promise<Extraction> {
  const doc = await getDocumentProxy(new Uint8Array(pdf));
  const { text: pages } = await extractText(doc, { mergePages: false });
  const text = (pages as string[]).join("\n");
  const readable = text.replace(/\s/g, "").length > 40;

  // Пропускаем строку покупателя, чтобы не взять его БИН
  const supplierPart = text.split(/Покупатель/i)[0];

  const res: Extraction = {
    mode: "local",
    readable,
    supplier_name: find(supplierPart, /((?:ТОО|АО|ИП)\s*«[^»]+»)/),
    bin: find(supplierPart, /БИН[:\s]*(\d{12})/),
    iban: find(supplierPart, /(KZ\d{2}(?:\s?[0-9A-Z]){16})/),
    bank_name: find(supplierPart, /Банк бенефициара:\s*(.+?)(?:\s{2,}|БИК|$)/m),
    amount: find(text, /Итого к оплате:\s*([\d\s]+)\s*₸/),
    invoice_number: find(text, /№\s*([A-ZА-Я]{1,3}-\d+)/),
    phone_in_document: find(supplierPart, /Тел\.?:\s*([+\d\s()-]{10,})/),
    change_request_text: /нов(ым|ые|ых)\s+реквизит/i.test(text) ? lineOf(text, text.search(/нов(ым|ые|ых)\s+реквизит/i)) : null,
  };
  if (res.amount.value) res.amount.value = res.amount.value.replace(/\s/g, "");
  if (!readable) res.warning = "В PDF нет текстового слоя (скан). Для распознавания сканов нужен режим Claude (ANTHROPIC_API_KEY).";
  return res;
}

export async function extract(pdf: Buffer): Promise<Extraction> {
  if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) {
    try {
      return await extractWithClaude(pdf);
    } catch (e) {
      const local = await extractLocally(pdf);
      local.warning = `Claude недоступен (${(e as Error).message}). Использован локальный разбор.` + (local.warning ? " " + local.warning : "");
      return local;
    }
  }
  return extractLocally(pdf);
}
