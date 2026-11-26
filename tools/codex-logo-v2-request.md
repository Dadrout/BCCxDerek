PROJECT CONTEXT: Derek is a hackathon prototype for the ITU Hackathon-2026 fintech case of Bank CenterCredit (BCC, Kazakhstan). Derek is a protection feature inside BCC Business, the bank's app for companies. When an accountant presses "Pay", Derek checks the recipient against the bank's data and stops payments to fake invoices (swapped bank details, lookalike email addresses, a "pay our partner instead" request that breaks the contract). The jury are BCC people, some of them not from finance.

TASK: design a professional logo for Derek, as a senior brand designer would. It must look like a credible product of BCC: a sub-brand that could sit next to the BCC logo in the BCC Business app. The current logo (public/brand/derek-*.svg, a generic shield with a check-arrow) looks like a stock icon. Replace it.

REFERENCE (attached image, also at tools/ref/bcc-logo-reference.png): the official BCC logo. Study it for its design language. Do not copy it.
- Mark: a rounded equilateral triangle drawn as a thick continuous band, with a second smaller rounded triangle inside, open at one side, like a nested or spiralling triangle. The corners are softly rounded, the strokes are heavy and even, and it is geometric and calm.
- Colours: warm gold/sand #D9AB6E for the mark, BCC green #26AE60 for the wordmark.
- Wordmark: lowercase geometric sans "bcc.kz", heavy weight, round bowls, tight spacing.

DESIGN BRIEF
1. Family resemblance, not imitation. Use the same vocabulary as BCC: thick even strokes, softly rounded corners, simple geometry, the gold plus green palette. Never reuse the BCC triangle or nested-triangle motif, and never make something that could be confused with the BCC mark. Derek must have its own idea.
2. Concept: the mark should express "a payment that is checked and stopped or let through". Ideas you may explore (pick the strongest or find a better one):
   - a lowercase "d" whose bowl is a guarded gate or a check;
   - two arcs (bank and payment) locking together;
   - a rounded shield formed by one continuous band, the way BCC's triangle is one band;
   - an arrow (payment) passing through a gate.
   Prefer one continuous thick band, echoing BCC's construction.
3. The wordmark "derek" in lowercase, matching the heavy geometric character of "bcc.kz": round bowls and the same stroke weight as the mark. Draw it as paths, not a <text> element, so it renders without fonts. Letters must be well spaced and optically balanced, with consistent stroke width and true geometric curves (arcs or proper Béziers, no wobbly hand-made points).
4. Colours: mark in BCC gold #D9AB6E, wordmark in deep navy #0A1424 for the light version. A second accent may use BCC green #26AE60 sparingly, for example one detail of the mark. Dark version: mark gold, wordmark #EEF2F8.
5. It must read at 24–32 px (favicon) and look premium at 600 px on a pitch deck cover.

OUTPUT FILES (replace the old ones; change nothing else in the repo):
- public/brand/derek-mark.svg: the mark alone, square viewBox 0 0 256 256, with even padding.
- public/brand/derek-logo.svg: horizontal lockup, mark plus "derek", for a light background.
- public/brand/derek-logo-dark.svg: the same lockup for a dark #0A1424 background.
- public/brand/derek-logo-bcc.svg: co-brand lockup "derek" plus a thin divider plus the small text "by BCC" drawn as paths. Do NOT include the BCC mark itself.
- app/icon.svg: a copy of derek-mark.svg.

TECHNICAL RULES: hand-written clean SVG, no raster, no scripts, no external refs, no <text>, explicit fills on every shape, correct viewBox with nothing clipped, each file under 10 KB, valid XML (check it).

PROCESS: sketch at least 3 different mark concepts in your reasoning, judge each against the brief (distinct from BCC, idea clarity, legibility at 24 px, family resemblance), pick the best, then refine its geometry carefully.

REPORT BACK (short): files written, the chosen concept in 2–3 sentences, why it beats the other concepts, and any open issues.
