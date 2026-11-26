// Файловое хранилище утверждённых смен реквизитов. Никогда не бросает на чтении: нет файла или битый JSON → [].
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { isStage } from "@/lib/demo";
import type { Approval } from "@/lib/signals/types";

const DEFAULT_FILE = "data/approvals.json";
const pathOf = (file?: string): string => file ?? process.env.DEREK_APPROVALS_FILE ?? DEFAULT_FILE;

// На сцене (DEREK_STAGE=1) утверждения живут только в памяти: перезапуск сервера всегда начинает с чистого листа.
// globalThis, чтобы все маршруты Next видели один и тот же список.
const g = globalThis as { __derekStageApprovals?: Approval[] };
const memory = (): Approval[] => (g.__derekStageApprovals ??= []);

const isStr = (v: unknown): v is string => typeof v === "string";
const isApproval = (x: unknown): x is Approval => {
  if (!x || typeof x !== "object") return false;
  const a = x as Record<string, unknown>;
  return isStr(a.clientBin) && isStr(a.bin) && isStr(a.iban) && isStr(a.approvedAt) && isStr(a.approvedBy);
};

export function readApprovals(file?: string): Approval[] {
  if (isStage()) return [...memory()];
  try {
    const data: unknown = JSON.parse(readFileSync(pathOf(file), "utf8"));
    return Array.isArray(data) ? data.filter(isApproval) : [];
  } catch {
    return [];
  }
}

function write(list: Approval[], file?: string): void {
  if (isStage()) {
    g.__derekStageApprovals = list;
    return;
  }
  const path = pathOf(file);
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(path, JSON.stringify(list, null, 2));
}

export function addApproval(a: Approval, file?: string): void {
  write([...readApprovals(file), a], file);
}

export function resetApprovals(file?: string): void {
  write([], file);
}
