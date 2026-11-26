"use client";
// Экран «Новый платёж»: форма слева, вердикт и счёт справа. Состояние и запросы — в lib/usePaymentScreen.ts.
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Highlight } from "@/components/PdfView";
import PaymentForm from "@/components/PaymentForm";
import VerdictPanel from "@/components/VerdictPanel";
import ContactCard from "@/components/ContactCard";
import EmailPanel from "@/components/EmailPanel";
import ContractPanel from "@/components/ContractPanel";
import { SCENARIOS, type Scenario } from "@/lib/scenarios";
import { DEMO_CLIENT } from "@/lib/demo-client";
import { actionLabel, scenarioHint, scenarioTitle } from "@/lib/signals/texts";
import { PRODUCT_NAME } from "@/lib/brand";
import { DICT, LANGS, DEFAULT_LANG, type Dict, type Lang } from "@/lib/i18n";
import { modeText, usePaymentScreen } from "@/lib/usePaymentScreen";

const PdfView = dynamic(() => import("@/components/PdfView"), { ssr: false });

const LANG_KEY = "derek-lang";
const IBAN_COLOR = { stop: "red", check: "amber", ok: "green" } as const;
const IBAN_LEGEND = { red: "bg-stop", amber: "bg-[#d68c14]", green: "bg-go" } as const;
const STAGE = SCENARIOS.filter((s) => s.onStage);
const MORE = SCENARIOS.filter((s) => !s.onStage);

export default function Home() {
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG);
  const t = DICT[lang];
  const s = usePaymentScreen(lang);
  const binRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Язык: из адреса (?lang=kk), иначе из прошлого выбора.
  useEffect(() => {
    let initial: string | null = null;
    try { initial = new URLSearchParams(window.location.search).get("lang") ?? localStorage.getItem(LANG_KEY); } catch {}
    if (initial && initial in DICT) setLang(initial as Lang);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    try { localStorage.setItem(LANG_KEY, lang); } catch {}
  }, [lang]);

  const v = s.outcome?.kind === "verdict" ? s.outcome : null;
  const fieldErrors = s.outcome?.kind === "fix_fields" ? s.outcome.errors : [];

  // На узком экране вердикт ниже формы: прокручиваем к нему, когда он появился.
  useEffect(() => {
    if (v) resultRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [v]);
  useEffect(() => {
    if (s.advice === "check_bin") binRef.current?.focus();
  }, [s.advice]);

  // Подсветка в PDF: номер счёта цветом вердикта, просьба сменить реквизиты и телефон — жёлтым.
  const highlights: Highlight[] = [];
  const ex = s.extraction;
  let ibanColor: Highlight["color"] | null = null;
  if (v && ex && s.src) {
    // Номер счёта подсвечиваем, только если поле не правили после чтения счёта.
    // Сравниваем без пробелов: ИИ отдаёт номер слитно, а в форме он сгруппирован по 4 символа.
    const bare = (x: string) => x.replace(/\s+/g, "").toUpperCase();
    if (ex.iban.value && bare(ex.iban.value) === bare(s.fields.iban)) {
      ibanColor = IBAN_COLOR[v.verdict];
      highlights.push({ needle: ex.iban.value, color: ibanColor });
    }
    if (s.hints?.changeRequestText && v.signals.some((x) => x.id === "change_request")) highlights.push({ needle: s.hints.changeRequestText, color: "amber" });
    if (s.hints?.phoneInDocument && v.signals.some((x) => x.id === "phone_differs")) highlights.push({ needle: "Тел.: " + s.hints.phoneInDocument, color: "amber" });
  }

  const payLabel = s.busy === "extract" ? t.payReading : s.busy === "check" ? t.payChecking : actionLabel("pay", lang);
  const status = s.busy === "extract" ? t.extracting : s.busy === "check" ? t.checking : null;
  const docName = s.doc?.kind === "sample" ? scenarioTitle(s.doc.scenario, lang) : s.doc?.name ?? "";
  const filled = Object.values(s.fields).some((x) => x.trim() !== "");
  const warning = ex?.warning ? (ex.warning.includes("ИИ недоступен") ? t.warnAi : ex.warning.includes("текстового слоя") ? t.warnNoText : null) : null;

  return (
    <div className="min-h-screen">
      <header className="bg-ink text-white">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="text-[15px] font-semibold">BCC Business</span>
            <span className="rounded-[4px] bg-white/12 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-white/80">{t.demo}</span>
            {/* Знак Derek: пропускной пункт со шлагбаумом (тот же, что в public/brand). */}
            <span className="flex items-center gap-1.5 text-[14px] font-semibold text-white/90">
              <svg aria-hidden viewBox="0 0 256 256" className="h-5 w-5">
                <path fill="none" stroke="#D9AB6E" strokeWidth="34" strokeLinecap="round" d="M128 52H90A38 38 0 0 0 52 90v76a38 38 0 0 0 38 38h76a38 38 0 0 0 38-38v-38" />
                <path fill="none" stroke="#26AE60" strokeWidth="28" strokeLinecap="round" d="m173 59 24 24" />
              </svg>
              {PRODUCT_NAME}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 sm:gap-x-6">
            <div role="group" aria-label={t.langSwitch} className="flex rounded-md bg-white/[0.07] p-0.5">
              {LANGS.map((l) => (
                <button key={l.id} lang={l.id} title={l.name} aria-pressed={lang === l.id} onClick={() => setLang(l.id)}
                  className={`h-7 rounded-[5px] px-2.5 text-[12px] font-semibold tracking-[0.02em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white ${lang === l.id ? "bg-white text-ink" : "text-white/65 hover:text-white"}`}>
                  {l.label}
                </button>
              ))}
            </div>
            <button onClick={() => void s.resetDemo()}
              className="h-7 rounded-[5px] border border-white/25 px-2.5 text-[12px] font-semibold text-white/80 transition-colors hover:border-white/60 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white">
              {t.resetDemo}
            </button>
            <div className="text-right">
              <div className="text-[14px] font-medium">{DEMO_CLIENT.name}</div>
              <div className="text-[12px] text-white/55">{t.binShort} {DEMO_CLIENT.bin}</div>
            </div>
          </div>
        </div>
        <p className="border-t border-white/10 px-4 py-1.5 text-center text-[12px] text-white/55">{t.disclaimer}</p>
      </header>

      <main className="mx-auto max-w-[1240px] px-4 pb-16 pt-5 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            <p className="text-[13px] text-ink-3">{t.crumbs}</p>
            <h1 className="mt-0.5 text-[26px] font-semibold leading-tight tracking-[-0.01em] sm:text-[30px]">{t.title}</h1>
          </div>
          <p className="max-w-[52ch] text-[14px] leading-snug text-ink-2">{t.pitch(PRODUCT_NAME)}</p>
        </div>

        <ScenarioRow t={t} lang={lang} active={s.scenario} disabled={s.busy === "extract"} onPick={s.pickScenario} />

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-2 lg:gap-6">
          <div className="lg:col-start-1 lg:row-start-1">
            <PaymentForm t={t} lang={lang} fields={s.fields} errors={fieldErrors} unsure={s.unsure}
              notice={s.scenario === "manual" ? scenarioHint("manual", lang) : null}
              status={status} error={s.error} payLabel={payLabel} showPay={!v}
              locked={s.busy === "extract" || s.busy === "check"} binRef={binRef}
              onChange={s.setField} onAttach={s.attach} onPay={() => void s.runCheck()} />
          </div>

          <div className="space-y-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
            {v && (
              <div ref={resultRef} className="scroll-mt-4">
                <VerdictPanel key={v.fingerprint + v.verdict} t={t} lang={lang} outcome={v} pay={s.pay} busy={s.busy} advice={s.advice}
                  ai={s.ai[lang]} aiModel={s.aiModel} onAct={s.act} onPostpone={s.postpone} onApprove={() => void s.approve()} onRecheck={() => void s.runCheck()} />
              </div>
            )}
            {s.hints?.contract && s.hints.contract.conflicts.length > 0 && (
              <ContractPanel t={t} lang={lang} hints={s.hints.contract} source={s.contract?.source ?? null} />
            )}
            {s.email && <EmailPanel t={t} lang={lang} email={s.email} signals={v ? v.signals.map((x) => x.id) : null} />}
            <section aria-label={t.invoice}>
              {s.src ? (
                <>
                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-[15px] font-medium">{t.invoiceNamed(docName)}</h2>
                    {ex && <span className="text-[13px] text-ink-3">{modeText(ex, t)}</span>}
                  </div>
                  {warning && <p className="mb-2 rounded-md bg-hold-wash px-3 py-2 text-[13px] text-hold">{warning}</p>}
                  <PdfView src={s.src} highlights={highlights} emptyText={t.pdfEmpty} />
                  {highlights.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-2">
                      {ibanColor && <Legend color={IBAN_LEGEND[ibanColor]} text={t.legendIban} />}
                      {highlights.length > (ibanColor ? 1 : 0) && <Legend color={IBAN_LEGEND.amber} text={t.legendWarn} />}
                    </ul>
                  )}
                </>
              ) : (
                <p className="rounded-[8px] border border-dashed border-ink-3/50 px-5 py-8 text-center text-[14px] leading-relaxed text-ink-3">
                  {filled || v ? t.noPdf : t.pdfEmpty}
                </p>
              )}
            </section>
          </div>

          {s.log.length > 0 && (
            <section aria-label={t.log} className="rounded-[10px] bg-sheet px-5 py-4 sm:px-6 lg:col-start-1 lg:row-start-2">
              <h2 className="mb-2.5 text-[15px] font-semibold">{t.log}</h2>
              <ol className="space-y-1.5 text-[13px] leading-relaxed text-ink-2">
                {s.log.map((l) => (
                  <li key={l.id} className="grid grid-cols-[4.75rem_1fr] gap-2">
                    <time className="font-mono text-[12px] leading-[1.75] text-ink-3">{l.time}</time>
                    <span>{l.render(t, lang)}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </main>

      {s.contact && v && (
        <ContactCard t={t} lang={lang} step={s.contact} contact={v.contact} phoneInDocument={s.hints?.phoneInDocument ?? null}
          busy={s.busy !== null} onConfirm={s.confirmChange} onNotChanged={s.notChanged} onApprove={() => void s.approve()} onClose={s.closeContact} />
      )}
    </div>
  );
}

// Ряд сценариев: четыре сценария для сцены крупно и по порядку, остальные — запас для вопросов жюри.
function ScenarioRow({ t, lang, active, disabled, onPick }: { t: Dict; lang: Lang; active: string | null; disabled: boolean; onPick: (s: Scenario) => void }) {
  return (
    <section aria-label={t.scenarios} className="mt-5">
      <h2 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">{t.scenarios} · {t.stageTitle}</h2>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {STAGE.map((sc, i) => {
          const on = active === sc.id;
          return (
            <button key={sc.id} onClick={() => onPick(sc)} disabled={disabled} aria-pressed={on}
              className={`rounded-[8px] border-2 bg-sheet px-4 py-2.5 text-left shadow-[0_1px_2px_rgba(21,32,43,0.06)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50 ${on ? "border-ink" : "border-transparent hover:border-ink-3"}`}>
              <span className="flex items-center gap-2">
                <span aria-hidden className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${on ? "bg-ink text-white" : "bg-cell text-ink"}`}>{i + 1}</span>
                <span className="text-[16px] font-semibold leading-tight">{scenarioTitle(sc.id, lang)}</span>
              </span>
              <span className="mt-1 block text-[13px] leading-snug text-ink-2">{scenarioHint(sc.id, lang)}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[13px] text-ink-3">{t.moreTitle}:</span>
        {MORE.map((sc) => {
          const on = active === sc.id;
          return (
            <button key={sc.id} onClick={() => onPick(sc)} disabled={disabled} aria-pressed={on} title={scenarioHint(sc.id, lang)}
              className={`h-8 rounded-full border px-3 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink disabled:opacity-50 ${on ? "border-ink bg-ink text-white" : "border-rule bg-sheet text-ink-2 hover:border-ink-3 hover:text-ink"}`}>
              {scenarioTitle(sc.id, lang)}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Legend({ color, text }: { color: string; text: string }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden className={`h-2.5 w-4 rounded-[2px] opacity-60 ${color}`} />
      {text}
    </li>
  );
}
