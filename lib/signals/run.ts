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

const KEYS = ["name", "bin", "iban", "amount", "purpose"] as const;

// Разбор тела JSON-запроса: null, если JSON битый или fields не объект со строковыми значениями.
export async function readBody(req: Request): Promise<{ body: Record<string, unknown>; fields: PaymentFields; hints?: DocumentHints } | null> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const body = raw as Record<string, unknown>;
  const f = body.fields;
  if (!f || typeof f !== "object" || Array.isArray(f)) return null;
  const fields = {} as PaymentFields;
  for (const k of KEYS) {
    const v = (f as Record<string, unknown>)[k];
    if (v === undefined || v === null) fields[k] = "";
    else if (typeof v === "string" || typeof v === "number") fields[k] = String(v);
    else return null;
  }
  const h = body.hints;
  const hints: DocumentHints | undefined =
    h && typeof h === "object" && !Array.isArray(h)
      ? {
          changeRequestText: typeof (h as DocumentHints).changeRequestText === "string" ? (h as DocumentHints).changeRequestText : null,
          phoneInDocument: typeof (h as DocumentHints).phoneInDocument === "string" ? (h as DocumentHints).phoneInDocument : null,
        }
      : undefined;
  return { body, fields, hints };
}
