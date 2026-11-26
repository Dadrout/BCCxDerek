"""Генерирует синтетические счета на оплату для демо. Все компании, БИН и IBAN вымышлены.
Запуск: python3 scripts/make_invoices.py  (нужны reportlab, pillow, numpy; pdftoppm нужен только для 03)"""
import sys, os, subprocess, tempfile, random
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor, black
from PIL import Image, ImageFilter
import numpy as np

if hasattr(sys.stdout, "reconfigure"): sys.stdout.reconfigure(encoding="utf-8")
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "samples")
import shutil

def _font(candidates):
    for f in candidates:
        if os.path.exists(f): return f
    raise SystemExit("Нет шрифта с кириллицей, проверьте пути: " + ", ".join(candidates))

pdfmetrics.registerFont(TTFont("DJ", _font([
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "C:/Windows/Fonts/DejaVuSans.ttf", "C:/Windows/Fonts/arial.ttf"])))
pdfmetrics.registerFont(TTFont("DJB", _font([
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "C:/Windows/Fonts/DejaVuSans-Bold.ttf", "C:/Windows/Fonts/arialbd.ttf"])))

def kz_iban(bank: str, acct: str) -> str:
    bban = bank + acct
    s = bban + "KZ00"
    num = "".join(str(int(c, 36)) for c in s)
    chk = 98 - int(num) % 97
    return f"KZ{chk:02d}{bban}"

def grp(iban): return " ".join(iban[i:i+4] for i in range(0, len(iban), 4))

SUPPLIER = dict(name="ТОО «Дала Транс Логистик»", bin="180340021457",
    addr="г. Алматы, ул. Сейфуллина, 404, офис 12", phone="+7 727 355 18 40",
    iban=kz_iban("856", "0000012345678"), bank="АО «Банк ЦентрКредит»", bik="KCJBKZKX", kbe="17")
FRAUD_IBAN = kz_iban("856", "0000098765432")
NEW = dict(name="ТОО «Алтын Сауда Сервис»", bin="210940017733",
    addr="г. Астана, пр. Мангилик Ел, 55/8", phone="+7 717 270 44 12",
    iban=kz_iban("601", "0000077712345"), bank="АО «Народный Банк Казахстана»", bik="HSBKKZKX", kbe="17")
BUYER = "ТОО «Шаңырақ Бизнес Групп», БИН 150540009981"

def invoice(path, sup, number, date, items, iban=None, phone=None, note=None):
    c = canvas.Canvas(path, pagesize=A4)
    W, H = A4
    c.setTitle(f"Счёт на оплату № {number}")
    c.setFillColor(HexColor("#b91c1c")); c.setFont("DJB", 7)
    c.drawString(40, H-22, "СИНТЕТИЧЕСКИЙ ДОКУМЕНТ ДЛЯ ДЕМОНСТРАЦИИ. ITU HACKATHON-2026. ВСЕ ДАННЫЕ ВЫМЫШЛЕНЫ.")
    c.setFillColor(black)
    c.setFont("DJB", 13); c.drawString(40, H-55, sup["name"])
    c.setFont("DJ", 9)
    c.drawString(40, H-70, f"БИН {sup['bin']}   ·   {sup['addr']}")
    c.drawString(40, H-83, f"Тел.: {phone or sup['phone']}")
    # реквизиты
    y = H-115
    c.setStrokeColor(HexColor("#999999")); c.rect(40, y-62, W-80, 70)
    c.setFont("DJB", 9); c.drawString(50, y-8, "Банковские реквизиты получателя / Алушының банктік деректемелері")
    c.setFont("DJ", 9)
    c.drawString(50, y-24, f"Бенефициар: {sup['name']}    БИН: {sup['bin']}    КБе: {sup['kbe']}")
    c.drawString(50, y-38, f"ИИК (IBAN): {grp(iban or sup['iban'])}")
    bank, bik = sup["bank"], sup["bik"]
    c.drawString(50, y-52, f"Банк бенефициара: {bank}    БИК: {bik}")
    c.setFont("DJB", 15); c.drawString(40, y-100, f"СЧЁТ НА ОПЛАТУ № {number} от {date}")
    c.setFont("DJ", 9)
    c.drawString(40, y-120, f"Покупатель: {BUYER}")
    c.drawString(40, y-134, "Договор: № 14/2025 от 10.01.2025 на оказание транспортно-экспедиционных услуг")
    # таблица
    ty = y-165
    cols = [40, 65, 330, 380, 440, W-40]
    heads = ["№", "Наименование", "Кол.", "Цена, ₸", "Сумма, ₸"]
    c.setFont("DJB", 8.5)
    for i, h in enumerate(heads): c.drawString(cols[i]+4, ty-12, h)
    c.rect(40, ty-18, W-80, 18)
    c.setFont("DJ", 8.5)
    total = 0
    for n, (name, q, p) in enumerate(items, 1):
        r = ty-18-18*n
        s = q*p; total += s
        for i, v in enumerate([str(n), name, str(q), f"{p:,}".replace(",", " "), f"{s:,}".replace(",", " ")]):
            c.drawString(cols[i]+4, r+6, v)
        c.rect(40, r, W-80, 18)
    ry = ty-18-18*len(items)-24
    vat = round(total*12/112)
    c.setFont("DJB", 10)
    c.drawRightString(W-44, ry, f"Итого к оплате: {total:,} ₸".replace(",", " "))
    c.setFont("DJ", 9)
    c.drawRightString(W-44, ry-14, f"в т.ч. НДС 12%: {vat:,} ₸".replace(",", " "))
    c.drawString(40, ry-40, "Назначение платежа: оплата транспортно-экспедиционных услуг по счёту № " + number)
    c.drawString(40, ry-54, "Код назначения платежа (КНП): 859. Срок оплаты: 5 банковских дней.")
    if note:
        c.setFont("DJB", 9); c.drawString(40, ry-78, note)
    c.setFont("DJ", 9)
    c.drawString(40, ry-120, "Директор ______________ Ахметов Е.С.         Бухгалтер ______________ Сапарова А.К.")
    c.drawString(40, ry-140, "М.П.")
    c.save()
    return total

ROUTE = [("Перевозка груза Алматы — Астана, тент 20 т", 3, 165000),
         ("Перевозка груза Алматы — Шымкент, тент 20 т", 2, 120000),
         ("Погрузо-разгрузочные работы", 1, 105000)]

os.makedirs(OUT, exist_ok=True)
t = invoice(f"{OUT}/01_dala_obychnyj.pdf", SUPPLIER, "ДТ-1124", "18.11.2026", ROUTE)
invoice(f"{OUT}/02_dala_podmena_iban.pdf", SUPPLIER, "ДТ-1124", "18.11.2026", ROUTE,
        iban=FRAUD_IBAN, phone="+7 707 412 90 66",
        note="Внимание: в связи со сменой расчётного счёта просим оплачивать по новым реквизитам.")
invoice(f"{OUT}/04_novyj_postavshik.pdf", NEW, "АС-0071", "20.11.2026",
        [("Канцелярские товары (комплект)", 10, 18500), ("Бумага офисная А4, коробка", 15, 14200)])

# 03: размытый «скан» обычного счёта
if shutil.which("pdftoppm") is None:
    print("pdftoppm не найден: 03_dala_razmytyj_skan.pdf пропущен")
else:
    with tempfile.TemporaryDirectory() as d:
        subprocess.run(["pdftoppm", "-r", "70", "-png", "-singlefile", f"{OUT}/01_dala_obychnyj.pdf", f"{d}/p"], check=True)
        im = Image.open(f"{d}/p.png").convert("L")
        im = im.rotate(1.3, expand=True, fillcolor=235, resample=Image.BICUBIC)
        im = im.filter(ImageFilter.GaussianBlur(1.6))
        a = np.asarray(im).astype(np.float32)
        rng = np.random.default_rng(7)
        a = a*0.82 + 30 + rng.normal(0, 14, a.shape)
        im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
        im.save(f"{OUT}/03_dala_razmytyj_skan.pdf", "PDF", resolution=70)


print("Поставщик IBAN:", SUPPLIER["iban"])
print("Подменный IBAN:", FRAUD_IBAN)
print("Новый поставщик IBAN:", NEW["iban"])
print("Сумма:", t)
