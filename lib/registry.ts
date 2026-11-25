// СИНТЕТИЧЕСКИЕ ДАННЫЕ. Все компании, БИН, IBAN и телефоны вымышлены.
// Эталон — подтверждённая карточка поставщика. Загруженный файл её никогда не меняет.

export type SupplierCard = {
  id: string;
  name: string;
  bin: string;
  iban: string;
  bank: string;
  verifiedAt: string;
  verifiedBy: string;
  verificationMethod: string;
  contact: { person: string; role: string; phone: string; source: string };
};

export type PastPayment = { date: string; supplierBin: string; iban: string; amount: number; invoice: string };

export const CLIENT = { name: "ТОО «Шаңырақ Бизнес Групп»", bin: "150540009981" };

export const SUPPLIERS: SupplierCard[] = [
  {
    id: "sup-dala",
    name: "ТОО «Дала Транс Логистик»",
    bin: "180340021457",
    iban: "KZ218560000012345678",
    bank: "АО «Банк ЦентрКредит»",
    verifiedAt: "12.01.2025",
    verifiedBy: "Сапарова А.К., главный бухгалтер",
    verificationMethod: "Звонок по номеру из договора + письмо на бланке с подписью директора",
    contact: {
      person: "Ахметов Ерлан Серикович",
      role: "директор",
      phone: "+7 727 355 18 40",
      source: "договор № 14/2025 от 10.01.2025",
    },
  },
];

export const PAYMENT_HISTORY: PastPayment[] = [
  { date: "15.05.2026", supplierBin: "180340021457", iban: "KZ218560000012345678", amount: 690000, invoice: "ДТ-0512" },
  { date: "16.06.2026", supplierBin: "180340021457", iban: "KZ218560000012345678", amount: 720000, invoice: "ДТ-0613" },
  { date: "17.07.2026", supplierBin: "180340021457", iban: "KZ218560000012345678", amount: 705000, invoice: "ДТ-0715" },
  { date: "15.08.2026", supplierBin: "180340021457", iban: "KZ218560000012345678", amount: 760000, invoice: "ДТ-0814" },
  { date: "16.09.2026", supplierBin: "180340021457", iban: "KZ218560000012345678", amount: 745000, invoice: "ДТ-0916" },
  { date: "19.10.2026", supplierBin: "180340021457", iban: "KZ218560000012345678", amount: 780000, invoice: "ДТ-1018" },
];

export const SAMPLES = [
  { file: "01_dala_obychnyj.pdf", title: "Обычный счёт", hint: "Знакомый поставщик, сумма выросла, IBAN прежний" },
  { file: "02_dala_podmena_iban.pdf", title: "Подмена IBAN", hint: "Всё как обычно, кроме банковского счёта" },
  { file: "03_dala_razmytyj_skan.pdf", title: "Размытый скан", hint: "Реквизиты не читаются уверенно" },
  { file: "04_novyj_postavshik.pdf", title: "Новый поставщик", hint: "Нет подтверждённой записи для сравнения" },
];
