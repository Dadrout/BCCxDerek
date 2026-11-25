export type Confidence = "high" | "medium" | "low";
export type Field = { value: string | null; fragment: string | null; confidence: Confidence };

export type Extraction = {
  mode: "claude" | "local";
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

export type Status = "match" | "mismatch" | "unreadable" | "new_supplier";

export type CheckResult = {
  status: Status;
  headline: string;
  reasons: string[];
  extraction: Extraction;
  supplier: import("./registry").SupplierCard | null;
  iban: { document: string | null; reference: string | null; checksumOk: boolean; homoglyphs: boolean; diffPositions: number[]; documentBank: string | null };
  bankSignal: { ibanSeenBefore: boolean; paymentsToThisIban: number; paymentsToSupplier: number; lastPayment: import("./registry").PastPayment | null; amountVsAvg: number | null };
};
