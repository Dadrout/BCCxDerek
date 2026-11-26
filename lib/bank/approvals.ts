// Файловое хранилище утверждённых смен реквизитов. Никогда не бросает на чтении: нет файла или битый JSON → [].
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Approval } from "@/lib/signals/types";

const DEFAULT_FILE = "data/approvals.json";
const pathOf = (file?: string): string => file ?? process.env.DEREK_APPROVALS_FILE ?? DEFAULT_FILE;

export function readApprovals(file?: string): Approval[] {
  try {
    const data: unknown = JSON.parse(readFileSync(pathOf(file), "utf8"));
    return Array.isArray(data) ? (data as Approval[]) : [];
  } catch {
    return [];
  }
}

function write(list: Approval[], file?: string): void {
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
