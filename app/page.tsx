"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { CheckResult, Status } from "@/lib/types";
import type { Highlight } from "@/components/PdfView";
import { SAMPLES, CLIENT, type SupplierCard } from "@/lib/registry";
import { formatIban, bankByIban } from "@/lib/iban";
import { check } from "@/lib/check";
import { PRODUCT_NAME } from "@/lib/brand";
import { DICT, LANGS, DEFAULT_LANG, bankName, type Dict, type Lang } from "@/lib/i18n";

const PdfView = dynamic(() => import("@/components/PdfView"), { ssr: false });

type PayState = "draft" | "postponed" | "sent" | "blocked";
// Запись журнала хранит функцию, чтобы журнал переводился вместе с интерфейсом.
type LogEntry = { time: string; render: (t: Dict) => string };
type Doc = { kind: "sample"; file: string } | { kind: "upload"; name: string } | null;

// Один цвет на статус. Полоса вердикта залита этим цветом целиком.
const STATUS_STYLE: Record<Status, { band: string; flag: string; wash: string; accent: string }> = {
  match: { band: "bg-go", flag: "bg-go text-white", wash: "bg-go-wash", accent: "border-go" },
  mismatch: { band: "bg-stop", flag: "bg-stop text-white", wash: "bg-stop-wash", accent: "border-stop" },
  unreadable: { band: "bg-hold", flag: "bg-hold text-white", wash: "bg-hold-wash", accent: "border-hold" },
  new_supplier: { band: "bg-new", flag: "bg-new text-white", wash: "bg-new-wash", accent: "border-new" },
};
const LOCALE: Record<Lang, string> = { kk: "ru-RU", ru: "ru-RU", en: "en-GB" };
const MANUAL = "manual";
const LANG_KEY = "derek-lang";

const now = () => new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export default function Home() {
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG);
  const [src, setSrc] = useState<string | null>(null);
  const [doc, setDoc] = useState<Doc>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [res, setRes] = useState<CheckResult | null>(null);
  const [pay, setPay] = useState<PayState>("draft");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [contactOpen, setContactOpen] = useState(false);
  const [manualIban, setManualIban] = useState("");
  const [manualBin, setManualBin] = useState("");
  const [ai, setAi] = useState<Partial<Record<Lang, { state: "loading" | "done" | "offline" | "failed"; text?: string }>>>({});
  const [aiModel, setAiModel] = useState<string>("gpt-oss-120b");
  const fileInput = useRef<HTMLInputElement>(null);
  const t = DICT[lang];

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

  useEffect(() => {
    if (!contactOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setContactOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [contactOpen]);

  // Сервер отдаёт результат на русском. Текст вердикта пересчитывается на выбранном языке.
  const view = useMemo(() => (res ? check(res.extraction, lang) : null), [res, lang]);

  // ИИ объясняет результат сверки на выбранном языке. Ответ кешируется по языку.
  useEffect(() => {
    if (!res || ai[lang]) return;
    let cancelled = false;
    setAi((a) => ({ ...a, [lang]: { state: "loading" } }));
    fetch("/api/explain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ extraction: res.extraction, lang }) })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.model) setAiModel(String(j.model).replace(/^openai\//, ""));
        setAi((a) => ({ ...a, [lang]: j.text ? { state: "done", text: j.text } : { state: j.code === "offline" ? "offline" : "failed" } }));
      })
      .catch(() => !cancelled && setAi((a) => ({ ...a, [lang]: { state: "failed" } })));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [res, lang]);

  const addLog = (render: (t: Dict) => string) => setLog((l) => [{ time: now(), render }, ...l]);
  const docName = (d: Doc, tt: Dict) => (!d ? "" : d.kind === "sample" ? tt.samples[d.file]?.title ?? d.file : d.name);

  async function run(body: FormData, url: string, next: Doc) {
    setLoading(true); setError(null); setRes(null); setAi({}); setPay("draft"); setLog([]); setManualIban(""); setManualBin("");
    setSrc(url); setDoc(next);
    try {
      const r = await fetch("/api/check", { method: "POST", body });
      const j = await r.json();
      if (!r.ok) throw new Error(j.code || "generic");
      setRes(j);
      const status = j.status as Status, mode = j.extraction.mode;
      const model = String(j.extraction.model ?? "").replace(/^openai\//, "");
      addLog((tt) => tt.logLoaded(docName(next, tt), mode === "groq" ? tt.modeGroq(model).charAt(0).toLowerCase() + tt.modeGroq(model).slice(1) : mode === "claude" ? "Claude" : tt.modeLocal.charAt(0).toLowerCase() + tt.modeLocal.slice(1), tt.status[status].toLowerCase()));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function pickSample(file: string) {
    const fd = new FormData(); fd.append("sample", file);
    run(fd, `/samples/${file}`, { kind: "sample", file });
  }
  function upload(f: File) {
    const fd = new FormData(); fd.append("file", f);
    run(fd, URL.createObjectURL(f), { kind: "upload", name: f.name });
  }
  function applyManual() {
    if (!res) return;
    const ex = structuredClone(res.extraction);
    ex.readable = true;
    if (manualIban) ex.iban = { value: manualIban, fragment: MANUAL, confidence: "high" };
    if (manualBin) ex.bin = { value: manualBin, fragment: MANUAL, confidence: "high" };
    const r = check(ex);
    setAi({});
    setRes(r);
    addLog((tt) => tt.logManual(tt.status[r.status].toLowerCase()));
  }

  const highlights: Highlight[] = [];
  if (view?.extraction.iban.fragment && view.extraction.iban.fragment !== MANUAL)
    highlights.push({ needle: view.iban.document ? formatIban(view.iban.document) : view.extraction.iban.fragment, color: view.status === "match" ? "green" : view.status === "mismatch" ? "red" : "amber" });
  if (view?.status === "mismatch") {
    if (view.extraction.change_request_text) highlights.push({ needle: view.extraction.change_request_text, color: "amber" });
    if (view.extraction.phone_in_document.value) highlights.push({ needle: "Тел.: " + view.extraction.phone_in_document.value, color: "amber" });
  }

  const st = view ? STATUS_STYLE[view.status] : null;
  const ex = view?.extraction;
  const money = (v: string | null) => (v ? Number(v.replace(/\D/g, "")).toLocaleString(LOCALE[lang]) + " ₸" : "—");
  const warning = ex?.warning ? [ex.warning.includes("ИИ недоступен") && t.warnClaude, ex.warning.includes("текстового слоя") && t.warnNoText].filter(Boolean).join(" ") || ex.warning : null;
  const sup = view?.supplier ? localSupplier(view.supplier, t) : null;

  return (
    <div className="min-h-screen">
      <header className="bg-ink text-white">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <div className="flex items-baseline gap-3">
            <span className="text-[15px] font-semibold">BCC Business</span>
            <span className="text-[13px] text-white/55">{t.demo}</span>
          </div>
          <div className="flex items-center gap-5 sm:gap-7">
            <div role="group" aria-label={t.langSwitch} className="flex rounded-md bg-white/[0.07] p-0.5">
              {LANGS.map((l) => (
                <button key={l.id} lang={l.id} title={l.name} aria-pressed={lang === l.id} onClick={() => setLang(l.id)}
                  className={`h-7 rounded-[5px] px-2.5 text-[12px] font-semibold tracking-[0.02em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white ${lang === l.id ? "bg-white text-ink" : "text-white/65 hover:text-white"}`}>
                  {l.label}
                </button>
              ))}
            </div>
            <div className="text-right">
              <div className="text-[14px] font-medium">{CLIENT.name}</div>
              <div className="text-[12px] text-white/55">{t.bin} {CLIENT.bin}</div>
            </div>
          </div>
        </div>
        <p className="border-t border-white/10 px-4 py-1.5 text-center text-[12px] text-white/55">{t.disclaimer}</p>
      </header>

      <main className="mx-auto max-w-[1240px] px-4 pb-16 pt-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[14px] text-ink-3">{t.crumbs}</p>
            <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-[-0.01em] sm:text-[32px]">{t.title}</h1>
          </div>
          <p className="max-w-[38ch] text-[14px] leading-snug text-ink-2">
            <span className="font-semibold text-ink">{PRODUCT_NAME}</span>{t.pitch("").replace(/^\s*/, " ")}
          </p>
        </div>

        {/* Выбор счёта */}
        <nav aria-label={t.pickInvoice} className="mt-6 border-b border-rule">
          <div className="-mb-px flex gap-1 overflow-x-auto lg:grid lg:grid-cols-5 lg:overflow-visible">
            {SAMPLES.map((s) => {
              const on = doc?.kind === "sample" && doc.file === s.file;
              const txt = t.samples[s.file] ?? { title: s.title, hint: s.hint };
              return (
                <button key={s.file} onClick={() => pickSample(s.file)} disabled={loading} aria-pressed={on}
                  className={`group min-w-[180px] shrink-0 border-b-2 lg:min-w-0 px-3 pb-3 pt-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink disabled:opacity-50 ${on ? "border-ink" : "border-transparent hover:border-ink-3"}`}>
                  <span className={`block text-[15px] font-medium ${on ? "text-ink" : "text-ink-2 group-hover:text-ink"}`}>{txt.title}</span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-ink-3">{txt.hint}</span>
                </button>
              );
            })}
            <button onClick={() => fileInput.current?.click()} disabled={loading} aria-pressed={doc?.kind === "upload"}
              className={`min-w-[160px] shrink-0 border-b-2 lg:min-w-0 px-3 pb-3 pt-2 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink disabled:opacity-50 ${doc?.kind === "upload" ? "border-ink" : "border-transparent hover:border-ink-3"}`}>
              <span className="block text-[15px] font-medium text-ink-2">{t.uploadTitle}</span>
              <span className="mt-0.5 block text-[13px] text-ink-3">{t.uploadHint}</span>
              <input ref={fileInput} type="file" accept="application/pdf" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
            </button>
          </div>
        </nav>

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* Документ */}
          <section aria-label={t.invoice} className="lg:sticky lg:top-6">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[15px] font-medium">{doc ? t.invoiceNamed(docName(doc, t)) : t.invoice}</h2>
              {ex && <span className={`text-[13px] ${ex.mode === "local" ? "text-ink-3" : "font-medium text-ink-2"}`}>{ex.mode === "groq" ? t.modeGroq(String(ex.model ?? "").replace(/^openai\//, "")) : ex.mode === "claude" ? t.modeClaude : t.modeLocal}</span>}
            </div>
            <PdfView src={src} highlights={highlights} emptyText={t.pdfEmpty} />
            {highlights.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-2">
                {view?.status === "match" && <Legend color="bg-go" text={t.legendMatch} />}
                {view?.status === "mismatch" && <Legend color="bg-stop" text={t.legendMismatch} />}
                {highlights.some((h) => h.color === "amber") && <Legend color="bg-[#d68c14]" text={view?.status === "mismatch" ? t.legendFraud : view?.status === "new_supplier" ? t.legendFound : t.legendUnsure} />}
              </ul>
            )}
          </section>

          {/* Проверка и платёж */}
          <section aria-label={t.result} aria-live="polite" className="overflow-hidden rounded-[10px] bg-sheet shadow-[0_1px_2px_rgba(21,32,43,0.08),0_8px_24px_-12px_rgba(21,32,43,0.18)]">
            {loading && (
              <div className="p-6 sm:p-8">
                <p className="text-[15px] text-ink-2">{t.loadingRead}</p>
                <EmptyCells pulse />
              </div>
            )}

            {error && (
              <div className="border-l-4 border-stop p-6">
                <p className="text-[15px] font-medium">{t.failed}</p>
                <p className="mt-1 text-[14px] text-ink-2">{t.errors[error] ?? t.errors.generic}</p>
              </div>
            )}

            {!view && !loading && !error && (
              <div className="p-6 sm:p-8">
                <p className="text-[20px] font-semibold leading-snug">{t.emptyTitle}</p>
                <p className="mt-2 max-w-[56ch] text-[15px] leading-relaxed text-ink-2">{t.emptyText(PRODUCT_NAME)}</p>
                <EmptyCells />
              </div>
            )}

            {view && st && ex && (
              <>
                {/* Вердикт */}
                <div className={`${st.band} px-5 pb-5 pt-4 text-white sm:px-8`}>
                  <p className="text-[14px] font-medium text-white/80">{t.status[view.status]}</p>
                  <h2 className="mt-1 max-w-[32ch] text-[24px] font-semibold leading-[1.2] tracking-[-0.01em] sm:text-[26px]">{view.headline}</h2>
                </div>

                <ol className="flex flex-wrap gap-x-6 gap-y-1.5 border-b border-rule px-5 py-3 text-[13px] sm:px-8" aria-label={t.result}>
                  <Step done muted={ex.mode === "local"} n={1} text={ex.mode === "local" ? t.stepReadOffline : t.stepRead} />
                  <Step done n={2} text={t.stepCompare} />
                  <Step done={ai[lang]?.state === "done"} busy={ai[lang]?.state === "loading"} muted={ai[lang]?.state === "offline" || ai[lang]?.state === "failed"} n={3} text={t.stepExplain} />
                </ol>

                <div className="px-5 py-6 sm:px-8">
                  {(view.iban.document || view.iban.reference) && (
                    <div className="space-y-3">
                      {view.iban.reference && (
                        <IbanCells label={t.rowCard} iban={view.iban.reference} diff={view.iban.diffPositions} mark="outline" />
                      )}
                      {view.iban.document && (
                        <IbanCells label={t.rowInvoice} iban={view.iban.document} diff={view.status === "mismatch" ? view.iban.diffPositions : []} mark="fill" flag={st.flag}
                          unknownFlag="bg-hold-wash text-hold" />
                      )}
                    </div>
                  )}

                  <AiSummary t={t} state={ai[lang]} model={aiModel} wash={st.wash} accent={st.accent} />

                  <ul className="mt-6 space-y-2.5 text-[15px] leading-relaxed">
                    {view.reasons.map((r, i) => (
                      <li key={i} className="relative pl-5">
                        <span aria-hidden className={`absolute left-0 top-[0.62em] h-[7px] w-[7px] rounded-full ${st.band}`} />
                        {r}
                      </li>
                    ))}
                  </ul>
                  {warning && <p className="mt-4 rounded-md bg-hold-wash px-3 py-2 text-[13px] text-hold">{warning}</p>}

                  {view.status === "unreadable" && (
                    <div className="mt-6 border-t border-rule pt-5">
                      <h3 className="text-[15px] font-semibold">{t.manualTitle}</h3>
                      <p className="mt-1 text-[14px] text-ink-2">{t.manualText}</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1.4fr]">
                        <label className="block">
                          <span className="sr-only">{t.binLabel}</span>
                          <input value={manualBin} onChange={(e) => setManualBin(e.target.value)} placeholder={t.binPlaceholder} inputMode="numeric" className="input font-mono text-[14px]" />
                        </label>
                        <label className="block">
                          <span className="sr-only">IBAN</span>
                          <input value={manualIban} onChange={(e) => setManualIban(e.target.value)} placeholder="KZ21 8560 …" className="input font-mono text-[14px] uppercase" />
                        </label>
                      </div>
                      <button onClick={applyManual} disabled={!manualIban} className="btn btn-primary mt-3">{t.recheck}</button>
                    </div>
                  )}

                  {view.status === "new_supplier" && (
                    <div className="mt-6 border-t border-rule pt-5">
                      <h3 className="text-[15px] font-semibold">{t.newTitle}</h3>
                      <ol className="mt-3 space-y-2 text-[15px] leading-relaxed">
                        {t.newSteps.map((s, i) => (
                          <li key={i} className="grid grid-cols-[1.75rem_1fr]">
                            <span className="font-mono text-[13px] leading-[1.9] text-new">{i + 1}</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Действия */}
                  {(view.status === "match" || view.status === "mismatch") && pay !== "blocked" && pay !== "sent" && (
                    <div className="mt-7 flex flex-wrap gap-2">
                      {view.status === "match" && pay === "draft" && (
                        <button onClick={() => { setPay("sent"); addLog((tt) => tt.logSent); }} className="btn btn-primary">{t.sendToSign}</button>
                      )}
                      {view.status === "mismatch" && pay === "draft" && (
                        <>
                          <button onClick={() => { setPay("postponed"); addLog((tt) => tt.logPostponed); }} className="btn btn-stop">{t.postpone}</button>
                          <button onClick={() => { setContactOpen(true); addLog((tt) => tt.logContact); }} className="btn btn-secondary">{t.callSaved}</button>
                        </>
                      )}
                      {view.status === "mismatch" && pay === "postponed" && (
                        <button onClick={() => setContactOpen(true)} className="btn btn-secondary">{t.logCall}</button>
                      )}
                    </div>
                  )}

                  {pay !== "draft" && (
                    <p className={`mt-5 flex items-start gap-2.5 rounded-md px-3 py-2.5 text-[14px] font-medium ${pay === "sent" ? "bg-go-wash text-go" : pay === "blocked" ? "bg-stop-wash text-stop" : "bg-cell text-ink"}`}>
                      <span aria-hidden className={`mt-[0.45em] h-2 w-2 shrink-0 rounded-full ${pay === "sent" ? "bg-go" : pay === "blocked" ? "bg-stop" : "bg-ink"}`} />
                      {pay === "sent" && t.paySent}
                      {pay === "postponed" && t.payPostponed}
                      {pay === "blocked" && t.payBlocked}
                    </p>
                  )}
                </div>

                {/* Платёжное поручение */}
                <Block title={t.order} note={t.orderNote}>
                  <dl className="grid grid-cols-[minmax(96px,132px)_1fr] gap-x-4 gap-y-2.5 text-[15px]">
                    <Fld t={t} k={t.recipient} f={ex.supplier_name} />
                    <Fld t={t} k={t.bin} f={ex.bin} mono />
                    <dt className="text-ink-3">IBAN</dt>
                    <dd className="min-w-0">
                      <div className={`font-mono text-[14px] ${view.status === "mismatch" ? "font-medium text-stop" : ""}`}>{view.iban.document ? formatIban(view.iban.document) : ex.iban.value ?? "—"}</div>
                      {view.iban.document && (
                        <div className="mt-0.5 text-[13px] text-ink-3">
                          {view.iban.checksumOk ? t.checksumOk : t.checksumBad}
                          {view.iban.documentBank && `, ${bankName(view.iban.documentBank, lang)}`}
                        </div>
                      )}
                    </dd>
                    <Fld t={t} k={t.bank} f={ex.bank_name} />
                    <dt className="text-ink-3">{t.amount}</dt><dd className="text-[16px] font-semibold">{money(ex.amount.value)}</dd>
                    <Fld t={t} k={t.invoiceNo} f={ex.invoice_number} />
                  </dl>
                </Block>

                {/* Карточка поставщика */}
                <Block title={t.card} note={t.cardNote}>
                  {view.supplier && sup ? (
                    <div className="text-[15px]">
                      <p className="font-medium">{view.supplier.name}</p>
                      <p className="mt-0.5 text-ink-2">{t.bin} <span className="font-mono text-[14px]">{view.supplier.bin}</span></p>
                      <p className="mt-2 font-mono text-[14px]">{formatIban(view.supplier.iban)}</p>
                      <p className="text-[13px] text-ink-3">{bankName(bankByIban(view.supplier.iban), lang)}</p>
                      <p className="mt-3 max-w-[60ch] text-[13px] leading-relaxed text-ink-2">
                        {t.verifiedOn(view.supplier.verifiedAt, sup.method, sup.by)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[15px] text-ink-2">{t.noCard}</p>
                  )}
                </Block>

                {/* Сигнал банка */}
                <Block title={t.bankSees}>
                  {view.iban.document ? (
                    view.bankSignal.ibanSeenBefore ? (
                      <p className="text-[15px] leading-relaxed">{t.knownRecipient(view.bankSignal.paymentsToThisIban)}</p>
                    ) : (
                      <p className="text-[15px] leading-relaxed">
                        <span className="font-semibold text-stop">{t.unknownIban}</span>
                        {view.supplier && t.unknownIbanSupplier(view.bankSignal.paymentsToSupplier)}
                        {t.unknownIbanTail}
                      </p>
                    )
                  ) : (
                    <p className="text-[15px] text-ink-2">{t.noIbanSignal}</p>
                  )}
                </Block>

                {/* Журнал */}
                {log.length > 0 && (
                  <Block title={t.log}>
                    <ol className="space-y-1.5 text-[13px] leading-relaxed text-ink-2">
                      {log.map((l, i) => (
                        <li key={i} className="grid grid-cols-[4.75rem_1fr] gap-2">
                          <time className="font-mono text-[12px] leading-[1.75] text-ink-3">{l.time}</time>
                          <span>{l.render(t)}</span>
                        </li>
                      ))}
                    </ol>
                  </Block>
                )}
              </>
            )}
          </section>
        </div>
      </main>

      {contactOpen && view?.supplier && sup && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 sm:items-center" onClick={() => setContactOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="contact-title" className="w-full max-w-[440px] overflow-hidden rounded-[10px] bg-sheet shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <p className="text-[13px] text-ink-3">{t.contactFrom(sup.source)}</p>
              <h2 id="contact-title" className="mt-1 text-[20px] font-semibold">{view.supplier.contact.person}</h2>
              <p className="text-[14px] text-ink-2">{sup.role}, {view.supplier.name}</p>
              <a href={`tel:${view.supplier.contact.phone.replace(/\s/g, "")}`} className="mt-4 block font-mono text-[24px] font-medium tracking-tight underline-offset-4 hover:underline">{view.supplier.contact.phone}</a>
              {ex?.phone_in_document.value && ex.phone_in_document.value.replace(/\D/g, "") !== view.supplier.contact.phone.replace(/\D/g, "") && (
                <p className="mt-3 rounded-md bg-hold-wash px-3 py-2 text-[13px] leading-relaxed text-hold">
                  {t.dontCall} <span className="whitespace-nowrap font-mono">{ex.phone_in_document.value}</span>. {t.dontCallTail}
                </p>
              )}
              <h3 className="mt-5 text-[14px] font-semibold">{t.whatToAsk}</h3>
              <ul className="mt-1.5 space-y-1.5 text-[14px] leading-relaxed text-ink-2">
                <li>{t.ask1}</li>
                <li>{t.ask2}</li>
              </ul>
            </div>
            <div className="grid gap-2 border-t border-rule bg-cell/60 p-4">
              <button className="btn btn-secondary" onClick={() => { setContactOpen(false); setPay("postponed"); addLog((tt) => tt.logConfirmed); }}>{t.confirmed}</button>
              <button className="btn btn-stop" onClick={() => { setContactOpen(false); setPay("blocked"); addLog((tt) => tt.logNotChanged); }}>{t.notChanged}</button>
              <button className="btn btn-quiet mx-auto" onClick={() => setContactOpen(false)}>{t.close}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Синтетическая карточка поставщика хранится на русском. Для демо-поставщика есть переводы.
function localSupplier(s: SupplierCard, t: Dict) {
  if (s.id === "sup-dala") return t.supplier;
  return { method: s.verificationMethod, by: s.verifiedBy, role: s.contact.role, source: s.contact.source };
}

function Step({ n, text, done, busy, muted }: { n: number; text: string; done?: boolean; busy?: boolean; muted?: boolean }) {
  return (
    <li className={`flex items-center gap-2 ${muted ? "text-ink-3" : "text-ink"}`}>
      <span aria-hidden className={`flex h-[18px] w-[18px] items-center justify-center rounded-full text-[11px] font-semibold ${done ? "bg-ink text-white" : busy ? "animate-pulse bg-rule text-ink" : "border border-rule text-ink-3"}`}>
        {done ? (
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2.5 6.2 5 8.5l4.5-5" /></svg>
        ) : n}
      </span>
      {text}
    </li>
  );
}

function AiSummary({ t, state, model, wash, accent }: { t: Dict; state?: { state: string; text?: string }; model: string; wash: string; accent: string }) {
  if (!state) return null;
  if (state.state === "offline" || state.state === "failed")
    return <p className="mt-6 text-[13px] text-ink-3">{state.state === "offline" ? t.aiOffline : t.aiFailed}</p>;
  return (
    <figure className={`mt-6 rounded-r-md border-l-[3px] ${accent} ${wash} px-4 py-3.5`}>
      <figcaption className="flex items-center gap-2 text-[13px] font-semibold">
        <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor"><path d="M8 0l1.7 5.1L15 6.8l-5.3 1.7L8 13.6 6.3 8.5 1 6.8l5.3-1.7z" /></svg>
        {t.aiTitle}
      </figcaption>
      {state.state === "loading" ? (
        <p className="mt-1.5 animate-pulse text-[15px] text-ink-2">{t.aiThinking}</p>
      ) : (
        <blockquote className="mt-1.5 max-w-[62ch] text-[15px] leading-relaxed">{state.text}</blockquote>
      )}
      <p className="mt-2 text-[12px] text-ink-3">{t.aiModel(model)}</p>
    </figure>
  );
}

function EmptyCells({ pulse }: { pulse?: boolean }) {
  return (
    <div className="mt-6 flex flex-wrap gap-x-1.5 gap-y-1.5 sm:gap-x-2" aria-hidden>
      {Array.from({ length: 5 }).map((_, g) => (
        <div key={g} className="flex gap-[3px]">
          {Array.from({ length: 4 }).map((_, i) => <span key={i} className={`h-9 w-[22px] rounded-[3px] bg-cell sm:h-11 sm:w-[25px] ${pulse ? "animate-pulse" : ""}`} />)}
        </div>
      ))}
    </div>
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

function Block({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-rule px-5 py-5 sm:px-8">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4">
        <h3 className="text-[15px] font-semibold">{title}</h3>
        {note && <span className="text-[13px] text-ink-3">{note}</span>}
      </div>
      {children}
    </div>
  );
}

function Fld({ t, k, f, mono }: { t: Dict; k: string; f: { value: string | null; fragment: string | null; confidence: string }; mono?: boolean }) {
  return (
    <>
      <dt className="text-ink-3">{k}</dt>
      <dd className="min-w-0">
        {f.value ? <span className={mono ? "font-mono text-[14px]" : ""}>{f.value}</span> : <span className="text-ink-3">{t.notFound}</span>}
        {f.value && f.confidence !== "high" && (
          <span className="ml-2 rounded-[3px] bg-hold-wash px-1.5 py-0.5 text-[12px] text-hold">{f.confidence === "medium" ? t.readMedium : t.readLow}</span>
        )}
      </dd>
    </>
  );
}

// IBAN в клетках, как в бумажном бланке. 20 клеток, по 4 в группе.
function IbanCells({ label, iban, diff, mark, flag = "", unknownFlag = "" }: {
  label: string; iban: string; diff: number[]; mark: "outline" | "fill"; flag?: string; unknownFlag?: string;
}) {
  const groups = iban.split("").reduce<{ c: string; i: number }[][]>((acc, c, i) => {
    if (i % 4 === 0) acc.push([]);
    acc[acc.length - 1].push({ c, i });
    return acc;
  }, []);
  let order = 0;
  return (
    <div>
      <p className="mb-1.5 text-[13px] text-ink-3">{label}</p>
      <div className="flex flex-wrap gap-x-1.5 gap-y-1.5 sm:gap-x-2" aria-label={`${label}: ${formatIban(iban)}`} role="img">
        {groups.map((g, gi) => (
          <div key={gi} className="flex gap-[3px]">
            {g.map(({ c, i }) => {
              const differs = diff.includes(i);
              const unknown = c === "?";
              let cls = "bg-cell text-ink";
              let style: React.CSSProperties | undefined;
              if (unknown) cls = unknownFlag || cls;
              else if (differs && mark === "fill") { cls = `${flag} cell-flag`; style = { animationDelay: `${order++ * 45}ms` }; }
              else if (differs && mark === "outline") cls = "bg-sheet text-ink shadow-[inset_0_0_0_1.5px_var(--color-ink-3)]";
              return (
                <span key={i} style={style}
                  className={`flex h-9 w-[22px] items-center justify-center rounded-[3px] font-mono text-[13px] font-medium sm:h-11 sm:w-[25px] sm:text-[16px] ${cls}`}>
                  {c}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
