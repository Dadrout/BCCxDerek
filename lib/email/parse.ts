import PostalMime from "postal-mime";
import type { AuthResult, ParsedEmail } from "./types";

// Результат одного механизма из заголовка Authentication-Results.
function authOf(header: string, name: string): AuthResult {
  const m = header.match(new RegExp(String.raw`\b${name}\s*=\s*([a-z]+)`, "i"));
  if (!m) return "none";
  const v = m[1].toLowerCase();
  if (v === "pass") return "pass";
  if (v === "fail" || v === "softfail") return "fail";
  return "none";
}

function stripTags(html: string): string {
  return html
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function toBuffer(c: ArrayBuffer | Uint8Array | string): Buffer {
  if (typeof c === "string") return Buffer.from(c, "binary");
  return Buffer.from(c instanceof Uint8Array ? c : new Uint8Array(c));
}

export async function parseEml(buf: Buffer): Promise<ParsedEmail> {
  const e = await PostalMime.parse(buf);
  const authHeader = e.headers.find((h) => h.key === "authentication-results")?.value ?? "";
  // Берём первое вложение, которое PDF по типу или имени И по содержимому (%PDF-): мусор пропускаем.
  const att = e.attachments
    .filter((a) => a.mimeType === "application/pdf" || (a.filename ?? "").toLowerCase().endsWith(".pdf"))
    .find((a) => toBuffer(a.content).subarray(0, 5).toString("latin1") === "%PDF-");
  const text = e.text?.trim() ? e.text.trim() : e.html ? stripTags(e.html) : "";
  return {
    fromAddress: (e.from?.address ?? "").toLowerCase(),
    fromName: e.from?.name ?? "",
    replyTo: e.replyTo?.[0]?.address?.toLowerCase() ?? null,
    subject: e.subject ?? "",
    date: e.date ?? null,
    text,
    auth: {
      spf: authOf(authHeader, "spf"),
      dkim: authOf(authHeader, "dkim"),
      dmarc: authOf(authHeader, "dmarc"),
    },
    pdf: att ? { filename: att.filename ?? "attachment.pdf", content: toBuffer(att.content) } : null,
  };
}

/** Похоже на .eml: в первых 8 КБ есть строка заголовка From:, и это не PDF. */
export function looksLikeEml(buf: Buffer): boolean {
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") return false;
  return /^From:/im.test(buf.subarray(0, 8192).toString("latin1"));
}
