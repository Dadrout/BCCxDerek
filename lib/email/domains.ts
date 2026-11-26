// Правила для доменов отправителя: бесплатная почта, тот же домен, похожий домен.

const FREE_MAIL = new Set([
  "gmail.com",
  "mail.ru",
  "inbox.ru",
  "list.ru",
  "bk.ru",
  "yandex.ru",
  "yandex.kz",
  "ya.ru",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
]);

/** Домен адреса (в нижнем регистре), пустая строка если нет «@». */
export function domainOf(address: string): string {
  const i = address.lastIndexOf("@");
  return i < 0 ? "" : address.slice(i + 1).trim().toLowerCase();
}

export function isFreeMail(domain: string): boolean {
  return FREE_MAIL.has(domain.trim().toLowerCase());
}

/** Тот же домен или его поддомен. */
export function sameOrg(domain: string, reference: string): boolean {
  const d = domain.trim().toLowerCase();
  const r = reference.trim().toLowerCase();
  if (!d || !r) return false;
  return d === r || d.endsWith("." + r);
}

const DIGIT_SWAPS: Record<string, string> = { "0": "o", "1": "l", "3": "e", "5": "s" };

// Ядро домена: без зоны (последней метки), без ведущих www./mail., без - _ .
// и с подменой цифр на похожие буквы.
function core(domain: string): string {
  const labels = domain.trim().toLowerCase().split(".").filter(Boolean);
  if (labels.length > 1) labels.pop();
  if (labels.length > 1 && (labels[0] === "www" || labels[0] === "mail")) labels.shift();
  return labels
    .join("")
    .replace(/[-_.]/g, "")
    .replace(/[0135]/g, (c) => DIGIT_SWAPS[c]);
}

function levenshtein(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

/** Домен выглядит как подделка эталонного, но им не является. */
export function isLookalike(domain: string, reference: string): boolean {
  if (sameOrg(domain, reference)) return false;
  const a = core(domain);
  const b = core(reference);
  if (!a || !b) return false;
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (short.length >= 4 && long.includes(short)) return true;
  return short.length >= 5 && levenshtein(a, b) <= 2;
}
