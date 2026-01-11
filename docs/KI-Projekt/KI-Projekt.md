# Taskilo-KI: Vollständige Systemdokumentation

> **Stand: 10. Januar 2026**
> Dieses Dokument beschreibt den aktuellen Implementierungsstand und die Architektur der Taskilo-KI Plattform.

---

## Implementierungsübersicht

### ✅ Umgesetzt (Produktiv)

| Komponente | Status | Details |
|------------|--------|---------|
| **FastAPI Backend** | ✅ Produktiv | Port 8000 auf Hetzner |
| **PostgreSQL** | ✅ Produktiv | Strukturierte Daten, KI-Lerndaten |
| **MongoDB** | ✅ Produktiv | JSON-Daten, OCR-Ergebnisse, 5 Collections |
| **Redis** | ✅ Produktiv | Caching, Celery-Queue |
| **Multi-Agent-System** | ✅ Produktiv | 4 Agenten aktiv |
| **Docker-Infrastruktur** | ✅ Produktiv | CPU-optimiert (kein GPU) |
| **Health-Monitoring** | ✅ Produktiv | /api/v1/health/ Endpoint |
| **Prometheus/Grafana** | ✅ Produktiv | Metriken-Überwachung |
| **OCR-Integration** | ✅ Integriert | Tesseract in taskilo-ki |
| **NER-Extractor** | ✅ Geladen | Textextraktion aktiv |

### ⏳ In Entwicklung

| Komponente | Status | Details |
|------------|--------|---------|
| **Anomaly Detector** | ⏳ Nicht trainiert | Modell vorhanden, keine Trainingsdaten |
| **Cashflow Predictor** | ⏳ Nicht trainiert | Prophet-Modell vorbereitet |
| **DATEV-Integration** | ⏳ Geplant | API-Client vorhanden |
| **FinAPI-Integration** | ⏳ Geplant | SDK-Wrapper vorbereitet |
| **Firebase-Sync** | ⏳ Geplant | Bidirektionale Synchronisation |

### ❌ Nicht umgesetzt / Entfernt

| Komponente | Status | Begründung |
|------------|--------|------------|
| **SQLite OCR-Datenbank** | ❌ Entfernt | Durch PostgreSQL ersetzt |
| **Separater OCR-Service** | ❌ Entfernt | In taskilo-ki integriert |
| **GPU-Abhängigkeit** | ❌ Entfernt | CPU-only PyTorch |
| **Blockchain-Integration** | ❌ Nicht geplant | Keine Priorität |
| **IoT-Integration** | ❌ Nicht geplant | Außerhalb Scope |

---

## Architektur

### Aktuelle Infrastruktur (Hetzner Server)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Hetzner Server (mail.taskilo.de)             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   taskilo-ki    │  │  taskilo-celery │  │ taskilo-webmail │ │
│  │   Port 8000     │  │   Background    │  │   Port 3000     │ │
│  │   FastAPI       │  │   Worker        │  │   Proxy         │ │
│  └────────┬────────┘  └────────┬────────┘  └─────────────────┘ │
│           │                    │                                │
│           ▼                    ▼                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Docker Network                           ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         ││
│  │  │  postgres   │  │   mongo     │  │   redis     │         ││
│  │  │  Port 5432  │  │  Port 27017 │  │  Port 6379  │         ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐                      │
│  │   prometheus    │  │    grafana      │                      │
│  │   Metriken      │  │   Dashboards    │                      │
│  └─────────────────┘  └─────────────────┘                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Container-Status (Live)

| Container | Status | Funktion |
|-----------|--------|----------|
| `taskilo-ki` | ✅ healthy | Haupt-KI-Service |
| `taskilo-celery` | ✅ healthy | Async Tasks |
| `taskilo-postgres` | ✅ healthy | SQL-Datenbank |
| `taskilo-mongo` | ✅ healthy | NoSQL-Datenbank |
| `taskilo-redis-ki` | ✅ healthy | KI-Cache/Queue |
| `taskilo-prometheus` | ✅ running | Metriken |
| `taskilo-grafana` | ✅ running | Monitoring |
| `taskilo-webmail-proxy` | ✅ healthy | E-Mail-Proxy |

---

## Multi-Agent-System

### Aktive Agenten (4 von 4)

#### 1. FinanzAgent
- **Status**: ✅ Initialisiert
- **Aufgaben**:
  - Einnahmen/Ausgaben-Analyse
  - Cashflow-Überwachung
  - Finanzielle Warnungen
  - Sparvorschläge

#### 2. SteuerAgent
- **Status**: ✅ Initialisiert (Steuersätze 2025)
- **Aufgaben**:
  - Steueroptimierung
  - Abzugsmöglichkeiten identifizieren
  - Gesetzesänderungen überwachen
  - Kleinunternehmer-Regelung (§19 UStG)

#### 3. RisikoAgent
- **Status**: ✅ Frühwarnsystem aktiviert
- **Aufgaben**:
  - Liquiditätsengpässe erkennen
  - Insolvenz-Früherkennung
  - Schuldenmanagement
  - Risikobewertung

#### 4. WachstumsAgent
- **Status**: ✅ Strategieberatung aktiviert
- **Aufgaben**:
  - Investitionsempfehlungen
  - Wachstumspotenziale identifizieren
  - Marktanalyse
  - Skalierungsstrategien

---

## Datenbank-Schema

### PostgreSQL (taskilo_ki)

```sql
-- Unternehmen
CREATE TABLE unternehmen (
    id SERIAL PRIMARY KEY,
    firebase_uid VARCHAR(255) UNIQUE,
    name VARCHAR(255),
    branche VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Transaktionen
CREATE TABLE transaktionen (
    id SERIAL PRIMARY KEY,
    unternehmen_id INT REFERENCES unternehmen(id),
    betrag DECIMAL(12,2),
    datum DATE,
    kategorie VARCHAR(100),
    typ VARCHAR(20) -- 'einnahme' oder 'ausgabe'
);

-- Analyse-Ergebnisse
CREATE TABLE analyse_ergebnisse (
    id SERIAL PRIMARY KEY,
    unternehmen_id INT REFERENCES unternehmen(id),
    agent VARCHAR(50),
    ergebnis JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- KI-Lerndaten (für OCR und Dokumentenerkennung)
CREATE TABLE ki_lern_daten (
    id SERIAL PRIMARY KEY,
    dokument_typ VARCHAR(100),
    original_text TEXT,
    korrigierter_text TEXT,
    extrahierte_felder JSONB,
    feedback_score FLOAT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- API-Logs
CREATE TABLE api_logs (
    id SERIAL PRIMARY KEY,
    endpoint VARCHAR(255),
    methode VARCHAR(10),
    status_code INT,
    response_time_ms FLOAT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### MongoDB (taskilo_ki)

| Collection | Zweck |
|------------|-------|
| `dokumente` | OCR-Ergebnisse, Belege |
| `analysen` | Detaillierte Analyse-JSON |
| `events` | System-Events, Logs |
| `cache` | Temporäre Daten |
| `korrekturen` | Benutzer-Feedback für KI-Lernen |

---

## API-Endpunkte

### Health & Monitoring

| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/v1/health/` | GET | System-Gesundheitsstatus |
| `/api/v1/health/detailed` | GET | Detaillierte Komponentenprüfung |
| `/metrics` | GET | Prometheus-Metriken |

### Dokumente & OCR

| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/v1/dokumente/upload` | POST | Dokument hochladen |
| `/api/v1/dokumente/{id}` | GET | Dokument abrufen |
| `/api/v1/dokumente/{id}/ocr` | POST | OCR durchführen |
| `/api/v1/dokumente/{id}/korrektur` | POST | Korrektur für KI-Lernen |

### Analyse

| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/v1/analyse/unternehmen/{id}` | POST | Vollständige Unternehmensanalyse |
| `/api/v1/analyse/anomalien` | POST | Anomalie-Erkennung |
| `/api/v1/analyse/steuern` | POST | Steueroptimierung |

### Prognosen

| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/v1/prognose/cashflow` | POST | Cashflow-Vorhersage |
| `/api/v1/prognose/wachstum` | POST | Wachstumsprognose |

### Firebase-Sync

| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/v1/firebase/sync` | POST | Daten synchronisieren |
| `/api/v1/firebase/unternehmen/{uid}` | GET | Unternehmensdaten abrufen |

---

## ML-Modelle

### AnomalyDetector (IsolationForest)
- **Status**: Modell geladen, nicht trainiert
- **Algorithmus**: Isolation Forest
- **Verwendung**: Erkennung ungewöhnlicher Transaktionen
- **Training**: Benötigt min. 10 Transaktionen

### CashflowPredictor (Prophet)
- **Status**: Bereit
- **Algorithmus**: Facebook Prophet
- **Verwendung**: Zeitreihen-Prognosen für Cashflow

### NERExtractor (Hugging Face)
- **Status**: ✅ Geladen
- **Modell**: Transformer-basiert
- **Verwendung**: Extraktion von Entitäten aus Dokumenten
  - Beträge, Daten, Firmenname, USt-IdNr, etc.

---

## OCR-System (Integriert in taskilo-ki)

### Technologie
- **Engine**: Tesseract OCR 5.5
- **Sprachen**: Deutsch (deu), Englisch (eng)
- **PDF-Verarbeitung**: pdf2image + poppler-utils
- **Bildverarbeitung**: Pillow

### OCR-Workflow
```
1. Dokument hochladen → /api/v1/dokumente/upload
2. OCR durchführen → /api/v1/dokumente/{id}/ocr
3. NER-Extraktion → Automatisch nach OCR
4. Benutzer-Korrektur → /api/v1/dokumente/{id}/korrektur
5. KI-Lernen → Korrektur in PostgreSQL speichern
```

### Lern-Schleife
```
Benutzer korrigiert OCR-Ergebnis
        ↓
Korrektur wird gespeichert (ki_lern_daten)
        ↓
Pattern-Erkennung verbessert sich
        ↓
Bessere Extraktion bei ähnlichen Dokumenten
```

---

## Deployment

### Verzeichnisstruktur (Hetzner)

```
/opt/taskilo/
├── taskilo-ki/           # Haupt-KI-Service
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── requirements.txt
│   └── src/
│       ├── api/
│       │   ├── main.py
│       │   └── routes/
│       ├── agents/
│       ├── database/
│       ├── integrations/
│       └── ml/
├── webmail-proxy/        # E-Mail-Proxy
└── data/                 # Persistente Daten
```

### Build & Deploy

```bash
# Lokale Änderungen hochladen
scp -r taskilo-ki/src root@mail.taskilo.de:/opt/taskilo/taskilo-ki/

# Container neu bauen
ssh root@mail.taskilo.de "cd /opt/taskilo/taskilo-ki && \
    docker compose build taskilo-ki && \
    docker compose up -d taskilo-ki"

# Status prüfen
ssh root@mail.taskilo.de "docker ps --filter name=taskilo-ki"
```

### Umgebungsvariablen

| Variable | Wert | Beschreibung |
|----------|------|--------------|
| `POSTGRES_URL` | postgresql://...@postgres:5432 | PostgreSQL-Verbindung |
| `MONGODB_URL` | mongodb://mongo:27017/taskilo_ki | MongoDB-Verbindung |
| `REDIS_URL` | redis://redis:6379/0 | Redis-Verbindung |
| `ENVIRONMENT` | production | Umgebung |
| `LOG_LEVEL` | INFO | Log-Level |

---

## Nächste Schritte

### Priorität 1: Trainingsdaten
- [ ] Anomaly Detector mit echten Transaktionsdaten trainieren
- [ ] OCR-Korrekturen sammeln für KI-Lernen
- [ ] Cashflow-Predictor mit historischen Daten füttern

### Priorität 2: Firebase-Integration
- [ ] Bidirektionale Sync implementieren
- [x] Unternehmensdaten aus Firestore abrufen ✅ (11.01.2026)
- [ ] Analyse-Ergebnisse zurück nach Firebase schreiben

**✅ Implementiert (11.01.2026): Company-Kontext für OCR**
Die OCR-API übergibt nun Unternehmensdaten aus Firestore an die KI:
- `companyName`, `vatId`, `taxNumber`, `address`, `iban`
- Automatische Erkennung: Ausgangsrechnung vs Eingangsrechnung
- Wenn OCR den Firmennamen des Users erkennt → Ausgangsrechnung

### Priorität 3: Externe APIs
- [ ] DATEV-API produktiv verbinden
- [ ] FinAPI-Integration fertigstellen
- [ ] BMF-Scraper aktivieren

### Priorität 4: Frontend-Integration
- [ ] Dashboard-Widgets für KI-Empfehlungen
- [ ] OCR-Korrekturen im Frontend ermöglichen
- [ ] Analyse-Berichte visualisieren

---

## Firebase-Integration für OCR (Januar 2026)

### Architektur
```
Frontend (Vercel)                    Hetzner KI-Server
      │                                    │
      ├─── GET /companies/{id} ────────────┤
      │    (Firestore Admin SDK)           │
      │                                    │
      ├─── POST /ocr/extract ──────────────┤
      │    + file                          │
      │    + company_context (JSON)        │
      │                                    │
      │    ┌─────────────────────────┐     │
      │    │ company_context:        │     │
      │    │  - companyName          │     │
      │    │  - vatId                │     │
      │    │  - taxNumber            │     │
      │    │  - address, zip, city   │     │
      │    │  - iban                 │     │
      │    └─────────────────────────┘     │
      │                                    │
      │◄─── invoice_type: incoming/────────┤
           outgoing + extracted_fields
```

### Intelligente Erkennung
1. **Eingangsrechnung (Expense)**: User ist Empfänger
   - OCR erkennt fremde Firma als Vendor
   - Normale Expense-Verarbeitung
   
2. **Ausgangsrechnung**: User ist Rechnungssteller
   - OCR erkennt User-Firma im Footer
   - Oder USt-IdNr/IBAN stimmt überein
   - Markierung: `_IS_OUTGOING: true`

### Dateien
- `src/lib/hetzner-ocr-client.ts` - CompanyContext Interface + Übergabe
- `src/app/api/expenses/ocr-extract/route.ts` - Firestore Abruf + Kontext-Übergabe
- `taskilo-ki/src/api/routes/dokumente.py` - Endpunkt mit company_context
- `taskilo-ki/src/services/ml_expense_analyzer.py` - Intelligente Auswertung

---

## Technologie-Stack

| Kategorie | Technologie | Version |
|-----------|-------------|---------|
| **Backend** | FastAPI | 0.115.6 |
| **Python** | Python | 3.11 |
| **ML** | scikit-learn | 1.6.1 |
| **ML** | Prophet | 1.1.6 |
| **ML** | PyTorch (CPU) | 2.9.1 |
| **NLP** | Transformers | 4.47.1 |
| **OCR** | Tesseract | 5.5 |
| **OCR** | pytesseract | 0.3.13 |
| **DB** | PostgreSQL | 17 |
| **DB** | MongoDB | 7.0 |
| **Cache** | Redis | 7.0 |
| **Queue** | Celery | 5.4.0 |
| **Container** | Docker | 24.x |

---

## Hinweise

### Kein GPU erforderlich
Der Server hat keine GPU. PyTorch ist auf CPU-only optimiert (~185MB statt 2.5GB).

### Keine separaten Services
Die OCR-Funktionalität ist vollständig in `taskilo-ki` integriert. Es gibt keinen separaten `ocr-service` mehr.

### Deutsche Sprache
- Alle Agenten arbeiten auf Deutsch
- OCR ist für deutsche Dokumente optimiert
- Steuersätze und Gesetze sind für Deutschland konfiguriert
