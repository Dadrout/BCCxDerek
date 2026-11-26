// Тексты сигналов, вердиктов, действий и ошибок полей на трёх языках. Безопасно для клиентских компонентов.
// Правило: простые слова («счёт», «номер счёта»), без жаргона и без обещаний «100% безопасно».
import { pluralRu, type Lang } from "@/lib/i18n";
import { DALA_SHOWN } from "@/lib/demo-client";
import { formatIban } from "@/lib/iban";
import type { Action, Signal, SignalId, Verdict } from "./types.ts";
import type { FieldError } from "./validate.ts";

type P = Record<string, string | number>;
type Fn = (p: P) => string;

const s = (v: string | number | undefined): string => (v === undefined || v === null ? "" : String(v));
const n = (v: string | number | undefined): number => Number(v) || 0;
const enPl = (k: number, one: string, many: string) => (k === 1 ? one : many);

// «в ...»: предложный падеж для известных названий банков, для остальных нейтральная форма.
const ruInBank = (name: string): string => {
  if (name.startsWith("Банк ")) return `Банке ${name.slice(5)}`;
  if (name.startsWith("Народный Банк")) return `Народном Банке${name.slice("Народный Банк".length)}`;
  return `банке «${name}»`;
};

// Казахский: «Банк ЦентрКредит» -> «ЦентрКредит банкінде», без повтора слова «банк».
const kkInBank = (name: string): string => {
  if (name === "Народный Банк Казахстана") return "Қазақстан Халық банкінде";
  const core = name.replace(/^Банк\s+/, "").replace(/\s+Bank$/i, "");
  return `${core} банкінде`;
};
const enBankNames: Record<string, string> = { "Банк ЦентрКредит": "Bank CenterCredit", "Народный Банк Казахстана": "Halyk Bank" };
const enBank = (name: string): string => enBankNames[name] ?? name;

// Кавычки вокруг названия: если в самом названии уже есть «», внешние не добавляем («ТОО «Дала»», а не «ТОО «Дала»»»).
const quoted = (name: string): string => (name.includes("«") ? name : `«${name}»`);
const quotedEn = (name: string): string => (name.includes("«") ? name : `"${name}"`);

// Реквизиты Дала Транс для подсказок сценариев.
const DALA_IBAN = formatIban(DALA_SHOWN.iban);
// Тот же счёт с ошибкой в последней цифре: контрольная сумма её ловит.
const DALA_IBAN_TYPO = formatIban(DALA_SHOWN.iban.slice(0, -1) + String((Number(DALA_SHOWN.iban.slice(-1)) + 1) % 10));

const RU: Record<SignalId, Fn> = {
  owner_mismatch: (p) => `Этот счёт принадлежит не ${quoted(s(p.name))}, а другому лицу`,
  owner_individual: () => "Счёт принадлежит частному лицу, а не фирме",
  account_not_found: (p) => (s(p.bankName) ? `Такого счёта в ${ruInBank(s(p.bankName))} нет` : "Такого счёта в банке нет"),
  iban_reported: (p) => `На этот счёт уже поступали жалобы о мошенничестве (${n(p.count)} ${pluralRu(n(p.count), "жалоба", "жалобы", "жалоб")})`,
  homoglyphs: () => "В номере счёта русские буквы, похожие на латинские. Так маскируют подделку",
  bin_not_found: (p) => `Фирмы с БИН ${s(p.bin)} не существует`,
  supplier_unreliable: (p) => `Фирма ${quoted(s(p.registryName))} в списке неблагонадёжных налогоплательщиков`,
  own_history_changed: (p) => `Вы ${n(p.count)} ${pluralRu(n(p.count), "раз", "раза", "раз")} платили этой фирме на другой счёт`,
  crowd_mismatch: (p) => `${n(p.count)} ${pluralRu(n(p.count), "клиент", "клиента", "клиентов")} банка ${pluralRu(n(p.count), "платит", "платят", "платят")} этой фирме на другой счёт`,
  account_new: (p) => `Счёт открыт ${n(p.days)} ${pluralRu(n(p.days), "день", "дня", "дней")} назад`,
  supplier_young: (p) => `Фирма зарегистрирована ${n(p.days)} ${pluralRu(n(p.days), "день", "дня", "дней")} назад`,
  supplier_inactive: (p) => `Фирма ${quoted(s(p.registryName))} числится бездействующей`,
  name_mismatch: (p) => `По этому БИН зарегистрирована другая фирма: ${quoted(s(p.registryName))}`,
  change_request: (p) => `В счёте просят платить по новым реквизитам: «${s(p.text)}»`,
  phone_differs: (p) => `Телефон в счёте (${s(p.phone)}) не тот, что в договоре (${s(p.contractPhone)})`,
  nothing_to_compare: () => "Банку не с чем сравнить этого получателя",
  change_approved: (p) => `Новый счёт подтверждён ${s(p.date)} (${s(p.by)})`,
  first_payment: () => "Вы платите этой фирме впервые",
  owner_unknown: (p) => (s(p.bankName) ? `Счёт в другом банке (${s(p.bankName)}), владельца проверить нельзя` : "Счёт в другом банке, владельца проверить нельзя"),
  amount_unusual: (p) => `Сумма на ${n(p.percent)}% выше обычной`,
  crowd_confirms: (p) => `${n(p.count)} ${pluralRu(n(p.count), "клиент", "клиента", "клиентов")} банка ${pluralRu(n(p.count), "платит", "платят", "платят")} этой фирме на этот же счёт`,
  own_history_ok: (p) => `Вы уже ${n(p.count)} ${pluralRu(n(p.count), "раз", "раза", "раз")} платили на этот счёт`,
  owner_ok: () => "Счёт принадлежит этой фирме",
};

const KK: Record<SignalId, Fn> = {
  owner_mismatch: (p) => `Бұл шот ${quoted(s(p.name))} компаниясына емес, басқа тұлғаға тиесілі`,
  owner_individual: () => "Шот фирмаға емес, жеке тұлғаға тиесілі",
  account_not_found: (p) => (s(p.bankName) ? `${kkInBank(s(p.bankName))} мұндай шот жоқ` : "Банкте мұндай шот жоқ"),
  iban_reported: (p) => `Бұл шотқа қатысты алаяқтық туралы шағымдар бұрын түскен (${n(p.count)} шағым)`,
  homoglyphs: () => "Шот нөмірінде латынға ұқсайтын орыс әріптері бар. Жалғандықты осылай жасырады",
  bin_not_found: (p) => `БСН ${s(p.bin)} бар фирма жоқ`,
  supplier_unreliable: (p) => `${quoted(s(p.registryName))} фирмасы сенімсіз салық төлеушілер тізімінде`,
  own_history_changed: (p) => `Сіз бұл фирмаға ${n(p.count)} рет басқа шотқа төледіңіз`,
  crowd_mismatch: (p) => `Банктің ${n(p.count)} клиенті бұл фирмаға басқа шотқа төлейді`,
  account_new: (p) => `Шот ${n(p.days)} күн бұрын ашылған`,
  supplier_young: (p) => `Фирма ${n(p.days)} күн бұрын тіркелген`,
  supplier_inactive: (p) => `${quoted(s(p.registryName))} фирмасы әрекетсіз болып саналады`,
  name_mismatch: (p) => `Бұл БСН бойынша басқа фирма тіркелген: ${quoted(s(p.registryName))}`,
  change_request: (p) => `Шотта жаңа деректемелермен төлеуді сұрайды: «${s(p.text)}»`,
  phone_differs: (p) => `Шоттағы телефон (${s(p.phone)}) шарттағы телефоннан (${s(p.contractPhone)}) өзгеше`,
  nothing_to_compare: () => "Банкке бұл алушыны салыстыратын ештеңе жоқ",
  change_approved: (p) => `Жаңа шот ${s(p.date)} күні расталды (${s(p.by)})`,
  first_payment: () => "Сіз бұл фирмаға бірінші рет төлеп жатырсыз",
  owner_unknown: (p) => (s(p.bankName) ? `Шот басқа банкте (${s(p.bankName)}), иесін тексеру мүмкін емес` : "Шот басқа банкте, иесін тексеру мүмкін емес"),
  amount_unusual: (p) => `Сома әдеттегіден ${n(p.percent)}% жоғары`,
  crowd_confirms: (p) => `Банктің ${n(p.count)} клиенті бұл фирмаға дәл осы шотқа төлейді`,
  own_history_ok: (p) => `Сіз бұл шотқа бұрын ${n(p.count)} рет төлегенсіз`,
  owner_ok: () => "Шот осы фирмаға тиесілі",
};

const EN: Record<SignalId, Fn> = {
  owner_mismatch: (p) => `This account does not belong to ${quotedEn(s(p.name))} but to someone else`,
  owner_individual: () => "The account belongs to a private person, not a company",
  account_not_found: (p) => (s(p.bankName) ? `There is no such account at ${enBank(s(p.bankName))}` : "There is no such account at the bank"),
  iban_reported: (p) => `Other customers have already reported this account for fraud (${n(p.count)} ${enPl(n(p.count), "report", "reports")})`,
  homoglyphs: () => "The account number contains Russian letters that look like Latin ones. This is a common way to disguise a fake",
  bin_not_found: (p) => `No company with BIN ${s(p.bin)} exists`,
  supplier_unreliable: (p) => `${quotedEn(s(p.registryName))} is on the list of unreliable taxpayers`,
  own_history_changed: (p) => `You paid this company ${n(p.count)} ${enPl(n(p.count), "time", "times")} to a different account`,
  crowd_mismatch: (p) => `${n(p.count)} ${enPl(n(p.count), "customer", "customers")} of the bank ${enPl(n(p.count), "pays", "pay")} this company to a different account`,
  account_new: (p) => `The account was opened ${n(p.days)} ${enPl(n(p.days), "day", "days")} ago`,
  supplier_young: (p) => `The company was registered ${n(p.days)} ${enPl(n(p.days), "day", "days")} ago`,
  supplier_inactive: (p) => `${quotedEn(s(p.registryName))} is listed as inactive`,
  name_mismatch: (p) => `A different company is registered under this BIN: ${quotedEn(s(p.registryName))}`,
  change_request: (p) => `The invoice asks you to pay to new details: "${s(p.text)}"`,
  phone_differs: (p) => `The phone number on the invoice (${s(p.phone)}) is not the one in the contract (${s(p.contractPhone)})`,
  nothing_to_compare: () => "The bank has nothing to compare this recipient with",
  change_approved: (p) => `The new account was confirmed on ${s(p.date)} (${s(p.by)})`,
  first_payment: () => "This is your first payment to this company",
  owner_unknown: (p) => (s(p.bankName) ? `The account is at another bank (${s(p.bankName)}), so the owner cannot be checked` : "The account is at another bank, so the owner cannot be checked"),
  amount_unusual: (p) => `The amount is ${n(p.percent)}% higher than usual`,
  crowd_confirms: (p) => `${n(p.count)} ${enPl(n(p.count), "customer", "customers")} of the bank ${enPl(n(p.count), "pays", "pay")} this company to this same account`,
  own_history_ok: (p) => `You have already paid to this account ${n(p.count)} ${enPl(n(p.count), "time", "times")}`,
  owner_ok: () => "The account belongs to this company",
};

const SIGNALS: Record<Lang, Record<SignalId, Fn>> = { ru: RU, kk: KK, en: EN };

export function signalText(sg: Signal, lang: Lang): string {
  return SIGNALS[lang][sg.id](sg.params ?? {});
}

const VERDICTS: Record<Lang, Record<Verdict, string>> = {
  ru: { stop: "Платёж остановлен", check: "Проверьте перед оплатой", ok: "Получатель подтверждён" },
  kk: { stop: "Төлем тоқтатылды", check: "Төлемнен бұрын тексеріңіз", ok: "Алушы расталды" },
  en: { stop: "Payment stopped", check: "Check before paying", ok: "Recipient confirmed" },
};
export const verdictTitle = (v: Verdict, lang: Lang): string => VERDICTS[lang][v];

const ACTIONS: Record<Lang, Record<Action, string>> = {
  ru: {
    call_contract: "Позвонить по номеру из договора",
    find_phone: "Найти телефон в независимом источнике",
    check_bin: "Проверить БИН",
    check_supplier: "Проверить фирму в госреестре",
    pay: "Оплатить",
    pay_after_ack: "Я проверил, оплатить",
  },
  kk: {
    call_contract: "Шарттағы нөмірге қоңырау шалу",
    find_phone: "Телефонды тәуелсіз көзден табу",
    check_bin: "БСН тексеру",
    check_supplier: "Фирманы мемлекеттік тізілімнен тексеру",
    pay: "Төлеу",
    pay_after_ack: "Тексердім, төлеу",
  },
  en: {
    call_contract: "Call the number from the contract",
    find_phone: "Find a phone number from an independent source",
    check_bin: "Check the BIN",
    check_supplier: "Check the company in the state registry",
    pay: "Pay",
    pay_after_ack: "I have checked, pay",
  },
};
export const actionLabel = (a: Action, lang: Lang): string => ACTIONS[lang][a];

const FIND_PHONE: Record<Lang, string> = {
  ru: "Найдите телефон в независимом источнике — на официальном сайте или в прежней переписке. Не звоните по номеру из счёта",
  kk: "Телефонды тәуелсіз көзден табыңыз — ресми сайттан немесе бұрынғы хат алмасудан. Шоттағы нөмірге қоңырау шалмаңыз",
  en: "Find the phone number from an independent source, such as the official website or earlier correspondence. Do not call the number on the invoice",
};
export const findPhoneAdvice = (lang: Lang): string => FIND_PHONE[lang];

type FE = Record<FieldError["field"], Record<FieldError["code"], string>>;
const FIELD_ERRORS: Record<Lang, FE> = {
  ru: {
    name: {
      empty: "Укажите название получателя",
      bad_chars: "В названии получателя есть недопустимые символы. Проверьте название",
      unreadable: "Название получателя не удалось прочитать. Введите его вручную",
      length: "Название получателя слишком короткое или слишком длинное. Проверьте его",
      checksum: "Название получателя не удалось проверить. Введите его ещё раз",
      not_positive: "Название получателя указано неверно. Введите его ещё раз",
    },
    bin: {
      empty: "Укажите БИН получателя",
      bad_chars: "В БИН должны быть только цифры. Уберите лишние символы",
      unreadable: "Часть цифр БИН не удалось прочитать. Введите БИН вручную",
      length: "В БИН должно быть 12 цифр. Проверьте, не пропущена ли цифра",
      checksum: "В БИН ошибка: не сходится контрольная цифра. Проверьте каждую цифру",
      not_positive: "БИН указан неверно. Введите его ещё раз",
    },
    iban: {
      empty: "Укажите номер счёта получателя",
      bad_chars: "В номере счёта есть лишние символы. Допустимы только латинские буквы и цифры",
      unreadable: "Часть номера счёта не удалось прочитать. Введите номер вручную",
      length: "В номере счёта должно быть 20 знаков. Проверьте, не пропущен ли знак",
      checksum: "В номере счёта ошибка: не сходится контрольная сумма. Проверьте каждую цифру",
      not_positive: "Номер счёта указан неверно. Введите его ещё раз",
    },
    amount: {
      empty: "Укажите сумму платежа",
      bad_chars: "В сумме должны быть только цифры. Уберите лишние символы",
      unreadable: "Сумму не удалось прочитать. Введите её вручную",
      length: "Сумма указана неверно. Проверьте количество цифр",
      checksum: "Сумма указана неверно. Введите её ещё раз",
      not_positive: "Сумма должна быть больше нуля",
    },
  },
  kk: {
    name: {
      empty: "Алушының атауын көрсетіңіз",
      bad_chars: "Алушының атауында жарамсыз таңбалар бар. Атауды тексеріңіз",
      unreadable: "Алушының атауын оқу мүмкін болмады. Қолмен енгізіңіз",
      length: "Алушының атауы тым қысқа немесе тым ұзын. Тексеріңіз",
      checksum: "Алушының атауын тексеру мүмкін болмады. Қайта енгізіңіз",
      not_positive: "Алушының атауы дұрыс емес. Қайта енгізіңіз",
    },
    bin: {
      empty: "Алушының БСН көрсетіңіз",
      bad_chars: "БСН-де тек цифрлар болуы керек. Артық таңбаларды алып тастаңыз",
      unreadable: "БСН цифрларының бір бөлігін оқу мүмкін болмады. БСН-ді қолмен енгізіңіз",
      length: "БСН-де 12 цифр болуы керек. Цифр жіберіліп кетпеді ме, тексеріңіз",
      checksum: "БСН-де қате бар: бақылау цифры сәйкес келмейді. Әр цифрды тексеріңіз",
      not_positive: "БСН дұрыс емес. Қайта енгізіңіз",
    },
    iban: {
      empty: "Алушының шот нөмірін көрсетіңіз",
      bad_chars: "Шот нөмірінде артық таңбалар бар. Тек латын әріптері мен цифрлар жарайды",
      unreadable: "Шот нөмірінің бір бөлігін оқу мүмкін болмады. Нөмірді қолмен енгізіңіз",
      length: "Шот нөмірінде 20 таңба болуы керек. Таңба жіберіліп кетпеді ме, тексеріңіз",
      checksum: "Шот нөмірінде қате бар: бақылау сомасы сәйкес келмейді. Әр цифрды тексеріңіз",
      not_positive: "Шот нөмірі дұрыс емес. Қайта енгізіңіз",
    },
    amount: {
      empty: "Төлем сомасын көрсетіңіз",
      bad_chars: "Сомада тек цифрлар болуы керек. Артық таңбаларды алып тастаңыз",
      unreadable: "Соманы оқу мүмкін болмады. Қолмен енгізіңіз",
      length: "Сома дұрыс емес. Цифрлар санын тексеріңіз",
      checksum: "Сома дұрыс емес. Қайта енгізіңіз",
      not_positive: "Сома нөлден көп болуы керек",
    },
  },
  en: {
    name: {
      empty: "Enter the recipient's name",
      bad_chars: "The recipient's name has characters that are not allowed. Please check it",
      unreadable: "The recipient's name could not be read. Please type it in",
      length: "The recipient's name is too short or too long. Please check it",
      checksum: "The recipient's name could not be verified. Please enter it again",
      not_positive: "The recipient's name looks wrong. Please enter it again",
    },
    bin: {
      empty: "Enter the recipient's BIN",
      bad_chars: "A BIN may contain only digits. Remove the extra characters",
      unreadable: "Some digits of the BIN could not be read. Please type the BIN in",
      length: "A BIN has 12 digits. Check whether a digit is missing",
      checksum: "The BIN has an error: the check digit does not match. Check every digit",
      not_positive: "The BIN looks wrong. Please enter it again",
    },
    iban: {
      empty: "Enter the recipient's account number",
      bad_chars: "The account number has extra characters. Only Latin letters and digits are allowed",
      unreadable: "Part of the account number could not be read. Please type it in",
      length: "An account number has 20 characters. Check whether one is missing",
      checksum: "The account number has an error: the checksum does not match. Check every digit",
      not_positive: "The account number looks wrong. Please enter it again",
    },
    amount: {
      empty: "Enter the payment amount",
      bad_chars: "The amount may contain only digits. Remove the extra characters",
      unreadable: "The amount could not be read. Please type it in",
      length: "The amount looks wrong. Check the number of digits",
      checksum: "The amount looks wrong. Please enter it again",
      not_positive: "The amount must be greater than zero",
    },
  },
};
export const fieldErrorText = (e: FieldError, lang: Lang): string => FIELD_ERRORS[lang][e.field][e.code];

// Названия и подсказки демо-сценариев.
type ScenarioKey = "normal" | "swap" | "new_to_you" | "young_firm" | "blurry" | "manual" | "known_new";
const SCENARIO_TEXTS: Record<Lang, Record<ScenarioKey, { title: string; hint: string }>> = {
  ru: {
    normal: { title: "Обычный счёт", hint: "Знакомый поставщик, сумма выросла, IBAN прежний" },
    swap: { title: "Подмена IBAN", hint: "Всё как обычно, кроме номера счёта: он принадлежит частному лицу" },
    new_to_you: { title: "Новый для вас поставщик", hint: "Вы ему ещё не платили, а другие клиенты банка платят на другой счёт" },
    young_firm: { title: "Совсем новая фирма", hint: "Фирма и счёт открыты несколько дней назад" },
    blurry: { title: "Размытый скан", hint: `Название, БИН и сумма подставлены, номер счёта введите сами. Ошибка в одной цифре (например, ${DALA_IBAN_TYPO}) будет поймана по контрольной сумме` },
    manual: { title: "Ввести вручную", hint: `Впишите: ${DALA_SHOWN.name}, БИН ${DALA_SHOWN.bin}, счёт ${DALA_IBAN}` },
    known_new: { title: "Новый поставщик", hint: "Вы ему ещё не платили, но другие клиенты банка платят на тот же счёт" },
  },
  kk: {
    normal: { title: "Қалыпты шот", hint: "Таныс жеткізуші, сома өсті, IBAN бұрынғы" },
    swap: { title: "IBAN ауыстырылған", hint: "Бәрі әдеттегідей, тек шот нөмірі басқа: ол жеке тұлғаға тиесілі" },
    new_to_you: { title: "Сіз үшін жаңа жеткізуші", hint: "Сіз оған әлі төлемегенсіз, ал банктің басқа клиенттері басқа шотқа төлейді" },
    young_firm: { title: "Мүлде жаңа фирма", hint: "Фирма мен шот бірнеше күн бұрын ашылған" },
    blurry: { title: "Бұлыңғыр скан", hint: `Атауы, БСН және сома қойылған, шот нөмірін өзіңіз енгізіңіз. Бір цифрдағы қате (мысалы, ${DALA_IBAN_TYPO}) бақылау сомасы арқылы ұсталады` },
    manual: { title: "Қолмен енгізу", hint: `Жазыңыз: ${DALA_SHOWN.name}, БСН ${DALA_SHOWN.bin}, шот ${DALA_IBAN}` },
    known_new: { title: "Жаңа жеткізуші", hint: "Сіз оған әлі төлемегенсіз, бірақ банктің басқа клиенттері дәл сол шотқа төлейді" },
  },
  en: {
    normal: { title: "Regular invoice", hint: "Known supplier, higher amount, same IBAN" },
    swap: { title: "Swapped IBAN", hint: "Everything as usual except the account number: it belongs to a private person" },
    new_to_you: { title: "New to you", hint: "You have never paid this company, and other bank customers pay it to a different account" },
    young_firm: { title: "Brand-new company", hint: "The company and its account were opened a few days ago" },
    blurry: { title: "Blurry scan", hint: `The name, BIN and amount are filled in; type the account number yourself. A one-digit mistake (for example ${DALA_IBAN_TYPO}) is caught by the checksum` },
    manual: { title: "Type it in", hint: `Type in: ${DALA_SHOWN.name}, BIN ${DALA_SHOWN.bin}, account ${DALA_IBAN}` },
    known_new: { title: "New supplier", hint: "You have never paid this company, but other bank customers pay it to the same account" },
  },
};
export const scenarioTitle = (id: ScenarioKey, lang: Lang): string => SCENARIO_TEXTS[lang][id].title;
export const scenarioHint = (id: ScenarioKey, lang: Lang): string => SCENARIO_TEXTS[lang][id].hint;
