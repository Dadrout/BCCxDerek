"use client";
// Вердикт проверки: цветная полоса, статус, одна главная причина крупно и действие рядом с ней.
// Остальные сигналы раскрываются по «Почему ещё». Ниже — состояние платежа и объяснение ИИ.
import { useState } from "react";
import type { Action, Severity, Verdict } from "@/lib/signals/types";
import { actionLabel, signalText, verdictTitle } from "@/lib/signals/texts";
import type { Dict, Lang } from "@/lib/i18n";
import type { AiState, Busy, PayState, VerdictOutcome } from "@/lib/usePaymentScreen";

const BAND: Record<Verdict, { band: string; wash: string; accent: string }> = {
  stop: { band: "bg-stop", wash: "bg-stop-wash", accent: "border-stop" },
  check: { band: "bg-hold", wash: "bg-hold-wash", accent: "border-hold" },
  ok: { band: "bg-go", wash: "bg-go-wash", accent: "border-go" },
};
const DOT: Record<Severity, string> = { stop: "bg-stop", check: "bg-hold", info: "bg-ink-3", ok: "bg-go" };

type Props = {
  t: Dict;
  lang: Lang;
  outcome: VerdictOutcome;
  pay: PayState;
  busy: Busy;
  advice: Action | null;
  ai?: AiState;
  aiModel: string;
  onAct: (a: Action) => void;
  onPostpone: () => void;
  onApprove: () => void;
  onRecheck: () => void;
};

export default function VerdictPanel({ t, lang, outcome: v, pay, busy, advice, ai, aiModel, onAct, onPostpone, onApprove, onRecheck }: Props) {
  const [open, setOpen] = useState(false);
  const st = BAND[v.verdict];
  const others = v.signals.filter((s) => s.id !== v.main.id);
  const canAct = pay === "draft" || pay === "postponed";
  const disabled = busy !== null;
  const primary: Action = v.verdict === "ok" ? "pay" : v.action;

  return (
    <section aria-label={t.result} aria-live="polite"
      className="overflow-hidden rounded-[10px] bg-sheet shadow-[0_1px_2px_rgba(21,32,43,0.08),0_8px_24px_-12px_rgba(21,32,43,0.18)]">
      <div className={`${st.band} px-5 pb-5 pt-4 text-white sm:px-7`}>
        <p className="flex items-center gap-2 text-[15px] font-semibold uppercase tracking-[0.05em] text-white/90">
          <VerdictIcon v={v.verdict} />
          {verdictTitle(v.verdict, lang)}
        </p>
        <h2 className="mt-2 text-[26px] font-semibold leading-[1.15] tracking-[-0.01em] sm:text-[30px]">{signalText(v.main, lang)}</h2>
        {canAct && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => onAct(primary)} disabled={disabled} className="btn btn-band btn-lg">{actionLabel(primary, lang)}</button>
            {v.verdict === "check" && (
              <button onClick={() => onAct("pay_after_ack")} disabled={disabled} className="btn btn-band-ghost btn-lg">{actionLabel("pay_after_ack", lang)}</button>
            )}
            {v.verdict === "stop" && pay === "draft" && (
              <button onClick={onPostpone} disabled={disabled} className="btn btn-band-ghost btn-lg">{t.postpone}</button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4 px-5 py-5 sm:px-7">
        {advice === "check_bin" && <Note tone="bg-cell text-ink">{t.checkBinAdvice}</Note>}
        {advice === "check_supplier" && <Note tone="bg-cell text-ink">{t.checkSupplierAdvice}</Note>}

        {pay !== "draft" && (
          <Note tone={pay === "sent" ? "bg-go-wash text-go" : pay === "blocked" ? "bg-stop-wash text-stop" : pay === "requested" ? "bg-new-wash text-new" : "bg-cell text-ink"} dot>
            {pay === "sent" ? t.paySent : pay === "blocked" ? t.payBlocked : pay === "requested" ? t.payRequested : t.payPostponed}
          </Note>
        )}
        {pay === "postponed" && (
          <button onClick={onRecheck} disabled={disabled} className="btn btn-secondary">{t.recheck}</button>
        )}
        {pay === "requested" && (
          <button onClick={onApprove} disabled={disabled} className="btn btn-primary">{t.approveSecond}</button>
        )}

        {others.length > 0 && (
          <div>
            <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="why-more"
              className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ink">
              <svg aria-hidden viewBox="0 0 12 12" className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`} fill="currentColor"><path d="M4 2l5 4-5 4z" /></svg>
              {open ? t.whyLess : t.whyMore(others.length)}
            </button>
            {open && (
              <ul id="why-more" className="mt-3 space-y-2 text-[15px] leading-relaxed">
                {others.map((s) => (
                  <li key={s.id} className="relative pl-5">
                    <span aria-hidden className={`absolute left-0 top-[0.6em] h-[8px] w-[8px] rounded-full ${DOT[s.severity]}`} />
                    {signalText(s, lang)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <AiSummary t={t} state={ai} model={aiModel} wash={st.wash} accent={st.accent} />
      </div>
    </section>
  );
}

function Note({ tone, dot, children }: { tone: string; dot?: boolean; children: React.ReactNode }) {
  return (
    <p className={`flex items-start gap-2.5 rounded-md px-3 py-2.5 text-[14px] font-medium leading-snug ${tone}`}>
      {dot && <span aria-hidden className="mt-[0.45em] h-2 w-2 shrink-0 rounded-full bg-current" />}
      <span>{children}</span>
    </p>
  );
}

function VerdictIcon({ v }: { v: Verdict }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="10" cy="10" r="8.5" />
      {v === "ok" && <path d="M6 10.3 8.7 13 14 7.5" />}
      {v === "check" && <path d="M10 5.5v5.5M10 14v.5" strokeLinecap="round" />}
      {v === "stop" && <path d="M7 7l6 6M13 7l-6 6" strokeLinecap="round" />}
    </svg>
  );
}

function AiSummary({ t, state, model, wash, accent }: { t: Dict; state?: AiState; model: string; wash: string; accent: string }) {
  if (!state) return null;
  if (state.state === "offline" || state.state === "failed")
    return <p className="text-[13px] text-ink-3">{state.state === "offline" ? t.aiOffline : t.aiFailed}</p>;
  return (
    <figure className={`rounded-r-md border-l-[3px] ${accent} ${wash} px-4 py-3.5`}>
      <figcaption className="flex items-center gap-2 text-[13px] font-semibold">
        <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor"><path d="M8 0l1.7 5.1L15 6.8l-5.3 1.7L8 13.6 6.3 8.5 1 6.8l5.3-1.7z" /></svg>
        {t.aiTitle}
      </figcaption>
      {state.state === "loading" ? (
        <p className="mt-1.5 animate-pulse text-[15px] text-ink-2">{t.aiThinking}</p>
      ) : (
        <blockquote className="mt-1.5 max-w-[62ch] text-[15px] leading-relaxed">{state.text}</blockquote>
      )}
      {model && state.state === "done" && <p className="mt-2 text-[12px] text-ink-3">{t.aiModel(model)}</p>}
    </figure>
  );
}
