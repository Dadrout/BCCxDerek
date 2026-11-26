PROJECT CONTEXT: Derek is a hackathon prototype for the ITU Hackathon-2026 fintech case of Bank CenterCredit (BCC, Kazakhstan). It is a protection feature inside BCC Business, the bank's app for companies: when an accountant presses "Pay", Derek checks the recipient against the bank's data and stops payments to fake invoices. The logo goes on a pitch deck cover in front of a BCC jury and in the app header.

TASK: design THREE alternative logo concepts for Derek. Each is an ABSTRACT symbol plus the wordmark "derek". Write them as separate files; do not touch any existing file.

WHAT WENT WRONG BEFORE (avoid):
- v1 was a generic shield with a check-arrow. It looked like a stock icon.
- v2 used a lowercase "d" as the symbol next to the word "derek". The user rejected it: "why are there two d's". The symbol must contain NO letters, no "d", no "D", no letter-like shapes.

REFERENCE (attached image, also at tools/ref/bcc-logo-reference.png): the official BCC logo. Borrow its design language, not its shapes:
- one thick continuous band with softly rounded corners;
- calm, even stroke weight;
- warm gold #D9AB6E;
- BCC green #26AE60 used sparingly.
Never use a triangle or nested triangles (that is BCC's own mark), and never make something that could be confused with it.

THE IDEA TO EXPRESS: a payment is checked at the bank's door and either passes or is stopped. Good directions (each of the three concepts must be clearly different):
- A. Checkpoint / gate: a rounded square or circle band, with one gap where a short bar sits (a barrier). It reads as "a protected passage".
- B. Shield made of one continuous band, with a small notch or an inner dot (the verified recipient). Not the generic stock shield: give it a distinctive construction, such as asymmetric overlap, a band that folds over itself, or a cut.
- C. Two interlocking rounded links (bank and recipient) where one link is closed and verified, or an orbit or ring with a dot on it (the payment) held in place.
You may replace one direction with a stronger original idea, as long as it stays abstract and letter-free.

WORDMARK: "derek" in lowercase, heavy geometric sans with round bowls and even stroke, deep navy #0A1424 (light version). Draw it as paths, not <text>. You may reuse the wordmark paths from tools/ref/rejected/derek-logo-bcc.svg if they are good: they were fine, only the symbol was rejected. Use the same wordmark in all three concepts so only the symbol differs.

COLOURS: symbol in gold #D9AB6E. Optionally one small detail in BCC green #26AE60, for example the "verified" dot or bar.

OUTPUT FILES (new folder public/brand/concepts/):
- concept-a.svg, concept-b.svg, concept-c.svg: horizontal lockup, symbol plus "derek", light background, viewBox about 0 0 760 256.
- concept-a-mark.svg, concept-b-mark.svg, concept-c-mark.svg: symbol alone, viewBox 0 0 256 256, even padding.

QUALITY BAR: a senior brand designer's work.
- True geometric curves (arcs or clean Béziers), no wobbly points, consistent stroke width.
- Optically centred and well balanced against the wordmark: the symbol's height is about the cap height to x-height-plus-ascender of the word.
- Readable at 24 px.
- Hand-written clean SVG: explicit fills, no raster, no scripts, no external refs, no <text>, nothing clipped, under 10 KB each, valid XML (check it).

REPORT BACK (short): the files written, then for each concept one sentence on the idea and one on its weakness. Say which you recommend and why.
