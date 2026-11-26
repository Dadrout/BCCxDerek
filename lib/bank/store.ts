// Загрузка синтетических данных банка. Только для сервера: читает JSON через fs.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { BankContext, BankRaw, Payment } from "./types.ts";

export function makeBank(raw: BankRaw): BankContext {
  const paymentsBySupplier = new Map<string, Payment[]>();
  for (const p of raw.payments) {
    const list = paymentsBySupplier.get(p.supplierBin);
    if (list) list.push(p);
    else paymentsBySupplier.set(p.supplierBin, [p]);
  }
  return {
    paymentsBySupplier,
    accounts: new Map(raw.accounts.map((a) => [a.iban, a])),
    registry: new Map(raw.registry.map((c) => [c.bin, c])),
    complaints: new Map(raw.complaints.map((c) => [c.iban, c])),
    contracts: raw.contracts,
  };
}

let cached: BankContext | null = null;

export function getBank(): BankContext {
  if (cached) return cached;
  const dir = join(process.cwd(), "data", "bank");
  const read = <T>(name: string): T => JSON.parse(readFileSync(join(dir, `${name}.json`), "utf8")) as T;
  cached = makeBank({
    payments: read("payments"),
    accounts: read("accounts"),
    registry: read("registry"),
    complaints: read("complaints"),
    contracts: read("contracts"),
  });
  return cached;
}
