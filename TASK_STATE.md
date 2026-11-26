# TASK_STATE

## Goal
Embed Derek in a BCC Business "new payment" screen. The check runs on every payment and uses synthetic bank data (other clients' payment history, account owners, a company registry, complaints) through a signals engine.

## Done
- Design doc: docs/superpowers/specs/2026-11-25-payment-screen-signals-design.md (builder check done, answers folded in)

- Codex reviewed the design (6 notes, all folded in)
- Design approved by user (2026-11-26)
- Implementation plan: docs/superpowers/plans/2026-11-26-payment-screen-signals.md (8 tasks)

## Next
- User reviews the plan and picks an execution method
- Implement tasks 1–8

## Later projects (agreed order)
2. (folded into 1: check on every payment)
3. Email (.eml) checks: lookalike domain, Reply-To, SPF/DKIM
4. Supplier QR "verified details"
5. Other B2B schemes: CEO fraud, payroll account change, business account takeover

## Open issues
- Project is not a git repo
- README contradicts itself (Claude vs Groq as the main extraction mode)
