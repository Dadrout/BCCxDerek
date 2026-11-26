"use client";
// Форма платёжного поручения в стиле банковского приложения. Только показывает поля и ошибки, логики проверки здесь нет.
import { useRef, type Ref } from "react";
import type { FieldError, PaymentFields } from "@/lib/signals/validate";
import { fieldErrorText } from "@/lib/signals/texts";
import type { Dict, Lang } from "@/lib/i18n";
import type { FieldKey } from "@/lib/usePaymentScreen";

type Props = {
  t: Dict;
  lang: Lang;
  fields: PaymentFields;
  errors: FieldError[];
  unsure: FieldKey[];
  notice: string | null;
  status: string | null;
  error: string | null;
  payLabel: string;
  showPay: boolean;
  locked: boolean;
  binRef: Ref<HTMLInputElement>;
  onChange: (k: FieldKey, v: string) => void;
  onAttach: (f: File) => void;
  onPay: () => void;
};

export default function PaymentForm(p: Props) {
  const { t } = p;
  const file = useRef<HTMLInputElement>(null);
  const err = (k: FieldKey) => {
    const e = p.errors.find((x) => x.field === k);
    return e ? fieldErrorText(e, p.lang) : null;
  };
  const field = (k: FieldKey, label: string, extra: Partial<FieldProps> = {}) => (
    <Field id={`f-${k}`} label={label} value={p.fields[k]} error={err(k)} unsure={p.unsure.includes(k) ? t.unsure : null}
      disabled={p.locked} onChange={(v) => p.onChange(k, v)} {...extra} />
  );

  return (
    <form aria-label={t.form} noValidate onSubmit={(e) => { e.preventDefault(); if (p.showPay && !p.locked) p.onPay(); }}
      className="rounded-[10px] bg-sheet p-5 shadow-[0_1px_2px_rgba(21,32,43,0.08),0_8px_24px_-12px_rgba(21,32,43,0.18)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[17px] font-semibold">{t.form}</h2>
        <button type="button" onClick={() => file.current?.click()} disabled={p.locked} className="btn btn-secondary h-9 gap-2 px-3 text-[14px]">
          <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M10.5 4.5 5.4 9.6a1.6 1.6 0 0 0 2.3 2.3l5.4-5.4a3 3 0 0 0-4.3-4.3L3.4 7.6a4.4 4.4 0 0 0 6.2 6.2l4-4" />
          </svg>
          {t.attachPdf}
        </button>
        <input ref={file} type="file" accept="application/pdf" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) p.onAttach(f); e.target.value = ""; }} />
      </div>
      <p className="mt-1 text-[13px] text-ink-3">{t.attachHint}</p>

      {p.notice && <p className="mt-4 rounded-md bg-new-wash px-3 py-2.5 text-[14px] leading-snug text-new">{p.notice}</p>}

      <div className="mt-5 grid gap-x-4 gap-y-4 sm:grid-cols-2">
        <div className="sm:col-span-2">{field("name", t.recipient, { placeholder: t.namePh, autoComplete: "organization" })}</div>
        {field("bin", t.bin, { placeholder: t.binPh, inputMode: "numeric", mono: true, inputRef: p.binRef })}
        {field("amount", t.amount, { placeholder: t.amountPh, inputMode: "decimal", mono: true })}
        <div className="sm:col-span-2">{field("iban", t.iban, { placeholder: "KZ00 0000 0000 0000 0000", mono: true, spellCheck: false })}</div>
        <div className="sm:col-span-2">{field("purpose", t.purpose, { placeholder: t.purposePh })}</div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
        {p.showPay && (
          <button type="submit" disabled={p.locked} className="btn btn-primary btn-lg min-w-[160px]">{p.payLabel}</button>
        )}
        <p className="text-[13px] leading-snug text-ink-3" aria-live="polite">{p.status ?? (p.showPay ? t.payNote : "")}</p>
      </div>
      {p.errors.length > 0 && <p className="mt-3 text-[14px] font-medium text-stop" role="alert">{t.fixFields}</p>}
      {p.error && <p className="mt-3 rounded-md bg-stop-wash px-3 py-2 text-[14px] text-stop" role="alert">{t.errors[p.error] ?? t.errors.generic}</p>}
    </form>
  );
}

type FieldProps = {
  id: string;
  label: string;
  value: string;
  error: string | null;
  unsure: string | null;
  disabled: boolean;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: "numeric" | "decimal" | "text";
  autoComplete?: string;
  spellCheck?: boolean;
  mono?: boolean;
  inputRef?: Ref<HTMLInputElement>;
};

function Field({ id, label, value, error, unsure, disabled, onChange, placeholder, inputMode, autoComplete, spellCheck, mono, inputRef }: FieldProps) {
  const note = error ?? unsure;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</label>
      <input id={id} ref={inputRef} value={value} disabled={disabled} placeholder={placeholder} inputMode={inputMode}
        autoComplete={autoComplete ?? "off"} spellCheck={spellCheck} aria-invalid={!!error} aria-describedby={note ? `${id}-note` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={`input ${mono ? "font-mono text-[14px]" : ""} ${error ? "border-stop bg-stop-wash/40 focus-visible:border-stop" : unsure ? "border-hold" : ""}`} />
      {note && (
        <p id={`${id}-note`} className={`mt-1.5 text-[13px] leading-snug ${error ? "font-medium text-stop" : "text-hold"}`}>{note}</p>
      )}
    </div>
  );
}
