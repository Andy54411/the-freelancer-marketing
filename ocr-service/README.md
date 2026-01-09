# Taskilo OCR Service

Eigener OCR-Service für deutsche Rechnungen - läuft auf Hetzner Server (DSGVO-konform).

## Features

- **Tesseract OCR** - Open Source, optimiert für deutsche Texte
- **PDF-Unterstützung** - Automatische Konvertierung zu Bildern
- **Deutsche Rechnungserkennung** - Spezialisierte Patterns für:
  - Rechnungsnummern
  - Datumsformate (DD.MM.YYYY)
  - Beträge (1.234,56 €)
  - USt-IdNr (DE123456789)
  - IBAN/BIC
  - Lieferantendaten

## Deployment auf Hetzner

```bash
# 1. Dateien hochladen
scp -r /Users/andystaudinger/Tasko/ocr-service root@mail.taskilo.de:/opt/taskilo/

# 2. Auf Server verbinden
ssh root@mail.taskilo.de

# 3. Netzwerk erstellen (falls nicht vorhanden)
docker network create taskilo-network 2>/dev/null || true

# 4. Service starten
cd /opt/taskilo/ocr-service
docker compose up -d --build

# 5. Logs prüfen
docker logs -f taskilo-ocr
```

## API Endpoints

### Health Check
```bash
curl https://mail.taskilo.de/ocr/health
```

### OCR Extraktion
```bash
curl -X POST https://mail.taskilo.de/ocr/extract \
  -H "X-Api-Key: taskilo-ocr-secret-key-2026" \
  -F "file=@rechnung.pdf"
```

## Response Format

```json
{
  "success": true,
  "text": "Extrahierter Text...",
  "extracted_data": {
    "invoice_number": "RE-2026-001",
    "invoice_date": "2026-01-09",
    "total_gross": 119.00,
    "total_net": 100.00,
    "total_vat": 19.00,
    "tax_rate": 19,
    "vendor_name": "Beispiel GmbH",
    "vendor_vat_id": "DE123456789",
    "vendor_email": "info@beispiel.de",
    "iban": "DE89370400440532013000"
  },
  "processing_time_ms": 1234,
  "pages": 1
}
```

## Nginx Konfiguration (auf Hetzner)

Füge zu `/etc/nginx/sites-available/mail.taskilo.de` hinzu:

```nginx
location /ocr/ {
    proxy_pass http://localhost:8090/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Für Datei-Uploads
    client_max_body_size 50M;
}
```
