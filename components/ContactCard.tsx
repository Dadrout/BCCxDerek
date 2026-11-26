"use client";
// Карточка «позвонить поставщику»: номер из договора (или совет найти номер самому, если договора нет),
// затем результат звонка. После «подтвердил» в демо второй сотрудник утверждает новый счёт.
import { useEffect } from "react";
import type { Contact } from "@/lib/signals/types";
import { actionLabel, findPhoneAdvice } from "@/lib/signals/texts";
import { contactTerm, type Dict, type Lang } from "@/lib/i18n";
import type { ContactStep } from "@/lib/usePaymentScreen";

type Props = {
  t: Dict;
  lang: Lang;
  step: Exclude<ContactStep, null>;
  contact: Contact | null;
  phoneInDocument: string | null;
  busy: boolean;
  onConfirm: () => void;
  onNotChanged: () => void;
  onApprove: () => void;
  onClose: () => void;
};

const digits = (s: string) => s.replace(/\D/g, "");

export default function ContactCard({ t, lang, step, contact, phoneInDocument, busy, onConfirm, onNotChanged, onApprove, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const otherPhone = phoneInDocument && (!contact || digits(phoneInDocument) !== digits(contact.phone)) ? phoneInDocument : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="contact-title" onClick={(e) => e.stopPropagation()}
        className="max-h-full w-full max-w-[460px] overflow-y-auto rounded-[10px] bg-sheet shadow-2xl">
        {step === "ask" ? (
          <>
            <div className="p-6">
              {contact ? (
                <>
                  <p className="text-[13px] text-ink-3">{t.contactSource(contactTerm(contact.source, lang))}</p>
                  <h2 id="contact-title" className="mt-1 text-[20px] font-semibold">{contact.person}</h2>
                  <p className="text-[14px] text-ink-2">{contactTerm(contact.role, lang)}</p>
                  <a href={`tel:${digits(contact.phone)}`} className="mt-4 block font-mono text-[24px] font-medium tracking-tight underline-offset-4 hover:underline">{contact.phone}</a>
                </>
              ) : (
                <>
                  <h2 id="contact-title" className="text-[20px] font-semibold leading-snug">{actionLabel("find_phone", lang)}</h2>
                  <p className="mt-2 text-[15px] leading-relaxed">{findPhoneAdvice(lang)}.</p>
                  <p className="mt-2 text-[13px] text-ink-3">{t.contactNoPhone}</p>
                </>
              )}
              {otherPhone && (
                <p className="mt-3 rounded-md bg-hold-wash px-3 py-2 text-[13px] leading-relaxed text-hold">
                  {t.dontCall} <span className="whitespace-nowrap font-mono">{otherPhone}</span>. {t.dontCallTail}
                </p>
              )}
              <h3 className="mt-5 text-[14px] font-semibold">{t.whatToAsk}</h3>
              <ul className="mt-1.5 space-y-1.5 text-[14px] leading-relaxed text-ink-2">
                <li>{t.ask1}</li>
                <li>{t.ask2}</li>
              </ul>
            </div>
            <div className="grid gap-2 border-t border-rule bg-cell/60 p-4">
              <button autoFocus className="btn btn-secondary" onClick={onConfirm}>{t.confirmed}</button>
              <button className="btn btn-stop" onClick={onNotChanged}>{t.notChanged}</button>
              <button className="btn btn-quiet mx-auto" onClick={onClose}>{t.close}</button>
            </div>
          </>
        ) : (
          <>
            <div className="p-6">
              <h2 id="contact-title" className="text-[20px] font-semibold leading-snug">{t.approveSecond}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{t.requestCreated}</p>
            </div>
            <div className="grid gap-2 border-t border-rule bg-cell/60 p-4">
              <button autoFocus className="btn btn-primary" onClick={onApprove} disabled={busy}>{t.approveSecond}</button>
              <button className="btn btn-quiet mx-auto" onClick={onClose}>{t.close}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
