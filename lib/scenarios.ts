// Сценарии демо. Реквизиты берутся из фикстур банка, IBAN здесь не набираются вручную.
import { TAU, ZHYLDAM } from "./bank/fixtures.ts";
import type { DocumentHints } from "./signals/types.ts";
import type { PaymentFields } from "./signals/validate.ts";

export type ScenarioId = "normal" | "swap" | "new_to_you" | "young_firm" | "blurry" | "manual" | "known_new";

export type Scenario = {
  id: ScenarioId;
  sample?: string;
  fields?: PaymentFields;
  hints?: DocumentHints;
  onStage: boolean;
};

const noHints: DocumentHints = { changeRequestText: null, phoneInDocument: null };

export const SCENARIOS: Scenario[] = [
  { id: "normal", sample: "01_dala_obychnyj.pdf", onStage: true },
  { id: "swap", sample: "02_dala_podmena_iban.pdf", onStage: true },
  {
    id: "new_to_you",
    fields: { name: TAU.name, bin: TAU.bin, iban: TAU.invoiceIban, amount: "1250000", purpose: "Оплата по счёту № ТС-0412" },
    hints: noHints,
    onStage: true,
  },
  {
    id: "young_firm",
    fields: { name: ZHYLDAM.name, bin: ZHYLDAM.bin, iban: ZHYLDAM.iban, amount: "900000", purpose: "Оплата по счёту № ЖИ-0001" },
    hints: noHints,
    onStage: false,
  },
  { id: "blurry", sample: "03_dala_razmytyj_skan.pdf", onStage: false },
  // Поля пустые: пользователь вводит реквизиты Дала Транс сам (подсказка говорит, что вписать).
  { id: "manual", fields: { name: "", bin: "", iban: "", amount: "", purpose: "" }, hints: noHints, onStage: false },
  { id: "known_new", sample: "04_novyj_postavshik.pdf", onStage: false },
];
