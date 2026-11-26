import { expect, test } from "vitest";
import { domainOf, isFreeMail, isLookalike, sameOrg } from "@/lib/email/domains";

test("похожий домен с дефисом и другой зоной", () => {
  expect(isLookalike("dalatrans-kz.com", "dalatrans.kz")).toBe(true);
});
test("цифра вместо буквы", () => {
  expect(isLookalike("da1atrans.kz", "dalatrans.kz")).toBe(true);
});
test("тот же домен и поддомен не похожи", () => {
  expect(isLookalike("dalatrans.kz", "dalatrans.kz")).toBe(false);
  expect(isLookalike("mail.dalatrans.kz", "dalatrans.kz")).toBe(false);
  expect(isLookalike("DalaTrans.KZ", "dalatrans.kz")).toBe(false);
});
test("чужой домен не похож", () => {
  expect(isLookalike("kaspi.kz", "dalatrans.kz")).toBe(false);
});
test("isFreeMail", () => {
  expect(isFreeMail("gmail.com")).toBe(true);
  expect(isFreeMail("dalatrans.kz")).toBe(false);
});
test("domainOf и sameOrg", () => {
  expect(domainOf("BUH@DalaTrans-KZ.com")).toBe("dalatrans-kz.com");
  expect(domainOf("nope")).toBe("");
  expect(sameOrg("mail.dalatrans.kz", "dalatrans.kz")).toBe(true);
  expect(sameOrg("evildalatrans.kz", "dalatrans.kz")).toBe(false);
});

test("границы порогов isLookalike", () => {
  expect(isLookalike("ab.kz", "ac.kz")).toBe(false);
  expect(isLookalike("abc.kz", "abcdef.kz")).toBe(false);
  expect(isLookalike("dala.kz", "dala-pay.kz")).toBe(true);
  expect(isLookalike("dalatrans.kz", "dalatrbms.kz")).toBe(true);
  expect(isLookalike("dalatrans.kz", "dalatrams.kz")).toBe(true);
  expect(isLookalike("kaspi.kz", "dalatrans.kz")).toBe(false);
});

test("завершающая точка в домене", () => {
  expect(sameOrg("dalatrans.kz.", "dalatrans.kz")).toBe(true);
  expect(sameOrg("mail.dalatrans.kz.", "dalatrans.kz.")).toBe(true);
  expect(isLookalike("dalatrans.kz.", "dalatrans.kz")).toBe(false);
  expect(isLookalike("dalatrans-kz.com.", "dalatrans.kz")).toBe(true);
});
