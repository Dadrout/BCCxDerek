// Фикстуры синтетического банка: на них опираются демо-сценарии и тесты. Все данные вымышленные.
import { makeKzIban } from "../iban.ts";

import { DALA_SHOWN, TAU_SHOWN, ZHYLDAM_SHOWN } from "../demo-client.ts";

export { DEMO_CLIENT } from "../demo-client.ts";
import { DEMO_CLIENT } from "../demo-client.ts";

export const DALA = {
  ...DALA_SHOWN,
  registeredAt: "2018-03-14",
  openedAt: "2018-04-02",
  otherClients: 47,
};

// Шесть платежей демо-клиента Дала Транс (даты и суммы совпадают с историей в демо-реестре).
export const DALA_DEMO_PAYMENTS: { date: string; amount: number }[] = [
  { date: "2026-05-15", amount: 690000 },
  { date: "2026-06-16", amount: 720000 },
  { date: "2026-07-17", amount: 705000 },
  { date: "2026-08-15", amount: 760000 },
  { date: "2026-09-16", amount: 745000 },
  { date: "2026-10-19", amount: 780000 },
];

export const FRAUD_IBAN = makeKzIban("856", "0000098765432");
export const FRAUD_OWNER = { name: "Касымов Р.Т.", id: "920115300123", openedAt: "2026-12-08" };

export const TAU = {
  ...TAU_SHOWN,
  registeredAt: "2017-06-20",
  openedAt: "2017-07-05",
  otherClients: 48,
};

export const ZHYLDAM = {
  ...ZHYLDAM_SHOWN,
  registeredAt: "2026-11-27",
  openedAt: "2026-12-08",
};

export const ALTYN = {
  bin: "210940017733",
  name: "ТОО «Алтын Сауда Сервис»",
  iban: makeKzIban("601", "0000077712345"),
  registeredAt: "2021-09-10",
  otherClients: 12,
};

// Партнёр Дала Транс: счёт в другом банке (601), поэтому в банке BCC счёта и платежей у него нет.
export const ARNA = {
  bin: "190540018826",
  name: "ТОО «Арна Карго»",
  iban: makeKzIban("601", "0000052207741"),
  registeredAt: "2019-05-21",
};

export const REPORTED_IBAN = makeKzIban("722", "0000011122233");
export const REPORTED = { count: 3, lastAt: "2026-11-20" };

export const UNRELIABLE = {
  bin: "190240005511",
  name: "ТОО «Нур Опт Трейд»",
  iban: makeKzIban("722", "0000033300111"),
  registeredAt: "2019-02-12",
};
export const INACTIVE = {
  bin: "160840007722",
  name: "ТОО «Кайрат Сервис Плюс»",
  iban: makeKzIban("601", "0000033300222"),
  registeredAt: "2016-08-30",
};
export const UNRELIABLE_BIN = UNRELIABLE.bin;
export const INACTIVE_BIN = INACTIVE.bin;

export const DALA_CONTRACT = {
  clientBin: DEMO_CLIENT.bin,
  supplierBin: DALA.bin,
  person: "Ахметов Ерлан Серикович",
  role: "директор",
  phone: "+7 727 355 18 40",
  email: "info@dalatrans.kz",
  source: "договор № 14/2025 от 10.01.2025",
  paymentTerms: [
    { clause: "4.1", text: "Оплата производится на расчётный счёт Исполнителя, указанный в разделе 10 настоящего договора." },
    { clause: "4.2", text: "Изменение банковских реквизитов Исполнителя допускается только дополнительным соглашением, подписанным обеими сторонами." },
    { clause: "4.3", text: "Оплата третьим лицам по настоящему договору не допускается." },
  ],
};
