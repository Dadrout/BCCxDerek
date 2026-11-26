import type { Pressure } from "./pressure";
// Результат проверки одного механизма подлинности письма (SPF, DKIM, DMARC).
export type AuthResult = "pass" | "fail" | "none";

export type ParsedEmail = {
  fromAddress: string;
  fromName: string;
  replyTo: string | null;
  subject: string;
  date: string | null;
  text: string;
  auth: { spf: AuthResult; dkim: AuthResult; dmarc: AuthResult };
  pdf: { filename: string; content: Buffer } | null;
};

// Письмо в том виде, в каком его показывает экран: поля разбора, ответ проверки давления и режим (AI или локально).
export type EmailView = {
  fromName: string;
  fromAddress: string;
  replyTo: string | null;
  subject: string;
  date: string | null;
  text: string;
  auth: ParsedEmail["auth"];
  pressure: Pressure[];
  pressureMode: "ai" | "local";
};
