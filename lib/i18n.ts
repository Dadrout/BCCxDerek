// Тексты интерфейса на трёх языках. Ключ языка совпадает с атрибутом lang у <html>.
export type Lang = "kk" | "ru" | "en";
export const LANGS: { id: Lang; label: string; name: string }[] = [
  { id: "kk", label: "ҚАЗ", name: "Қазақша" },
  { id: "ru", label: "РУС", name: "Русский" },
  { id: "en", label: "ENG", name: "English" },
];
export const DEFAULT_LANG: Lang = "ru";

const pluralRu = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};
const pluralEn = (n: number, one: string, many: string) => (n === 1 ? one : many);

type StatusKey = "match" | "mismatch" | "unreadable" | "new_supplier";

export type Dict = {
  demo: string;
  disclaimer: string;
  langSwitch: string;
  crumbs: string;
  title: string;
  pitch: (name: string) => string;
  pickInvoice: string;
  result: string;
  samples: Record<string, { title: string; hint: string }>;
  uploadTitle: string;
  uploadHint: string;
  invoice: string;
  invoiceNamed: (n: string) => string;
  modeClaude: string;
  modeLocal: string;
  modeGroq: (m: string) => string;
  stepRead: string;
  stepReadOffline: string;
  stepCompare: string;
  stepExplain: string;
  aiTitle: string;
  aiModel: (m: string) => string;
  aiThinking: string;
  aiOffline: string;
  aiFailed: string;
  loadingRead: string;
  legendMatch: string;
  legendMismatch: string;
  legendFraud: string;
  legendUnsure: string;
  legendFound: string;
  pdfEmpty: string;
  loading: string;
  failed: string;
  emptyTitle: string;
  emptyText: (name: string) => string;
  status: Record<StatusKey, string>;
  rowCard: string;
  rowInvoice: string;
  manualTitle: string;
  manualText: string;
  binLabel: string;
  binPlaceholder: string;
  recheck: string;
  newTitle: string;
  newSteps: string[];
  sendToSign: string;
  postpone: string;
  callSaved: string;
  logCall: string;
  paySent: string;
  payPostponed: string;
  payBlocked: string;
  order: string;
  orderNote: string;
  recipient: string;
  bin: string;
  bank: string;
  amount: string;
  invoiceNo: string;
  checksumOk: string;
  checksumBad: string;
  notFound: string;
  readMedium: string;
  readLow: string;
  card: string;
  cardNote: string;
  verifiedOn: (date: string, method: string, by: string) => string;
  noCard: string;
  bankSees: string;
  knownRecipient: (n: number) => string;
  unknownIban: string;
  unknownIbanSupplier: (n: number) => string;
  unknownIbanTail: string;
  noIbanSignal: string;
  log: string;
  contactFrom: (src: string) => string;
  dontCall: string;
  dontCallTail: string;
  whatToAsk: string;
  ask1: string;
  ask2: string;
  confirmed: string;
  notChanged: string;
  close: string;
  cellsLabel: (label: string, iban: string) => string;
  // журнал
  logLoaded: (name: string, mode: string, status: string) => string;
  logManual: (status: string) => string;
  logSent: string;
  logPostponed: string;
  logContact: string;
  logConfirmed: string;
  logNotChanged: string;
  // ошибки
  errors: Record<string, string>;
  warnNoText: string;
  warnClaude: string;
  // вердикт (lib/check.ts)
  v: {
    unreadableHead: string;
    notReadable: string;
    noIban: string;
    unreadableChars: string;
    checksum: string;
    lowConfidence: string;
    notChecked: string;
    homoglyphs: string;
    newHead: string;
    noSupplier: string;
    nothingToCompare: string;
    dontUsePhone: string;
    matchHead: string;
    matchCard: (date: string) => string;
    matchPayments: (n: number) => string;
    amountHigher: (pct: number) => string;
    mismatchHead: string;
    ibanDiffers: (n: number) => string;
    otherBank: (doc: string, ref: string) => string;
    neverPaid: string;
    changeRequest: (quote: string) => string;
    phoneDiffers: string;
    previous: string;
  };
  // синтетические данные поставщика
  supplier: { method: string; by: string; role: string; source: string };
  banks: Record<string, string>;
};

const ru: Dict = {
  demo: "демо-стенд",
  disclaimer: "Прототип для ITU Hackathon-2026 по кейсу Банка ЦентрКредит. Не продукт банка, все компании, БИН, IBAN и платежи вымышлены.",
  langSwitch: "Язык интерфейса",
  crumbs: "Платежи / Новый платёж по счёту",
  title: "Оплата счёта поставщика",
  pitch: (n) => `${n} проверяет реквизиты поставщика до того, как платёж уйдёт на подпись.`,
  pickInvoice: "Счёт для проверки",
  result: "Результат проверки",
  samples: {
    "01_dala_obychnyj.pdf": { title: "Обычный счёт", hint: "Знакомый поставщик, сумма выросла, IBAN прежний" },
    "02_dala_podmena_iban.pdf": { title: "Подмена IBAN", hint: "Всё как обычно, кроме банковского счёта" },
    "03_dala_razmytyj_skan.pdf": { title: "Размытый скан", hint: "Реквизиты не читаются уверенно" },
    "04_novyj_postavshik.pdf": { title: "Новый поставщик", hint: "Нет подтверждённой записи для сравнения" },
  },
  uploadTitle: "Загрузить свой PDF",
  uploadHint: "Любой счёт с компьютера",
  invoice: "Счёт",
  invoiceNamed: (n) => `Счёт: ${n}`,
  modeClaude: "Распознано Claude",
  modeLocal: "Офлайн-разбор текста PDF",
  modeGroq: m => `Прочитано ИИ: ${m}`,
  stepRead: "ИИ прочитал счёт",
  stepReadOffline: "Офлайн-разбор счёта",
  stepCompare: "Сверка с карточкой",
  stepExplain: "ИИ объяснил риск",
  aiTitle: "Вывод ИИ",
  aiModel: m => `Модель ${m} на Groq. Решение принимает сверка, ИИ его объясняет.`,
  aiThinking: "ИИ формулирует вывод…",
  aiOffline: "ИИ не подключён: добавьте GROQ_API_KEY. Сверка работает и без него.",
  aiFailed: "ИИ сейчас недоступен. Вердикт выше получен сверкой и остаётся в силе.",
  loadingRead: "ИИ читает счёт и извлекает реквизиты…",
  legendMatch: "IBAN совпал с карточкой",
  legendMismatch: "IBAN не совпал с карточкой",
  legendFraud: "Признаки подмены",
  legendUnsure: "Прочитано неуверенно",
  legendFound: "IBAN, найденный в счёте",
  pdfEmpty: "Здесь появится счёт, а найденные реквизиты будут подсвечены",
  loading: "Читаю счёт и сверяю реквизиты с карточкой поставщика…",
  failed: "Проверка не прошла",
  emptyTitle: "Выберите счёт, чтобы проверить реквизиты",
  emptyText: (n) => `${n} прочитает IBAN и БИН получателя и сравнит их с подтверждённой карточкой поставщика. Платёж уходит на подпись, только если реквизиты совпали.`,
  status: { match: "Совпадение", mismatch: "Расхождение", unreadable: "Недостаточно данных", new_supplier: "Новый поставщик" },
  rowCard: "Карточка поставщика",
  rowInvoice: "В этом счёте",
  manualTitle: "Ввести реквизиты вручную",
  manualText: "Сверьте с оригиналом и введите посимвольно. Карточка поставщика при этом не меняется.",
  binLabel: "БИН поставщика",
  binPlaceholder: "БИН, 12 цифр",
  recheck: "Сверить ещё раз",
  newTitle: "Как проверить нового поставщика",
  newSteps: [
    "Проверьте БИН и регистрационные данные в официальном реестре.",
    "Возьмите реквизиты из независимого источника: договора или письма с подписью.",
    "Позвоните по номеру, которого нет в этом счёте.",
    "Попросите второго уполномоченного сотрудника утвердить карточку.",
  ],
  sendToSign: "Передать платёж на подпись",
  postpone: "Отложить платёж",
  callSaved: "Позвонить по номеру из договора",
  logCall: "Записать результат звонка",
  paySent: "Платёж передан на подпись. Это демо, деньги не отправляются.",
  payPostponed: "Платёж отложен. Черновик сохранён, отправить его нельзя до проверки реквизитов.",
  payBlocked: "Платёж отменён. Счёт отмечен как подозрительный, обращение в банк подготовлено.",
  order: "Платёжное поручение",
  orderNote: "Заполнено из счёта",
  recipient: "Получатель",
  bin: "БИН",
  bank: "Банк",
  amount: "Сумма",
  invoiceNo: "Счёт №",
  checksumOk: "Контрольная сумма верна",
  checksumBad: "Контрольная сумма не сходится",
  notFound: "Не найдено в счёте",
  readMedium: "Прочитано не точно",
  readLow: "Прочитано плохо",
  card: "Подтверждённая карточка поставщика",
  cardNote: "Загрузка счёта её не меняет",
  verifiedOn: (d, m, b) => `Подтверждена ${d}. ${m}. ${b}.`,
  noCard: "Карточки для этого поставщика нет.",
  bankSees: "Что видит банк при отправке",
  knownRecipient: (n) => `Получатель знакомый: ${n} ${pluralRu(n, "платёж", "платежа", "платежей")} на этот IBAN за полгода. Дополнительная проверка не нужна.`,
  unknownIban: "Этого IBAN нет в истории платежей клиента.",
  unknownIbanSupplier: (n) => ` Поставщику с этим БИН клиент платил ${n} ${pluralRu(n, "раз", "раза", "раз")}, всегда на другой счёт.`,
  unknownIbanTail: " Банк может отправить такой платёж на усиленное подтверждение.",
  noIbanSignal: "IBAN не определён, поэтому банк не может оценить получателя.",
  log: "Журнал проверки",
  contactFrom: (s) => `Контакт из ${s}`,
  dontCall: "Не звоните на номер из счёта,",
  dontCallTail: "Его мог вписать тот, кто подменил реквизиты.",
  whatToAsk: "Что спросить",
  ask1: "Меняли ли вы банковские реквизиты?",
  ask2: "Назовите последние четыре цифры вашего IBAN. Сами цифры не подсказывайте.",
  confirmed: "Поставщик подтвердил новые реквизиты",
  notChanged: "Поставщик реквизиты не менял",
  close: "Закрыть",
  cellsLabel: (l, i) => `${l}: ${i}`,
  logLoaded: (n, m, s) => `Счёт «${n}» загружен, реквизиты извлечены (${m}). Результат: ${s}.`,
  logManual: (s) => `Реквизиты введены вручную. Повторная сверка: ${s}.`,
  logSent: "Платёж передан на подпись (демо).",
  logPostponed: "Платёж отложен. Черновик сохранён до проверки реквизитов.",
  logContact: "Открыт сохранённый контакт поставщика из договора.",
  logConfirmed: "Поставщик подтвердил смену реквизитов. Создана заявка на изменение карточки, её утверждает второй уполномоченный сотрудник. Карточка пока не изменена, платёж отложен.",
  logNotChanged: "Поставщик реквизиты не менял. Платёж отменён, счёт отмечен как подозрительный, обращение в банк подготовлено.",
  errors: {
    unknown_sample: "Такого примера нет. Выберите счёт из списка.",
    no_file: "Файл не получен. Выберите PDF ещё раз.",
    too_big: "Файл больше 15 МБ. Загрузите счёт поменьше.",
    not_pdf: "Это не PDF. Загрузите счёт в формате PDF.",
    generic: "Не удалось проверить счёт. Попробуйте загрузить его ещё раз.",
  },
  warnNoText: "В PDF нет текстового слоя, это скан. ИИ читает только текст, поэтому введите реквизиты вручную.",
  warnClaude: "ИИ недоступен, использован офлайн-разбор.",
  v: {
    unreadableHead: "Не удалось уверенно прочитать реквизиты",
    notReadable: "Документ не читается: размытый скан или нет текста.",
    noIban: "IBAN получателя не найден в документе.",
    unreadableChars: "Часть символов IBAN не распознана, они отмечены «?».",
    checksum: "Контрольная сумма IBAN не сходится: скорее всего, символ прочитан неверно.",
    lowConfidence: "Модель не уверена в каждом символе IBAN.",
    notChecked: "Сверка не выполнена. Загрузите оригинал PDF или введите IBAN вручную посимвольно.",
    homoglyphs: "В IBAN найдены кириллические буквы, похожие на латинские. Это частый приём подделки.",
    newHead: "Нет подтверждённой записи для сравнения",
    noSupplier: "Поставщика с таким БИН нет в подтверждённых карточках компании.",
    nothingToCompare: "Сравнивать не с чем. Перед первым платежом проведите первичную проверку реквизитов по независимому источнику.",
    dontUsePhone: "Телефон из этого счёта для проверки не используйте.",
    matchHead: "Реквизиты совпадают с подтверждённой карточкой",
    matchCard: (d) => `IBAN совпадает с подтверждённой карточкой от ${d}.`,
    matchPayments: (n) => `На этот счёт уже было ${n} ${pluralRu(n, "платёж", "платежа", "платежей")}.`,
    amountHigher: (p) => `Сумма выше средней на ${p}%, но реквизиты прежние.`,
    mismatchHead: "Реквизиты изменились. Этот счёт у поставщика ещё не подтверждён",
    ibanDiffers: (n) => `IBAN в счёте отличается от подтверждённой карточки: ${n} ${pluralRu(n, "символ", "символа", "символов")} из 20.`,
    otherBank: (d, r) => `Счёт открыт в другом банке: ${d} вместо ${r}.`,
    neverPaid: "На этот IBAN компания раньше не платила.",
    changeRequest: (q) => `В счёте есть просьба платить по новым реквизитам: «${q}»`,
    phoneDiffers: "Телефон в счёте не совпадает с контактом из договора. Звонить нужно только по сохранённому номеру.",
    previous: "прежнего",
  },
  supplier: {
    method: "Звонок по номеру из договора и письмо на бланке с подписью директора",
    by: "Сапарова А.К., главный бухгалтер",
    role: "директор",
    source: "договора № 14/2025 от 10.01.2025",
  },
  banks: {},
};

const kk: Dict = {
  demo: "демо-стенд",
  disclaimer: "ITU Hackathon-2026 үшін Банк ЦентрКредит кейсі бойынша прототип. Банк өнімі емес, барлық компаниялар, БСН, IBAN және төлемдер ойдан алынған.",
  langSwitch: "Интерфейс тілі",
  crumbs: "Төлемдер / Шот бойынша жаңа төлем",
  title: "Жеткізуші шотын төлеу",
  pitch: (n) => `${n} төлем қол қоюға жіберілмей тұрып, жеткізушінің деректемелерін тексереді.`,
  pickInvoice: "Тексерілетін шот",
  result: "Тексеру нәтижесі",
  samples: {
    "01_dala_obychnyj.pdf": { title: "Қалыпты шот", hint: "Таныс жеткізуші, сома өсті, IBAN бұрынғы" },
    "02_dala_podmena_iban.pdf": { title: "IBAN ауыстырылған", hint: "Бәрі әдеттегідей, тек банк шоты басқа" },
    "03_dala_razmytyj_skan.pdf": { title: "Бұлыңғыр скан", hint: "Деректемелер анық оқылмайды" },
    "04_novyj_postavshik.pdf": { title: "Жаңа жеткізуші", hint: "Салыстыруға расталған жазба жоқ" },
  },
  uploadTitle: "Өз PDF-іңізді жүктеу",
  uploadHint: "Компьютерден кез келген шот",
  invoice: "Шот",
  invoiceNamed: (n) => `Шот: ${n}`,
  modeClaude: "Claude таныды",
  modeLocal: "PDF мәтінін офлайн талдау",
  modeGroq: m => `ЖИ оқыды: ${m}`,
  stepRead: "ЖИ шотты оқыды",
  stepReadOffline: "Шотты офлайн талдау",
  stepCompare: "Карточкамен салыстыру",
  stepExplain: "ЖИ тәуекелді түсіндірді",
  aiTitle: "ЖИ қорытындысы",
  aiModel: m => `Groq-тағы ${m} моделі. Шешімді салыстыру қабылдайды, ЖИ оны түсіндіреді.`,
  aiThinking: "ЖИ қорытынды жазып жатыр…",
  aiOffline: "ЖИ қосылмаған: GROQ_API_KEY қосыңыз. Салыстыру онсыз да жұмыс істейді.",
  aiFailed: "ЖИ қазір қолжетімсіз. Жоғарыдағы шешім салыстыру арқылы алынды және күшінде.",
  loadingRead: "ЖИ шотты оқып, деректемелерді алып жатыр…",
  legendMatch: "IBAN карточкамен сәйкес",
  legendMismatch: "IBAN карточкамен сәйкес емес",
  legendFraud: "Ауыстыру белгілері",
  legendUnsure: "Анық оқылмады",
  legendFound: "Шоттан табылған IBAN",
  pdfEmpty: "Шот осында шығады, табылған деректемелер белгіленеді",
  loading: "Шотты оқып, деректемелерді жеткізуші карточкасымен салыстырып жатырмын…",
  failed: "Тексеру өтпеді",
  emptyTitle: "Деректемелерді тексеру үшін шотты таңдаңыз",
  emptyText: (n) => `${n} алушының IBAN мен БСН-ын оқып, жеткізушінің расталған карточкасымен салыстырады. Төлем деректемелер сәйкес келгенде ғана қол қоюға жіберіледі.`,
  status: { match: "Сәйкес келеді", mismatch: "Сәйкессіздік", unreadable: "Деректер жеткіліксіз", new_supplier: "Жаңа жеткізуші" },
  rowCard: "Жеткізуші карточкасы",
  rowInvoice: "Осы шотта",
  manualTitle: "Деректемелерді қолмен енгізу",
  manualText: "Түпнұсқамен салыстырып, таңба бойынша енгізіңіз. Жеткізуші карточкасы өзгермейді.",
  binLabel: "Жеткізушінің БСН-ы",
  binPlaceholder: "БСН, 12 сан",
  recheck: "Қайта салыстыру",
  newTitle: "Жаңа жеткізушіні қалай тексеру керек",
  newSteps: [
    "БСН мен тіркеу деректерін ресми тізілімнен тексеріңіз.",
    "Деректемелерді тәуелсіз дереккөзден алыңыз: шарттан немесе қол қойылған хаттан.",
    "Осы шотта жоқ нөмірге қоңырау шалыңыз.",
    "Карточканы екінші уәкілетті қызметкерге бекіттіріңіз.",
  ],
  sendToSign: "Төлемді қол қоюға жіберу",
  postpone: "Төлемді кейінге қалдыру",
  callSaved: "Шарттағы нөмірге қоңырау шалу",
  logCall: "Қоңырау нәтижесін жазу",
  paySent: "Төлем қол қоюға жіберілді. Бұл демо, ақша жіберілмейді.",
  payPostponed: "Төлем кейінге қалдырылды. Жоба сақталды, деректемелер тексерілгенше жіберуге болмайды.",
  payBlocked: "Төлем тоқтатылды. Шот күдікті деп белгіленді, банкке өтініш дайындалды.",
  order: "Төлем тапсырмасы",
  orderNote: "Шоттан толтырылды",
  recipient: "Алушы",
  bin: "БСН",
  bank: "Банк",
  amount: "Сома",
  invoiceNo: "Шот №",
  checksumOk: "Бақылау сомасы дұрыс",
  checksumBad: "Бақылау сомасы сәйкес емес",
  notFound: "Шоттан табылмады",
  readMedium: "Толық анық емес",
  readLow: "Нашар оқылды",
  card: "Жеткізушінің расталған карточкасы",
  cardNote: "Шот жүктеу оны өзгертпейді",
  verifiedOn: (d, m, b) => `${d} расталды. ${m}. ${b}.`,
  noCard: "Бұл жеткізушінің карточкасы жоқ.",
  bankSees: "Жіберу кезінде банк не көреді",
  knownRecipient: (n) => `Алушы таныс: соңғы жарты жылда осы IBAN-ға ${n} төлем жасалған. Қосымша тексеру қажет емес.`,
  unknownIban: "Бұл IBAN клиенттің төлем тарихында жоқ.",
  unknownIbanSupplier: (n) => ` Осы БСН-ы бар жеткізушіге клиент ${n} рет төлеген, барлығы басқа шотқа.`,
  unknownIbanTail: " Банк мұндай төлемді күшейтілген растауға жіберуі мүмкін.",
  noIbanSignal: "IBAN анықталмады, сондықтан банк алушыны бағалай алмайды.",
  log: "Тексеру журналы",
  contactFrom: (s) => `Байланыс: ${s}`,
  dontCall: "Шоттағы нөмірге қоңырау шалмаңыз,",
  dontCallTail: "Оны деректемелерді ауыстырған адам жазуы мүмкін.",
  whatToAsk: "Не сұрау керек",
  ask1: "Банк деректемелеріңізді өзгерттіңіз бе?",
  ask2: "IBAN-ның соңғы төрт санын айтыңызшы. Сандарды өзіңіз айтпаңыз.",
  confirmed: "Жеткізуші жаңа деректемелерді растады",
  notChanged: "Жеткізуші деректемелерді өзгертпеген",
  close: "Жабу",
  cellsLabel: (l, i) => `${l}: ${i}`,
  logLoaded: (n, m, s) => `«${n}» шоты жүктелді, деректемелер алынды (${m}). Нәтиже: ${s}.`,
  logManual: (s) => `Деректемелер қолмен енгізілді. Қайта салыстыру: ${s}.`,
  logSent: "Төлем қол қоюға жіберілді (демо).",
  logPostponed: "Төлем кейінге қалдырылды. Жоба деректемелер тексерілгенше сақталды.",
  logContact: "Шарттағы жеткізуші байланысы ашылды.",
  logConfirmed: "Жеткізуші деректемелердің өзгергенін растады. Карточканы өзгертуге өтінім жасалды, оны екінші уәкілетті қызметкер бекітеді. Карточка әзірге өзгермеді, төлем кейінге қалдырылды.",
  logNotChanged: "Жеткізуші деректемелерді өзгертпеген. Төлем тоқтатылды, шот күдікті деп белгіленді, банкке өтініш дайындалды.",
  errors: {
    unknown_sample: "Мұндай мысал жоқ. Тізімнен шот таңдаңыз.",
    no_file: "Файл алынбады. PDF файлын қайта таңдаңыз.",
    too_big: "Файл 15 МБ-тан үлкен. Кішірек шот жүктеңіз.",
    not_pdf: "Бұл PDF емес. Шотты PDF форматында жүктеңіз.",
    generic: "Шотты тексеру мүмкін болмады. Қайта жүктеп көріңіз.",
  },
  warnNoText: "PDF-те мәтін қабаты жоқ, бұл скан. ЖИ тек мәтінді оқиды, сондықтан деректемелерді қолмен енгізіңіз.",
  warnClaude: "ЖИ қолжетімсіз, офлайн талдау қолданылды.",
  v: {
    unreadableHead: "Деректемелерді сенімді оқу мүмкін болмады",
    notReadable: "Құжат оқылмайды: скан бұлыңғыр немесе мәтін жоқ.",
    noIban: "Құжаттан алушының IBAN-ы табылмады.",
    unreadableChars: "IBAN-ның кейбір таңбалары танылмады, олар «?» белгісімен көрсетілген.",
    checksum: "IBAN бақылау сомасы сәйкес емес: таңба қате оқылған болуы мүмкін.",
    lowConfidence: "Модель IBAN-ның әр таңбасына сенімді емес.",
    notChecked: "Салыстыру жасалмады. PDF түпнұсқасын жүктеңіз немесе IBAN-ды қолмен таңба бойынша енгізіңіз.",
    homoglyphs: "IBAN ішінде латынға ұқсас кирилл әріптері табылды. Бұл жалғандықтың жиі тәсілі.",
    newHead: "Салыстыруға расталған жазба жоқ",
    noSupplier: "Мұндай БСН-ы бар жеткізуші компанияның расталған карточкаларында жоқ.",
    nothingToCompare: "Салыстыратын ештеңе жоқ. Алғашқы төлем алдында деректемелерді тәуелсіз дереккөз бойынша тексеріңіз.",
    dontUsePhone: "Тексеру үшін осы шоттағы телефонды пайдаланбаңыз.",
    matchHead: "Деректемелер расталған карточкамен сәйкес келеді",
    matchCard: (d) => `IBAN ${d} расталған карточкамен сәйкес келеді.`,
    matchPayments: (n) => `Бұл шотқа бұрын ${n} төлем жасалған.`,
    amountHigher: (p) => `Сома орташадан ${p}% жоғары, бірақ деректемелер бұрынғы.`,
    mismatchHead: "Деректемелер өзгерген. Бұл шотты жеткізуші әлі растаған жоқ",
    ibanDiffers: (n) => `Шоттағы IBAN расталған карточкадан өзгеше: 20 таңбаның ${n}-і басқа.`,
    otherBank: (d, r) => `Шот басқа банкте ашылған: ${r} орнына ${d}.`,
    neverPaid: "Компания бұрын бұл IBAN-ға төлем жасамаған.",
    changeRequest: (q) => `Шотта жаңа деректемелер бойынша төлеу туралы өтініш бар: «${q}»`,
    phoneDiffers: "Шоттағы телефон шарттағы байланыспен сәйкес емес. Тек сақталған нөмірге қоңырау шалыңыз.",
    previous: "бұрынғы банк",
  },
  supplier: {
    method: "Шарттағы нөмірге қоңырау және директор қол қойған бланктегі хат",
    by: "Сапарова А.К., бас бухгалтер",
    role: "директор",
    source: "10.01.2025 жылғы № 14/2025 шарт",
  },
  banks: { "Народный Банк Казахстана": "Қазақстан Халық Банкі" },
};

const en: Dict = {
  demo: "demo",
  disclaimer: "Prototype for ITU Hackathon-2026, Bank CenterCredit case. Not a bank product. All companies, BINs, IBANs and payments are fictional.",
  langSwitch: "Interface language",
  crumbs: "Payments / New payment from invoice",
  title: "Pay a supplier invoice",
  pitch: (n) => `${n} checks the supplier's bank details before the payment goes for signing.`,
  pickInvoice: "Invoice to check",
  result: "Check result",
  samples: {
    "01_dala_obychnyj.pdf": { title: "Regular invoice", hint: "Known supplier, higher amount, same IBAN" },
    "02_dala_podmena_iban.pdf": { title: "Swapped IBAN", hint: "Everything as usual except the bank account" },
    "03_dala_razmytyj_skan.pdf": { title: "Blurry scan", hint: "Bank details can't be read reliably" },
    "04_novyj_postavshik.pdf": { title: "New supplier", hint: "No verified record to compare against" },
  },
  uploadTitle: "Upload your own PDF",
  uploadHint: "Any invoice from your computer",
  invoice: "Invoice",
  invoiceNamed: (n) => `Invoice: ${n}`,
  modeClaude: "Read by Claude",
  modeLocal: "Offline PDF text parsing",
  modeGroq: m => `Read by AI: ${m}`,
  stepRead: "AI read the invoice",
  stepReadOffline: "Offline invoice parsing",
  stepCompare: "Compared with the card",
  stepExplain: "AI explained the risk",
  aiTitle: "AI summary",
  aiModel: m => `${m} on Groq. The check makes the decision, the AI explains it.`,
  aiThinking: "The AI is writing a summary…",
  aiOffline: "AI isn't connected: add GROQ_API_KEY. The check works without it.",
  aiFailed: "The AI is unavailable right now. The verdict above comes from the check and still stands.",
  loadingRead: "The AI is reading the invoice and extracting the details…",
  legendMatch: "IBAN matches the card",
  legendMismatch: "IBAN doesn't match the card",
  legendFraud: "Signs of tampering",
  legendUnsure: "Read with low confidence",
  legendFound: "IBAN found in the invoice",
  pdfEmpty: "The invoice appears here, with the bank details it found highlighted",
  loading: "Reading the invoice and comparing details with the supplier card…",
  failed: "Check failed",
  emptyTitle: "Choose an invoice to check its bank details",
  emptyText: (n) => `${n} reads the recipient's IBAN and BIN and compares them with the verified supplier card. The payment goes for signing only if the details match.`,
  status: { match: "Match", mismatch: "Mismatch", unreadable: "Not enough data", new_supplier: "New supplier" },
  rowCard: "Supplier card",
  rowInvoice: "In this invoice",
  manualTitle: "Enter details manually",
  manualText: "Compare with the original and type it character by character. The supplier card stays unchanged.",
  binLabel: "Supplier BIN",
  binPlaceholder: "BIN, 12 digits",
  recheck: "Check again",
  newTitle: "How to verify a new supplier",
  newSteps: [
    "Check the BIN and registration data in the official registry.",
    "Get the bank details from an independent source: the contract or a signed letter.",
    "Call a number that isn't on this invoice.",
    "Ask a second authorised employee to approve the card.",
  ],
  sendToSign: "Send payment for signing",
  postpone: "Hold payment",
  callSaved: "Call the number from the contract",
  logCall: "Record the call result",
  paySent: "Payment sent for signing. This is a demo, no money moves.",
  payPostponed: "Payment on hold. The draft is saved and can't be sent until the details are verified.",
  payBlocked: "Payment cancelled. The invoice is flagged as suspicious and a report to the bank is ready.",
  order: "Payment order",
  orderNote: "Filled in from the invoice",
  recipient: "Recipient",
  bin: "BIN",
  bank: "Bank",
  amount: "Amount",
  invoiceNo: "Invoice no.",
  checksumOk: "Checksum is valid",
  checksumBad: "Checksum doesn't match",
  notFound: "Not found in the invoice",
  readMedium: "Partly unclear",
  readLow: "Poorly read",
  card: "Verified supplier card",
  cardNote: "Uploading an invoice never changes it",
  verifiedOn: (d, m, b) => `Verified ${d}. ${m}. ${b}.`,
  noCard: "There is no card for this supplier.",
  bankSees: "What the bank sees on sending",
  knownRecipient: (n) => `Known recipient: ${n} ${pluralEn(n, "payment", "payments")} to this IBAN in the last six months. No extra check needed.`,
  unknownIban: "This IBAN isn't in the client's payment history.",
  unknownIbanSupplier: (n) => ` The client has paid the supplier with this BIN ${n} ${pluralEn(n, "time", "times")}, always to a different account.`,
  unknownIbanTail: " The bank may send this payment for enhanced confirmation.",
  noIbanSignal: "The IBAN wasn't found, so the bank can't assess the recipient.",
  log: "Check log",
  contactFrom: (s) => `Contact from ${s}`,
  dontCall: "Don't call the number on the invoice,",
  dontCallTail: "Whoever swapped the details may have put it there.",
  whatToAsk: "What to ask",
  ask1: "Have you changed your bank details?",
  ask2: "Please read me the last four digits of your IBAN. Don't prompt the digits yourself.",
  confirmed: "Supplier confirmed the new details",
  notChanged: "Supplier didn't change their details",
  close: "Close",
  cellsLabel: (l, i) => `${l}: ${i}`,
  logLoaded: (n, m, s) => `Invoice "${n}" loaded, details extracted (${m}). Result: ${s}.`,
  logManual: (s) => `Details entered manually. Re-check: ${s}.`,
  logSent: "Payment sent for signing (demo).",
  logPostponed: "Payment on hold. Draft saved until the details are verified.",
  logContact: "Opened the supplier contact saved from the contract.",
  logConfirmed: "Supplier confirmed the change of details. A card change request was created for a second authorised employee to approve. The card is unchanged for now and the payment is on hold.",
  logNotChanged: "Supplier didn't change their details. Payment cancelled, invoice flagged as suspicious, report to the bank prepared.",
  errors: {
    unknown_sample: "That sample doesn't exist. Choose an invoice from the list.",
    no_file: "No file received. Choose the PDF again.",
    too_big: "The file is over 15 MB. Upload a smaller invoice.",
    not_pdf: "This isn't a PDF. Upload the invoice as a PDF.",
    generic: "Couldn't check the invoice. Try uploading it again.",
  },
  warnNoText: "The PDF has no text layer, it's a scan. The AI reads text only, so enter the details manually.",
  warnClaude: "AI is unavailable, offline parsing was used.",
  v: {
    unreadableHead: "Couldn't read the bank details reliably",
    notReadable: "The document can't be read: blurry scan or no text.",
    noIban: "No recipient IBAN found in the document.",
    unreadableChars: "Some IBAN characters weren't recognised and are marked \"?\".",
    checksum: "The IBAN checksum doesn't match: a character was probably misread.",
    lowConfidence: "The model isn't sure about every IBAN character.",
    notChecked: "No comparison made. Upload the original PDF or type the IBAN manually.",
    homoglyphs: "The IBAN contains Cyrillic letters that look like Latin ones. This is a common forgery trick.",
    newHead: "No verified record to compare against",
    noSupplier: "No supplier with this BIN among the company's verified cards.",
    nothingToCompare: "There's nothing to compare against. Before the first payment, verify the details through an independent source.",
    dontUsePhone: "Don't use the phone number from this invoice to verify.",
    matchHead: "Bank details match the verified card",
    matchCard: (d) => `The IBAN matches the card verified on ${d}.`,
    matchPayments: (n) => `There have already been ${n} ${pluralEn(n, "payment", "payments")} to this account.`,
    amountHigher: (p) => `The amount is ${p}% above average, but the details are the same.`,
    mismatchHead: "Bank details have changed. The supplier hasn't confirmed this invoice",
    ibanDiffers: (n) => `The IBAN on the invoice differs from the verified card in ${n} of 20 characters.`,
    otherBank: (d, r) => `The account is at a different bank: ${d} instead of ${r}.`,
    neverPaid: "The company has never paid to this IBAN.",
    changeRequest: (q) => `The invoice asks to pay to new details: "${q}"`,
    phoneDiffers: "The phone on the invoice doesn't match the contact from the contract. Call only the saved number.",
    previous: "the previous bank",
  },
  supplier: {
    method: "Call to the number from the contract and a letter on letterhead signed by the director",
    by: "A.K. Saparova, chief accountant",
    role: "director",
    source: "contract No. 14/2025 of 10.01.2025",
  },
  banks: { "Банк ЦентрКредит": "Bank CenterCredit", "Народный Банк Казахстана": "Halyk Bank" },
};

export const DICT: Record<Lang, Dict> = { kk, ru, en };
export const bankName = (name: string | null | undefined, lang: Lang) => (name ? DICT[lang].banks[name] ?? name : name ?? null);
