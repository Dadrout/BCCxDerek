"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { CheckResult, Status } from "@/lib/types";
import type { Highlight } from "@/components/PdfView";
import { SAMPLES, CLIENT } from "@/lib/registry";
import { formatIban, bankByIban } from "@/lib/iban";
import { check } from "@/lib/check";
import { PRODUCT_NAME } from "@/lib/brand";

const PdfView = dynamic(() => import("@/components/PdfView"), { ssr: false });

type PayState = "draft" | "postponed" | "sent" | "blocked";
type LogEntry = { time: string; text: string };

// Один цвет на статус. Полоса вердикта залита этим цветом целиком.
const STATUS: Record<Status, { label: string; band: string; flag: string; wash: string }> = {
  match: { label: "Совпадение", band: "bg-go", flag: "bg-go text-white", wash: "bg-go-wash" },
  mismatch: { label: "Расхождение", band: "bg-stop", flag: "bg-stop text-white", wash: "bg-stop-wash" },
  unreadable: { label: "Недостаточно данных", band: "bg-hold", flag: "bg-hold text-white", wash: "bg-hold-wash" },
  new_supplier: { label: "Новый поставщик", band: "bg-new", flag: "bg-new text-white", wash: "bg-new-wash" },
};

const now = () => new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const money = (v: string | null) => (v ? Number(v.replace(/\D/g, "")).toLocaleString("ru-RU") + " ₸" : "—");

export default function Home() {
  const [src, setSrc] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [res, setRes] = useState<CheckResult | null>(null);
  const [pay, setPay] = useState<PayState>("draft");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [contactOpen, setContactOpen] = useState(false);
  const [manualIban, setManualIban] = useState("");
  const [manualBin, setManualBin] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!contactOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setContactOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [contactOpen]);

  const addLog = (text: string) => setLog((l) => [{ time: now(), text }, ...l]);

  async function run(body: FormData, url: string, name: string) {
    setLoading(true); setError(null); setRes(null); setPay("draft"); setLog([]); setManualIban(""); setManualBin("");
    setSrc(url); setFileName(name);
    try {
      const r = await fetch("/api/check", { method: "POST", body });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Не удалось проверить счёт. Попробуйте загрузить его ещё раз.");
      setRes(j);
      addLog(`Счёт «${name}» загружен, реквизиты извлечены (${j.extraction.mode === "claude" ? "Claude" : "локальный разбор"}). Результат: ${STATUS[j.status as Status].label.toLowerCase()}.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function pickSample(file: string, title: string) {
    const fd = new FormData(); fd.append("sample", file);
    run(fd, `/samples/${file}`, title);
  }
  function upload(f: File) {
    const fd = new FormData(); fd.append("file", f);
    run(fd, URL.createObjectURL(f), f.name);
  }
  function applyManual() {
    if (!res) return;
    const ex = structuredClone(res.extraction);
    ex.readable = true;
    if (manualIban) ex.iban = { value: manualIban, fragment: "введено вручную", confidence: "high" };
    if (manualBin) ex.bin = { value: manualBin, fragment: "введено вручную", confidence: "high" };
    const r = check(ex);
    setRes(r);
    addLog(`Реквизиты введены вручную. Повторная сверка: ${STATUS[r.status].label.toLowerCase()}.`);
  }

  const highlights: Highlight[] = [];
  if (res?.extraction.iban.fragment && res.extraction.iban.fragment !== "введено вручную")
    highlights.push({ needle: res.iban.document ? formatIban(res.iban.document) : res.extraction.iban.fragment, color: res.status === "match" ? "green" : res.status === "mismatch" ? "red" : "amber" });
  if (res?.status === "mismatch") {
    if (res.extraction.change_request_text) highlights.push({ needle: res.extraction.change_request_text, color: "amber" });
    if (res.extraction.phone_in_document.value) highlights.push({ needle: "Тел.: " + res.extraction.phone_in_document.value, color: "amber" });
  }

  const st = res ? STATUS[res.status] : null;
  const ex = res?.extraction;
  const sampleActive = SAMPLES.some((s) => s.title === fileName);

  return (
    <div className="min-h-screen">
      <header className="bg-ink text-white">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-3 sm:px-6">
          <div className="flex items-baseline gap-3">
            <span className="text-[15px] font-semibold">BCC Business</span>
            <span className="text-[13px] text-white/55">демо-стенд</span>
          </div>
          <div className="text-right">
            <div className="text-[14px] font-medium">{CLIENT.name}</div>
            <div className="text-[12px] text-white/55">БИН {CLIENT.bin}</div>
          </div>
        </div>
        <p className="border-t border-white/10 px-4 py-1.5 text-center text-[12px] text-white/55">
          Прототип для ITU Hackathon-2026 по кейсу Банка ЦентрКредит. Не продукт банка, все компании, БИН, IBAN и платежи вымышлены.
        </p>
      </header>

      <main className="mx-auto max-w-[1240px] px-4 pb-16 pt-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[14px] text-ink-3">Платежи / Новый платёж по счёту</p>
            <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-[-0.01em] sm:text-[32px]">Оплата счёта поставщика</h1>
          </div>
          <p className="max-w-[34ch] text-[14px] leading-snug text-ink-2">
            <span className="font-semibold text-ink">{PRODUCT_NAME}</span> проверяет реквизиты поставщика до того, как платёж уйдёт на подпись.
          </p>
        </div>

        {/* Выбор счёта */}
        <nav aria-label="Счёт для проверки" className="mt-6 border-b border-rule">
          <div className="-mb-px flex gap-1 overflow-x-auto">
            {SAMPLES.map((s) => {
              const on = fileName === s.title;
              return (
                <button key={s.file} onClick={() => pickSample(s.file, s.title)} disabled={loading} aria-pressed={on}
                  className={`group min-w-[180px] shrink-0 border-b-2 px-3 pb-3 pt-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink disabled:opacity-50 ${on ? "border-ink" : "border-transparent hover:border-ink-3"}`}>
                  <span className={`block text-[15px] font-medium ${on ? "text-ink" : "text-ink-2 group-hover:text-ink"}`}>{s.title}</span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-ink-3">{s.hint}</span>
                </button>
              );
            })}
            <button onClick={() => fileInput.current?.click()} disabled={loading} aria-pressed={!!fileName && !sampleActive}
              className={`min-w-[160px] shrink-0 border-b-2 px-3 pb-3 pt-2 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink disabled:opacity-50 ${fileName && !sampleActive ? "border-ink" : "border-transparent hover:border-ink-3"}`}>
              <span className="block text-[15px] font-medium text-ink-2">Загрузить свой PDF</span>
              <span className="mt-0.5 block text-[13px] text-ink-3">Любой счёт с компьютера</span>
              <input ref={fileInput} type="file" accept="application/pdf" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
            </button>
          </div>
        </nav>

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* Документ */}
          <section aria-label="Счёт" className="lg:sticky lg:top-6">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[15px] font-medium">{fileName ? `Счёт: ${fileName}` : "Счёт"}</h2>
              {ex && <span className="text-[13px] text-ink-3">{ex.mode === "claude" ? "Распознано Claude" : "Локальный разбор текста PDF"}</span>}
            </div>
            <PdfView src={src} highlights={highlights} />
            {highlights.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-2">
                {res?.status === "match" && <Legend color="bg-go" text="IBAN совпал с карточкой" />}
                {res?.status === "mismatch" && <Legend color="bg-stop" text="IBAN не совпал с карточкой" />}
                {highlights.some((h) => h.color === "amber") && <Legend color="bg-[#d68c14]" text={res?.status === "mismatch" ? "Признаки подмены" : "Прочитано неуверенно"} />}
              </ul>
            )}
          </section>

          {/* Проверка и платёж */}
          <section aria-label="Результат проверки" aria-live="polite" className="overflow-hidden rounded-[10px] bg-sheet shadow-[0_1px_2px_rgba(21,32,43,0.08),0_8px_24px_-12px_rgba(21,32,43,0.18)]">
            {loading && (
              <div className="p-6 sm:p-8">
                <p className="text-[15px] text-ink-2">Читаю счёт и сверяю реквизиты с карточкой поставщика…</p>
                <div className="mt-5 flex flex-wrap gap-2" aria-hidden>
                  {Array.from({ length: 5 }).map((_, g) => (
                    <div key={g} className="flex gap-[3px]">
                      {Array.from({ length: 4 }).map((_, i) => <span key={i} className="h-9 w-[22px] animate-pulse rounded-[3px] bg-cell sm:h-11 sm:w-[25px]" />)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="border-l-4 border-stop p-6">
                <p className="text-[15px] font-medium">Проверка не прошла</p>
                <p className="mt-1 text-[14px] text-ink-2">{error}</p>
              </div>
            )}

            {!res && !loading && !error && (
              <div className="p-6 sm:p-8">
                <p className="text-[20px] font-semibold leading-snug">Выберите счёт, чтобы проверить реквизиты</p>
                <p className="mt-2 max-w-[56ch] text-[15px] leading-relaxed text-ink-2">
                  {PRODUCT_NAME} прочитает IBAN и БИН получателя и сравнит их с подтверждённой карточкой поставщика. Платёж уходит на подпись, только если реквизиты совпали.
                </p>
                <div className="mt-6 flex flex-wrap gap-2" aria-hidden>
                  {Array.from({ length: 5 }).map((_, g) => (
                    <div key={g} className="flex gap-[3px]">
                      {Array.from({ length: 4 }).map((_, i) => <span key={i} className="h-9 w-[22px] rounded-[3px] bg-cell sm:h-11 sm:w-[25px]" />)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {res && st && ex && (
              <>
                {/* Вердикт */}
                <div className={`${st.band} px-5 pb-5 pt-4 text-white sm:px-8`}>
                  <p className="text-[14px] font-medium text-white/80">{st.label}</p>
                  <h2 className="mt-1 max-w-[30ch] text-[24px] font-semibold leading-[1.2] tracking-[-0.01em] sm:text-[26px]">{res.headline}</h2>
                </div>

                <div className="px-5 py-6 sm:px-8">
                  {(res.iban.document || res.iban.reference) && (
                    <div className="space-y-3">
                      {res.iban.reference && (
                        <IbanCells label="Карточка поставщика" iban={res.iban.reference} diff={res.iban.diffPositions} mark="outline" />
                      )}
                      {res.iban.document && (
                        <IbanCells label="В этом счёте" iban={res.iban.document} diff={res.status === "mismatch" ? res.iban.diffPositions : []} mark="fill" flag={st.flag}
                          unknownFlag="bg-hold-wash text-hold" />
                      )}
                    </div>
                  )}

                  <ul className="mt-6 space-y-2.5 text-[15px] leading-relaxed">
                    {res.reasons.map((r, i) => (
                      <li key={i} className="relative pl-5">
                        <span aria-hidden className={`absolute left-0 top-[0.62em] h-[7px] w-[7px] rounded-full ${st.band}`} />
                        {r}
                      </li>
                    ))}
                  </ul>
                  {ex.warning && <p className="mt-4 rounded-md bg-hold-wash px-3 py-2 text-[13px] text-hold">{ex.warning}</p>}

                  {res.status === "unreadable" && (
                    <div className="mt-6 border-t border-rule pt-5">
                      <h3 className="text-[15px] font-semibold">Ввести реквизиты вручную</h3>
                      <p className="mt-1 text-[14px] text-ink-2">Сверьте с оригиналом и введите посимвольно. Карточка поставщика при этом не меняется.</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1.4fr]">
                        <label className="block">
                          <span className="sr-only">БИН поставщика</span>
                          <input value={manualBin} onChange={(e) => setManualBin(e.target.value)} placeholder="БИН, 12 цифр" inputMode="numeric" className="input font-mono text-[14px]" />
                        </label>
                        <label className="block">
                          <span className="sr-only">IBAN</span>
                          <input value={manualIban} onChange={(e) => setManualIban(e.target.value)} placeholder="KZ21 8560 …" className="input font-mono text-[14px] uppercase" />
                        </label>
                      </div>
                      <button onClick={applyManual} disabled={!manualIban} className="btn btn-primary mt-3">Сверить ещё раз</button>
                    </div>
                  )}

                  {res.status === "new_supplier" && (
                    <div className="mt-6 border-t border-rule pt-5">
                      <h3 className="text-[15px] font-semibold">Как проверить нового поставщика</h3>
                      <ol className="mt-3 space-y-2 text-[15px] leading-relaxed">
                        {[
                          "Проверьте БИН и регистрационные данные в официальном реестре.",
                          "Возьмите реквизиты из независимого источника: договора или письма с подписью.",
                          "Позвоните по номеру, которого нет в этом счёте.",
                          "Попросите второго уполномоченного сотрудника утвердить карточку.",
                        ].map((t, i) => (
                          <li key={i} className="grid grid-cols-[1.75rem_1fr]">
                            <span className="font-mono text-[13px] leading-[1.9] text-new">{i + 1}</span>
                            <span>{t}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Действия */}
                  {(res.status === "match" || res.status === "mismatch") && pay !== "blocked" && pay !== "sent" && (
                    <div className="mt-7 flex flex-wrap gap-2">
                      {res.status === "match" && pay === "draft" && (
                        <button onClick={() => { setPay("sent"); addLog("Платёж передан на подпись (демо)."); }} className="btn btn-primary">Передать платёж на подпись</button>
                      )}
                      {res.status === "mismatch" && pay === "draft" && (
                        <>
                          <button onClick={() => { setPay("postponed"); addLog("Платёж отложен. Черновик сохранён до проверки реквизитов."); }} className="btn btn-stop">Отложить платёж</button>
                          <button onClick={() => { setContactOpen(true); addLog("Открыт сохранённый контакт поставщика из договора."); }} className="btn btn-secondary">Позвонить по номеру из договора</button>
                        </>
                      )}
                      {res.status === "mismatch" && pay === "postponed" && (
                        <button onClick={() => setContactOpen(true)} className="btn btn-secondary">Записать результат звонка</button>
                      )}
                    </div>
                  )}

                  {pay !== "draft" && (
                    <p className={`mt-5 flex items-start gap-2.5 rounded-md px-3 py-2.5 text-[14px] font-medium ${pay === "sent" ? "bg-go-wash text-go" : pay === "blocked" ? "bg-stop-wash text-stop" : "bg-cell text-ink"}`}>
                      <span aria-hidden className={`mt-[0.45em] h-2 w-2 shrink-0 rounded-full ${pay === "sent" ? "bg-go" : pay === "blocked" ? "bg-stop" : "bg-ink"}`} />
                      {pay === "sent" && "Платёж передан на подпись. Это демо, деньги не отправляются."}
                      {pay === "postponed" && "Платёж отложен. Черновик сохранён, отправить его нельзя до проверки реквизитов."}
                      {pay === "blocked" && "Платёж отменён. Счёт отмечен как подозрительный, обращение в банк подготовлено."}
                    </p>
                  )}
                </div>

                {/* Платёжное поручение */}
                <Block title="Платёжное поручение" note="Заполнено из счёта">
                  <dl className="grid grid-cols-[minmax(96px,132px)_1fr] gap-x-4 gap-y-2.5 text-[15px]">
                    <Fld k="Получатель" f={ex.supplier_name} />
                    <Fld k="БИН" f={ex.bin} mono />
                    <dt className="text-ink-3">IBAN</dt>
                    <dd className="min-w-0">
                      <div className={`font-mono text-[14px] ${res.status === "mismatch" ? "font-medium text-stop" : ""}`}>{res.iban.document ? formatIban(res.iban.document) : ex.iban.value ?? "—"}</div>
                      {res.iban.document && (
                        <div className="mt-0.5 text-[13px] text-ink-3">
                          {res.iban.checksumOk ? "Контрольная сумма верна" : "Контрольная сумма не сходится"}
                          {res.iban.documentBank && `, ${res.iban.documentBank}`}
                        </div>
                      )}
                    </dd>
                    <Fld k="Банк" f={ex.bank_name} />
                    <dt className="text-ink-3">Сумма</dt><dd className="text-[16px] font-semibold">{money(ex.amount.value)}</dd>
                    <Fld k="Счёт №" f={ex.invoice_number} />
                  </dl>
                </Block>

                {/* Карточка поставщика */}
                <Block title="Подтверждённая карточка поставщика" note="Загрузка счёта её не меняет">
                  {res.supplier ? (
                    <div className="text-[15px]">
                      <p className="font-medium">{res.supplier.name}</p>
                      <p className="mt-0.5 text-ink-2">БИН <span className="font-mono text-[14px]">{res.supplier.bin}</span></p>
                      <p className="mt-2 font-mono text-[14px]">{formatIban(res.supplier.iban)}</p>
                      <p className="text-[13px] text-ink-3">{bankByIban(res.supplier.iban)}</p>
                      <p className="mt-3 max-w-[60ch] text-[13px] leading-relaxed text-ink-2">
                        Подтверждена {res.supplier.verifiedAt}. {res.supplier.verificationMethod}. {res.supplier.verifiedBy}.
                      </p>
                    </div>
                  ) : (
                    <p className="text-[15px] text-ink-2">Карточки для этого поставщика нет.</p>
                  )}
                </Block>

                {/* Сигнал банка */}
                <Block title="Что видит банк при отправке">
                  {res.iban.document ? (
                    res.bankSignal.ibanSeenBefore ? (
                      <p className="text-[15px] leading-relaxed">
                        Получатель знакомый: {res.bankSignal.paymentsToThisIban} {plural(res.bankSignal.paymentsToThisIban, "платёж", "платежа", "платежей")} на этот IBAN за полгода. Дополнительная проверка не нужна.
                      </p>
                    ) : (
                      <p className="text-[15px] leading-relaxed">
                        <span className="font-semibold text-stop">Этого IBAN нет в истории платежей клиента.</span>
                        {res.supplier && ` Поставщику с этим БИН клиент платил ${res.bankSignal.paymentsToSupplier} раз, всегда на другой счёт.`}
                        {" "}Банк может отправить такой платёж на усиленное подтверждение.
                      </p>
                    )
                  ) : (
                    <p className="text-[15px] text-ink-2">IBAN не определён, поэтому банк не может оценить получателя.</p>
                  )}
                </Block>

                {/* Журнал */}
                {log.length > 0 && (
                  <Block title="Журнал проверки">
                    <ol className="space-y-1.5 text-[13px] leading-relaxed text-ink-2">
                      {log.map((l, i) => (
                        <li key={i} className="grid grid-cols-[4.75rem_1fr] gap-2">
                          <time className="font-mono text-[12px] leading-[1.75] text-ink-3">{l.time}</time>
                          <span>{l.text}</span>
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

      {contactOpen && res?.supplier && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 sm:items-center" onClick={() => setContactOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="contact-title" className="w-full max-w-[440px] overflow-hidden rounded-[10px] bg-sheet shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <p className="text-[13px] text-ink-3">Контакт из {res.supplier.contact.source}</p>
              <h2 id="contact-title" className="mt-1 text-[20px] font-semibold">{res.supplier.contact.person}</h2>
              <p className="text-[14px] text-ink-2">{res.supplier.contact.role}, {res.supplier.name}</p>
              <a href={`tel:${res.supplier.contact.phone.replace(/\s/g, "")}`} className="mt-4 block font-mono text-[24px] font-medium tracking-tight underline-offset-4 hover:underline">{res.supplier.contact.phone}</a>
              {ex?.phone_in_document.value && ex.phone_in_document.value.replace(/\D/g, "") !== res.supplier.contact.phone.replace(/\D/g, "") && (
                <p className="mt-3 rounded-md bg-hold-wash px-3 py-2 text-[13px] leading-relaxed text-hold">
                  Не звоните на номер из счёта, <span className="font-mono">{ex.phone_in_document.value}</span>. Его мог вписать тот, кто подменил реквизиты.
                </p>
              )}
              <h3 className="mt-5 text-[14px] font-semibold">Что спросить</h3>
              <ul className="mt-1.5 space-y-1.5 text-[14px] leading-relaxed text-ink-2">
                <li>Меняли ли вы банковские реквизиты?</li>
                <li>Назовите последние четыре цифры вашего IBAN. Сами цифры не подсказывайте.</li>
              </ul>
            </div>
            <div className="grid gap-2 border-t border-rule bg-cell/60 p-4">
              <button className="btn btn-secondary" onClick={() => { setContactOpen(false); setPay("postponed"); addLog("Поставщик подтвердил смену реквизитов. Создана заявка на изменение карточки, её утверждает второй уполномоченный сотрудник. Карточка пока не изменена, платёж отложен."); }}>
                Поставщик подтвердил новые реквизиты
              </button>
              <button className="btn btn-stop" onClick={() => { setContactOpen(false); setPay("blocked"); addLog("Поставщик реквизиты не менял. Платёж отменён, счёт отмечен как подозрительный, обращение в банк подготовлено."); }}>
                Поставщик реквизиты не менял
              </button>
              <button className="btn-quiet btn mx-auto" onClick={() => setContactOpen(false)}>Закрыть</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
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

function Fld({ k, f, mono }: { k: string; f: { value: string | null; fragment: string | null; confidence: string }; mono?: boolean }) {
  return (
    <>
      <dt className="text-ink-3">{k}</dt>
      <dd className="min-w-0">
        {f.value ? <span className={mono ? "font-mono text-[14px]" : ""}>{f.value}</span> : <span className="text-ink-3">Не найдено в счёте</span>}
        {f.value && f.confidence !== "high" && (
          <span className="ml-2 rounded-[3px] bg-hold-wash px-1.5 py-0.5 text-[12px] text-hold">{f.confidence === "medium" ? "Прочитано не точно" : "Прочитано плохо"}</span>
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
