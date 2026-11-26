// Тексты интерфейса на трёх языках. Ключ языка совпадает с атрибутом lang у <html>.
// Тексты сигналов, вердиктов и действий лежат в lib/signals/texts.ts.
export type Lang = "kk" | "ru" | "en";
export const LANGS: { id: Lang; label: string; name: string }[] = [
  { id: "kk", label: "ҚАЗ", name: "Қазақша" },
  { id: "ru", label: "РУС", name: "Русский" },
  { id: "en", label: "ENG", name: "English" },
];
export const DEFAULT_LANG: Lang = "ru";

export const pluralRu = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};

export type Dict = {
  // шапка
  demo: string;
  disclaimer: string;
  langSwitch: string;
  resetDemo: string;
  binShort: string;
  crumbs: string;
  title: string;
  pitch: (name: string) => string;
  // сценарии
  scenarios: string;
  stageTitle: string;
  moreTitle: string;
  // форма
  form: string;
  recipient: string;
  bin: string;
  iban: string;
  amount: string;
  purpose: string;
  namePh: string;
  binPh: string;
  amountPh: string;
  purposePh: string;
  attachPdf: string;
  attachHint: string;
  attachEmail: string;
  attachEmailHint: string;
  payNote: string;
  extracting: string;
  checking: string;
  payReading: string;
  payChecking: string;
  recheck: string;
  unsure: string;
  fixFields: string;
  // вердикт
  result: string;
  whyMore: (n: number) => string;
  whyLess: string;
  postpone: string;
  approveSecond: string;
  paySent: string;
  payPostponed: string;
  payBlocked: string;
  payRequested: string;
  checkBinAdvice: string;
  checkSupplierAdvice: string;
  // документ
  invoice: string;
  invoiceNamed: (n: string) => string;
  modeClaude: string;
  modeLocal: string;
  modeGroq: (m: string) => string;
  pdfEmpty: string;
  noPdf: string;
  legendIban: string;
  legendWarn: string;
  // письмо
  emailTitle: string;
  emailFrom: string;
  emailReplyTo: string;
  emailAuth: string;
  emailSubject: string;
  emailDate: string;
  emailBody: string;
  emailNoSubject: string;
  authWord: Record<"pass" | "fail" | "none", string>;
  authOk: string;
  authBad: string;
  authUnknown: string;
  tagLookalike: string;
  tagDomainDiffers: string;
  tagFreeMail: string;
  tagReplyTo: string;
  pressureAi: string;
  pressureLocal: string;
  pressureNone: string;
  pressureKinds: Record<string, string>;
  // ИИ
  aiTitle: string;
  aiModel: (m: string) => string;
  aiThinking: string;
  aiOffline: string;
  aiFailed: string;
  // журнал
  log: string;
  logScenario: (name: string) => string;
  logExtracted: (name: string, mode: string) => string;
  logCheck: (verdict: string, reason: string) => string;
  logFixFields: string;
  logEdited: string;
  logSent: string;
  logSentAck: string;
  logPostponed: string;
  logContact: string;
  logFindPhone: string;
  logConfirmed: string;
  logApproved: string;
  logNotChanged: string;
  logCheckBin: string;
  logCheckSupplier: string;
  logBlockedServer: string;
  logEmail: (name: string) => string;
  // карточка контакта
  contactSource: (src: string) => string;
  contactNoPhone: string;
  dontCall: string;
  dontCallTail: string;
  whatToAsk: string;
  ask1: string;
  ask2: string;
  confirmed: string;
  notChanged: string;
  close: string;
  requestCreated: string;
  // перевод синтетических данных договора (на сервере они на русском)
  contactTerms: Record<string, string>;
  // ошибки
  errors: Record<string, string>;
  warnNoText: string;
  warnAi: string;
};

const ru: Dict = {
  demo: "демо для BCC",
  disclaimer: "Прототип для ITU Hackathon-2026 по кейсу Банка ЦентрКредит. Не продукт банка: все компании, БИН, счета и платежи вымышлены (синтетические данные).",
  langSwitch: "Язык интерфейса",
  resetDemo: "Сбросить демо",
  binShort: "БИН",
  crumbs: "Платежи / Новый платёж",
  title: "Новый платёж",
  pitch: (n) => `${n} проверяет получателя в момент оплаты по данным банка и останавливает подозрительный платёж.`,
  scenarios: "Сценарии демо",
  stageTitle: "Для сцены",
  moreTitle: "Ещё",
  form: "Платёжное поручение",
  recipient: "Получатель",
  bin: "БИН получателя",
  iban: "Номер счёта (IBAN)",
  amount: "Сумма, ₸",
  purpose: "Назначение платежа",
  namePh: "Например, ТОО «Дала Транс Логистик»",
  binPh: "12 цифр",
  amountPh: "0",
  purposePh: "Оплата по счёту № …",
  attachPdf: "Приложить счёт PDF",
  attachHint: "Поля заполнятся из счёта сами. Проверяются всё равно поля платежа.",
  attachEmail: "Приложить письмо",
  attachEmailHint: "Если счёт пришёл письмом, приложите само письмо (.eml): проверим и отправителя.",
  payNote: "Перед отправкой банк проверит получателя по своим данным.",
  extracting: "Читаю счёт и заполняю поля…",
  checking: "Банк проверяет получателя…",
  payReading: "Читаю счёт…",
  payChecking: "Проверяю…",
  recheck: "Проверить снова",
  unsure: "Прочитано неуверенно, сверьте с оригиналом",
  fixFields: "Платёж не проверен: исправьте поля, отмеченные красным.",
  result: "Результат проверки",
  whyMore: (n) => `Почему ещё (${n})`,
  whyLess: "Скрыть причины",
  postpone: "Отложить платёж",
  approveSecond: "Утвердить как второй сотрудник",
  paySent: "Отправлено на подпись. Это демо, деньги не уходят.",
  payPostponed: "Платёж отложен. Чтобы оплатить, проверьте его заново.",
  payBlocked: "Платёж заблокирован. Сообщите в банк о попытке мошенничества.",
  payRequested: "Заявка на новый счёт создана. Её должен утвердить второй сотрудник.",
  checkBinAdvice: "Сверьте БИН с договором или прежними счетами: это может быть просто опечатка.",
  checkSupplierAdvice: "Проверьте фирму в официальном госреестре до оплаты.",
  invoice: "Счёт",
  invoiceNamed: (n) => `Счёт: ${n}`,
  modeClaude: "Прочитано ИИ: Claude",
  modeLocal: "Офлайн-разбор текста PDF",
  modeGroq: (m) => `Прочитано ИИ: ${m}`,
  pdfEmpty: "Приложите счёт PDF или выберите сценарий. Найденные реквизиты будут подсвечены.",
  noPdf: "Платёж заполнен без PDF. Банк проверяет поля платежа, файл для этого не нужен.",
  legendIban: "Номер счёта",
  legendWarn: "Просьба сменить реквизиты, телефон",
  emailTitle: "Письмо, в котором пришёл счёт",
  emailFrom: "От кого",
  emailReplyTo: "Ответ уйдёт",
  emailAuth: "Подлинность",
  emailSubject: "Тема",
  emailDate: "Дата",
  emailBody: "Текст письма",
  emailNoSubject: "(без темы)",
  authWord: { pass: "пройдена", fail: "не пройдена", none: "нет данных" },
  authOk: "Почтовый сервер подтвердил: письмо отправлено с этого адреса",
  authBad: "Почтовый сервер не подтвердил, что письмо отправил владелец адреса",
  authUnknown: "Почтовый сервер не сообщил, подлинное ли письмо",
  tagLookalike: "адрес-двойник",
  tagDomainDiffers: "не адрес из договора",
  tagFreeMail: "бесплатная почта",
  tagReplyTo: "другой адрес",
  pressureAi: "Давление найдено ИИ",
  pressureLocal: "Давление найдено по ключевым фразам",
  pressureNone: "Слов, которые торопят или давят, не найдено",
  pressureKinds: { urgency: "Торопят", no_call: "Просят не звонить", new_details: "Новые реквизиты", secrecy: "Просят молчать", authority: "Ссылаются на начальство" },
  aiTitle: "Объяснение ИИ",
  aiModel: (m) => `Модель ${m}. Решение принимает проверка, ИИ его объясняет.`,
  aiThinking: "ИИ формулирует объяснение…",
  aiOffline: "Объяснение ИИ недоступно офлайн. Вердикт получен проверкой по данным банка и остаётся в силе.",
  aiFailed: "ИИ сейчас недоступен. Вердикт получен проверкой по данным банка и остаётся в силе.",
  log: "Журнал действий",
  logScenario: (n) => `Выбран сценарий «${n}».`,
  logExtracted: (n, m) => `Счёт «${n}» прочитан (${m}), поля платежа заполнены.`,
  logCheck: (v, r) => `Нажато «Оплатить». Проверка банка: ${v}. ${r}.`,
  logFixFields: "Нажато «Оплатить». Проверка не выполнена: нужно исправить поля.",
  logEdited: "Поля платежа изменены. Прежний результат проверки сброшен.",
  logSent: "Платёж отправлен на подпись (демо).",
  logSentAck: "Бухгалтер подтвердил, что проверил получателя. Платёж отправлен на подпись (демо).",
  logPostponed: "Платёж отложен.",
  logContact: "Открыт контакт поставщика из договора.",
  logFindPhone: "Показан совет: найти телефон поставщика в независимом источнике.",
  logConfirmed: "Поставщик подтвердил смену счёта. Создана заявка, её утверждает второй сотрудник.",
  logApproved: "Второй сотрудник утвердил новый счёт. Платёж проверен заново.",
  logNotChanged: "Поставщик реквизиты не менял. Платёж отменён, счёт отмечен как подозрительный.",
  logCheckBin: "Предложено сверить БИН получателя.",
  logCheckSupplier: "Предложено проверить фирму в госреестре.",
  logBlockedServer: "Сервер не пропустил платёж: проверка его остановила.",
  logEmail: (n) => `Прочитано письмо: ${n}`,
  contactSource: (s) => `Источник: ${s}`,
  contactNoPhone: "Договора с этой фирмой нет, поэтому проверенного номера у банка нет.",
  dontCall: "Не звоните на номер из счёта,",
  dontCallTail: "Его мог вписать тот, кто подменил реквизиты.",
  whatToAsk: "Что спросить",
  ask1: "Меняли ли вы банковские реквизиты?",
  ask2: "Назовите последние четыре цифры вашего счёта. Сами цифры не подсказывайте.",
  confirmed: "Поставщик подтвердил смену",
  notChanged: "Реквизиты не менялись",
  close: "Закрыть",
  requestCreated: "Заявка создана. Новый счёт начнёт действовать после утверждения вторым сотрудником.",
  contactTerms: {},
  errors: {
    unknown_sample: "Такого примера нет. Выберите сценарий из списка.",
    no_file: "Файл не получен. Выберите PDF ещё раз.",
    too_big: "Файл больше 15 МБ. Приложите счёт поменьше.",
    not_pdf: "Это не PDF и не письмо. Приложите счёт PDF или письмо .eml.",
    bad_email: "Не удалось прочитать письмо. Сохраните его из почты как файл .eml и приложите ещё раз.",
    no_pdf_in_email: "В письме нет счёта PDF. Письмо показано справа, поля платежа заполните вручную.",
    generic: "Не удалось связаться с сервером. Попробуйте ещё раз.",
  },
  warnNoText: "В PDF нет текстового слоя, это скан. Сверьте поля с оригиналом и при необходимости введите вручную.",
  warnAi: "ИИ недоступен, счёт прочитан офлайн-разбором.",
};

const kk: Dict = {
  demo: "BCC үшін демо",
  disclaimer: "ITU Hackathon-2026 үшін Банк ЦентрКредит кейсі бойынша прототип. Банк өнімі емес: барлық компаниялар, БСН, шоттар және төлемдер ойдан алынған (синтетикалық деректер).",
  langSwitch: "Интерфейс тілі",
  resetDemo: "Демоны қалпына келтіру",
  binShort: "БСН",
  crumbs: "Төлемдер / Жаңа төлем",
  title: "Жаңа төлем",
  pitch: (n) => `${n} төлем сәтінде алушыны банк деректері бойынша тексеріп, күдікті төлемді тоқтатады.`,
  scenarios: "Демо сценарийлері",
  stageTitle: "Сахна үшін",
  moreTitle: "Тағы",
  form: "Төлем тапсырмасы",
  recipient: "Алушы",
  bin: "Алушының БСН-ы",
  iban: "Шот нөмірі (IBAN)",
  amount: "Сома, ₸",
  purpose: "Төлем мақсаты",
  namePh: "Мысалы, «Дала Транс Логистик» ЖШС",
  binPh: "12 цифр",
  amountPh: "0",
  purposePh: "№ … шот бойынша төлем",
  attachPdf: "PDF шотты тіркеу",
  attachHint: "Өрістер шоттан өздігінен толады. Бәрібір төлем өрістері тексеріледі.",
  attachEmail: "Хатты тіркеу",
  attachEmailHint: "Шот хатпен келсе, хаттың өзін (.eml) тіркеңіз: жіберушіні де тексереміз.",
  payNote: "Жіберер алдында банк алушыны өз деректері бойынша тексереді.",
  extracting: "Шотты оқып, өрістерді толтырып жатырмын…",
  checking: "Банк алушыны тексеріп жатыр…",
  payReading: "Шотты оқып жатырмын…",
  payChecking: "Тексеріп жатырмын…",
  recheck: "Қайта тексеру",
  unsure: "Анық оқылмады, түпнұсқамен салыстырыңыз",
  fixFields: "Төлем тексерілмеді: қызылмен белгіленген өрістерді түзетіңіз.",
  result: "Тексеру нәтижесі",
  whyMore: (n) => `Тағы неге (${n})`,
  whyLess: "Себептерді жасыру",
  postpone: "Төлемді кейінге қалдыру",
  approveSecond: "Екінші қызметкер ретінде бекіту",
  paySent: "Қол қоюға жіберілді. Бұл демо, ақша жіберілмейді.",
  payPostponed: "Төлем кейінге қалдырылды. Төлеу үшін оны қайта тексеріңіз.",
  payBlocked: "Төлем бұғатталды. Банкке алаяқтық әрекеті туралы хабарлаңыз.",
  payRequested: "Жаңа шотқа өтінім жасалды. Оны екінші қызметкер бекітуі керек.",
  checkBinAdvice: "БСН-ды шартпен немесе бұрынғы шоттармен салыстырыңыз: бұл жай қате болуы мүмкін.",
  checkSupplierAdvice: "Төлемнен бұрын фирманы ресми мемлекеттік тізілімнен тексеріңіз.",
  invoice: "Шот",
  invoiceNamed: (n) => `Шот: ${n}`,
  modeClaude: "ЖИ оқыды: Claude",
  modeLocal: "PDF мәтінін офлайн талдау",
  modeGroq: (m) => `ЖИ оқыды: ${m}`,
  pdfEmpty: "PDF шотты тіркеңіз немесе сценарий таңдаңыз. Табылған деректемелер белгіленеді.",
  noPdf: "Төлем PDF-сіз толтырылды. Банк төлем өрістерін тексереді, бұған файл қажет емес.",
  legendIban: "Шот нөмірі",
  legendWarn: "Деректемелерді ауыстыру өтініші, телефон",
  emailTitle: "Шот келген хат",
  emailFrom: "Кімнен",
  emailReplyTo: "Жауап кетеді",
  emailAuth: "Түпнұсқалық",
  emailSubject: "Тақырып",
  emailDate: "Күні",
  emailBody: "Хат мәтіні",
  emailNoSubject: "(тақырыпсыз)",
  authWord: { pass: "өтті", fail: "өтпеді", none: "дерек жоқ" },
  authOk: "Пошта сервері растады: хат осы мекенжайдан жіберілген",
  authBad: "Пошта сервері хатты мекенжай иесі жібергенін растамады",
  authUnknown: "Пошта сервері хаттың түпнұсқа екенін хабарламады",
  tagLookalike: "ұқсас жалған мекенжай",
  tagDomainDiffers: "шарттағы мекенжай емес",
  tagFreeMail: "тегін пошта",
  tagReplyTo: "басқа мекенжай",
  pressureAi: "Қысымды ЖИ тапты",
  pressureLocal: "Қысым кілт сөздер бойынша табылды",
  pressureNone: "Асықтыратын не қысым жасайтын сөздер табылмады",
  pressureKinds: { urgency: "Асықтырады", no_call: "Қоңырау шалмауды сұрайды", new_details: "Жаңа деректемелер", secrecy: "Үндемеуді сұрайды", authority: "Басшыға сілтейді" },
  aiTitle: "ЖИ түсіндірмесі",
  aiModel: (m) => `${m} моделі. Шешімді тексеру қабылдайды, ЖИ оны түсіндіреді.`,
  aiThinking: "ЖИ түсіндірме жазып жатыр…",
  aiOffline: "ЖИ түсіндірмесі офлайн режимде қолжетімсіз. Шешім банк деректері бойынша тексеруден алынды және күшінде.",
  aiFailed: "ЖИ қазір қолжетімсіз. Шешім банк деректері бойынша тексеруден алынды және күшінде.",
  log: "Әрекеттер журналы",
  logScenario: (n) => `«${n}» сценарийі таңдалды.`,
  logExtracted: (n, m) => `«${n}» шоты оқылды (${m}), төлем өрістері толтырылды.`,
  logCheck: (v, r) => `«Төлеу» басылды. Банк тексеруі: ${v}. ${r}.`,
  logFixFields: "«Төлеу» басылды. Тексеру жасалмады: өрістерді түзету керек.",
  logEdited: "Төлем өрістері өзгертілді. Бұрынғы тексеру нәтижесі алынып тасталды.",
  logSent: "Төлем қол қоюға жіберілді (демо).",
  logSentAck: "Бухгалтер алушыны тексергенін растады. Төлем қол қоюға жіберілді (демо).",
  logPostponed: "Төлем кейінге қалдырылды.",
  logContact: "Шарттағы жеткізуші байланысы ашылды.",
  logFindPhone: "Кеңес көрсетілді: жеткізушінің телефонын тәуелсіз көзден табу.",
  logConfirmed: "Жеткізуші шоттың өзгергенін растады. Өтінім жасалды, оны екінші қызметкер бекітеді.",
  logApproved: "Екінші қызметкер жаңа шотты бекітті. Төлем қайта тексерілді.",
  logNotChanged: "Жеткізуші деректемелерді өзгертпеген. Төлем тоқтатылды, шот күдікті деп белгіленді.",
  logCheckBin: "Алушының БСН-ын салыстыру ұсынылды.",
  logCheckSupplier: "Фирманы мемлекеттік тізілімнен тексеру ұсынылды.",
  logBlockedServer: "Сервер төлемді өткізбеді: тексеру оны тоқтатты.",
  logEmail: (n) => `Хат оқылды: ${n}`,
  contactSource: (s) => `Дереккөз: ${s}`,
  contactNoPhone: "Бұл фирмамен шарт жоқ, сондықтан банкте тексерілген нөмір жоқ.",
  dontCall: "Шоттағы нөмірге қоңырау шалмаңыз,",
  dontCallTail: "Оны деректемелерді ауыстырған адам жазуы мүмкін.",
  whatToAsk: "Не сұрау керек",
  ask1: "Банк деректемелеріңізді өзгерттіңіз бе?",
  ask2: "Шотыңыздың соңғы төрт санын айтыңызшы. Сандарды өзіңіз айтпаңыз.",
  confirmed: "Жеткізуші өзгерісті растады",
  notChanged: "Деректемелер өзгермеген",
  close: "Жабу",
  requestCreated: "Өтінім жасалды. Жаңа шот екінші қызметкер бекіткеннен кейін күшіне енеді.",
  contactTerms: {
    "директор": "директор",
    "договор № 14/2025 от 10.01.2025": "10.01.2025 жылғы № 14/2025 шарт",
  },
  errors: {
    unknown_sample: "Мұндай мысал жоқ. Тізімнен сценарий таңдаңыз.",
    no_file: "Файл алынбады. PDF файлын қайта таңдаңыз.",
    too_big: "Файл 15 МБ-тан үлкен. Кішірек шот тіркеңіз.",
    not_pdf: "Бұл PDF те, хат та емес. Шотты PDF немесе .eml хат ретінде тіркеңіз.",
    bad_email: "Хатты оқу мүмкін болмады. Оны поштадан .eml файл ретінде сақтап, қайта тіркеңіз.",
    no_pdf_in_email: "Хатта PDF шот жоқ. Хат оң жақта көрсетілген, төлем өрістерін қолмен толтырыңыз.",
    generic: "Сервермен байланыс болмады. Қайта көріңіз.",
  },
  warnNoText: "PDF-те мәтін қабаты жоқ, бұл скан. Өрістерді түпнұсқамен салыстырып, қажет болса қолмен енгізіңіз.",
  warnAi: "ЖИ қолжетімсіз, шот офлайн талдаумен оқылды.",
};

const en: Dict = {
  demo: "demo for BCC",
  disclaimer: "Prototype for ITU Hackathon-2026, Bank CenterCredit case. Not a bank product: all companies, BINs, accounts and payments are fictional (synthetic data).",
  langSwitch: "Interface language",
  resetDemo: "Reset demo",
  binShort: "BIN",
  crumbs: "Payments / New payment",
  title: "New payment",
  pitch: (n) => `${n} checks the recipient against the bank's data at the moment of payment and stops a suspicious payment.`,
  scenarios: "Demo scenarios",
  stageTitle: "On stage",
  moreTitle: "More",
  form: "Payment order",
  recipient: "Recipient",
  bin: "Recipient BIN",
  iban: "Account number (IBAN)",
  amount: "Amount, ₸",
  purpose: "Payment purpose",
  namePh: "e.g. Dala Trans Logistik LLP",
  binPh: "12 digits",
  amountPh: "0",
  purposePh: "Payment for invoice No. …",
  attachPdf: "Attach invoice PDF",
  attachHint: "The fields fill in from the invoice. The check still runs on the payment fields.",
  attachEmail: "Attach email",
  attachEmailHint: "If the invoice came by email, attach the email itself (.eml): we'll check the sender too.",
  payNote: "Before sending, the bank checks the recipient against its own data.",
  extracting: "Reading the invoice and filling in the fields…",
  checking: "The bank is checking the recipient…",
  payReading: "Reading the invoice…",
  payChecking: "Checking…",
  recheck: "Check again",
  unsure: "Read with low confidence, compare with the original",
  fixFields: "Payment not checked: fix the fields marked in red.",
  result: "Check result",
  whyMore: (n) => `Why else (${n})`,
  whyLess: "Hide reasons",
  postpone: "Hold payment",
  approveSecond: "Approve as second employee",
  paySent: "Sent for signing. This is a demo, no money moves.",
  payPostponed: "Payment on hold. To pay, check it again.",
  payBlocked: "Payment blocked. Report the fraud attempt to the bank.",
  payRequested: "A request for the new account was created. A second employee has to approve it.",
  checkBinAdvice: "Compare the BIN with the contract or earlier invoices: it may just be a typo.",
  checkSupplierAdvice: "Check the company in the official state registry before paying.",
  invoice: "Invoice",
  invoiceNamed: (n) => `Invoice: ${n}`,
  modeClaude: "Read by AI: Claude",
  modeLocal: "Offline PDF text parsing",
  modeGroq: (m) => `Read by AI: ${m}`,
  pdfEmpty: "Attach an invoice PDF or pick a scenario. The details found will be highlighted.",
  noPdf: "This payment was filled in without a PDF. The bank checks the payment fields; no file is needed.",
  legendIban: "Account number",
  legendWarn: "Request to change details, phone",
  emailTitle: "The email the invoice came in",
  emailFrom: "From",
  emailReplyTo: "Replies go to",
  emailAuth: "Authenticity",
  emailSubject: "Subject",
  emailDate: "Date",
  emailBody: "Email text",
  emailNoSubject: "(no subject)",
  authWord: { pass: "passed", fail: "failed", none: "no data" },
  authOk: "The mail server confirmed the email was sent from this address",
  authBad: "The mail server could not confirm that the owner of the address sent this email",
  authUnknown: "The mail server did not say whether the email is genuine",
  tagLookalike: "lookalike address",
  tagDomainDiffers: "not the contract address",
  tagFreeMail: "free mailbox",
  tagReplyTo: "different address",
  pressureAi: "Pressure found by AI",
  pressureLocal: "Pressure found by key phrases",
  pressureNone: "No words rushing or pressuring you were found",
  pressureKinds: { urgency: "Rushing you", no_call: "Asks you not to call", new_details: "New bank details", secrecy: "Asks for secrecy", authority: "Invokes the boss" },
  aiTitle: "AI explanation",
  aiModel: (m) => `Model ${m}. The check makes the decision, the AI explains it.`,
  aiThinking: "The AI is writing an explanation…",
  aiOffline: "The AI explanation is not available offline. The verdict comes from the check against the bank's data and still stands.",
  aiFailed: "The AI is unavailable right now. The verdict comes from the check against the bank's data and still stands.",
  log: "Activity log",
  logScenario: (n) => `Scenario "${n}" selected.`,
  logExtracted: (n, m) => `Invoice "${n}" read (${m}), payment fields filled in.`,
  logCheck: (v, r) => `"Pay" pressed. Bank check: ${v}. ${r}.`,
  logFixFields: `"Pay" pressed. No check made: some fields need fixing.`,
  logEdited: "Payment fields changed. The previous check result was cleared.",
  logSent: "Payment sent for signing (demo).",
  logSentAck: "The accountant confirmed they checked the recipient. Payment sent for signing (demo).",
  logPostponed: "Payment put on hold.",
  logContact: "Opened the supplier contact from the contract.",
  logFindPhone: "Shown advice: find the supplier's phone number from an independent source.",
  logConfirmed: "The supplier confirmed the account change. A request was created for a second employee to approve.",
  logApproved: "A second employee approved the new account. The payment was checked again.",
  logNotChanged: "The supplier didn't change their details. Payment cancelled, invoice flagged as suspicious.",
  logCheckBin: "Suggested checking the recipient's BIN.",
  logCheckSupplier: "Suggested checking the company in the state registry.",
  logBlockedServer: "The server refused the payment: the check stopped it.",
  logEmail: (n) => `Email read: ${n}`,
  contactSource: (s) => `Source: ${s}`,
  contactNoPhone: "There is no contract with this company, so the bank has no verified number.",
  dontCall: "Don't call the number on the invoice,",
  dontCallTail: "Whoever swapped the details may have put it there.",
  whatToAsk: "What to ask",
  ask1: "Have you changed your bank details?",
  ask2: "Please read me the last four digits of your account. Don't prompt the digits yourself.",
  confirmed: "Supplier confirmed the change",
  notChanged: "Details were not changed",
  close: "Close",
  requestCreated: "Request created. The new account takes effect once a second employee approves it.",
  contactTerms: {
    "директор": "director",
    "договор № 14/2025 от 10.01.2025": "contract No. 14/2025 of 10.01.2025",
  },
  errors: {
    unknown_sample: "That sample doesn't exist. Pick a scenario from the list.",
    no_file: "No file received. Choose the PDF again.",
    too_big: "The file is over 15 MB. Attach a smaller invoice.",
    not_pdf: "This isn't a PDF or an email. Attach the invoice PDF or an .eml email.",
    bad_email: "Couldn't read the email. Save it from your mail app as an .eml file and attach it again.",
    no_pdf_in_email: "There's no invoice PDF in the email. The email is shown on the right; fill in the payment fields by hand.",
    generic: "Couldn't reach the server. Please try again.",
  },
  warnNoText: "The PDF has no text layer, it's a scan. Compare the fields with the original and type them in if needed.",
  warnAi: "AI is unavailable, the invoice was read by offline parsing.",
};

export const DICT: Record<Lang, Dict> = { kk, ru, en };
export const contactTerm = (s: string, lang: Lang): string => DICT[lang].contactTerms[s] ?? s;
