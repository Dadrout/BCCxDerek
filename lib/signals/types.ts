// Типы движка сигналов. Порядок SIGNAL_ORDER — приоритет: первый сигнал наивысшей серьёзности становится главной причиной.
import type { ContractConflict } from "@/lib/contract/compare";
import type { Pressure } from "@/lib/email/pressure";
import type { FieldError } from "./validate.ts";

export const SIGNAL_ORDER = [
  "owner_individual",
  "owner_mismatch",
  "account_not_found",
  "iban_reported",
  "homoglyphs",
  "email_lookalike",
  "bin_not_found",
  "supplier_unreliable",
  "own_history_changed",
  "crowd_mismatch",
  "contract_conflict",
  "account_new",
  "supplier_young",
  "supplier_inactive",
  "name_mismatch",
  "change_request",
  "phone_differs",
  "email_domain_differs",
  "email_free_mail",
  "email_reply_to",
  "email_auth_failed",
  "email_pressure",
  "nothing_to_compare",
  "change_approved",
  "first_payment",
  "owner_unknown",
  "amount_unusual",
  "crowd_confirms",
  "own_history_ok",
  "owner_ok",
] as const;

export type SignalId = (typeof SIGNAL_ORDER)[number];

export type Severity = "stop" | "check" | "info" | "ok";

export const SEVERITY: Record<SignalId, Severity> = {
  owner_individual: "stop",
  owner_mismatch: "stop",
  account_not_found: "stop",
  iban_reported: "stop",
  homoglyphs: "stop",
  email_lookalike: "stop",
  bin_not_found: "stop",
  supplier_unreliable: "stop",
  own_history_changed: "stop",
  crowd_mismatch: "stop",
  contract_conflict: "check",
  account_new: "check",
  supplier_young: "check",
  supplier_inactive: "check",
  name_mismatch: "check",
  change_request: "check",
  phone_differs: "check",
  email_domain_differs: "check",
  email_free_mail: "check",
  email_reply_to: "check",
  email_auth_failed: "check",
  email_pressure: "check",
  nothing_to_compare: "check",
  change_approved: "info",
  first_payment: "info",
  owner_unknown: "info",
  amount_unusual: "info",
  crowd_confirms: "ok",
  own_history_ok: "ok",
  owner_ok: "ok",
};

export type Signal = { id: SignalId; severity: Severity; params: Record<string, string | number> };

export type Action = "call_contract" | "find_phone" | "check_bin" | "check_supplier" | "pay" | "pay_after_ack";

export type Verdict = "stop" | "check" | "ok";

export type Contact = { person: string; role: string; phone: string; source: string };

export type CheckOutcome =
  | { kind: "verdict"; verdict: Verdict; main: Signal; action: Action; signals: Signal[]; contact: Contact | null; fingerprint: string }
  | { kind: "fix_fields"; errors: FieldError[] };

// Подсказки из приложенного письма (.eml): отправитель, Reply-To, проверка подлинности, давление в тексте.
export type EmailHints = { fromAddress: string; replyTo: string | null; authFailed: boolean; pressure: Pressure[] };

// Сравнение счёта и письма с условиями оплаты договора: БИН поставщика, найденные расхождения, чем найдены (ИИ или правила).
export type ContractHints = { supplierBin: string; conflicts: ContractConflict[]; mode: "ai" | "local" };

// Подсказки из приложенного PDF и письма (необязательно).
export type DocumentHints = { changeRequestText: string | null; phoneInDocument: string | null; email?: EmailHints | null; contract?: ContractHints | null };

// Утверждённая вторым сотрудником смена реквизитов (хранилище — задача 4).
export type Approval = { clientBin: string; bin: string; iban: string; approvedAt: string; approvedBy: string };
