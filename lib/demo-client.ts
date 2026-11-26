// Клиентобезопасные данные демо: то, что экран и сценарии показывают пользователю. Без чувствительных фикстур банка.
import { makeKzIban } from "./iban.ts";

export const DEMO_CLIENT = { bin: "150540009981", name: "ТОО «Шаңырақ Бизнес Групп»" };

export const DALA_SHOWN = {
  bin: "180340021457",
  name: "ТОО «Дала Транс Логистик»",
  iban: makeKzIban("856", "0000012345678"),
};

export const TAU_SHOWN = {
  bin: "170640011223",
  name: "ТОО «Тау Строй Материалы»",
  iban: makeKzIban("856", "0000055501234"),
  invoiceIban: makeKzIban("601", "0000044409876"),
};

export const ZHYLDAM_SHOWN = {
  bin: "261127000451",
  name: "ТОО «Жылдам Импорт»",
  iban: makeKzIban("856", "0000066607788"),
};
