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
        
        return {
            "success": True,
            "text": text,
            "data": {
                "invoiceNumber": extracted_data.get("invoice_number"),
                "invoiceDate": extracted_data.get("invoice_date"),
                "dueDate": extracted_data.get("due_date"),
                "vendor": {
                    "name": extracted_data.get("vendor_name"),
                    "address": extracted_data.get("vendor_address"),
                    "vatId": extracted_data.get("vendor_vat_id"),
                    "taxNumber": extracted_data.get("vendor_tax_number"),
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
    """Extrahiert Text aus einem Bild."""
    image = Image.open(io.BytesIO(image_bytes))
    
    # Konvertiere zu RGB falls nötig
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # Tesseract OCR mit deutscher Sprache
    text = pytesseract.image_to_string(image, lang='deu+eng', config='--psm 6')
    return text


def extract_german_invoice_data(text: str) -> dict:
    """
    Extrahiert strukturierte Daten aus deutschem Rechnungstext.
    Speziell optimiert für deutsche Rechnungsformate.
    """
    data = {}
    
    # === RECHNUNGSNUMMER ===
    invoice_patterns = [
        r'[Rr]echnungsnummer\s*:?\s*([A-Za-z0-9\-\.\/]+)',
        r'[Rr]echnung\s*[Nn]r\.?\s*:?\s*([A-Za-z0-9\-\.\/]+)',
        r'[Ii]nvoice\s*(?:[Nn]o\.?|[Nn]umber)\s*:?\s*([A-Za-z0-9\-\.\/]+)',
        r'\b(RE-\d{3,6})\b',
        r'\b(INV-\d{3,6})\b',
        r'\b(\d{4,8})\b'  # Fallback: Reine Zahlen
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
        r'[Ff]ällig(?:keit)?(?:sdatum)?\s*:?\s*(\d{1,2}[\.\/]\d{1,2}[\.\/]\d{2,4})',
        r'[Zz]ahlbar\s+bis\s*:?\s*(\d{1,2}[\.\/]\d{1,2}[\.\/]\d{2,4})',
        r'[Dd]ue\s*[Dd]ate\s*:?\s*(\d{1,2}[\.\/]\d{1,2}[\.\/]\d{2,4})'
    ]
    for pattern in due_patterns:
        match = re.search(pattern, text)
        if match:
            data['due_date'] = convert_german_date(match.group(1))
            break
    
    # === BETRÄGE ===
    # TOTAL / Gesamtbetrag
    total_patterns = [
        r'[Gg]esamtbetrag\s*(?:brutto)?\s*:?\s*(-?[\d.,]+)\s*€',
        r'[Tt]otal\s*:?\s*(-?[\d.,]+)\s*€',
        r'[Ss]umme\s*:?\s*(-?[\d.,]+)\s*€',
        r'[Zz]u\s+zahlen\s*:?\s*(-?[\d.,]+)\s*€',
        r'[Bb]rutto\s*:?\s*(-?[\d.,]+)\s*€',
        r'[Ee]ndbetrag\s*:?\s*(-?[\d.,]+)\s*€'
    ]
    for pattern in total_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            data['total_gross'] = parse_german_amount(match.group(1))
            break
    
    # NETTO
    net_patterns = [
        r'[Nn]etto\s*:?\s*(-?[\d.,]+)\s*€',
        r'[Zz]wischensumme\s*:?\s*(-?[\d.,]+)\s*€',
        r'[Ss]ubtotal\s*:?\s*(-?[\d.,]+)\s*€'
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
        r'(?:MwSt|USt)\s*\(?\s*(\d+)\s*%\s*\)?'
    ]
    if 'tax_rate' not in data:
        for pattern in tax_rate_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                data['tax_rate'] = float(match.group(1))
                break
    
    # Wenn nur Netto und Brutto bekannt, berechne MwSt
    if 'total_gross' in data and 'total_net' in data and 'total_vat' not in data:
        data['total_vat'] = round(data['total_gross'] - data['total_net'], 2)
    
    # === LIEFERANT / VENDOR ===
    # USt-IdNr
    vat_id_patterns = [
        r'[Uu][Ss]t\.?-?[Ii]d\.?(?:-?[Nn]r\.?)?\s*:?\s*(DE\s?\d{9})',
        r'(DE\s?\d{9})',
        r'[Ss]teuer-?[Nn]r\.?\s*:?\s*(\d{2,3}/\d{3}/\d{5})'
    ]
    for pattern in vat_id_patterns:
        match = re.search(pattern, text)
        if match:
            data['vendor_vat_id'] = match.group(1).replace(' ', '')
            break
    
    # E-Mail
    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
    if email_match:
        data['vendor_email'] = email_match.group(0)
    
    # Telefon
    phone_patterns = [
        r'[Tt]el\.?\s*:?\s*([\d\s\-\/\(\)]+)',
        r'[Tt]elefon\s*:?\s*([\d\s\-\/\(\)]+)',
        r'(\+49[\d\s\-\/]+)',
        r'(0\d{2,4}[\s\-\/]?\d{3,8})'
    ]
    for pattern in phone_patterns:
        match = re.search(pattern, text)
        if match:
            phone = re.sub(r'[^\d\+\-\/\(\)\s]', '', match.group(1)).strip()
            if len(phone) >= 8:
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
    
    # === FIRMENNAME (erste Zeilen) ===
    lines = text.strip().split('\n')
    for line in lines[:10]:
        line = line.strip()
        if len(line) > 5 and len(line) < 100:
            # Deutsche Rechtsformen
            if re.search(r'\b(GmbH|AG|KG|UG|OHG|GbR|e\.K\.|eK|mbH)\b', line, re.IGNORECASE):
                data['vendor_name'] = line
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
