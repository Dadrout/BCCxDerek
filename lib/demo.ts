// Константы демо-режима.

// «Сегодня» в демо: фиксированная дата, чтобы сценарии не зависели от часов.
export const DEMO_TODAY = "2026-12-11";

export function isStage(): boolean {
  return process.env.DEREK_STAGE === "1";
}
