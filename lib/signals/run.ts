// Общий серверный запуск проверки: разбор полей, затем оценка по данным банка.
import { parsePayment, type PaymentFields, type ParsedPayment } from "./validate";
import { evaluate } from "./engine";
import type { CheckOutcome, DocumentHints, EmailHints } from "./types";
import { PRESSURE_KINDS, type Pressure, type PressureKind } from "@/lib/email/pressure";
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
          email: readEmail((h as Record<string, unknown>).email),
        }
      : undefined;
  return { body, fields, hints };
}

// Подсказки из письма: принимаем только строго правильную форму, иначе считаем, что письма нет.
function readEmail(v: unknown): EmailHints | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const e = v as Record<string, unknown>;
  if (typeof e.fromAddress !== "string" || e.fromAddress.length > 320) return null;
  if (e.replyTo === undefined) e.replyTo = null;
  if (e.replyTo !== null && (typeof e.replyTo !== "string" || e.replyTo.length > 320)) return null;
  if (typeof e.authFailed !== "boolean") return null;
  if (!Array.isArray(e.pressure) || e.pressure.length > 10) return null;
  const pressure: Pressure[] = [];
  for (const x of e.pressure) {
    if (!x || typeof x !== "object") return null;
    const { kind, quote } = x as Record<string, unknown>;
    if (typeof kind !== "string" || !(PRESSURE_KINDS as readonly string[]).includes(kind)) return null;
    if (typeof quote !== "string" || quote.length > 300) return null;
    pressure.push({ kind: kind as PressureKind, quote });
  }
  return { fromAddress: e.fromAddress, replyTo: e.replyTo as string | null, authFailed: e.authFailed, pressure };
}
