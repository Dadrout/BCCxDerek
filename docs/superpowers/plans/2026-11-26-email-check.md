# Email (.eml) Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The accountant attaches the `.eml` email that carried the invoice; Derek fills the payment from its PDF attachment and adds email signals (lookalike domain, Reply-To, failed authentication, free mail, pressure in the text).

**Architecture:** Server-side `lib/email/*` parses MIME with `postal-mime`, judges domains with pure functions, and finds pressure phrases (Groq with verbatim-quote filter, keyword fallback). `/api/extract` returns `hints.email` plus the PDF as base64; the engine turns `hints.email` + `Contract.email` into signals. The UI adds an "Attach email" button and an `EmailPanel`.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind 4, Vitest 3, Node 24, `postal-mime` (new dependency), Groq `openai/gpt-oss-120b`.

**Spec:** `docs/superpowers/specs/2026-11-26-email-check-design.md`

## Global Constraints

- Repo: `C:\Users\Dias\Downloads\derek-mvp-redesign\derek`, branch `feat/email-check`. Commit locally after each task; never push. Never commit `.env.local`.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- New signal ids and severities exactly: `email_lookalike` stop; `email_domain_differs`, `email_free_mail`, `email_reply_to`, `email_auth_failed`, `email_pressure` check.
- `SIGNAL_ORDER`: `email_lookalike` directly after `homoglyphs`; the other five directly after `phone_differs`, in the order `email_domain_differs, email_free_mail, email_reply_to, email_auth_failed, email_pressure`, before `nothing_to_compare`.
- Approvals never demote email signals. There is no "email ok" signal.
- AI never produces a `stop`; pressure quotes not found verbatim (after whitespace normalisation) in the email text are dropped.
- `DEREK_STAGE=1` → no network: pressure by keywords only.
- Free mail domains: `gmail.com, mail.ru, inbox.ru, list.ru, bk.ru, yandex.ru, yandex.kz, ya.ru, outlook.com, hotmail.com, icloud.com`.
- Fixture: DALA contract email `info@dalatrans.kz`; demo lookalike sender `buh@dalatrans-kz.com`.
- Texts: kk/ru/en for every new signal and UI string; plain words, no jargon ("адрес-двойник", not "homoglyph domain"); no "100% safe" promises.
- All data synthetic. Email limit 15 MB, AI text limit 6000 chars.
- Run `npm test`, `npx tsc --noEmit`, `npm run lint` before each commit; send long output to a file and report only the summary.

## Review Focus

1. Email with no PDF attachment → panel shows the email, fields stay empty, notice "в письме нет PDF-счёта"; no 500.
2. Headers with RFC 2047 encoded names (`=?UTF-8?B?...?=`) and `From` without a display name → address and domain parsed correctly.
3. Tampered hints from the client (`email` with wrong types, huge strings) → `readBody` drops/normalises them; never a 500; fingerprint changes when email hints change.
4. Groq returns a quote that is not in the email, or invalid JSON → that quote is dropped / keyword fallback used.
5. Sender domain equals contract domain but in different case or with a subdomain (`mail.dalatrans.kz`) → not a lookalike, no `email_domain_differs`.

---

### Task 1: Email parsing and domain rules (`lib/email/`)

**Files:**
- Create: `lib/email/types.ts`, `lib/email/parse.ts`, `lib/email/domains.ts`
- Test: `tests/email-parse.test.ts`, `tests/email-domains.test.ts`
- Modify: `package.json` (add `postal-mime`)

**Interfaces:**
- Produces:
  - `type AuthResult = "pass" | "fail" | "none"`
  - `type ParsedEmail = { fromAddress: string; fromName: string; replyTo: string | null; subject: string; date: string | null; text: string; auth: { spf: AuthResult; dkim: AuthResult; dmarc: AuthResult }; pdf: { filename: string; content: Buffer } | null }`
  - `parseEml(buf: Buffer): Promise<ParsedEmail>` — `text` is the plain-text body, or the HTML body stripped of tags when there is no plain part. `auth` from the first `Authentication-Results` header: `fail`/`softfail` → `"fail"`, `pass` → `"pass"`, missing → `"none"`. `pdf` = first attachment with mime `application/pdf` or filename ending `.pdf`.
  - `looksLikeEml(buf: Buffer): boolean` — true if the first 8 KB contain a `From:` header line and the buffer does not start with `%PDF-`.
  - `domainOf(address: string): string` (lower case, after the last `@`, `""` if none)
  - `isFreeMail(domain: string): boolean`
  - `sameOrg(domain: string, reference: string): boolean` — equal, or `domain` ends with `"." + reference`.
  - `isLookalike(domain: string, reference: string): boolean` — false when `sameOrg`; otherwise compare cores: core = registrable label(s) without the TLD, lower case, with `-`, `_`, `.` removed, and digit-letter swaps normalised (`0→o, 1→l, 3→e, 5→s`). Lookalike if cores are equal, one core contains the other and the shorter is ≥ 4 chars, or Levenshtein distance ≤ 2 and the shorter core is ≥ 5 chars.

- [ ] Step 1: `npm i postal-mime` and write failing tests:
  - `tests/email-domains.test.ts`: `isLookalike("dalatrans-kz.com","dalatrans.kz")` true; `("da1atrans.kz","dalatrans.kz")` true; `("dalatrans.kz","dalatrans.kz")` false; `("mail.dalatrans.kz","dalatrans.kz")` false; `("DalaTrans.KZ","dalatrans.kz")` false (case); `("kaspi.kz","dalatrans.kz")` false; `isFreeMail("gmail.com")` true, `isFreeMail("dalatrans.kz")` false; `domainOf("Buh <BUH@DalaTrans-KZ.com>")`… — note `domainOf` takes a bare address: `domainOf("BUH@DalaTrans-KZ.com") === "dalatrans-kz.com"`.
  - `tests/email-parse.test.ts`: build `.eml` strings in the test (multipart/mixed with a text/plain part, a base64 `application/pdf` attachment of bytes `%PDF-1.4 test`, `Reply-To`, `Authentication-Results: mx.bcc.kz; spf=softfail smtp.mailfrom=x; dkim=pass; dmarc=fail`, `From: =?UTF-8?B?0JTQsNC70LA=?= <buh@dalatrans-kz.com>`). Assert fromAddress `buh@dalatrans-kz.com`, fromName `Дала`, replyTo, auth `{spf:"fail",dkim:"pass",dmarc:"fail"}`, `pdf.content` starts with `%PDF-`. Second case: HTML-only body, no attachment, no auth header → text has no `<`, `pdf` null, auth all `"none"`. `looksLikeEml` true for the eml, false for `%PDF-…`.
- [ ] Step 2: run `npx vitest run tests/email-parse.test.ts tests/email-domains.test.ts` → FAIL.
- [ ] Step 3: implement the three files.
- [ ] Step 4: tests pass; full `npm test`, tsc, lint clean.
- [ ] Step 5: commit `feat(email): parse .eml and judge sender domains`.

### Task 2: Pressure detection (`lib/email/pressure.ts`)

**Files:**
- Create: `lib/email/pressure.ts`
- Modify: `lib/groq.ts` (export the existing `chat` helper, or add `chatJson(system, user, schema)`; keep current behaviour)
- Test: `tests/email-pressure.test.ts`

**Interfaces:**
- Consumes: `ParsedEmail.text` (Task 1), `hasGroq()`, `isStage()`.
- Produces:
  - `type PressureKind = "urgency" | "no_call" | "new_details" | "secrecy" | "authority"`
  - `type Pressure = { kind: PressureKind; quote: string }`
  - `findPressureLocal(text: string): Pressure[]` — keyword regexes (ru + kk), each match returns the sentence containing it as `quote` (trimmed, ≤ 160 chars). At most one quote per kind. Minimum coverage: urgency «срочно», «сегодня», «до конца дня», «немедленно», kk «шұғыл», «бүгін»; no_call «не звоните», «не дозвониться», «пишите только», «в отпуске», kk «қоңырау шалмаңыз»; new_details «новы(е|м) реквизит», «смен(а|ой|ил) банк», «другой счёт», kk «жаңа деректеме»; secrecy «конфиденциально», «никому не сообщайте»; authority «по распоряжению директора», «директор просит», «генеральный директор».
  - `verifyQuotes(text: string, list: Pressure[]): Pressure[]` — keep items whose quote (whitespace collapsed, case-insensitive) is a substring of the text (same normalisation); max one per kind; quote trimmed to 160 chars.
  - `findPressure(text: string): Promise<{ items: Pressure[]; mode: "ai" | "local" }>` — stage or no Groq → local. Otherwise Groq with a JSON schema `{ items: [{kind, quote}] }`, text cut to 6000 chars, prompt in Russian: find only manipulation that pushes to pay fast or to new details or to avoid checking; quote verbatim. Result passed through `verifyQuotes`. Any error → local.
- [ ] Step 1: failing tests: local finds urgency + no_call + new_details in the demo body text «Добрый день! В связи со сменой банка просим оплатить счёт по новым реквизитам сегодня до конца дня. Бухгалтер в отпуске, по телефону не дозвониться, пишите только сюда.»; a neutral text «Счёт во вложении. Спасибо.» → `[]`; `verifyQuotes` drops an invented quote and keeps a real one with different spacing/case; `findPressure` with `DEREK_STAGE=1` returns mode `local` without calling `fetch` (spy on `globalThis.fetch`); with `GROQ_API_KEY` set and `fetch` mocked to return a Groq-shaped response containing one real and one invented quote → mode `ai`, only the real quote; with `fetch` rejecting → mode `local`.
- [ ] Step 2: run → FAIL. Step 3: implement. Step 4: pass + full suite/tsc/lint. Step 5: commit `feat(email): find pressure phrases with AI and keyword fallback`.

### Task 3: Engine, hints, texts, contract email

**Files:**
- Modify: `lib/signals/types.ts`, `lib/signals/engine.ts`, `lib/signals/run.ts` (`readBody`), `lib/signals/texts.ts`, `lib/bank/types.ts` (`Contract.email: string`), `lib/bank/fixtures.ts` (`DALA_CONTRACT.email = "info@dalatrans.kz"`), `scripts/gen-bank.ts` if needed, `data/bank/contracts.json` (regenerate with `npm run gen:bank`)
- Test: `tests/engine.test.ts`, `tests/texts.test.ts`, `tests/api.test.ts` (readBody / pay fingerprint), `tests/bank-data.test.ts` if it pins contracts

**Interfaces:**
- Consumes: `domainOf`, `isFreeMail`, `sameOrg`, `isLookalike` (Task 1); `Pressure` (Task 2).
- Produces:
  - `type EmailHints = { fromAddress: string; replyTo: string | null; authFailed: boolean; pressure: Pressure[] }`
  - `DocumentHints` gains optional `email?: EmailHints | null`.
  - Signal params: `email_lookalike {domain, contractDomain}`, `email_domain_differs {domain, contractDomain}`, `email_free_mail {domain}`, `email_reply_to {replyTo}`, `email_auth_failed {}`, `email_pressure {quote, count}` (`quote` = first item's quote, `count` = number of items).
  - Engine rules (only when `hints.email` present): contract domain = `domainOf(contract.email)` when the contract exists and has an email. Free mail → `email_free_mail` (and no domain_differs). Else if contract domain and not `sameOrg`: `isLookalike` → `email_lookalike`, otherwise `email_domain_differs`. Reply-To domain present and not `sameOrg` with the From domain → `email_reply_to`. `authFailed` → `email_auth_failed`. `pressure.length > 0` → `email_pressure`.
  - `fingerprint` includes `JSON.stringify(hints?.email ?? null)`.
  - `readBody`: `hints.email` accepted only if an object with string `fromAddress` (≤ 320 chars), `replyTo` string ≤ 320 or null, boolean `authFailed`, `pressure` array (≤ 10 items, each `kind` in PressureKind, `quote` string ≤ 300); otherwise `email` = null. Never throws.
- Texts (ru; write kk and en with the same meaning):
  - `email_lookalike`: `Письмо пришло с адреса-двойника ${domain}. В договоре — ${contractDomain}`
  - `email_domain_differs`: `Письмо пришло не с адреса из договора (${contractDomain}), а с ${domain}`
  - `email_free_mail`: `Фирма пишет с бесплатной почты (${domain})`
  - `email_reply_to`: `Ответ на письмо уйдёт на другой адрес: ${replyTo}`
  - `email_auth_failed`: `Почтовый сервер не подтвердил, что письмо отправил владелец адреса`
  - `email_pressure`: `В письме торопят и просят не проверять: «${quote}»`
- [ ] Step 1: failing tests in `tests/engine.test.ts` using DALA history fields + contract: (a) lookalike `buh@dalatrans-kz.com` with an IBAN at another bank for DALA → verdict stop, `main.id === "email_lookalike"`, signals include `own_history_changed` and `owner_unknown`; (b) `info@mail.dalatrans.kz` + correct DALA IBAN → no email signal, verdict ok; (c) `x@gmail.com` → `email_free_mail` check, no `email_domain_differs`; (d) `x@other.kz` → `email_domain_differs`; (e) replyTo `pay@evil.kz` → `email_reply_to`; (f) `authFailed` → `email_auth_failed`; (g) pressure items → `email_pressure` with `count`; (h) approval for the IBAN does not demote `email_lookalike`; (i) supplier without a contract + `x@other.kz` → no domain signal. `tests/texts.test.ts`: add PARAMS for the six ids (the loop then covers kk/ru/en). `tests/api.test.ts`: fingerprint differs with/without email hints; malformed `hints.email` (`{fromAddress: 5}`) → check returns 200 and treats it as no email.
- [ ] Step 2: run → FAIL. Step 3: implement; regenerate bank data. Step 4: pass + suite/tsc/lint. Step 5: commit `feat(signals): email signals from sender, Reply-To, auth and pressure`.

### Task 4: `/api/extract` for `.eml`, demo email and invoice, scenario

**Files:**
- Modify: `app/api/extract/route.ts`, `lib/scenarios.ts`, `lib/signals/texts.ts` (scenario title/hint for `email`), `scripts/make_invoices.py`
- Create: `public/samples/05_dala_schet_drugoj_bank.pdf` (via `make_invoices.py`), `public/samples/05_dala_pismo.eml` (via a new `scripts/make_email.ts` run with `node scripts/make_email.ts`, which base64-embeds the PDF)
- Test: `tests/api.test.ts`, `tests/scenarios.test.ts`

**Interfaces:**
- Consumes: `parseEml`, `looksLikeEml` (Task 1), `findPressure` (Task 2), `EmailHints` (Task 3), existing `extract(buf)`.
- Produces:
  - `ScenarioId` gains `"email"`; scenario `{ id: "email", sample: "05_dala_pismo.eml", onStage: true }` placed after `swap`.
  - `/api/extract` response for an email: `{ fields, hints: { changeRequestText, phoneInDocument, email: EmailHints }, extraction: Extraction | null, email: EmailView, pdfBase64: string | null }` where `EmailView = { fromName, fromAddress, replyTo, subject, date, text (≤ 6000 chars), auth: {spf,dkim,dmarc}, pressure: Pressure[], pressureMode: "ai" | "local" }` (export `EmailView` from `lib/email/types.ts`). `authFailed` = any of spf/dkim/dmarc is `"fail"`. No PDF in the email → `fields` all empty, `extraction` null, `pdfBase64` null, `code: "no_pdf_in_email"` in the 200 body. For PDF input the response is unchanged (no `email` key).
  - Upload accepts PDF (`%PDF-`) or `looksLikeEml`; otherwise the existing `not_pdf` error.
- Demo data:
  - Invoice `05_dala_schet_drugoj_bank.pdf`: DALA name/BIN/address, number `ДТ-1201`, date `09.12.2026`, IBAN `kz_iban("722", "0000044455566")` with bank «АО «Kaspi Bank»», BIK `CASPKZKA`, phone `+7 727 355 18 40` (same as contract), note «В связи со сменой обслуживающего банка просим производить оплату по новым реквизитам.», amount ≈ 790 000 ₸ (same ROUTE items style).
  - Email `05_dala_pismo.eml`: `From: "Дала Транс Логистик" <buh@dalatrans-kz.com>`, `To: buh@shanyrak.kz`, `Subject: Счёт ДТ-1201 — новые реквизиты`, `Date: Wed, 09 Dec 2026 10:42:00 +0500`, `Authentication-Results: mx.bcc.kz; spf=pass smtp.mailfrom=dalatrans-kz.com; dkim=pass header.d=dalatrans-kz.com; dmarc=pass`, no Reply-To, plain-text body (UTF-8, quoted-printable or base64): the demo body from Task 2 plus a greeting and signature «Бухгалтерия ТОО «Дала Транс Логистик»». Attachment = the PDF above. Mark the email synthetic in an `X-Derek-Demo: synthetic` header.
- [ ] Step 1: failing tests in `tests/api.test.ts` (stage mode, as existing tests do): POST sample `05_dala_pismo.eml` → 200, `email.fromAddress === "buh@dalatrans-kz.com"`, `hints.email.pressure.length >= 2`, `fields.bin === DALA bin`, `pdfBase64` decodes to `%PDF-`; then `/api/check` with those fields+hints → stop, main `email_lookalike`; upload of an eml without attachment → 200 with `code: "no_pdf_in_email"`; upload of random bytes → 400 `not_pdf`. `tests/scenarios.test.ts`: the `email` scenario exists, is on stage, sample file exists.
- [ ] Step 2: run → FAIL. Step 3: generate the PDF (`python scripts/make_invoices.py`; it must keep regenerating 01–04 identically or leave them untouched — check `git status` shows only the new file) and the eml; implement the route. Step 4: pass + suite/tsc/lint. Step 5: commit `feat(email): accept .eml in extract, demo email scenario`.

### Task 5: UI — attach email, `EmailPanel`, highlights, i18n

**Files:**
- Create: `components/EmailPanel.tsx`
- Modify: `lib/usePaymentScreen.ts`, `app/page.tsx`, `components/PaymentForm.tsx`, `lib/i18n.ts`

**Interfaces:**
- Consumes: `/api/extract` email response (Task 4), signal ids (Task 3).
- Produces:
  - Hook state `email: EmailView | null`, cleared by `clearAll` and by attaching a new file; `attach(file)` accepts PDF or `.eml`; for an email response the hook makes a blob URL from `pdfBase64` (revoked like the existing object URL) and sets `src` to it (or null when no PDF). `error` code `no_pdf_in_email` shown as a notice.
  - `PaymentForm`: second button «Приложить письмо» (`accept=".eml,message/rfc822"`) next to the PDF button; Dict keys `attachEmail`, `attachEmailHint`.
  - `EmailPanel` (right column, above the invoice when `email` is set): title «Письмо, в котором пришёл счёт»; rows: From (name + address; the domain part highlighted red when the verdict has `email_lookalike`, amber when `email_domain_differs` or `email_free_mail`), Reply-To (only if present; amber when `email_reply_to`), authentication (three small labels SPF/DKIM/DMARC with pass/fail/none in plain words), subject, date; body text in a scrollable box (max ~12 lines) with each pressure quote highlighted amber; caption «Давление найдено ИИ» or «Давление найдено по ключевым фразам» from `pressureMode`. Before a verdict exists the panel shows the same data without red/amber on From/Reply-To (pressure highlights always shown).
  - The invoice heading for an email upload uses the PDF attachment filename.
  - All new strings in kk/ru/en in `lib/i18n.ts`.
- [ ] Step 1: no unit tests for components (project has none); keep `npm test`, tsc, lint, `npm run build` (log to a file) clean.
- [ ] Step 2: implement.
- [ ] Step 3: browser check is done by the controller.
- [ ] Step 4: commit `feat(ui): attach an email, email panel with highlights`.
