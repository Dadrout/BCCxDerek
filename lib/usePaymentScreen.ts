"use client";
// Состояние экрана «Новый платёж»: поля, сценарий, PDF, проверка, отправка, журнал, объяснение ИИ.
// Все обращения к серверу здесь; компоненты только показывают состояние и вызывают действия.
import { useEffect, useRef, useState } from "react";
import type { Action, CheckOutcome, DocumentHints } from "@/lib/signals/types";
import type { FieldError, PaymentFields } from "@/lib/signals/validate";
import type { Extraction } from "@/lib/types";
import type { EmailView } from "@/lib/email/types";
import type { Scenario, ScenarioId } from "@/lib/scenarios";
import { formatIban } from "@/lib/iban";
import { scenarioTitle, signalText, verdictTitle } from "@/lib/signals/texts";
import type { Dict, Lang } from "@/lib/i18n";

export type FieldKey = keyof PaymentFields;
export type VerdictOutcome = Extract<CheckOutcome, { kind: "verdict" }>;
export type PayState = "draft" | "sent" | "postponed" | "blocked" | "requested";
export type Busy = "extract" | "check" | "pay" | "approve" | null;
// Запись журнала хранит функцию, а не строку: журнал переводится вместе с интерфейсом.
export type LogEntry = { id: number; time: string; render: (t: Dict, lang: Lang) => string };
export type Doc = { kind: "sample"; scenario: ScenarioId } | { kind: "upload"; name: string } | null;
export type AiState = { state: "loading" | "done" | "offline" | "failed"; text?: string };
export type ContactStep = "ask" | "approve" | null;

export const EMPTY_FIELDS: PaymentFields = { name: "", bin: "", iban: "", amount: "", purpose: "" };

// IBAN в форме показываем группами по 4 знака; разбор принимает и с пробелами.
const showFields = (f: PaymentFields): PaymentFields => ({ ...f, iban: formatIban(f.iban.replace(/\s+/g, "")) });

const now = () => new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const post = (body: unknown): RequestInit => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

// Каким способом прочитан счёт — для подписи над PDF и для журнала.
export function modeText(ex: Extraction, t: Dict): string {
  if (ex.mode === "groq") return t.modeGroq(String(ex.model ?? "").replace(/^openai\//, ""));
  if (ex.mode === "claude") return t.modeClaude;
  return t.modeLocal;
}

// Поля, которые ИИ/разбор прочитал неуверенно: подсвечиваем до первой правки.
function unsureFields(ex: Extraction): FieldKey[] {
  const map: [FieldKey, Extraction["bin"]][] = [["name", ex.supplier_name], ["bin", ex.bin], ["iban", ex.iban], ["amount", ex.amount]];
  return map.filter(([, f]) => f.value && (f.confidence !== "high" || f.value.includes("?"))).map(([k]) => k);
}

const isEmailName = (n: string) => /\.eml$/i.test(n);

export function usePaymentScreen(lang: Lang) {
  const [fields, setFields] = useState<PaymentFields>(EMPTY_FIELDS);
  const [hints, setHints] = useState<DocumentHints | undefined>(undefined);
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [email, setEmail] = useState<EmailView | null>(null);
  const [unsure, setUnsure] = useState<FieldKey[]>([]);
  const [scenario, setScenario] = useState<ScenarioId | null>(null);
  const [doc, setDoc] = useState<Doc>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [outcome, setOutcome] = useState<CheckOutcome | null>(null);
  const [pay, setPay] = useState<PayState>("draft");
  const [advice, setAdvice] = useState<Action | null>(null);
  const [contact, setContact] = useState<ContactStep>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [ai, setAi] = useState<Partial<Record<Lang, AiState>>>({});
  const [aiModel, setAiModel] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Поколение: любой сброс или правка делает устаревшими ответы, которые ещё в пути.
  const gen = useRef(0);
  const logId = useRef(0);
  const objectUrl = useRef<string | null>(null);
  const outcomeRef = useRef<CheckOutcome | null>(null);
  outcomeRef.current = outcome;

  const addLog = (render: LogEntry["render"]) => setLog((l) => [{ id: ++logId.current, time: now(), render }, ...l]);

  function dropVerdict() {
    setOutcome(null);
    setPay("draft");
    setAdvice(null);
    setContact(null);
    setAi({});
    setError(null);
  }

  function clearAll() {
    gen.current++;
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
    setFields(EMPTY_FIELDS);
    setHints(undefined);
    setExtraction(null);
    setEmail(null);
    setUnsure([]);
    setScenario(null);
    setDoc(null);
    setSrc(null);
    setBusy(null);
    setLog([]);
    dropVerdict();
  }

  async function extractInto(fd: FormData, g: number, name: (t: Dict, l: Lang) => string, fallback?: Scenario["fallback"]) {
    setBusy("extract");
    try {
      const r = await fetch("/api/extract", { method: "POST", body: fd });
      const j = await r.json();
      if (g !== gen.current) return;
      if (!r.ok) {
        setError(j.code ?? "generic");
        if (fallback) setFields(showFields({ ...EMPTY_FIELDS, ...fallback }));
        return;
      }
      // У письма без PDF-вложения extraction нет: поля приходят пустыми.
      const ex = (j.extraction ?? null) as Extraction | null;
      const got = j.fields as PaymentFields;
      const filled = { ...got };
      // Запасные значения сценария — только в пустые поля; номер счёта остаётся как прочитан (пустой).
      for (const k of ["name", "bin", "amount"] as const) if (!filled[k].trim() && fallback?.[k]) filled[k] = fallback[k]!;
      setFields(showFields(filled));
      setHints(j.hints as DocumentHints);
      if (j.email) {
        setEmail(j.email as EmailView);
        // Счёт из письма показываем из base64 через blob-адрес; прежний адрес освобождаем.
        if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
        objectUrl.current = null;
        if (typeof j.pdfBase64 === "string") {
          const bytes = Uint8Array.from(atob(j.pdfBase64), (c) => c.charCodeAt(0));
          const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
          objectUrl.current = url;
          setSrc(url);
          if (typeof j.pdfName === "string" && j.pdfName) setDoc({ kind: "upload", name: j.pdfName });
        } else {
          setSrc(null);
        }
        addLog((t, l) => t.logEmail(name(t, l)));
      }
      setExtraction(ex);
      setUnsure(ex ? unsureFields(ex) : []);
      if (ex) addLog((t, l) => t.logExtracted(name(t, l), modeText(ex, t)));
      // Ответ 200 с кодом (письмо без счёта) — не сбой, а подсказка в форме.
      if (typeof j.code === "string") setError(j.code);
    } catch {
      if (g === gen.current) setError("generic");
    } finally {
      if (g === gen.current) setBusy((b) => (b === "extract" ? null : b));
    }
  }

  // Выбор сценария сбрасывает всё и только заполняет форму. Проверку запускает лишь «Оплатить».
  function pickScenario(s: Scenario) {
    clearAll();
    const g = gen.current;
    setScenario(s.id);
    addLog((t, l) => t.logScenario(scenarioTitle(s.id, l)));
    if (s.sample) {
      // Пример-письмо (.eml) не показываем как PDF: счёт придёт вложением в ответе сервера.
      if (!isEmailName(s.sample)) setSrc(`/samples/${s.sample}`);
      setDoc({ kind: "sample", scenario: s.id });
      const fd = new FormData();
      fd.append("sample", s.sample);
      void extractInto(fd, g, (_, l) => scenarioTitle(s.id, l), s.fallback);
    } else if (s.fields) {
      setFields(showFields(s.fields));
      setHints(s.hints);
    }
  }

  function attach(file: File) {
    gen.current++;
    const g = gen.current;
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
    // PDF показываем сразу; у письма счёт (если он есть) придёт вложением в ответе сервера.
    if (isEmailName(file.name) || file.type === "message/rfc822") {
      setSrc(null);
    } else {
      const url = URL.createObjectURL(file);
      objectUrl.current = url;
      setSrc(url);
    }
    setDoc({ kind: "upload", name: file.name });
    setScenario(null);
    setExtraction(null);
    setEmail(null);
    setUnsure([]);
    dropVerdict();
    const fd = new FormData();
    fd.append("file", file);
    void extractInto(fd, g, () => file.name);
  }

  // Любая правка поля после проверки сбрасывает показанный вердикт (сервер требует новую проверку через fingerprint).
  function setField(k: FieldKey, v: string) {
    setFields((f) => ({ ...f, [k]: v }));
    setUnsure((u) => u.filter((x) => x !== k));
    if (busy === "check" || busy === "pay" || busy === "approve") {
      gen.current++;
      setBusy(null);
    }
    if (!outcome) return;
    if (outcome.kind === "fix_fields") {
      const rest = outcome.errors.filter((e) => e.field !== k);
      setOutcome(rest.length ? { kind: "fix_fields", errors: rest } : null);
      return;
    }
    addLog((t) => t.logEdited);
    dropVerdict();
  }

  async function runCheck() {
    const g = gen.current;
    setBusy("check");
    dropVerdict();
    try {
      const r = await fetch("/api/check", post({ fields, hints }));
      const j = (await r.json()) as CheckOutcome;
      if (g !== gen.current) return;
      if (j.kind === "verdict") {
        setOutcome(j);
        const { verdict, main } = j;
        addLog((t, l) => t.logCheck(verdictTitle(verdict, l), signalText(main, l)));
      } else if (j.kind === "fix_fields") {
        setOutcome({ kind: "fix_fields", errors: j.errors as FieldError[] });
        addLog((t) => t.logFixFields);
      } else {
        throw new Error("bad response");
      }
    } catch {
      if (g === gen.current) setError("generic");
    } finally {
      if (g === gen.current) setBusy((b) => (b === "check" ? null : b));
    }
  }

  async function send(acknowledged: boolean) {
    if (outcome?.kind !== "verdict") return;
    const g = gen.current;
    setBusy("pay");
    setError(null);
    try {
      const r = await fetch("/api/pay", post({ fields, hints, fingerprint: outcome.fingerprint, acknowledged }));
      const j = await r.json();
      if (g !== gen.current) return;
      if (j.result === "sent") {
        setPay("sent");
        addLog((t) => (acknowledged ? t.logSentAck : t.logSent));
      } else if (j.result === "blocked") {
        setPay("blocked");
        addLog((t) => t.logBlockedServer);
      } else if (j.result === "needs_recheck" || j.result === "needs_ack" || j.result === "fix_fields") {
        void runCheck();
      } else {
        throw new Error("bad response");
      }
    } catch {
      if (g === gen.current) setError("generic");
    } finally {
      if (g === gen.current) setBusy((b) => (b === "pay" ? null : b));
    }
  }

  function act(a: Action) {
    switch (a) {
      case "pay": void send(false); break;
      case "pay_after_ack": void send(true); break;
      case "call_contract": setContact("ask"); addLog((t) => t.logContact); break;
      case "find_phone": setContact("ask"); addLog((t) => t.logFindPhone); break;
      case "check_bin": setAdvice(a); addLog((t) => t.logCheckBin); break;
      case "check_supplier": setAdvice(a); addLog((t) => t.logCheckSupplier); break;
    }
  }

  function postpone() {
    setPay("postponed");
    addLog((t) => t.logPostponed);
  }

  function confirmChange() {
    setPay("requested");
    setContact("approve");
    addLog((t) => t.logConfirmed);
  }

  function notChanged() {
    setPay("blocked");
    setContact(null);
    addLog((t) => t.logNotChanged);
  }

  // Демо: второй сотрудник утверждает новый счёт, после чего платёж проверяется заново.
  async function approve() {
    const g = gen.current;
    setBusy("approve");
    try {
      const r = await fetch("/api/approvals", post({ fields }));
      if (!r.ok) throw new Error("approve failed");
      if (g !== gen.current) return;
      addLog((t) => t.logApproved);
      setContact(null);
      void runCheck();
    } catch {
      if (g === gen.current) setError("generic");
    } finally {
      if (g === gen.current) setBusy((b) => (b === "approve" ? null : b));
    }
  }

  async function resetDemo() {
    clearAll();
    try {
      const r = await fetch("/api/approvals", { method: "DELETE" });
      if (!r.ok) throw new Error("reset failed");
    } catch {
      setError("generic");
    }
  }

  // ИИ объясняет вердикт на выбранном языке. Ответ кешируется по языку и сбрасывается с новым вердиктом.
  useEffect(() => {
    if (outcome?.kind !== "verdict" || ai[lang]) return;
    const o = outcome;
    setAi((a) => ({ ...a, [lang]: { state: "loading" } }));
    fetch("/api/explain", post({ fields, hints, lang }))
      .then((r) => r.json())
      .then((j) => {
        if (outcomeRef.current !== o) return;
        if (j.model) setAiModel(String(j.model).replace(/^openai\//, ""));
        setAi((a) => ({ ...a, [lang]: j.text ? { state: "done", text: String(j.text) } : { state: j.code === "offline" ? "offline" : "failed" } }));
      })
      .catch(() => {
        if (outcomeRef.current === o) setAi((a) => ({ ...a, [lang]: { state: "failed" } }));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcome, lang]);

  return {
    fields, hints, extraction, email, unsure, scenario, doc, src, busy, outcome, pay, advice, contact, log, ai, aiModel, error,
    pickScenario, attach, setField, runCheck, act, postpone, confirmChange, notChanged, approve, resetDemo,
    closeContact: () => setContact(null),
  };
}

