# Derek внутри платёжки: план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Экран «Новый платёж» BCC Business, где кнопка «Оплатить» запускает серверную проверку получателя по синтетическим данным банка через движок сигналов.

**Architecture:** Детерминированный скрипт создаёт данные банка в JSON (`data/bank/`). Чистая функция `evaluate()` (`lib/signals/engine.ts`) превращает поля платежа и данные банка в список сигналов и вердикт. API-маршруты Next.js вызывают её на сервере. Клиент получает идентификаторы сигналов с параметрами и сам собирает тексты на kk/ru/en. Чтение PDF (`lib/extract.ts`) только заполняет поля формы.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind 4, Vitest (новая dev-зависимость), Node 24 (запускает `.ts`-скрипты без сборки).

**Spec:** `docs/superpowers/specs/2026-11-25-payment-screen-signals-design.md`. Исполнитель читает и его, и этот план.

**Git:** папка не под git, поэтому вместо коммитов каждая задача заканчивается контрольной точкой «все тесты зелёные». Если пользователь сделает `git init`, после каждой контрольной точки нужно делать коммит.

## Global Constraints

- Работает без интернета: данные в файлах проекта, без базы данных и внешних сервисов. ИИ необязателен.
- Стек не меняется: Next.js 15, React 19, Tailwind 4, TypeScript.
- Все новые тексты на трёх языках: `kk`, `ru`, `en`.
- Все данные синтетические, интерфейс сообщает об этом (как сейчас: `t.disclaimer`).
- Решение принимают правила, не ИИ. ИИ только читает PDF и объясняет вердикт.
- Бухгалтер видит только агрегаты о других клиентах (число), никогда их названия, суммы и даты.
- Главные сообщения без жаргона, понятны человеку не из финансов («номер счёта», а не «бенефициар»).
- Нельзя обещать «100% защиты» или «деньги вернутся».
- Нельзя выдавать зелёный вердикт без положительного подтверждения или при сомнительном номере счёта.
- `DEMO_TODAY = 2026-12-11`: одна константа, системные часы движок не использует.
- Окно истории — 12 месяцев до `DEMO_TODAY`; `crowd_mismatch` требует не меньше 5 разных других клиентов; `account_new` — счёт моложе 30 дней; `supplier_young` — фирма моложе 90 дней.
- Сценический режим: переменная окружения `DEREK_STAGE=1` отключает Groq и Claude в разборе PDF.
- Экран в стиле банковского приложения с пометкой «демо для BCC», без копии логотипа BCC.

## Review Focus

1. Номер счёта, введённый строчными буквами, с пробелами или дефисами (`kz21 8560-0000 1234 5678`), должен приниматься как обычный, а не считаться ошибкой. Тест в задаче 1.
2. БИН с пробелами (`180 340 021 457`) принимается; БИН из 11 или 13 цифр — ошибка поля, а не «фирма не найдена». Тест в задаче 1.
3. Сумма в виде `1 250 000,00` или `1250000.50` разбирается как 1 250 000 (копейки отбрасываются); пустая или нулевая сумма — ошибка поля. Тест в задаче 1.
4. Пользователь изменил номер счёта после проверки и нажал «Оплатить» — сервер отвечает «нужна новая проверка», а не отправляет. Тест в задаче 6.
5. Файла `data/approvals.json` нет или в нём испорченный JSON — проверка работает как без утверждений, без падения. Тест в задаче 4.

---

## Файлы

| Файл | Ответственность |
|---|---|
| `vitest.config.ts` | Настройка тестов, алиас `@` → корень |
| `lib/demo.ts` | `DEMO_TODAY`, `isStage()` |
| `lib/iban.ts` (изменить) | + `makeKzIban()`, строгая проверка символов |
| `lib/signals/validate.ts` | Разбор и проверка полей платежа |
| `lib/bank/types.ts` | Типы данных банка |
| `lib/bank/fixtures.ts` | Фиксированные фирмы и счета демо-сценариев |
| `scripts/gen-bank.ts` | Генератор `data/bank/*.json` |
| `data/bank/*.json` | Сгенерированные данные (в репозитории) |
| `lib/bank/store.ts` | Загрузка JSON и индексы (`BankContext`) |
| `lib/bank/approvals.ts` | Утверждённые смены реквизитов (`data/approvals.json`) |
| `lib/signals/types.ts` | Сигналы, вердикты, результат проверки |
| `lib/signals/engine.ts` | `evaluate()` |
| `lib/signals/texts.ts` | Тексты сигналов, вердиктов и действий на kk/ru/en |
| `app/api/extract/route.ts` | PDF → поля |
| `app/api/check/route.ts` (переписать) | Поля → результат проверки |
| `app/api/pay/route.ts` | Демо-отправка только проверенной версии |
| `app/api/approvals/route.ts` | Утвердить смену / сбросить демо |
| `app/api/explain/route.ts` (переписать), `lib/groq.ts` (изменить) | Объяснение от ИИ по сигналам |
| `lib/extract.ts` (изменить) | Сценический режим |
| `lib/scenarios.ts` | Список демо-сценариев (безопасен для клиента) |
| `scripts/make_invoices.py` (изменить), `public/samples/02_*.pdf` | Счёт подмены с номером счёта в BCC |
| `components/PaymentForm.tsx`, `components/VerdictPanel.tsx`, `components/ContactCard.tsx` | Экран платежа |
| `app/page.tsx` (переписать) | Сборка экрана |
| Удалить: `lib/check.ts`; из `lib/types.ts` — `CheckResult`, `Status`; из `lib/registry.ts` — `SUPPLIERS`, `PAYMENT_HISTORY` | Старый движок |

---

### Task 1: Тесты, константы демо и строгий разбор полей

**Files:**
- Create: `vitest.config.ts`, `lib/demo.ts`, `lib/signals/validate.ts`
- Modify: `package.json` (devDependency `vitest`, скрипт `"test": "vitest run"`), `lib/iban.ts`
- Test: `tests/validate.test.ts`, `tests/iban.test.ts`

**Interfaces:**
- Produces:
  - `DEMO_TODAY: string` (`"2026-12-11"`), `isStage(): boolean` (`process.env.DEREK_STAGE === "1"`) в `lib/demo.ts`
  - `makeKzIban(bankCode: string, account: string): string` в `lib/iban.ts`: 3 цифры банка + 13 символов счёта → валидный IBAN `KZ…` из 20 символов (тот же алгоритм, что `kz_iban` в `scripts/make_invoices.py`)
  - `type PaymentFields = { name: string; bin: string; iban: string; amount: string; purpose: string }` (сырые строки из формы)
  - `type FieldError = { field: "name" | "bin" | "iban" | "amount"; code: "empty" | "bad_chars" | "unreadable" | "length" | "checksum" | "not_positive" }`
  - `type ParsedPayment = { name: string; bin: string; iban: string; amount: number; hadHomoglyphs: boolean }`
  - `parsePayment(f: PaymentFields): { ok: true; value: ParsedPayment } | { ok: false; errors: FieldError[] }` в `lib/signals/validate.ts`

- [ ] **Step 1: Установить зависимости и Vitest.** `npm install`, затем `npm install -D vitest`. В `vitest.config.ts`: `environment: "node"`, `resolve.alias: { "@": <корень проекта> }`, `include: ["tests/**/*.test.ts"]`.

- [ ] **Step 2: Написать падающие тесты**

```ts
// tests/iban.test.ts
expect(makeKzIban("856", "0000012345678")).toBe("KZ218560000012345678");
expect(ibanChecksumOk(makeKzIban("601", "0000077712345"))).toBe(true);

// tests/validate.test.ts
const base = { name: "ТОО «Дала Транс Логистик»", bin: "180340021457", iban: "KZ218560000012345678", amount: "840000", purpose: "" };
test("lowercase, spaces and dashes in IBAN are accepted", () => {
  const r = parsePayment({ ...base, iban: "kz21 8560-0000 1234 5678" });
  expect(r).toEqual({ ok: true, value: expect.objectContaining({ iban: "KZ218560000012345678" }) });
});
test("unexpected symbol in IBAN is a field error, not silently dropped", () => {
  expect(parsePayment({ ...base, iban: "KZ218560000012345678!" })).toEqual({ ok: false, errors: [{ field: "iban", code: "bad_chars" }] });
});
test("unreadable ? in IBAN", () => expect(parsePayment({ ...base, iban: "KZ2185600000123?5678" })).toMatchObject({ ok: false, errors: [{ field: "iban", code: "unreadable" }] }));
test("one wrong digit fails checksum", () => expect(parsePayment({ ...base, iban: "KZ218560000012345679" })).toMatchObject({ ok: false, errors: [{ field: "iban", code: "checksum" }] }));
test("Cyrillic look-alikes are normalised and flagged", () => {
  const r = parsePayment({ ...base, iban: "КZ218560000012345678" }); // К кириллица
  expect(r).toMatchObject({ ok: true, value: { iban: "KZ218560000012345678", hadHomoglyphs: true } });
});
test("BIN with spaces accepted; 11 digits is length error", () => {
  expect(parsePayment({ ...base, bin: "180 340 021 457" })).toMatchObject({ ok: true, value: { bin: "180340021457" } });
  expect(parsePayment({ ...base, bin: "18034002145" })).toMatchObject({ ok: false, errors: [{ field: "bin", code: "length" }] });
});
test("amount formats", () => {
  expect(parsePayment({ ...base, amount: "1 250 000,00" })).toMatchObject({ ok: true, value: { amount: 1250000 } });
  expect(parsePayment({ ...base, amount: "1250000.50" })).toMatchObject({ ok: true, value: { amount: 1250000 } });
  expect(parsePayment({ ...base, amount: "0" })).toMatchObject({ ok: false, errors: [{ field: "amount", code: "not_positive" }] });
});
test("empty fields are reported together", () => {
  const r = parsePayment({ name: "", bin: "", iban: "", amount: "", purpose: "" });
  expect(r.ok).toBe(false);
  expect((r as { errors: FieldError[] }).errors.map((e) => e.field).sort()).toEqual(["amount", "bin", "iban", "name"]);
});
```

- [ ] **Step 3: Запустить** `npm test`. Ожидается: FAIL, функции не определены.

- [ ] **Step 4: Реализовать.** `makeKzIban` и `parsePayment`. Для IBAN переиспользовать `HOMOGLYPHS` из `lib/iban.ts`; допустимые разделители — только пробел, `-`, `.`; любой другой символ вне `A-Z0-9?` даёт `bad_chars`; порядок проверок IBAN: empty → bad_chars → unreadable → length (не 20) → checksum. Сумма: убрать пробелы (включая неразрывные), дробную часть после `,` или `.` отбросить.

- [ ] **Step 5: Запустить** `npm test`. Ожидается: PASS.

- [ ] **Step 6: Контрольная точка:** `npm test` зелёный, `npx tsc --noEmit` без ошибок.

---

### Task 2: Данные банка: фикстуры, генератор, загрузка

**Files:**
- Create: `lib/bank/types.ts`, `lib/bank/fixtures.ts`, `scripts/gen-bank.ts`, `data/bank/{clients,payments,accounts,registry,complaints,contracts}.json`, `lib/bank/store.ts`
- Modify: `package.json` (скрипт `"gen:bank": "node scripts/gen-bank.ts"`)
- Test: `tests/bank-data.test.ts`

**Interfaces:**
- Consumes: `makeKzIban`, `DEMO_TODAY`
- Produces (`lib/bank/types.ts`):
  - `Payment = { date: string /* YYYY-MM-DD */; clientBin: string; supplierBin: string; iban: string; amount: number }`
  - `Account = { iban: string; ownerId: string /* БИН или ИИН */; ownerType: "company" | "ip" | "individual"; ownerName: string; openedAt: string }` — только счета BCC (код банка `856`)
  - `Company = { bin: string; name: string; registeredAt: string; status: "active" | "inactive" | "unreliable" }`
  - `Complaint = { iban: string; count: number; lastAt: string }`
  - `Contract = { clientBin: string; supplierBin: string; person: string; role: string; phone: string; source: string }`
  - `BankContext = { paymentsBySupplier: Map<string, Payment[]>; accounts: Map<string, Account>; registry: Map<string, Company>; complaints: Map<string, Complaint>; contracts: Contract[] }`
- Produces (`lib/bank/store.ts`): `getBank(): BankContext` (ленивая загрузка JSON один раз), `makeBank(raw: { payments; accounts; registry; complaints; contracts }): BankContext` (для тестов с ручными данными)
- Produces (`lib/bank/fixtures.ts`): константы, на которые опираются сценарии и тесты:

| Константа | Значение | Смысл |
|---|---|---|
| `DEMO_CLIENT` | `{ bin: "150540009981", name: "ТОО «Шаңырақ Бизнес Групп»" }` | Клиент на экране |
| `DALA` | БИН `180340021457`, «ТОО «Дала Транс Логистик»», `iban: makeKzIban("856","0000012345678")`, зарегистрирована 2018-03-14, active, счёт в BCC принадлежит этой фирме; демо-клиент платил ей 6 раз (даты и суммы из текущего `PAYMENT_HISTORY` в `lib/registry.ts`, средняя ≈ 733 000, поэтому счёт на 840 000 даёт `amount_unusual` ≈ 15%); ещё 47 других клиентов платят на этот же счёт | Сценарии 1, 2 |
| `FRAUD_IBAN` | `makeKzIban("856","0000098765432")`, владелец — физлицо «Касымов Р.Т.», ИИН `920115300123`, открыт 2026-12-08 | Сценарий 2 |
| `TAU` | БИН `170640011223`, «ТОО «Тау Строй Материалы»», `iban: makeKzIban("856","0000055501234")` (настоящий, платят ровно 48 других клиентов), `invoiceIban: makeKzIban("601","0000044409876")` (в счёте мошенника) | Сценарий 3 |
| `ZHYLDAM` | БИН `261127000451`, «ТОО «Жылдам Импорт»», зарегистрирована 2026-11-27, IBAN `makeKzIban("856","0000066607788")` открыт 2026-12-08, владелец — эта фирма | Сценарий 4 |
| `ALTYN` | БИН `210940017733`, «ТОО «Алтын Сауда Сервис»», `iban: makeKzIban("601","0000077712345")`, платят 12 других клиентов, демо-клиент — никогда | Пример 04 (новый поставщик, банк подтверждает → зелёный) |
| `REPORTED_IBAN` | `makeKzIban("722","0000011122233")`, 3 жалобы | Тест `iban_reported` |
| `UNRELIABLE_BIN`, `INACTIVE_BIN` | по одной фирме каждого статуса | Тесты |
| `DALA_CONTRACT` | данные из текущего `SUPPLIERS[0].contact` в `lib/registry.ts` | Звонок по договору |

- [ ] **Step 1: Написать падающие тесты** (`tests/bank-data.test.ts`, читают реальные JSON через `getBank()`):

```ts
const dala = bank.paymentsBySupplier.get(DALA.bin)!;
const others = (iban: string, bin: string) => new Set(bank.paymentsBySupplier.get(bin)!.filter(p => p.iban === iban && p.clientBin !== DEMO_CLIENT.bin).map(p => p.clientBin)).size;
test("demo client paid Dala 6 times to the real IBAN", () => expect(dala.filter(p => p.clientBin === DEMO_CLIENT.bin && p.iban === DALA.iban)).toHaveLength(6));
test("Tau is paid by exactly 48 other clients to its real IBAN, none to the invoice IBAN", () => {
  expect(others(TAU.iban, TAU.bin)).toBe(48);
  expect(others(TAU.invoiceIban, TAU.bin)).toBe(0);
});
test("demo client never paid Tau or Zhyldam", () => { /* нет платежей DEMO_CLIENT этим БИН */ });
test("FRAUD_IBAN belongs to an individual opened 2026-12-08", () => expect(bank.accounts.get(FRAUD_IBAN)).toMatchObject({ ownerType: "individual", openedAt: "2026-12-08" }));
test("every generated IBAN passes checksum", () => { /* все iban в payments и accounts */ });
test("some supplier has two working IBANs paid by different clients", () => { /* хотя бы один БИН с 2 IBAN, на каждый платят ≥5 клиентов */ });
test("no client names, amounts or dates leak into contracts other than the demo client", () => expect(bank.contracts.every(c => c.clientBin === DEMO_CLIENT.bin)).toBe(true));
test("generator is deterministic", () => { /* запустить генерацию в память дважды (экспортируемая функция generate()) и сравнить JSON */ });
```

- [ ] **Step 2: Запустить** `npm test`. Ожидается: FAIL.

- [ ] **Step 3: Реализовать генератор** `scripts/gen-bank.ts`, экспорт `generate(seed = 2026)`, при прямом запуске пишет файлы. Импорты относительные с расширением `.ts`, чтобы Node 24 запускал файл без сборки. ПСЧ: mulberry32 с фиксированным зерном. Примерный объём: 300 клиентов, 40 поставщиков, у 3 поставщиков по два рабочих счёта, платежи за 12 месяцев до `DEMO_TODAY` (несколько тысяч), все фикстуры из таблицы выше вписываются поверх случайных данных. Все даты отсчитываются от `DEMO_TODAY`.

- [ ] **Step 4: Реализовать** `lib/bank/store.ts` (`makeBank`, `getBank` читает `data/bank/*.json` через `fs` относительно `process.cwd()`).

- [ ] **Step 5:** `npm run gen:bank`, затем `npm test`. Ожидается: PASS.

- [ ] **Step 6: Контрольная точка:** тесты зелёные, размер `data/bank/payments.json` меньше 2 МБ.

---

### Task 3: Движок сигналов

**Files:**
- Create: `lib/signals/types.ts`, `lib/signals/engine.ts`
- Test: `tests/engine.test.ts` (ручной маленький `BankContext` через `makeBank`, не реальные данные)

**Interfaces:**
- Consumes: `ParsedPayment`, `BankContext`, `makeBank`, `DEMO_TODAY`, `bankByIban`
- Produces (`lib/signals/types.ts`):
  - `type SignalId` — ровно эти значения, **в порядке приоритета** (первый сработавший `stop` становится главной причиной): `"owner_individual" | "owner_mismatch" | "iban_reported" | "homoglyphs" | "bin_not_found" | "supplier_unreliable" | "own_history_changed" | "crowd_mismatch" | "account_new" | "supplier_young" | "supplier_inactive" | "name_mismatch" | "change_request" | "phone_differs" | "nothing_to_compare" | "change_approved" | "first_payment" | "owner_unknown" | "amount_unusual" | "crowd_confirms" | "own_history_ok" | "owner_ok"`. Экспортировать массив `SIGNAL_ORDER` в этом порядке.
  - `type Severity = "stop" | "check" | "info" | "ok"`; `SEVERITY: Record<SignalId, Severity>` по таблице спецификации; `nothing_to_compare` → `check`, `bin_not_found` → `stop`, `name_mismatch` → `check`, `change_approved` → `info`.
  - `type Signal = { id: SignalId; severity: Severity; params: Record<string, string | number> }`
  - `type Action = "call_contract" | "find_phone" | "check_bin" | "check_supplier" | "pay" | "pay_after_ack"`
  - `type Verdict = "stop" | "check" | "ok"`
  - `type Contact = { person: string; role: string; phone: string; source: string }`
  - `type CheckOutcome = { kind: "verdict"; verdict: Verdict; main: Signal; action: Action; signals: Signal[]; contact: Contact | null; fingerprint: string } | { kind: "fix_fields"; errors: FieldError[] }`
  - `type DocumentHints = { changeRequestText: string | null; phoneInDocument: string | null }` (из PDF, необязательно)
  - `type Approval = { clientBin: string; bin: string; iban: string; approvedAt: string; approvedBy: string }` (используется движком здесь, хранилище — в задаче 4)
- Produces (`lib/signals/engine.ts`): `evaluate(p: ParsedPayment, bank: BankContext, opts: { clientBin: string; hints?: DocumentHints; approvals?: Approval[] }): Extract<CheckOutcome, { kind: "verdict" }>` и `fingerprint(clientBin: string, p: ParsedPayment): string` (sha256 hex от `clientBin|name|bin|iban|amount` через `node:crypto`).

**Правила (где спецификация оставила выбор, решение записано здесь):**
- `owner_individual` вместо `owner_mismatch`, если владелец счёта в BCC не совпадает с БИН и `ownerType === "individual"`. `owner_ok`, если `ownerId === bin`. `owner_unknown`, если код банка не `856`.
- `bin_not_found`, если БИН нет в реестре; тогда `supplier_*`, `name_mismatch` не считаются.
- `name_mismatch`, если название из реестра после нормализации (нижний регистр, только буквы и цифры, без «тоо», «ао», «ип») не совпадает с введённым; параметр `registryName`.
- История: платежи с датой > `DEMO_TODAY` − 12 месяцев. `own_history_changed`, если клиент платил этому БИН только на другие счета (параметр `count`); `own_history_ok`, если хоть раз на этот (параметр `count`). `first_payment`, если не платил этому БИН ни разу.
- Другие клиенты (без текущего), считаются разные `clientBin`: `crowd_mismatch` (параметр `count`), если на этот IBAN платили 0, а на другие ≥ 5; `crowd_confirms` (параметр `count`), если на этот IBAN платили ≥ 1.
- `account_new` (параметр `days`), если счёт в BCC моложе 30 дней; `supplier_young` (параметр `days`) — фирма моложе 90 дней.
- `amount_unusual` (параметр `percent`), если сумма > 1,10 × средняя по платежам клиента этому БИН.
- `change_request` (параметр `text`) из `hints.changeRequestText`; `phone_differs`, если в договоре клиента с этим БИН есть телефон и цифры не совпадают с `hints.phoneInDocument`.
- `homoglyphs` из `p.hadHomoglyphs`.
- `nothing_to_compare`, если после всего нет ни одного сигнала `ok` и нет `change_approved`.
- Вердикт: есть `stop` → `stop`; иначе есть `check` → `check`; иначе `ok`. `main` — первый сигнал наивысшей серьёзности по `SIGNAL_ORDER`.
- Действие по главной причине: `bin_not_found`, `name_mismatch` → `check_bin`; `supplier_unreliable`, `supplier_inactive`, `supplier_young` → `check_supplier`; другие `stop` и `check` → `call_contract`, если есть договор клиента с этим БИН, иначе `find_phone`; вердикт `ok` → `pay`. Для вердикта `check` кнопка оплаты доступна после подтверждения (`pay_after_ack` показывается вторым действием в интерфейсе).
- `contact` — из договора клиента с этим БИН или `null`.

- [ ] **Step 1: Написать падающие тесты:** по одному тесту на каждый `SignalId` (срабатывает в своём случае и не срабатывает в соседнем), плюс:

```ts
// OTHER_REGISTERED_BIN — БИН другой фирмы из ручного реестра теста
test("known name with a foreign BIN is not a match", () => {
  const r = evaluate({ ...dala, bin: OTHER_REGISTERED_BIN }, bank, opts);
  expect(r.signals.map(s => s.id)).toContain("name_mismatch");
  expect(r.verdict).not.toBe("ok");
});
test("only info signals give check with nothing_to_compare, never green", () => {
  const r = evaluate(newSupplierOtherBank, bank, opts); // first_payment + owner_unknown
  expect(r.verdict).toBe("check");
  expect(r.main.id).toBe("nothing_to_compare");
});
test("supplier with two working IBANs: paying either one is not crowd_mismatch", () => { /* ... */ });
test("4 other clients on another IBAN is below threshold", () => { /* нет crowd_mismatch */ });
test("payments older than 12 months are ignored", () => { /* ... */ });
test("main reason follows SIGNAL_ORDER: owner_individual beats crowd_mismatch", () => { /* ... */ });
test("action: bin_not_found → check_bin; owner_mismatch with contract → call_contract; without → find_phone", () => { /* ... */ });
test("fingerprint changes when any field except purpose changes", () => { /* ... */ });
```

- [ ] **Step 2: Запустить** `npm test`. Ожидается: FAIL.
- [ ] **Step 3: Реализовать** `types.ts` и `engine.ts` по правилам выше. Движок не читает файлы и часы: всё приходит через параметры.
- [ ] **Step 4: Запустить** `npm test`. Ожидается: PASS.
- [ ] **Step 5: Контрольная точка:** тесты зелёные, `npx tsc --noEmit` чистый.

---

### Task 4: Утверждённые смены реквизитов

**Files:**
- Create: `lib/bank/approvals.ts`
- Modify: `lib/signals/engine.ts`
- Test: `tests/approvals.test.ts`

**Interfaces:**
- Consumes: `Approval` из `lib/signals/types.ts`; в движке — `opts.approvals`.
- Produces в `lib/bank/approvals.ts`: `readApprovals(file?: string): Approval[]`, `addApproval(a: Approval, file?: string): void`, `resetApprovals(file?: string): void`. Путь: аргумент `file`, иначе `process.env.DEREK_APPROVALS_FILE`, иначе `data/approvals.json` (добавить в `.gitignore`).

- [ ] **Step 1: Падающие тесты:**

```ts
test("approval for exact client+BIN+IBAN turns own_history_changed and crowd_mismatch into change_approved", () => {
  const r = evaluate(swapToCompanyAccount, bank, { ...opts, approvals: [approval] });
  const ids = r.signals.map(s => s.id);
  expect(ids).toContain("change_approved");
  expect(ids).not.toContain("own_history_changed");
  expect(ids).not.toContain("crowd_mismatch");
});
test("approval never removes owner_individual, owner_mismatch, iban_reported, supplier_unreliable", () => { /* verdict остаётся stop */ });
test("approval for another IBAN or another client has no effect", () => { /* ... */ });
test("missing file reads as []", () => expect(readApprovals(tmp("nope.json"))).toEqual([]));
test("corrupt JSON reads as []", () => { /* записать "{oops" и прочитать */ });
test("add then reset", () => { /* ... */ });
```

- [ ] **Step 2: Запустить**, ожидается FAIL. **Step 3: Реализовать.** `change_approved` получает параметры `date` (дата из `approvedAt`, формат `ДД.ММ`) и `by`. **Step 4: Запустить**, ожидается PASS. **Step 5: Контрольная точка.**

---

### Task 5: Тексты на трёх языках

**Files:**
- Create: `lib/signals/texts.ts`
- Test: `tests/texts.test.ts`

**Interfaces:**
- Consumes: `SignalId`, `Signal`, `Verdict`, `Action`, `FieldError`, `Lang` из `lib/i18n.ts`
- Produces: `signalText(s: Signal, lang: Lang): string`, `verdictTitle(v: Verdict, lang: Lang): string`, `actionLabel(a: Action, lang: Lang): string`, `fieldErrorText(e: FieldError, lang: Lang): string`, `findPhoneAdvice(lang: Lang): string`

Русские тексты сигналов — фразы-примеры из таблицы спецификации с параметрами; для `nothing_to_compare` — «Банку не с чем сравнить этого получателя». Заголовки вердиктов (ru): `stop` — «Платёж остановлен», `check` — «Проверьте перед оплатой», `ok` — «Получатель подтверждён». Действия (ru): `call_contract` — «Позвонить по номеру из договора», `find_phone` — «Найти телефон в независимом источнике», `check_bin` — «Проверить БИН», `check_supplier` — «Проверить фирму в госреестре», `pay` — «Оплатить», `pay_after_ack` — «Я проверил, оплатить». `findPhoneAdvice` (ru): «Найдите телефон в независимом источнике — на официальном сайте или в прежней переписке. Не звоните по номеру из счёта». Казахский — в стиле существующего `lib/i18n.ts` (деректемелер, жеткізуші, төлем, БСН).

- [ ] **Step 1: Падающие тесты:** для каждого `SignalId` × каждого языка `signalText` возвращает непустую строку без `undefined` и `{`; параметры подставляются (`count: 48` → строка содержит `48`); ни один русский текст не содержит слов «бенефициар», «IBAN» в начале строки (номер счёта называется «счёт»).
- [ ] **Step 2: Запустить**, FAIL. **Step 3: Реализовать.** **Step 4:** PASS. **Step 5: Контрольная точка.**

---

### Task 6: API: разбор PDF, проверка, оплата, утверждения, объяснение

**Files:**
- Create: `app/api/extract/route.ts`, `app/api/pay/route.ts`, `app/api/approvals/route.ts`
- Modify: `app/api/check/route.ts` (переписать), `app/api/explain/route.ts` (переписать), `lib/groq.ts` (`explainRisk`), `lib/extract.ts` (сценический режим)
- Test: `tests/api.test.ts` (вызывает экспортированные `POST`/`DELETE` напрямую с `new Request(...)`)

**Interfaces:**
- `POST /api/extract` — `multipart/form-data` с `file` или `sample` (проверки размера, `%PDF-` и списка образцов перенести из текущего `/api/check`) → `{ fields: PaymentFields; hints: DocumentHints; extraction: Extraction }`. Поля из `Extraction`: `supplier_name`, `bin`, `iban`, `amount` → `PaymentFields`; `purpose` = `"Оплата по счёту № " + invoice_number`, если номер есть.
- `POST /api/check` — JSON `{ fields: PaymentFields; hints?: DocumentHints }` → `CheckOutcome`. Сервер: `parsePayment` → при ошибках `{ kind: "fix_fields" }`, иначе `evaluate(…, getBank(), { clientBin: DEMO_CLIENT.bin, hints, approvals: readApprovals() })`.
- `POST /api/pay` — JSON `{ fields; hints?; fingerprint: string; acknowledged?: boolean }` → проверяет заново: ошибки полей → 400 `{ result: "fix_fields" }`; отпечаток не совпадает → 409 `{ result: "needs_recheck" }`; вердикт `stop` → 403 `{ result: "blocked" }`; `check` без `acknowledged` → 409 `{ result: "needs_ack" }`; иначе 200 `{ result: "sent" }`.
- `POST /api/approvals` — JSON `{ fields }` → `addApproval({ clientBin: DEMO_CLIENT.bin, bin, iban, approvedAt: DEMO_TODAY, approvedBy: "Сапарова А.К., главный бухгалтер" })` → `{ ok: true }`. `DELETE /api/approvals` → `resetApprovals()` → `{ ok: true }`.
- `POST /api/explain` — JSON `{ fields; hints?; lang }` → как сейчас: `{ text, model }` или `{ text: null, code: "offline" | "failed" }`. `explainRisk(outcome, lang)` получает в фактах вердикт, главную причину и тексты всех сигналов на русском (`signalText(s, "ru")`). Системный промпт сохранить, заменив «сверки с подтверждённой карточкой» на «проверки получателя по данным банка».
- `lib/extract.ts`: если `isStage()`, сразу `extractLocally(pdf)` без обращения к сети.

- [ ] **Step 1: Падающие тесты:**

```ts
test("check returns fix_fields for IBAN with '!'", async () => { /* kind === "fix_fields" */ });
test("pay: edited IBAN after check → 409 needs_recheck", async () => {
  const c = await check(dalaFields);           // получить fingerprint
  const r = await pay({ fields: { ...dalaFields, iban: FRAUD_IBAN }, fingerprint: c.fingerprint });
  expect(r.status).toBe(409); expect(await r.json()).toEqual({ result: "needs_recheck" });
});
test("pay: stop verdict → 403 blocked", async () => { /* подмена */ });
test("pay: check verdict needs acknowledged", async () => { /* Жылдам: 409 needs_ack, затем с acknowledged → 200 sent */ });
test("pay: ok verdict → 200 sent", async () => { /* Дала */ });
test("approvals: approve swap to company IBAN then check shows change_approved; DELETE resets", async () => { /* временный DEREK_APPROVALS_FILE */ });
test("extract rejects non-PDF and unknown sample", async () => { /* 400 not_pdf / unknown_sample */ });
test("stage mode never calls the network", async () => { /* DEREK_STAGE=1, GROQ_API_KEY задан, global fetch заменён на падающий, extract образца 01 работает */ });
```

В тестах путь к файлу утверждений задаётся через `DEREK_APPROVALS_FILE` (задача 4).

- [ ] **Step 2: Запустить**, FAIL. **Step 3: Реализовать.** **Step 4:** PASS. **Step 5: Контрольная точка.**

---

### Task 7: Сценарии демо и обновлённые счета

**Files:**
- Create: `lib/scenarios.ts`
- Modify: `scripts/make_invoices.py` (`FRAUD_IBAN = kz_iban("856", "0000098765432")` вместо банка `722`; банк в счёте подмены — «АО «Банк ЦентрКредит»», БИК `KCJBKZKX`), `public/samples/02_dala_podmena_iban.pdf` (пересобрать: `python scripts/make_invoices.py`, нужен `reportlab`), `lib/registry.ts` (`SAMPLES` переносится в сценарии; `SUPPLIERS`, `PAYMENT_HISTORY` удаляются в задаче 8)
- Test: `tests/scenarios.test.ts`

**Interfaces:**
- Produces: `type Scenario = { id: "normal" | "swap" | "new_to_you" | "young_firm" | "blurry" | "manual" | "known_new"; sample?: string; fields?: PaymentFields; hints?: DocumentHints; onStage: boolean }`, `SCENARIOS: Scenario[]` в порядке спецификации; `onStage: true` для `normal`, `swap`, `new_to_you`. Названия и подсказки сценариев — в `lib/signals/texts.ts` (`scenarioTitle(id, lang)`, `scenarioHint(id, lang)`).
- `new_to_you`, `young_firm`, `manual` — без PDF (поля заданы); `normal`, `swap`, `blurry`, `known_new` — с PDF. `manual` — те же поля, что `normal`, но вводятся «руками» (поля пустые, подсказка что вписать).

- [ ] **Step 1: Падающие тесты** (реальные данные `getBank()`, для PDF-сценариев — `extractLocally` через `/api/extract` с `DEREK_STAGE=1`):

```ts
test("normal → ok, main own_history_ok/crowd_confirms, amount_unusual present", …);
test("swap → stop, main owner_individual, also own_history_changed, crowd_mismatch, account_new, change_request, phone_differs", …);
test("new_to_you → stop, main crowd_mismatch with count 48, owner_unknown, first_payment, no contact", …);
test("young_firm → check, supplier_young and account_new, action check_supplier", …);
test("blurry (local mode, no text layer) → fields come back empty, check gives fix_fields with iban code empty", …);
test("known_new (Altyn) → ok, main crowd_confirms count 12, also first_payment and owner_unknown", …);
test("PDF 02 contains FRAUD_IBAN formatted in groups of 4", …);
```

- [ ] **Step 2: Запустить**, FAIL. **Step 3: Реализовать** сценарии, обновить и запустить генератор PDF. **Step 4:** PASS. **Step 5: Контрольная точка.**

---

### Task 8: Экран платежа

**Files:**
- Create: `components/PaymentForm.tsx`, `components/VerdictPanel.tsx`, `components/ContactCard.tsx`
- Modify: `app/page.tsx` (переписать), `lib/i18n.ts` (строки экрана: заголовок «Новый платёж», подписи полей, «Приложить счёт PDF», «Почему ещё», «Отложить платёж», «Сбросить демо», журнал), `README.md`
- Delete: `lib/check.ts`; `CheckResult`, `Status` из `lib/types.ts`; `SUPPLIERS`, `PAYMENT_HISTORY` из `lib/registry.ts` (оставить `CLIENT` или заменить на `DEMO_CLIENT`)

**Interfaces:**
- Consumes: API из задачи 6, `SCENARIOS`, тексты из задачи 5, `PdfView` (без изменений)

Поведение (только то, чего нет в спецификации):
- Слева форма платежа, справа PDF (если приложен) с подсветкой: номер счёта — цветом вердикта; `change_request` и телефон — жёлтым (как сейчас в `highlights`).
- Над формой — ряд сценариев; сценарии с `onStage` идут первыми и визуально выделены.
- Приложенный PDF вызывает `/api/extract` и только заполняет поля и `hints`. Любая правка поля сбрасывает показанный вердикт.
- «Оплатить» → `/api/check` → `VerdictPanel`: цветная полоса вердикта, заголовок, одна главная причина крупно, кнопка действия рядом, «Почему ещё» раскрывает остальные сигналы. Ошибки полей подсвечивают сами поля текстом из `fieldErrorText`.
- При `ok` кнопка «Оплатить» → `/api/pay` → «Отправлено на подпись». При `check` — «Я проверил, оплатить» (`acknowledged: true`). При `stop` — «Отложить платёж» и кнопка действия.
- `ContactCard` (из текущей модалки): при `call_contract` показывает договор; при `find_phone` — `findPhoneAdvice`; кнопки «Поставщик подтвердил смену» (создаёт заявку), «Реквизиты не менялись» (блокирует). В демо после «подтвердил» появляется «Утвердить как второй сотрудник» → `/api/approvals` → повторная проверка.
- Объяснение ИИ (`/api/explain`) — как сейчас, блок под вердиктом, кешируется по языку.
- Журнал действий и переключатель языка — как сейчас. Смена языка не вызывает повторную проверку (тексты из идентификаторов).
- «Сбросить демо» в шапке: `DELETE /api/approvals`, очистка формы и журнала.

- [ ] **Step 1: Реализовать компоненты и страницу.**
- [ ] **Step 2: Проверить сборку:** `npm run lint` и `npm run build` без ошибок; `npm test` зелёный.
- [ ] **Step 3: Проверить в браузере** (`npm run dev`): три сценария для сцены дают «Получатель подтверждён» / «Платёж остановлен: Счёт принадлежит частному лицу» / «Платёж остановлен: 48 клиентов банка платят этой фирме на другой счёт»; правка номера счёта после проверки сбрасывает вердикт; переключение kk/ru/en меняет тексты без новой проверки; «Утвердить как второй сотрудник» и «Сбросить демо» работают.
- [ ] **Step 4: Офлайн-прогон:** `npm run build`, затем `DEREK_STAGE=1 npm start` с отключённой сетью; три сценария для сцены проходят, а `/api/explain` показывает «офлайн» без зависания.
- [ ] **Step 5:** обновить `README.md` (новый экран, сценарии, `DEREK_STAGE`, `npm run gen:bank`, `npm test`; исправить противоречие Claude/Groq) и `TASK_STATE.md`.
- [ ] **Step 6: Контрольная точка:** всё выше выполнено.
