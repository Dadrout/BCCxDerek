// Генератор синтетических данных банка. Запуск: node scripts/gen-bank.ts (Node 24 без сборки).
// Относительные импорты с .ts и только стираемый синтаксис типов.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEMO_TODAY } from "../lib/demo.ts";
import { makeKzIban } from "../lib/iban.ts";
import {
  ALTYN, DALA, DALA_CONTRACT, DALA_DEMO_PAYMENTS, DEMO_CLIENT, FRAUD_IBAN, FRAUD_OWNER, INACTIVE,
  REPORTED, REPORTED_IBAN, TAU, UNRELIABLE, ZHYLDAM,
} from "../lib/bank/fixtures.ts";
import type { Account, BankRaw, Company, Payment } from "../lib/bank/types.ts";

const CLIENTS = 300;
const RANDOM_SUPPLIERS = 34; // плюс 6 фиксированных = 40 поставщиков
const TWO_IBAN_SUPPLIERS = 3;
const DAY = 86400000;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isoDaysBefore(base: string, days: number): string {
  return new Date(Date.parse(base + "T00:00:00Z") - days * DAY).toISOString().slice(0, 10);
}

const FIRST = ["Алма", "Арман", "Астана", "Береке", "Дастан", "Жигер", "Қазына", "Нұр", "Самал", "Сункар", "Тұлпар", "Алтай", "Каспий", "Бірлік", "Ертіс"];
const SECOND = ["Строй", "Трейд", "Логистик", "Групп", "Снаб", "Инвест", "Сервис", "Агро", "Пром", "Транзит", "Опт", "Монтаж"];
const SURNAMES = ["Сериков", "Ахметов", "Жумабаев", "Омаров", "Байжанов", "Нурпеисов", "Калиев", "Тулегенов"];

export function generate(seed = 2026): BankRaw {
  const rnd = mulberry32(seed);
  const int = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
  const pick = <T>(arr: T[]): T => arr[int(0, arr.length - 1)];
  const shuffle = <T>(arr: T[]): T[] => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = int(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const usedBins = new Set<string>([DEMO_CLIENT.bin, DALA.bin, TAU.bin, ZHYLDAM.bin, ALTYN.bin, UNRELIABLE.bin, INACTIVE.bin]);
  const bin = (): string => {
    for (;;) {
      const v = String(int(10, 24)).padStart(2, "0") + String(int(1, 12)).padStart(2, "0") + "4" + String(int(0, 9999999)).padStart(7, "0");
      if (v.length === 12 && !usedBins.has(v)) { usedBins.add(v); return v; }
    }
  };
  const usedIbans = new Set<string>([DALA.iban, TAU.iban, TAU.invoiceIban, ZHYLDAM.iban, ALTYN.iban, FRAUD_IBAN, REPORTED_IBAN, UNRELIABLE.iban, INACTIVE.iban]);
  const iban = (bank: string): string => {
    for (;;) {
      const v = makeKzIban(bank, String(int(100000, 999999)).padStart(6, "0") + String(int(0, 9999999)).padStart(7, "0"));
      if (!usedIbans.has(v)) { usedIbans.add(v); return v; }
    }
  };
  const name = () => `ТОО «${pick(FIRST)} ${pick(SECOND)}»`;
  const registeredBefore = () => isoDaysBefore(DEMO_TODAY, int(800, 3500));

  const registry: Company[] = [];
  const accounts: Account[] = [];
  const payments: Payment[] = [];

  // Клиенты банка.
  registry.push({ bin: DEMO_CLIENT.bin, name: DEMO_CLIENT.name, registeredAt: "2015-05-12", status: "active" });
  const clients: string[] = [];
  for (let i = 0; i < CLIENTS - 1; i++) {
    const b = bin();
    clients.push(b);
    registry.push({ bin: b, name: name(), registeredAt: registeredBefore(), status: "active" });
  }

  // Платежи пары клиент-поставщик-счёт: от 1 до 6 платежей на сумму около базовой.
  const pay = (clientBin: string, supplierBin: string, ibanValue: string, base: number, count = int(1, 6)) => {
    const k = 0.75 + rnd() * 0.5;
    const days = new Set<number>();
    while (days.size < count) days.add(int(0, 364));
    for (const d of days) {
      const amount = Math.round((base * k * (0.92 + rnd() * 0.16)) / 100) * 100;
      payments.push({ date: isoDaysBefore(DEMO_TODAY, d), clientBin, supplierBin, iban: ibanValue, amount });
    }
  };
  const payFrom = (n: number, supplierBin: string, ibanValue: string, base: number) => {
    for (const c of shuffle(clients).slice(0, n)) pay(c, supplierBin, ibanValue, base);
  };

  // Фиксированные поставщики.
  registry.push({ bin: DALA.bin, name: DALA.name, registeredAt: DALA.registeredAt, status: "active" });
  accounts.push({ iban: DALA.iban, ownerId: DALA.bin, ownerType: "company", ownerName: DALA.name, openedAt: DALA.openedAt });
  for (const p of DALA_DEMO_PAYMENTS) payments.push({ date: p.date, clientBin: DEMO_CLIENT.bin, supplierBin: DALA.bin, iban: DALA.iban, amount: p.amount });
  payFrom(DALA.otherClients, DALA.bin, DALA.iban, 733000);

  registry.push({ bin: TAU.bin, name: TAU.name, registeredAt: TAU.registeredAt, status: "active" });
  accounts.push({ iban: TAU.iban, ownerId: TAU.bin, ownerType: "company", ownerName: TAU.name, openedAt: TAU.openedAt });
  payFrom(TAU.otherClients, TAU.bin, TAU.iban, 1200000);

  registry.push({ bin: ZHYLDAM.bin, name: ZHYLDAM.name, registeredAt: ZHYLDAM.registeredAt, status: "active" });
  accounts.push({ iban: ZHYLDAM.iban, ownerId: ZHYLDAM.bin, ownerType: "company", ownerName: ZHYLDAM.name, openedAt: ZHYLDAM.openedAt });

  registry.push({ bin: ALTYN.bin, name: ALTYN.name, registeredAt: ALTYN.registeredAt, status: "active" });
  payFrom(ALTYN.otherClients, ALTYN.bin, ALTYN.iban, 450000);

  registry.push({ bin: UNRELIABLE.bin, name: UNRELIABLE.name, registeredAt: UNRELIABLE.registeredAt, status: "unreliable" });
  payFrom(6, UNRELIABLE.bin, UNRELIABLE.iban, 300000);
  registry.push({ bin: INACTIVE.bin, name: INACTIVE.name, registeredAt: INACTIVE.registeredAt, status: "inactive" });
  payFrom(6, INACTIVE.bin, INACTIVE.iban, 300000);

  accounts.push({ iban: FRAUD_IBAN, ownerId: FRAUD_OWNER.id, ownerType: "individual", ownerName: FRAUD_OWNER.name, openedAt: FRAUD_OWNER.openedAt });

  // Случайные поставщики; у первых трёх по два рабочих счёта, на каждый платят не меньше пяти клиентов.
  for (let i = 0; i < RANDOM_SUPPLIERS; i++) {
    const b = bin();
    const isIp = i % 5 === 4;
    const sName = isIp ? `ИП ${pick(SURNAMES)}` : name();
    registry.push({ bin: b, name: sName, registeredAt: registeredBefore(), status: "active" });
    const ibans = Array.from({ length: i < TWO_IBAN_SUPPLIERS ? 2 : 1 }, () => iban(pick(["856", "856", "601", "722"])));
    if (i < TWO_IBAN_SUPPLIERS) ibans[0] = iban("856");
    for (const ib of ibans) {
      if (ib.slice(4, 7) === "856") {
        accounts.push({ iban: ib, ownerId: b, ownerType: isIp ? "ip" : "company", ownerName: sName, openedAt: isoDaysBefore(DEMO_TODAY, int(400, 3000)) });
      }
    }
    const pool = shuffle(clients).slice(0, i < TWO_IBAN_SUPPLIERS ? int(14, 30) : int(8, 40));
    const base = int(50, 3000) * 1000;
    pool.forEach((c, idx) => pay(c, b, ibans[idx % ibans.length], base));
    if (i < 5) pay(DEMO_CLIENT.bin, b, ibans[0], base);
  }

  payments.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  return {
    payments,
    accounts,
    registry,
    complaints: [{ iban: REPORTED_IBAN, count: REPORTED.count, lastAt: REPORTED.lastAt }],
    contracts: [{ ...DALA_CONTRACT }],
  };
}

const self = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === resolve(self)) {
  const out = join(dirname(self), "..", "data", "bank");
  mkdirSync(out, { recursive: true });
  const raw = generate();
  for (const [key, value] of Object.entries(raw)) writeFileSync(join(out, `${key}.json`), JSON.stringify(value));
  console.log(
    `bank: ${raw.registry.length} companies, ${raw.payments.length} payments, ${raw.accounts.length} accounts, ${raw.complaints.length} complaints, ${raw.contracts.length} contracts`,
  );
}
