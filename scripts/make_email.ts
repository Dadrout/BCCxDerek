// Собирает синтетическое демо-письмо public/samples/05_dala_pismo.eml (со счётом 05 во вложении).
// Запуск: node scripts/make_email.ts  (сначала python scripts/make_invoices.py 05).
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SAMPLES = join(import.meta.dirname, "..", "public", "samples");
const PDF_NAME = "05_dala_schet_drugoj_bank.pdf";

const b64 = (b: Buffer | string): string => Buffer.from(b).toString("base64");
// Строка base64 с переносами по 76 символов (RFC 2045).
const wrap76 = (s: string): string => s.match(/.{1,76}/g)?.join("\r\n") ?? "";
// RFC 2047: слово в кодировке UTF-8 + base64.
const word = (s: string): string => `=?UTF-8?B?${b64(s)}?=`;

const body = [
  "Добрый день!",
  "",
  "В связи со сменой банка просим оплатить счёт по новым реквизитам сегодня до конца дня. Бухгалтер в отпуске, по телефону не дозвониться, пишите только сюда.",
  "",
  "Счёт ДТ-1201 во вложении.",
  "",
  "С уважением,",
  "Бухгалтерия ТОО «Дала Транс Логистик»",
  "",
].join("\r\n");

const boundary = "----=_Derek_Demo_05";
const pdf = readFileSync(join(SAMPLES, PDF_NAME));

const lines = [
  `From: ${word("Дала Транс Логистик")} <buh@dalatrans-kz.com>`,
  "To: buh@shanyrak.kz",
  `Subject: ${word("Счёт ДТ-1201 — новые реквизиты")}`,
  "Date: Wed, 09 Dec 2026 10:42:00 +0500",
  "Message-ID: <demo-05@dalatrans-kz.com>",
  "Authentication-Results: mx.bcc.kz; spf=pass smtp.mailfrom=dalatrans-kz.com; dkim=pass header.d=dalatrans-kz.com; dmarc=pass",
  "X-Derek-Demo: synthetic",
  "MIME-Version: 1.0",
  `Content-Type: multipart/mixed; boundary="${boundary}"`,
  "",
  `--${boundary}`,
  "Content-Type: text/plain; charset=UTF-8",
  "Content-Transfer-Encoding: base64",
  "",
  wrap76(b64(body)),
  `--${boundary}`,
  `Content-Type: application/pdf; name="${PDF_NAME}"`,
  "Content-Transfer-Encoding: base64",
  `Content-Disposition: attachment; filename="${PDF_NAME}"`,
  "",
  wrap76(b64(pdf)),
  `--${boundary}--`,
  "",
];

writeFileSync(join(SAMPLES, "05_dala_pismo.eml"), lines.join("\r\n"));
console.log("05_dala_pismo.eml готов");
