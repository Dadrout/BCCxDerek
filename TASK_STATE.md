# TASK_STATE

## Goal
Embed Derek in a BCC Business "new payment" screen. The check runs on every payment and uses synthetic bank data (other clients' payment history, account owners, a company registry, complaints) through a signals engine.

## Done
- Design doc: docs/superpowers/specs/2026-11-25-payment-screen-signals-design.md (Codex-reviewed, approved 2026-11-26)
- Implementation plan: docs/superpowers/plans/2026-11-26-payment-screen-signals.md (8 tasks)
- Tasks 1–7: strict field parsing, synthetic bank + generator, signals engine, approvals store, kk/ru/en texts, API routes + stage mode, demo scenarios + invoices
- Task 8: new "Новый платёж" screen (`app/page.tsx`, `lib/usePaymentScreen.ts`, `components/PaymentForm|VerdictPanel|ContactCard.tsx`); old engine removed (`lib/check.ts`, `lib/registry.ts`, `CheckResult`/`Status`); README rewritten (Groq → Claude → local, `DEREK_STAGE`)
- Task 8 side fixes: engine `main` was undefined for an ok verdict carried only by `change_approved` (fixed + test); `/api/explain` returns offline in stage mode; `/api/extract` whitelists samples from `SCENARIOS`
- lint / tsc / 173 tests / build clean; HTTP smoke in stage mode passes for the three stage scenarios

## Next
- Controller in-browser walkthrough: 1280×800 and 375px, three stage scenarios, edit-after-check reset, kk/ru/en switch, approve-as-second-employee, reset demo
- Offline rehearsal with network actually disabled

## Later projects (agreed order)
3. Email (.eml) checks: lookalike domain, Reply-To, SPF/DKIM
4. Supplier QR "verified details"
5. Other B2B schemes: CEO fraud, payroll account change, business account takeover

## Open issues
- Uploaded PDFs that aren't BCC-style invoices only fill what the parser finds; the user fixes the rest by hand
