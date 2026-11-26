import { describe, expect, test } from "vitest";
import { SIGNAL_ORDER, SEVERITY } from "@/lib/signals/types";
import type { Action, Signal, SignalId, Verdict } from "@/lib/signals/types";
import type { FieldError } from "@/lib/signals/validate";
import type { Lang } from "@/lib/i18n";
import { actionLabel, fieldErrorText, findPhoneAdvice, signalText, verdictTitle } from "@/lib/signals/texts";

const LANGS: Lang[] = ["kk", "ru", "en"];
const PARAMS: Record<SignalId, Record<string, string | number>> = {
  account_not_found: { bankName: "Банк ЦентрКредит" },
  owner_ok: {},
  owner_individual: {},
  owner_mismatch: { name: "Дала Транс Логистик" },
  account_new: { days: 3 },
  owner_unknown: { bankName: "Halyk" },
  iban_reported: { count: 7 },
  homoglyphs: {},
  bin_not_found: { bin: "123456789012" },
  supplier_unreliable: { registryName: "ТОО Рога" },
  supplier_inactive: { registryName: "ТОО Рога" },
  supplier_young: { days: 14 },
  name_mismatch: { registryName: "ТОО Копыта" },
  own_history_ok: { count: 6 },
  own_history_changed: { count: 6 },
  first_payment: {},
  amount_unusual: { percent: 15 },
  crowd_confirms: { count: 48 },
  crowd_mismatch: { count: 48 },
  change_approved: { date: "26.11", by: "Сапарова А.К." },
  change_request: { text: "новые реквизиты" },
  phone_differs: { phone: "+7 701 111 11 11", contractPhone: "+7 727 222 22 22" },
  nothing_to_compare: {},
  email_lookalike: { domain: "dalatrans-kz.com", contractDomain: "dalatrans.kz" },
  email_domain_differs: { domain: "other.kz", contractDomain: "dalatrans.kz" },
  email_free_mail: { domain: "gmail.com" },
  email_reply_to: { replyTo: "pay@evil.kz" },
  email_auth_failed: {},
  email_pressure: { quote: "оплатите срочно", count: 2 },
  contract_conflict: { kind: "third_party", source: "email", docQuote: "направить нашему партнёру", clause: "4.3", contractQuote: "Оплата третьим лицам не допускается.", count: 1 },
};
const sig = (id: SignalId, params = PARAMS[id]): Signal => ({ id, severity: SEVERITY[id], params });

describe("signalText", () => {
  for (const lang of LANGS) {
    for (const id of SIGNAL_ORDER) {
      test(`${id} / ${lang}`, () => {
        const t = signalText(sig(id), lang);
        expect(t.length).toBeGreaterThan(0);
        expect(t).not.toMatch(/undefined|\{|\}|NaN/);
        if (lang === "ru") expect(t).not.toMatch(/бенефициар|^IBAN/i);
      });
    }
  }
  test("no doubled quotes when the name already has «»; kk iban_reported has a noun", () => {
    for (const lang of LANGS) {
      for (const id of ["owner_mismatch", "name_mismatch", "supplier_unreliable", "supplier_inactive"] as SignalId[]) {
        const t = signalText({ id, severity: "stop", params: { name: "ТОО «Дала»", registryName: "ТОО «Дала»" } }, lang);
        expect(t).toContain("ТОО «Дала»");
        expect(t).not.toMatch(/[«"]ТОО «/);
      }
    }
    expect(signalText({ id: "iban_reported", severity: "stop", params: { count: 7 } }, "kk")).toContain("7 шағым");
  });
  test("params substituted", () => {
    for (const lang of LANGS) {
      expect(signalText(sig("crowd_mismatch"), lang)).toContain("48");
      expect(signalText(sig("account_new"), lang)).toContain("3");
      expect(signalText(sig("owner_mismatch"), lang)).toContain("Дала Транс Логистик");
      expect(signalText(sig("phone_differs"), lang)).toContain("+7 727 222 22 22");
    }
  });
  test("ru plurals: clients", () => {
    const f = (count: number) => signalText(sig("crowd_mismatch", { count }), "ru");
    expect(f(1)).toContain("1 клиент ");
    expect(f(3)).toContain("3 клиента");
    expect(f(48)).toContain("48 клиентов");
  });
  test("ru verb agrees with count", () => {
    const m = (count: number) => signalText(sig("crowd_mismatch", { count }), "ru");
    const c = (count: number) => signalText(sig("crowd_confirms", { count }), "ru");
    expect(m(1)).toBe("1 клиент банка платит этой фирме на другой счёт");
    expect(m(3)).toBe("3 клиента банка платят этой фирме на другой счёт");
    expect(m(21)).toBe("21 клиент банка платит этой фирме на другой счёт");
    expect(m(48)).toBe("48 клиентов банка платят этой фирме на другой счёт");
    expect(c(1)).toBe("1 клиент банка платит этой фирме на этот же счёт");
    expect(c(3)).toBe("3 клиента банка платят этой фирме на этот же счёт");
    expect(c(21)).toBe("21 клиент банка платит этой фирме на этот же счёт");
    expect(c(48)).toBe("48 клиентов банка платят этой фирме на этот же счёт");
  });
  test("ru plurals: days", () => {
    const f = (days: number) => signalText(sig("account_new", { days }), "ru");
    expect(f(1)).toContain("1 день");
    expect(f(3)).toContain("3 дня");
    expect(f(5)).toContain("5 дней");
  });
  test("account_not_found without bank name", () => {
    expect(signalText(sig("account_not_found", { bankName: "" }), "ru")).toBe("Такого счёта в банке нет");
    expect(signalText(sig("account_not_found", {}), "ru")).toBe("Такого счёта в банке нет");
    expect(signalText(sig("account_not_found"), "ru")).toBe("Такого счёта в Банке ЦентрКредит нет");
  });
  test("account_not_found kk/en do not double the word bank", () => {
    expect(signalText(sig("account_not_found"), "kk")).toBe("ЦентрКредит банкінде мұндай шот жоқ");
    expect(signalText(sig("account_not_found"), "en")).toBe("There is no such account at Bank CenterCredit");
    expect(signalText(sig("account_not_found", { bankName: "" }), "kk")).toBe("Банкте мұндай шот жоқ");
    expect(signalText(sig("account_not_found", {}), "en")).toBe("There is no such account at the bank");
  });
  test("owner_unknown without bank name", () => {
    for (const lang of LANGS) {
      const t = signalText(sig("owner_unknown", {}), lang);
      expect(t.length).toBeGreaterThan(0);
      expect(t).not.toMatch(/undefined|\{|\}/);
    }
  });
});

describe("verdicts, actions, advice", () => {
  const verdicts: Verdict[] = ["stop", "check", "ok"];
  const actions: Action[] = ["call_contract", "find_phone", "check_bin", "check_supplier", "pay", "pay_after_ack"];
  test("ru exact", () => {
    expect(verdictTitle("stop", "ru")).toBe("Платёж остановлен");
    expect(verdictTitle("check", "ru")).toBe("Проверьте перед оплатой");
    expect(verdictTitle("ok", "ru")).toBe("Получатель подтверждён");
    expect(actionLabel("call_contract", "ru")).toBe("Позвонить по номеру из договора");
    expect(actionLabel("pay_after_ack", "ru")).toBe("Я проверил, оплатить");
    expect(findPhoneAdvice("ru")).toBe(
      "Найдите телефон в независимом источнике — на официальном сайте или в прежней переписке. Не звоните по номеру из счёта",
    );
    expect(signalText(sig("nothing_to_compare"), "ru")).toBe("Банку не с чем сравнить этого получателя");
  });
  test("non-empty everywhere", () => {
    for (const lang of LANGS) {
      for (const v of verdicts) expect(verdictTitle(v, lang).length).toBeGreaterThan(0);
      for (const a of actions) expect(actionLabel(a, lang).length).toBeGreaterThan(0);
      expect(findPhoneAdvice(lang).length).toBeGreaterThan(0);
    }
  });
});

describe("fieldErrorText", () => {
  const codes: FieldError["code"][] = ["empty", "bad_chars", "unreadable", "length", "checksum", "not_positive"];
  const fields: FieldError["field"][] = ["name", "bin", "iban", "amount"];
  test("every field x code x lang is non-empty", () => {
    for (const lang of LANGS)
      for (const field of fields)
        for (const code of codes) {
          const t = fieldErrorText({ field, code }, lang);
          expect(t.length, `${field}/${code}/${lang}`).toBeGreaterThan(0);
          expect(t).not.toMatch(/undefined|\{/);
        }
  });
  test("iban checksum ru", () => {
    expect(fieldErrorText({ field: "iban", code: "checksum" }, "ru")).toBe(
      "В номере счёта ошибка: не сходится контрольная сумма. Проверьте каждую цифру",
    );
  });
});
