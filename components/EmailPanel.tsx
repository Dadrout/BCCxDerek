"use client";
// Письмо, в котором пришёл счёт: от кого, куда уйдёт ответ, подлинность, тема, дата и текст.
// Фразы давления в тексте подсвечены жёлтым всегда; адрес отправителя красим только после проверки, по её сигналам.
import type { ReactNode } from "react";
import type { EmailView } from "@/lib/email/types";
import type { SignalId } from "@/lib/signals/types";
import type { Dict, Lang } from "@/lib/i18n";

type Props = {
  t: Dict;
  lang: Lang;
  email: EmailView;
  // id сигналов вердикта; null — проверки ещё не было.
  signals: SignalId[] | null;
};

type Tone = "stop" | "check" | null;
const TONE: Record<"stop" | "check", string> = {
  stop: "bg-stop-wash text-stop",
  check: "bg-hold-wash text-hold",
};
const AUTH_CHIP = { pass: "bg-go-wash text-go", fail: "bg-stop-wash text-stop", none: "bg-cell text-ink-3" } as const;
const LOCALE: Record<Lang, string> = { kk: "kk-KZ", ru: "ru-RU", en: "en-GB" };

// Регулярное выражение для цитат: спецсимволы экранируем, любые пробелы считаем одним \s+,
// регистр не важен (сервер сверяет цитаты так же — без учёта регистра и лишних пробелов).
function quotesRegex(quotes: string[]): RegExp | null {
  const parts = [...new Set(quotes.map((q) => q.trim()).filter(Boolean))]
    .sort((a, b) => b.length - a.length)
    .map((q) => q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"));
  return parts.length ? new RegExp(parts.join("|"), "gi") : null;
}

function highlight(text: string, quotes: string[], title: (match: string) => string | undefined): ReactNode[] {
  const re = quotesRegex(quotes);
  if (!re) return [text];
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (!m[0]) continue;
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      <mark key={m.index} title={title(m[0])} className="rounded-[3px] bg-[#f6dc9c] px-0.5 text-ink">
        {m[0]}
      </mark>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// Адрес, где доменная часть (после @) выделена цветом сигнала.
function Address({ address, tone, tag }: { address: string; tone: Tone; tag: string | null }) {
  const at = address.lastIndexOf("@");
  const local = at >= 0 ? address.slice(0, at + 1) : address;
  const domain = at >= 0 ? address.slice(at + 1) : "";
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className="break-all font-mono text-[13.5px]">
        {local}
        {domain && <span className={tone ? `rounded-[3px] px-1 font-semibold ${TONE[tone]}` : ""}>{domain}</span>}
      </span>
      {tone && tag && <span className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${TONE[tone]}`}>{tag}</span>}
    </span>
  );
}

function formatDate(d: string | null, lang: Lang): string | null {
  if (!d) return null;
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return d;
  return x.toLocaleString(LOCALE[lang], { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Almaty" });
}

export default function EmailPanel({ t, lang, email, signals }: Props) {
  const has = (id: SignalId) => signals?.includes(id) ?? false;
  const fromTone: Tone = has("email_lookalike") ? "stop" : has("email_domain_differs") || has("email_free_mail") ? "check" : null;
  const fromTag = has("email_lookalike") ? t.tagLookalike : has("email_domain_differs") ? t.tagDomainDiffers : has("email_free_mail") ? t.tagFreeMail : null;
  const replyTone: Tone = has("email_reply_to") ? "check" : null;

  const auth = email.auth;
  const results = [auth.spf, auth.dkim, auth.dmarc];
  const authCaption = results.includes("fail") ? t.authBad : results.every((r) => r === "pass") ? t.authOk : t.authUnknown;

  const kindOf = (match: string) => {
    const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
    // Одна фраза может попасть под несколько видов давления (например, «срочно» и «новые реквизиты»).
    const names = email.pressure.filter((x) => norm(x.quote) === norm(match)).map((x) => t.pressureKinds[x.kind] ?? x.kind);
    return names.length ? [...new Set(names)].join(", ") : undefined;
  };
  const kinds = [...new Set(email.pressure.map((p) => p.kind))];
  const date = formatDate(email.date, lang);

  return (
    <section aria-label={t.emailTitle}
      className="rounded-[10px] bg-sheet px-5 py-4 shadow-[0_1px_2px_rgba(21,32,43,0.08),0_8px_24px_-12px_rgba(21,32,43,0.18)] sm:px-6">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold">
        <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4 text-ink-3" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="1.8" y="3.3" width="12.4" height="9.4" rx="1.4" />
          <path d="m2.4 4.2 5.6 4.4 5.6-4.4" />
        </svg>
        {t.emailTitle}
      </h2>

      <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2.5 text-[14px] sm:grid-cols-[8.5rem_1fr]">
        <Row label={t.emailFrom}>
          {email.fromName && <span className="mr-2 font-medium">{email.fromName}</span>}
          <Address address={email.fromAddress} tone={fromTone} tag={fromTag} />
        </Row>
        {email.replyTo && (
          <Row label={t.emailReplyTo}>
            <Address address={email.replyTo} tone={replyTone} tag={replyTone ? t.tagReplyTo : null} />
          </Row>
        )}
        <Row label={t.emailAuth}>
          <span className="flex flex-wrap gap-1.5">
            {(["spf", "dkim", "dmarc"] as const).map((k) => (
              <span key={k} className={`rounded-[4px] px-1.5 py-0.5 text-[11.5px] font-semibold ${AUTH_CHIP[auth[k]]}`}>
                {k.toUpperCase()} · {t.authWord[auth[k]]}
              </span>
            ))}
          </span>
          <span className="mt-1 block text-[13px] leading-snug text-ink-2">{authCaption}</span>
        </Row>
        <Row label={t.emailSubject}>
          <span className="font-medium">{email.subject || t.emailNoSubject}</span>
        </Row>
        {date && <Row label={t.emailDate}><span className="text-ink-2">{date}</span></Row>}
      </dl>

      <h3 className="mt-4 text-[13px] font-medium text-ink-2">{t.emailBody}</h3>
      <div tabIndex={0} aria-label={t.emailBody}
        className="mt-1.5 max-h-[18em] overflow-y-auto whitespace-pre-wrap break-words rounded-[8px] border border-rule bg-cell px-3.5 py-3 text-[14px] leading-[1.5] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink">
        {highlight(email.text, email.pressure.map((p) => p.quote), kindOf)}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-ink-2">
        {email.pressure.length > 0 ? (
          <>
            <span className="flex items-center gap-2">
              <span aria-hidden className="h-2.5 w-4 rounded-[2px] bg-[#f6dc9c]" />
              {email.pressureMode === "ai" ? t.pressureAi : t.pressureLocal}:
            </span>
            {kinds.map((k) => (
              <span key={k} className="rounded-full bg-hold-wash px-2 py-0.5 text-[12px] font-semibold text-hold">{t.pressureKinds[k] ?? k}</span>
            ))}
          </>
        ) : (
          <span className="text-ink-3">{t.pressureNone}</span>
        )}
      </div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-[13px] font-medium text-ink-3 sm:pt-px">{label}</dt>
      <dd className="-mt-1.5 min-w-0 sm:mt-0">{children}</dd>
    </>
  );
}
