// Нормализация и проверка казахстанских IBAN (KZ + 2 контрольные цифры + 3 код банка + 13 счёт = 20 символов).

// Кириллические буквы, похожие на латинские: частый приём при подделке реквизитов.
const HOMOGLYPHS: Record<string, string> = {
  "А": "A", "В": "B", "Е": "E", "К": "K", "М": "M", "Н": "H", "О": "O",
  "Р": "P", "С": "C", "Т": "T", "Х": "X", "З": "Z", "У": "Y",
};

export type NormalizedIban = {
  value: string; // только A-Z, 0-9 и «?» для нечитаемых символов
  hadHomoglyphs: boolean;
  hasUnreadable: boolean;
};

export function normalizeIban(raw: string | null | undefined): NormalizedIban {
  let hadHomoglyphs = false;
  const value = (raw ?? "")
    .toUpperCase()
    .split("")
    .map((ch) => {
      if (HOMOGLYPHS[ch]) { hadHomoglyphs = true; return HOMOGLYPHS[ch]; }
      return ch;
    })
    .join("")
    .replace(/[\s\-.]/g, "")
    .replace(/[^A-Z0-9?]/g, "");
  return { value, hadHomoglyphs, hasUnreadable: value.includes("?") };
}

export function ibanChecksumOk(iban: string): boolean {
  if (!/^KZ\d{2}[0-9A-Z]{16}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let rem = 0;
  for (const ch of rearranged) {
    const digits = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
    for (const d of digits) rem = (rem * 10 + Number(d)) % 97;
  }
  return rem === 1;
}

export function formatIban(iban: string): string {
  return iban.replace(/(.{4})/g, "$1 ").trim();
}

// Коды банков в IBAN (позиции 5–7). Небольшой справочник для демо.
const BANK_CODES: Record<string, string> = {
  "856": "Банк ЦентрКредит",
  "722": "Kaspi Bank",
  "601": "Народный Банк Казахстана",
};
export function bankByIban(iban: string): string | null {
  return BANK_CODES[iban.slice(4, 7)] ?? null;
}

export function normalizeBin(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\D/g, "");
}
