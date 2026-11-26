// Типы движка сигналов. Порядок SIGNAL_ORDER — приоритет: первый сигнал наивысшей серьёзности становится главной причиной.
import type { FieldError } from "./validate.ts";

export const SIGNAL_ORDER = [
  "owner_individual",
  "owner_mismatch",
  "iban_reported",
  "homoglyphs",
  "bin_not_found",
  "supplier_unreliable",
  "own_history_changed",
  "crowd_mismatch",
  "account_new",
  "supplier_young",
  "supplier_inactive",
  "name_mismatch",
  "change_request",
  "phone_differs",
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
  iban_reported: "stop",
  homoglyphs: "stop",
  bin_not_found: "stop",
  supplier_unreliable: "stop",
  own_history_changed: "stop",
  crowd_mismatch: "stop",
  account_new: "check",
  supplier_young: "check",
  supplier_inactive: "check",
  name_mismatch: "check",
  change_request: "check",
  phone_differs: "check",
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

// Подсказки из приложенного PDF (необязательно).
export type DocumentHints = { changeRequestText: string | null; phoneInDocument: string | null };

// Утверждённая вторым сотрудником смена реквизитов (хранилище — задача 4).
export type Approval = { clientBin: string; bin: string; iban: string; approvedAt: string; approvedBy: string };
