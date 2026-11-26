import { expect, test } from "vitest";
import { looksLikeEml, parseEml } from "@/lib/email/parse";

const pdfB64 = Buffer.from("%PDF-1.4 test").toString("base64");

const full = [
  "From: =?UTF-8?B?0JTQsNC70LA=?= <buh@dalatrans-kz.com>",
  "To: pay@client.kz",
  "Reply-To: other@gmail.com",
  "Subject: Счёт на оплату",
  "Date: Mon, 24 Nov 2025 10:00:00 +0500",
  "Authentication-Results: mx.bcc.kz; spf=softfail smtp.mailfrom=x; dkim=pass; dmarc=fail",
  "MIME-Version: 1.0",
  'Content-Type: multipart/mixed; boundary="b1"',
  "",
  "--b1",
  "Content-Type: text/plain; charset=utf-8",
  "",
  "Оплатите счёт во вложении.",
  "--b1",
  'Content-Type: application/pdf; name="invoice.pdf"',
  'Content-Disposition: attachment; filename="invoice.pdf"',
  "Content-Transfer-Encoding: base64",
  "",
  pdfB64,
  "--b1--",
  "",
].join("\r\n");

const htmlOnly = [
  "From: Buh <buh@dalatrans.kz>",
  "Subject: Hi",
  "MIME-Version: 1.0",
  "Content-Type: text/html; charset=utf-8",
  "",
  "<html><body><p>Hello <b>world</b></p></body></html>",
  "",
].join("\r\n");

test("разбор полного письма", async () => {
  const m = await parseEml(Buffer.from(full));
  expect(m.fromAddress).toBe("buh@dalatrans-kz.com");
  expect(m.fromName).toBe("Дала");
  expect(m.replyTo).toBe("other@gmail.com");
  expect(m.auth).toEqual({ spf: "fail", dkim: "pass", dmarc: "fail" });
  expect(m.pdf?.filename).toBe("invoice.pdf");
  expect(m.pdf?.content.subarray(0, 5).toString()).toBe("%PDF-");
  expect(m.text).toContain("Оплатите");
});

test("только HTML без вложений и auth", async () => {
  const m = await parseEml(Buffer.from(htmlOnly));
  expect(m.text).not.toContain("<");
  expect(m.text).toContain("Hello");
  expect(m.pdf).toBeNull();
  expect(m.replyTo).toBeNull();
  expect(m.auth).toEqual({ spf: "none", dkim: "none", dmarc: "none" });
});

test("looksLikeEml", () => {
  expect(looksLikeEml(Buffer.from(full))).toBe(true);
  expect(looksLikeEml(Buffer.from("%PDF-1.4\nFrom: x\n"))).toBe(false);
});

test("From без имени", async () => {
  const m = await parseEml(Buffer.from("From: buh@DalaTrans.kz\r\nSubject: x\r\n\r\nhi\r\n"));
  expect(m.fromAddress).toBe("buh@dalatrans.kz");
  expect(m.fromName).toBe("");
});
