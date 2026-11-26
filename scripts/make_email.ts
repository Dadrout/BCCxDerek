// Собирает синтетические демо-письма public/samples/05_dala_pismo.eml и 06_dala_partner.eml (со счетами 05 и 06 во вложении).
// Запуск: node scripts/make_email.ts  (сначала python scripts/make_invoices.py 05 и 06).
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SAMPLES = join(import.meta.dirname, "..", "public", "samples");

const b64 = (b: Buffer | string): string => Buffer.from(b).toString("base64");
// Строка base64 с переносами по 76 символов (RFC 2045).
const wrap76 = (s: string): string => s.match(/.{1,76}/g)?.join("\r\n") ?? "";
// RFC 2047: слово в кодировке UTF-8 + base64.
const word = (s: string): string => `=?UTF-8?B?${b64(s)}?=`;

type Demo = {
  file: string; pdfName: string; boundary: string; body: string; from: string; fromAddr: string;
  subject: string; date: string; messageId: string;
};

function build(d: Demo): void {
  const pdf = readFileSync(join(SAMPLES, d.pdfName));
  const lines = [
    `From: ${word(d.from)} <${d.fromAddr}>`,
    "To: buh@shanyrak.kz",
    `Subject: ${word(d.subject)}`,
    `Date: ${d.date}`,
    `Message-ID: <${d.messageId}>`,
    `Authentication-Results: mx.bcc.kz; spf=pass smtp.mailfrom=${d.fromAddr.split("@")[1]}; dkim=pass header.d=${d.fromAddr.split("@")[1]}; dmarc=pass`,
    "X-Derek-Demo: synthetic",
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${d.boundary}"`,
    "",
    `--${d.boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrap76(b64(d.body)),
    `--${d.boundary}`,
    `Content-Type: application/pdf; name="${d.pdfName}"`,
    "Content-Transfer-Encoding: base64",
    `Content-Disposition: attachment; filename="${d.pdfName}"`,
    "",
    wrap76(b64(pdf)),
    `--${d.boundary}--`,
    "",
  ];
  writeFileSync(join(SAMPLES, d.file), lines.join("\r\n"));
  console.log(`${d.file} готов`);
}

build({
  file: "05_dala_pismo.eml",
  pdfName: "05_dala_schet_drugoj_bank.pdf",
  boundary: "----=_Derek_Demo_05",
  from: "Дала Транс Логистик",
  fromAddr: "buh@dalatrans-kz.com",
  subject: "Счёт ДТ-1201 — новые реквизиты",
  date: "Wed, 09 Dec 2026 10:42:00 +0500",
  messageId: "demo-05@dalatrans-kz.com",
  body: [
    "Добрый день!",
    "",
    "В связи со сменой банка просим оплатить счёт по новым реквизитам сегодня до конца дня. Бухгалтер в отпуске, по телефону не дозвониться, пишите только сюда.",
    "",
    "Счёт ДТ-1201 во вложении.",
    "",
    "С уважением,",
    "Бухгалтерия ТОО «Дала Транс Логистик»",
    "",
  ].join("\r\n"),
});

// 06: письмо с настоящего адреса поставщика просит заплатить партнёру.
build({
  file: "06_dala_partner.eml",
  pdfName: "06_arna_schet.pdf",
  boundary: "----=_Derek_Demo_06",
  from: "Дала Транс Логистик",
  fromAddr: "buh@dalatrans.kz",
  subject: "Оплата рейса Алматы — Астана",
  date: "Thu, 10 Dec 2026 09:15:00 +0500",
  messageId: "demo-06@dalatrans.kz",
  body: [
    "Добрый день!",
    "",
    "Оплату за рейс Алматы — Астана по договору № 14/2025 в этот раз просим направить нашему партнёру ТОО «Арна Карго», счёт во вложении.",
    "",
    "С уважением,",
    "бухгалтерия ТОО «Дала Транс Логистик»",
    "",
  ].join("\r\n"),
});
