export type Confidence = "high" | "medium" | "low";
export type Field = { value: string | null; fragment: string | null; confidence: Confidence };

export type Extraction = {
  mode: "groq" | "claude" | "local";
  model?: string;
  readable: boolean;
  supplier_name: Field;
  bin: Field;
  iban: Field;
  bank_name: Field;
  amount: Field;
  invoice_number: Field;
  phone_in_document: Field;
  change_request_text: string | null; // «просим оплачивать по новым реквизитам» и т.п.
  warning?: string;
};
