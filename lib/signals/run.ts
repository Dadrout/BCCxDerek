// Общий серверный запуск проверки: разбор полей, затем оценка по данным банка.
import { parsePayment, type PaymentFields, type ParsedPayment } from "./validate";
import { evaluate } from "./engine";
import type { CheckOutcome, DocumentHints } from "./types";
import { getBank } from "@/lib/bank/store";
import { readApprovals } from "@/lib/bank/approvals";
import { DEMO_CLIENT } from "@/lib/bank/fixtures";

export function runCheck(fields: PaymentFields, hints?: DocumentHints): { outcome: CheckOutcome; parsed: ParsedPayment | null } {
  const r = parsePayment(fields);
  if (!r.ok) return { outcome: { kind: "fix_fields", errors: r.errors }, parsed: null };
  const outcome = evaluate(r.value, getBank(), { clientBin: DEMO_CLIENT.bin, hints, approvals: readApprovals() });
  return { outcome, parsed: r.value };
}
