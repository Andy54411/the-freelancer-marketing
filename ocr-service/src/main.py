"""
Taskilo OCR Service - Hauptanwendung
=====================================
Optimiert für deutsche Rechnungen und Belege.
Läuft auf Hetzner Server (DSGVO-konform).
"""

import os
import io
import re
import base64
import tempfile
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pytesseract
from PIL import Image
from pdf2image import convert_from_bytes

app = FastAPI(
    title="Taskilo OCR Service",
    description="Deutsche Rechnungs-OCR - DSGVO-konform auf Hetzner",
    version="1.0.0"
)

# CORS für Taskilo
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://taskilo.de",
        "https://www.taskilo.de",
        "http://localhost:3000",
        "http://localhost:3001"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Key für Authentifizierung
API_KEY = os.getenv("API_KEY", os.getenv("OCR_API_KEY", "taskilo-ocr-secret-key-2026"))


class OCRResponse(BaseModel):
    success: bool
    text: str
    extracted_data: dict
    processing_time_ms: int
    pages: int


class ExtractedInvoiceData(BaseModel):
    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None
    due_date: Optional[str] = None
    total_gross: Optional[float] = None
    total_net: Optional[float] = None
    total_vat: Optional[float] = None
    tax_rate: Optional[float] = None
    vendor_name: Optional[str] = None
    vendor_address: Optional[str] = None
    vendor_vat_id: Optional[str] = None
    vendor_email: Optional[str] = None
    vendor_phone: Optional[str] = None
    customer_name: Optional[str] = None
    customer_address: Optional[str] = None
    description: Optional[str] = None
    iban: Optional[str] = None
    bic: Optional[str] = None


@app.get("/health")
async def health_check():
    """Health Check Endpoint"""
    return {
        "status": "healthy",
        "service": "taskilo-ocr",
        "version": "1.0.0",
        "tesseract_version": pytesseract.get_tesseract_version().decode() if hasattr(pytesseract.get_tesseract_version(), 'decode') else str(pytesseract.get_tesseract_version()),
        "timestamp": datetime.utcnow().isoformat()
    }


class JSONOCRRequest(BaseModel):
    """JSON-basierte OCR-Anfrage für Base64-kodierte Dateien"""
    file: str  # Base64-kodierter Dateiinhalt
    filename: str
    content_type: str
    language: str = "deu"


@app.post("/extract")
async def extract_text_json(
    request: JSONOCRRequest,
    x_api_key: Optional[str] = Header(None)
):
    """
    JSON-Endpunkt: Extrahiert Text aus Base64-kodierter PDF oder Bild.
    Erkennt deutsche Rechnungsdaten.
    """
    start_time = datetime.now()
    
    # API Key Validierung
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Ungültiger API-Key")
    
    # Base64 dekodieren
    try:
        content = base64.b64decode(request.file)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ungültige Base64-Kodierung: {str(e)}")
    
    filename = request.filename
    content_type = request.content_type
    
    print(f"[OCR JSON] Verarbeite Datei: {filename} ({len(content)} bytes, {content_type})")
    
    try:
        # PDF oder Bild?
        if content_type == "application/pdf" or filename.lower().endswith(".pdf"):
            text, pages = process_pdf(content)
        else:
            text = process_image(content)
            pages = 1
        
        # Deutsche Rechnungsdaten extrahieren
        extracted_data = extract_german_invoice_data(text)
        
        processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
        
        print(f"[OCR JSON] Erfolgreich: {len(text)} Zeichen, {pages} Seiten, {processing_time}ms")
        print(f"[OCR JSON] Extrahierte Daten: {extracted_data}")
        
        return {
            "success": True,
            "text": text,
            "data": {
                "invoiceNumber": extracted_data.get("invoice_number"),
                "invoiceDate": extracted_data.get("invoice_date"),
                "dueDate": extracted_data.get("due_date"),
                "paymentTerms": extracted_data.get("payment_terms"),
                "vendor": {
                    "name": extracted_data.get("vendor_name"),
                    "address": extracted_data.get("vendor_address"),
                    "zip": extracted_data.get("vendor_zip"),
                    "city": extracted_data.get("vendor_city"),
                    "vatId": extracted_data.get("vendor_vat_id"),
                    "taxNumber": extracted_data.get("vendor_tax_number"),
                    "email": extracted_data.get("vendor_email"),
                    "phone": extracted_data.get("vendor_phone"),
                },
                "amounts": {
                    "net": extracted_data.get("total_net"),
                    "vat": extracted_data.get("total_vat"),
                    "gross": extracted_data.get("total_gross"),
                    "currency": "EUR",
                },
                "vatRate": extracted_data.get("tax_rate"),
                "iban": extracted_data.get("iban"),
                "bic": extracted_data.get("bic"),
                "description": extracted_data.get("description"),
            },
            "confidence": 0.85,
            "processing_time_ms": processing_time,
        }
        
    except Exception as e:
        print(f"[OCR JSON] Fehler: {str(e)}")
        raise HTTPException(status_code=500, detail=f"OCR-Verarbeitung fehlgeschlagen: {str(e)}")


@app.post("/ocr/extract", response_model=OCRResponse)
async def extract_text(
    file: UploadFile = File(...),
    x_api_key: Optional[str] = Header(None)
):
    """
    Extrahiert Text aus PDF oder Bild und erkennt deutsche Rechnungsdaten.
    """
    start_time = datetime.now()
    
    # API Key Validierung
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Ungültiger API-Key")
    
    # Datei lesen
    content = await file.read()
    filename = file.filename or "unknown"
    content_type = file.content_type or ""
    
    print(f"[OCR] Verarbeite Datei: {filename} ({len(content)} bytes, {content_type})")
    
    try:
        # PDF oder Bild?
        if content_type == "application/pdf" or filename.lower().endswith(".pdf"):
            text, pages = process_pdf(content)
        else:
            text = process_image(content)
            pages = 1
        
        # Deutsche Rechnungsdaten extrahieren
        extracted_data = extract_german_invoice_data(text)
        
        processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
        
        print(f"[OCR] Erfolgreich: {len(text)} Zeichen, {pages} Seiten, {processing_time}ms")
        
        return OCRResponse(
            success=True,
            text=text,
            extracted_data=extracted_data,
            processing_time_ms=processing_time,
            pages=pages
        )
        
    except Exception as e:
        print(f"[OCR] Fehler: {str(e)}")
        raise HTTPException(status_code=500, detail=f"OCR-Verarbeitung fehlgeschlagen: {str(e)}")


def process_pdf(pdf_bytes: bytes) -> tuple[str, int]:
    """Konvertiert PDF zu Bildern und extrahiert Text."""
    # PDF zu Bildern konvertieren
    images = convert_from_bytes(pdf_bytes, dpi=300)
    
    all_text = []
    for i, image in enumerate(images):
        print(f"[OCR] Verarbeite Seite {i + 1}/{len(images)}")
        # Tesseract OCR mit deutscher Sprache
        text = pytesseract.image_to_string(image, lang='deu+eng', config='--psm 6')
        all_text.append(text)
    
    return "\n\n--- SEITE ---\n\n".join(all_text), len(images)


def process_image(image_bytes: bytes) -> str:
    """Extrahiert Text aus einem Bild mit OCR-Optimierung."""
    image = Image.open(io.BytesIO(image_bytes))
    
    # Konvertiere zu RGB falls nötig
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # === EXIF-ORIENTIERUNG KORRIGIEREN (wichtig für iPhone-Fotos!) ===
    try:
        from PIL import ExifTags
        exif = image._getexif()
        if exif:
            for tag, value in exif.items():
                if ExifTags.TAGS.get(tag) == 'Orientation':
                    if value == 3:
                        image = image.rotate(180, expand=True)
                    elif value == 6:
                        image = image.rotate(270, expand=True)
                    elif value == 8:
                        image = image.rotate(90, expand=True)
                    print(f"[OCR] EXIF-Rotation angewendet: Orientation={value}")
                    break
    except Exception as e:
        print(f"[OCR] EXIF-Orientierung nicht lesbar: {e}")
    
    # === INTELLIGENTE ROTATION für Querformat-Bilder ===
    # Belege/Rechnungen sind fast immer höher als breit (Portrait)
    # Wenn das Bild breiter als hoch ist, drehe um 90°
    width, height = image.size
    if width > height * 1.2:
        print(f"[OCR] Querformat erkannt ({width}x{height}), drehe um 90° für OCR")
        image = image.rotate(90, expand=True)
    
    # === OCR-OPTIMIERUNG für Kassenbelege/iPhone-Fotos ===
    # 1. Graustufen für bessere Texterkennung
    gray_image = image.convert('L')
    
    # 2. Kontrast und Schärfe verbessern
    from PIL import ImageEnhance, ImageFilter
    
    # Kontrast erhöhen (wichtig für Kassenbelege)
    enhancer = ImageEnhance.Contrast(gray_image)
    gray_image = enhancer.enhance(2.0)  # 2x Kontrast
    
    # Schärfe erhöhen
    enhancer = ImageEnhance.Sharpness(gray_image)
    gray_image = enhancer.enhance(2.0)  # 2x Schärfe
    
    # 3. Optional: Binarisierung für noch bessere Ergebnisse
    # Threshold bei 128 für klare Schwarz/Weiß-Trennung
    gray_image = gray_image.point(lambda x: 0 if x < 140 else 255, '1')
    
    # Tesseract OCR mit deutscher Sprache und optimierter Konfiguration
    # --psm 4: Einzelne Spalte mit Text
    # --psm 6: Einheitlicher Textblock
    # OEM 3: Default, LSTM + Legacy
    text = pytesseract.image_to_string(
        gray_image, 
        lang='deu+eng', 
        config='--psm 4 --oem 3 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzäöüÄÖÜß€.,:-/@ '
    )
    
    # Fallback: Wenn zu wenig Text, nochmal mit anderem PSM versuchen
    if len(text.strip()) < 50:
        print("[OCR] Wenig Text erkannt, versuche PSM 6...")
        text = pytesseract.image_to_string(gray_image, lang='deu+eng', config='--psm 6')
    
    return text


def extract_german_invoice_data(text: str) -> dict:
    """
    Extrahiert strukturierte Daten aus deutschem Rechnungstext.
    Speziell optimiert für deutsche Rechnungsformate.
    """
    data = {}
    
    # Debug: Ersten Teil des Textes ausgeben
    print(f"[OCR DEBUG] Text-Auszug (erste 500 Zeichen):\n{text[:500]}")
    
    # === RECHNUNGSNUMMER ===
    invoice_patterns = [
        r'[Rr]echnungsnummer\s*:?\s*([A-Za-z0-9\-\.\/]+)',
        r'[Rr]echnung\s*[Nn]r\.?\s*:?\s*([A-Za-z0-9\-\.\/]+)',
        r'[Ii]nvoice\s*(?:[Nn]o\.?|[Nn]umber)\s*:?\s*([A-Za-z0-9\-\.\/]+)',
        r'\b(TWEB-\d{4}-\d{4})\b',  # Taskilo Webmail Format
        r'\b([A-Z]{2,4}-\d{4}-\d{4})\b',  # Allgemeines Format XXX-YYYY-NNNN
        r'\b(RE-\d{3,6})\b',
        r'\b(INV-\d{3,6})\b',
        r'\b(RG-\d{6,10})\b',  # RG-Format
        r'\b(CT\d{11,12}DE)\b',  # DHL/Post Sendungsnummer
        r'[Ss]endungsnummer\s*:?\s*([A-Z0-9]{10,20})',  # Sendungsnummer
        r'[Bb]elegnummer\s*:?\s*([A-Z0-9\-\.]+)',  # Belegnummer
    ]
    for pattern in invoice_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            data['invoice_number'] = match.group(1).strip()
            break
    
    # === DATUM ===
    date_patterns = [
        r'[Rr]echnungsdatum\s*:?\s*(\d{1,2}[\.\/]\d{1,2}[\.\/]\d{2,4})',
        r'[Dd]atum\s*:?\s*(\d{1,2}[\.\/]\d{1,2}[\.\/]\d{2,4})',
        r'[Dd]ate\s*:?\s*(\d{1,2}[\.\/]\d{1,2}[\.\/]\d{2,4})',
        r'(\d{1,2}\.\d{1,2}\.\d{4})'  # Deutsches Format
    ]
    for pattern in date_patterns:
        match = re.search(pattern, text)
        if match:
            date_str = match.group(1)
            data['invoice_date'] = convert_german_date(date_str)
            break
    
    # === FÄLLIGKEITSDATUM ===
    due_patterns = [
        r'[Ff]ällig\s+am\s*:?\s*(\d{1,2}[\.\/]\d{1,2}[\.\/]\d{2,4})',
        r'[Ff]ällig(?:keit)?(?:sdatum)?\s*:?\s*(\d{1,2}[\.\/]\d{1,2}[\.\/]\d{2,4})',
        r'[Zz]ahlbar\s+bis\s*:?\s*(\d{1,2}[\.\/]\d{1,2}[\.\/]\d{2,4})',
        r'[Zz]ahlungsziel\s*:?\s*(\d{1,2}[\.\/]\d{1,2}[\.\/]\d{2,4})',
        r'[Dd]ue\s*[Dd]ate\s*:?\s*(\d{1,2}[\.\/]\d{1,2}[\.\/]\d{2,4})',
        r'[Bb]is\s+zum\s*:?\s*(\d{1,2}[\.\/]\d{1,2}[\.\/]\d{2,4})',
    ]
    for pattern in due_patterns:
        match = re.search(pattern, text)
        if match:
            data['due_date'] = convert_german_date(match.group(1))
            break
    
    # === BETRÄGE ===
    # TOTAL / Gesamtbetrag
    total_patterns = [
        r'[Gg]esamtbetrag\s*(?:brutto)?\s*:?\s*(-?[\d.,]+)\s*€?',
        r'[Tt]otal\s*:?\s*(-?[\d.,]+)\s*€?',
        r'[Ss]umme\s*:?\s*(-?[\d.,]+)\s*€?',
        r'[Zz]u\s+zahlen\s*:?\s*(-?[\d.,]+)\s*€?',
        r'[Bb]rutto\s*:?\s*(-?[\d.,]+)\s*€?',
        r'[Ee]ndbetrag\s*:?\s*(-?[\d.,]+)\s*€?',
        r'TOTAL\s*:?\s*(-?[\d.,]+)\s*€?',  # Englisches Label
        r'Rechnungsbetrag\s*:?\s*(-?[\d.,]+)\s*€?',
    ]
    for pattern in total_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            data['total_gross'] = parse_german_amount(match.group(1))
            break
    
    # Fallback: Suche nach alleinstehenden Beträgen mit €
    if 'total_gross' not in data:
        amount_matches = re.findall(r'(-?[\d.,]+)\s*€', text)
        if amount_matches:
            amounts = [parse_german_amount(a) for a in amount_matches if parse_german_amount(a)]
            if amounts:
                # Nimm den größten Betrag als Gesamtbetrag
                data['total_gross'] = max(amounts)
    
    # NETTO
    net_patterns = [
        r'[Nn]etto\s*:?\s*(-?[\d.,]+)\s*€?',
        r'[Zz]wischensumme\s*:?\s*(-?[\d.,]+)\s*€?',
        r'[Ss]ubtotal\s*:?\s*(-?[\d.,]+)\s*€?',
        r'NETTO\s*:?\s*(-?[\d.,]+)\s*€?',  # Englisches Label
    ]
    for pattern in net_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            data['total_net'] = parse_german_amount(match.group(1))
            break
    
    # MwSt / USt
    vat_patterns = [
        r'[Mm]w[Ss]t\.?\s*(?:\(?\d+%\)?)?\s*:?\s*(-?[\d.,]+)\s*€',
        r'[Uu][Ss]t\.?\s*(?:\(?\d+%\)?)?\s*:?\s*(-?[\d.,]+)\s*€',
        r'[Mm]ehrwertsteuer\s*:?\s*(-?[\d.,]+)\s*€',
        r'[Uu]msatzsteuer\s*:?\s*(-?[\d.,]+)\s*€',
        r'(\d+)\s*%\s*(?:MwSt|USt|Steuer)\s*:?\s*(-?[\d.,]+)\s*€'
    ]
    for pattern in vat_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            if len(match.groups()) == 2:
                data['tax_rate'] = float(match.group(1))
                data['total_vat'] = parse_german_amount(match.group(2))
            else:
                data['total_vat'] = parse_german_amount(match.group(1))
            break
    
    # Steuersatz erkennen
    tax_rate_patterns = [
        r'(\d+)\s*%\s*(?:MwSt|USt|Mehrwertsteuer|Umsatzsteuer)',
        r'(?:MwSt|USt)\s*\(?\s*(\d+)\s*%\s*\)?',
        r'(\d+)\s*%',  # Fallback: Beliebiger Prozentsatz
    ]
    if 'tax_rate' not in data:
        for pattern in tax_rate_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                rate = float(match.group(1))
                if rate in [7, 19]:  # Nur gültige deutsche MwSt-Sätze
                    data['tax_rate'] = rate
                    break
    
    # Standard Steuersatz falls nicht erkannt
    if 'tax_rate' not in data:
        data['tax_rate'] = 19.0
    
    # === NETTO-RECHNUNG / STEUERFREIE RECHNUNG ERKENNEN ===
    # Prüfe ob es eine Netto-Rechnung ist (kein MwSt-Ausweis)
    text_lower = text.lower()
    is_net_invoice = (
        'netto rechnung' in text_lower or
        'nettorechnung' in text_lower or
        'ohne mwst' in text_lower or
        'ohne mehrwertsteuer' in text_lower or
        'steuerfrei' in text_lower or
        'reverse charge' in text_lower or
        'steuerschuldnerschaft' in text_lower or
        '§13b' in text_lower or
        'kleinunternehmer' in text_lower or
        '§19 ustg' in text_lower or
        'nicht steuerbar' in text_lower
    )
    
    # Wenn Netto = Brutto oder keine MwSt gefunden
    if is_net_invoice or (data.get('total_gross') and data.get('total_net') and 
                          abs(data['total_gross'] - data['total_net']) < 0.01):
        data['tax_rate'] = 0.0
        data['total_vat'] = 0.0
        data['is_net_invoice'] = True
        print(f"[OCR] Netto-Rechnung erkannt: Betrag {data.get('total_gross', data.get('total_net'))}€ ohne MwSt")
    
    # Wenn nur Netto und Brutto bekannt, berechne MwSt
    if 'total_gross' in data and 'total_net' in data and 'total_vat' not in data:
        data['total_vat'] = round(data['total_gross'] - data['total_net'], 2)
    
    # Wenn nur Brutto bekannt und KEINE Netto-Rechnung, berechne Netto und MwSt
    if 'total_gross' in data and 'total_net' not in data and not data.get('is_net_invoice'):
        tax_rate = data.get('tax_rate', 19.0)
        data['total_net'] = round(data['total_gross'] / (1 + tax_rate / 100), 2)
        data['total_vat'] = round(data['total_gross'] - data['total_net'], 2)
        print(f"[OCR] MwSt berechnet: Brutto {data['total_gross']}€ → Netto {data['total_net']}€ + MwSt {data['total_vat']}€ ({tax_rate}%)")
    
    # === LIEFERANT / VENDOR ===
    # USt-IdNr - erweiterte Patterns für verschiedene Formate
    vat_id_patterns = [
        r'[Uu][Ss]t\.?-?[Ii]d\.?(?:-?[Nn]r\.?)?\s*:?\s*(DE\s?\d{9})',
        r'[Vv][Aa][Tt]\s*:?\s*(DE\s?\d{9})',  # VAT: DE...
        r'[Vv][Aa][Tt]\s*[Ii][Dd]\s*:?\s*(DE\s?\d{9})',  # VAT ID: DE...
        r'[Vv][Aa][Tt]\s*[Nn][Oo]\.?\s*:?\s*(DE\s?\d{9})',  # VAT No: DE...
        r'(DE\s?\d{9})',  # Nur DE-Nummer
        r'(CY\d{8}[A-Z])',  # Zypern VAT
        r'(AT\s?U\d{8})',  # Österreich VAT
        r'[Ss]teuer-?[Nn]r\.?\s*:?\s*(\d{2,3}/\d{3}/\d{5})',  # Steuernummer
        r'[Ss]t\.?-?[Nn]r\.?\s*:?\s*(\d{2,3}/\d{3}/\d{5})',  # St.-Nr.
    ]
    for pattern in vat_id_patterns:
        match = re.search(pattern, text)
        if match:
            vat_id = match.group(1).replace(' ', '')
            data['vendor_vat_id'] = vat_id
            print(f"[OCR] USt-IdNr gefunden: {vat_id}")
            break
    
    # E-Mail - sehr flexibles Pattern für verschiedene OCR-Artefakte
    email_patterns = [
        r'[Ee]-?[Mm]ail\s*:?\s*([\w\.\-]+@[\w\.\-]+\.[a-zA-Z]{2,})',  # E-Mail: label
        r'[Mm]ail\s*:?\s*([\w\.\-]+@[\w\.\-]+\.[a-zA-Z]{2,})',  # Mail: label
        r'([\w\.\-]+@[\w\.\-]+\.[a-zA-Z]{2,})',  # Standard
        r'([a-zA-Z0-9][a-zA-Z0-9\.\-\_]*@[a-zA-Z0-9\.\-]+\.[a-zA-Z]{2,})',  # Flexibler
    ]
    for pattern in email_patterns:
        email_match = re.search(pattern, text)
        if email_match:
            email = email_match.group(1) if email_match.lastindex else email_match.group(0)
            # Validiere dass es wirklich eine E-Mail ist
            if '@' in email and '.' in email.split('@')[-1]:
                # Ignoriere bestimmte System-E-Mails
                if not any(x in email.lower() for x in ['noreply', 'no-reply', 'mailer-daemon']):
                    data['vendor_email'] = email
                    print(f"[OCR] E-Mail gefunden: {email}")
                    break
                data['vendor_email'] = email
                break
    
    # Telefon - +49 und Tel: priorisieren (NICHT Rechnungsnummern fangen!)
    phone_patterns = [
        r'(\+49[\d\s\-\/]+)',  # +49 Präfix hat höchste Priorität
        r'[Tt]el\.?\s*:?\s*(\+?[\d\s\-\/\(\)]{10,})',  # Tel: Label
        r'[Tt]elefon\s*:?\s*(\+?[\d\s\-\/\(\)]{10,})',  # Telefon: Label
        r'[Pp]hone\s*:?\s*(\+?[\d\s\-\/\(\)]{10,})',  # Phone: Label
        r'[Mm]obil\s*:?\s*(\+?[\d\s\-\/\(\)]{10,})',  # Mobil: Label
        r'[Ff]ax\s*:?\s*([\d\s\-\/\(\)]{10,})',  # Fax als Fallback
    ]
    for pattern in phone_patterns:
        match = re.search(pattern, text)
        if match:
            phone = re.sub(r'[^\d\+]', '', match.group(1)).strip()
            # Telefonnummer muss mindestens 10 Ziffern haben (deutsche Nummern)
            if len(phone) >= 10:
                data['vendor_phone'] = phone
                print(f"[OCR] Telefon gefunden: {phone}")
                break
    for pattern in phone_patterns:
        match = re.search(pattern, text)
        if match:
            phone = re.sub(r'[^\d\+]', '', match.group(1)).strip()
            # Telefonnummer muss mindestens 10 Ziffern haben (deutsche Nummern)
            if len(phone) >= 10:
                data['vendor_phone'] = phone
                break
    
    # IBAN
    iban_match = re.search(r'[Ii][Bb][Aa][Nn]\s*:?\s*([A-Z]{2}\d{2}[\s]?[\dA-Z]{4}[\s]?[\dA-Z]{4}[\s]?[\dA-Z]{4}[\s]?[\dA-Z]{4}[\s]?[\dA-Z]{0,4})', text)
    if iban_match:
        data['iban'] = iban_match.group(1).replace(' ', '')
    
    # BIC
    bic_match = re.search(r'[Bb][Ii][Cc]\s*:?\s*([A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?)', text)
    if bic_match:
        data['bic'] = bic_match.group(1)
    
    # === FIRMENNAME - INTELLIGENTE ERKENNUNG ===
    # Statt statischer Liste: Erkennung über Rechtsformen und Briefkopf-Muster
    lines = text.strip().split('\n')
    
    # Höflichkeitsfloskeln und Schlussformeln die KEINE Firmennamen sind
    exclude_phrases = [
        r'vielen\s*dank',
        r'danke\s*(für|fuer)',
        r'ihr\s*besuch',
        r'ihren?\s*besuch',
        r'auf\s*wiedersehen',
        r'besuchen\s*sie',
        r'wir\s*freuen\s*uns',
        r'bis\s*bald',
        r'mit\s*freundlichen',
        r'herzlichen\s*dank',
        r'guten\s*tag',
        r'willkommen',
        r'sendungsverfolgung',
        r'www\.',
        r'http',
    ]
    
    def is_excluded_phrase(text_to_check):
        """Prüft ob der Text eine Höflichkeitsfloskel enthält"""
        text_lower = text_to_check.lower()
        for pattern in exclude_phrases:
            if re.search(pattern, text_lower):
                return True
        return False
    
    # 1. PRIORITÄT: Deutsche Rechtsformen im Text finden (ERSTE Erwähnung!)
    # Das funktioniert für ALLE deutschen Firmen mit korrekter Rechtsform
    rechtsform_pattern = r'\b([A-ZÄÖÜ][A-Za-zäöüÄÖÜß\s\-&\.]+(?:GmbH|AG|KG|UG|OHG|GbR|e\.K\.|eK|mbH|SE|KGaA|gGmbH|e\.V\.|eV|Ltd\.|Inc\.|Co\.))\b'
    
    # Suche alle Matches und nimm den ersten der KEINE Höflichkeitsfloskel ist
    for match in re.finditer(rechtsform_pattern, text):
        vendor = match.group(1).strip()
        # Bereinige: Entferne führende Kleinbuchstaben und Sonderzeichen
        vendor = re.sub(r'^[a-z\s\-\.]+', '', vendor).strip()
        # Prüfe ob es eine Höflichkeitsfloskel ist
        if len(vendor) > 5 and not is_excluded_phrase(vendor):
            # Extrahiere nur den Firmennamen (ohne "Ihre", "Ihr", etc.)
            vendor = re.sub(r'^(Ihre?|Ihr)\s*', '', vendor).strip()
            data['vendor_name'] = vendor
            print(f"[OCR] Firma via Rechtsform erkannt: {vendor}")
            break
    
    # 2. FALLBACK: Erste aussagekräftige Zeile (typischer Briefkopf)
    if 'vendor_name' not in data:
        for line in lines[:15]:
            line = line.strip()
            # Überspringe leere Zeilen und sehr kurze Zeilen
            if len(line) < 5 or len(line) > 100:
                continue
            # Überspringe Höflichkeitsfloskeln
            if is_excluded_phrase(line):
                continue
            # Überspringe Zeilen die wie Datum/Nummer/Betreff aussehen
            if re.match(r'^(Rechnung|Invoice|Datum|Date|Nr\.|Beleg|Quittung|Kasse|\d)', line, re.IGNORECASE):
                continue
            # Überspringe Zeilen die nur Zahlen und Sonderzeichen enthalten
            if re.match(r'^[\d\s\-\./]+$', line):
                continue
            # Überspringe Adressen (PLZ + Ort)
            if re.match(r'^\d{5}\s+[A-Z]', line):
                continue
            # Überspringe Zeilen mit Email/Web
            if '@' in line or 'www.' in line.lower() or 'http' in line.lower():
                continue
            # Überspringe Zeilen die hauptsächlich Kleinbuchstaben sind (Fließtext)
            if sum(1 for c in line if c.isupper()) < len(line) * 0.15:
                continue
            # Gute Kandidaten: Beginnen mit Großbuchstaben, enthalten nicht zu viele Zahlen
            if line[0].isupper() and sum(1 for c in line if c.isdigit()) < len(line) * 0.3:
                data['vendor_name'] = line
                print(f"[OCR] Firma via Briefkopf erkannt: {line}")
                break
    
    # 3. LETZTER FALLBACK: Suche nach Labels wie "Von:", "Absender:", etc.
    if 'vendor_name' not in data:
        label_patterns = [
            r'[Vv]on\s*:\s*(.+)',
            r'[Aa]bsender\s*:\s*(.+)',
            r'[Ff]irma\s*:\s*(.+)',
            r'[Ll]ieferant\s*:\s*(.+)',
            r'[Hh]ersteller\s*:\s*(.+)',
        ]
        for pattern in label_patterns:
            match = re.search(pattern, text)
            if match:
                vendor = match.group(1).strip()[:100]
                if len(vendor) > 3 and not is_excluded_phrase(vendor):
                    data['vendor_name'] = vendor
                    print(f"[OCR] Firma via Label erkannt: {vendor}")
                    break
    
    # === ADRESSE ===
    # PLZ + Ort Pattern (deutsche Postleitzahlen sind 5-stellig)
    # WICHTIG: PLZ muss am Zeilenanfang oder nach Whitespace stehen, NICHT in Telefonnummern!
    # Negativer Lookbehind verhindert Match wenn Ziffer davor steht
    plz_ort_patterns = [
        # PLZ am Zeilenanfang einer neuen Zeile
        r'(?:^|\n)\s*(\d{5})\s+([A-ZÄÖÜ][a-zäöüß]+)\b',
        # PLZ nach Komma oder Zeilenumbruch
        r'[,\n]\s*(\d{5})\s+([A-ZÄÖÜ][a-zäöüß]+)\b',
    ]
    for pattern in plz_ort_patterns:
        plz_ort_match = re.search(pattern, text, re.MULTILINE)
        if plz_ort_match:
            plz = plz_ort_match.group(1)
            city = plz_ort_match.group(2)
            # Validierung: PLZ muss mit 0-9 beginnen (nicht Teil einer größeren Zahl)
            # Deutsche PLZ: 01000-99999
            if plz[0] in '0123456789' and city.lower() not in ['zeitraum', 'rechnung', 'datum', 'nummer', 'betrag', 'gesamt', 'netto', 'brutto', 'eur', 'euro']:
                data['vendor_zip'] = plz
                data['vendor_city'] = city
                break
    
    # Straße + Hausnummer Pattern - erweiterte Patterns für verschiedene Straßennamen
    street_patterns = [
        # "Siedlung am/an/im" Patterns - PRIORITÄT da speziell
        r'(Siedlung\s+am\s+\w+)\s+(\d+[a-zA-Z]?)',
        r'(Siedlung\s+an\s+\w+)\s+(\d+[a-zA-Z]?)',
        r'(Siedlung\s+\w+)\s+(\d+[a-zA-Z]?)',
        # "Am", "An der", "Im" Patterns
        r'(Am\s+[A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ]?[a-zäöüß]+)?)\s+(\d+[a-zA-Z]?)',
        r'(An\s+der\s+[A-ZÄÖÜ][a-zäöüß]+)\s+(\d+[a-zA-Z]?)',
        r'(Im\s+[A-ZÄÖÜ][a-zäöüß]+)\s+(\d+[a-zA-Z]?)',
        r'(Auf\s+(?:der|dem)\s+[A-ZÄÖÜ][a-zäöüß]+)\s+(\d+[a-zA-Z]?)',
        # Standard-Endungen (mit straße UND strasse - OCR erkennt ß oft als ss)
        r'([A-ZÄÖÜ][a-zäöüß]+(?:straße|strasse|str\.|weg|allee|platz|gasse|ring|damm|ufer|hof|park))\s+(\d+[a-zA-Z]?)',
        r'([A-ZÄÖÜ][a-zäöüß]+\s+[A-ZÄÖÜ][a-zäöüß]+(?:straße|strasse|str\.|weg|allee|platz))\s+(\d+[a-zA-Z]?)',
        # Straße vor PLZ (Zeile endet mit Hausnummer, nächste Zeile PLZ)
        r'([A-ZÄÖÜ][a-zäöüß\s\-]+)\s+(\d+[a-zA-Z]?)\s*\n\s*\d{5}',
        # Generisches Pattern: Wort + Hausnummer gefolgt von PLZ
        r'([A-ZÄÖÜ][a-zäöüß]+)\s+(\d+[a-zA-Z]?)\s*\n\s*\d{5}',
    ]
    for pattern in street_patterns:
        match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        if match:
            street = match.group(1).strip()
            number = match.group(2).strip()
            # Validiere dass es kein falscher Match ist
            if len(street) > 3 and street.lower() not in ['rechnung', 'datum', 'nummer', 'betrag']:
                data['vendor_address'] = f"{street} {number}"
                break
    
    # Fallback: Suche nach Zeilen die wie Adressen aussehen
    if 'vendor_address' not in data:
        for i, line in enumerate(lines[:20]):
            line = line.strip()
            # Zeile mit Hausnummer am Ende
            addr_match = re.search(r'^([A-ZÄÖÜ][a-zäöüß\s]+)\s+(\d+[a-zA-Z]?)\s*$', line)
            if addr_match and len(line) < 60 and len(line) > 5:
                street = addr_match.group(1).strip()
                # Prüfe ob nächste Zeile eine PLZ hat (dann ist es wahrscheinlich Adresse)
                if i + 1 < len(lines) and re.match(r'\d{5}', lines[i + 1].strip()):
                    data['vendor_address'] = f"{street} {addr_match.group(2)}"
                    break
                # Oder prüfe auf typische Straßenendungen
                if re.search(r'(straße|str\.|weg|allee|platz|gasse|siedlung|am\s|an\s|im\s)', line, re.IGNORECASE):
                    data['vendor_address'] = f"{street} {addr_match.group(2)}"
                    break
    
    # === BESCHREIBUNG ===
    desc_patterns = [
        r'[Bb]etreff\s*:?\s*(.+)',
        r'[Bb]eschreibung\s*:?\s*(.+)',
        r'[Ll]eistung\s*:?\s*(.+)'
    ]
    for pattern in desc_patterns:
        match = re.search(pattern, text)
        if match:
            data['description'] = match.group(1).strip()[:200]
            break
    
    # === ZAHLUNGSBEDINGUNGEN ===
    payment_patterns = [
        r'[Zz]ahlungsbedingungen?\s*:?\s*(.+?)(?:\n|$)',
        r'[Zz]ahlbar\s+(?:innerhalb\s+)?(\d+)\s*[Tt]age',
        r'[Zz]ahlungsziel\s*:?\s*(\d+)\s*[Tt]age',
        r'(\d+)\s*[Tt]age\s+[Nn]etto',
        r'[Ss]ofort\s+[Ff]ällig',
        r'[Bb]ei\s+[Ee]rhalt',
    ]
    for pattern in payment_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            if match.groups():
                if match.group(1).isdigit():
                    data['payment_terms'] = f"{match.group(1)} Tage netto"
                else:
                    data['payment_terms'] = match.group(1).strip()[:100]
            else:
                data['payment_terms'] = match.group(0).strip()
            break
    
    return data


def parse_german_amount(amount_str: str) -> Optional[float]:
    """Parst einen deutschen Geldbetrag (1.234,56 oder 1234,56)."""
    if not amount_str:
        return None
    
    # Entferne alles außer Zahlen, Komma, Punkt und Minus
    cleaned = re.sub(r'[^\d,.\-]', '', amount_str)
    
    if not cleaned:
        return None
    
    # Deutsche Format: 1.234,56 -> 1234.56
    if ',' in cleaned and '.' in cleaned:
        # Tausendertrennzeichen entfernen, Dezimalkomma zu Punkt
        cleaned = cleaned.replace('.', '').replace(',', '.')
    elif ',' in cleaned:
        # Nur Komma = Dezimaltrennzeichen
        cleaned = cleaned.replace(',', '.')
    
    try:
        return float(cleaned)
    except ValueError:
        return None


def convert_german_date(date_str: str) -> Optional[str]:
    """Konvertiert deutsches Datum (DD.MM.YYYY) zu ISO-Format (YYYY-MM-DD)."""
    if not date_str:
        return None
    
    # Verschiedene Formate versuchen
    formats = [
        ('%d.%m.%Y', date_str),
        ('%d.%m.%y', date_str),
        ('%d/%m/%Y', date_str),
        ('%d/%m/%y', date_str)
    ]
    
    for fmt, ds in formats:
        try:
            dt = datetime.strptime(ds, fmt)
            return dt.strftime('%Y-%m-%d')
        except ValueError:
            continue
    
    return None


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8090)
