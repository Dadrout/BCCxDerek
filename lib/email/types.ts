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
