"use client";
// Сверка счёта и письма с договором поставщика: цитата из документа рядом с пунктом договора, который она нарушает.
// Расхождения приходят вместе с загрузкой, поэтому панель видна и до проверки.
import type { ContractConflict } from "@/lib/contract/compare";
import type { ContractHints } from "@/lib/signals/types";
import { contactTerm, type Dict, type Lang } from "@/lib/i18n";

type Props = {
  t: Dict;
  lang: Lang;
  hints: ContractHints;
  // Реквизиты договора («договор № … от …»); null — источник неизвестен, подзаголовок не показываем.
  source: string | null;
};

export default function ContractPanel({ t, lang, hints, source }: Props) {
  return (
    <section aria-label={t.contractTitle}
      className="rounded-[10px] bg-sheet px-5 py-4 shadow-[0_1px_2px_rgba(21,32,43,0.08),0_8px_24px_-12px_rgba(21,32,43,0.18)] sm:px-6">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold">
        <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4 text-ink-3" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 1.8h5.4L12.6 5v9.2H4z" />
          <path d="M9.2 1.8V5.2h3.4M6.2 8h4.2M6.2 10.6h4.2" />
        </svg>
        {t.contractTitle}
      </h2>
      {source && <p className="mt-0.5 text-[13px] text-ink-3">{contactTerm(source, lang)}</p>}

      <ul className="mt-3 space-y-4">
        {hints.conflicts.map((c, i) => (
          <Conflict key={`${c.kind}-${c.clause}-${i}`} t={t} conflict={c} />
        ))}
      </ul>

      <p className="mt-3 text-[13px] text-ink-3">{hints.mode === "ai" ? t.contractAi : t.contractLocal}</p>
    </section>
  );
}

function Conflict({ t, conflict: c }: { t: Dict; conflict: ContractConflict }) {
  return (
    <li>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Quote label={c.source === "email" ? t.contractInEmail : t.contractInInvoice} text={c.docQuote}
          className="border-[#f6dc9c] bg-hold-wash" />
        <Quote label={t.contractClause(c.clause)} text={c.contractQuote} className="border-rule bg-cell" />
      </div>
      <p className="mt-2 text-[14px] font-medium leading-snug">{t.contractKinds[c.kind]}</p>
    </li>
  );
}

function Quote({ label, text, className }: { label: string; text: string; className: string }) {
  return (
    <figure className={`min-w-0 rounded-[8px] border px-3.5 py-3 ${className}`}>
      <figcaption className="text-[12.5px] font-medium text-ink-3">{label}</figcaption>
      <blockquote className="mt-1 break-words text-[14px] leading-[1.5]">{text.includes("«") || text.includes("»") ? text : `«${text}»`}</blockquote>
    </figure>
  );
}
