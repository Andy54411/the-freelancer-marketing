# ELSTER ERiC Integration - Taskilo

## Übersicht

Taskilo integriert die ELSTER ERiC-Bibliothek (ELSTER Rich Client) für die elektronische Steuerübermittlung an das Finanzamt. Die Integration ermöglicht:

> **WICHTIG:** Wir verwenden **ERiC Release 43** (aktuellste Version). ERiC 39 und 40 sind seit 28.04.2025 nicht mehr nutzbar. Die nächste Mindestversionserhöhung erfolgt im April 2026.

- **UStVA** (Umsatzsteuer-Voranmeldung) - Monatlich oder vierteljährlich
- **EÜR** (Einnahmen-Überschuss-Rechnung) - Jährlich
- **ESt** (Einkommensteuererklärung) - Geplant
- **GewSt** (Gewerbesteuererklärung) - Geplant

## Architektur

```
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│   Vercel        │     │   Hetzner Server    │     │   ELSTER        │
│   (Frontend)    │────►│   (ERiC Proxy)      │────►│   (Finanzamt)   │
│                 │     │                     │     │                 │
│ • Dashboard UI  │     │ • ERiC C-Bibliothek │     │ • Empfang       │
│ • API Routes    │     │ • FFI Wrapper       │     │ • Validierung   │
│ • Client Lib    │     │ • Zertifikate       │     │ • Bestätigung   │
└─────────────────┘     └─────────────────────┘     └─────────────────┘
```

**Warum Hetzner?**
- Die ERiC-Bibliothek ist eine C-Library für Linux
- Vercel (Serverless) unterstützt keine nativen C-Bibliotheken
- Hetzner bietet dedizierte Linux-Infrastruktur

## Komponenten

### 1. ERiC Service (Hetzner)

**Pfad:** `webmail-proxy/src/services/EricService.ts`

Der Service kapselt die ERiC C-Bibliothek über Node.js FFI:
- Initialisierung der ERiC-Bibliothek
- Steuernummer-Validierung
- UStVA XML-Generierung
- Datenübermittlung an ELSTER
- Zertifikatsverwaltung

### 2. ERiC Router (Hetzner)

**Pfad:** `webmail-proxy/src/routes/eric.ts`

API-Endpunkte:
| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/eric/status` | GET | Service-Status und Verfügbarkeit |
| `/api/eric/testfinanzaemter` | GET | Liste der Testfinanzämter |
| `/api/eric/validate-steuernummer` | POST | Steuernummer validieren |
| `/api/eric/submit-ustva` | POST | UStVA an ELSTER übermitteln |
| `/api/eric/submit-euer` | POST | EÜR übermitteln (geplant) |
| `/api/eric/generate-xml` | POST | XML-Vorschau ohne Übermittlung |
| `/api/eric/upload-certificate` | POST | ELSTER-Zertifikat hochladen |
| `/api/eric/certificate/:companyId/status` | GET | Zertifikatsstatus prüfen |
| `/api/eric/certificate/:companyId` | DELETE | Zertifikat löschen |

### 3. Vercel Client (Frontend)

**Pfad:** `src/lib/eric-hetzner-proxy.ts`

TypeScript-Client für die Kommunikation mit dem ERiC-Proxy:

```typescript
import { EricHetznerProxy } from '@/lib/eric-hetzner-proxy';

// Status prüfen
const status = await EricHetznerProxy.getStatus();

// Steuernummer validieren
const result = await EricHetznerProxy.validateSteuernummer('1234567890123', 'BY');

// UStVA übermitteln
const submission = await EricHetznerProxy.submitUStVA(
  companyId,
  ustvaData,
  { pin: '123456' }
);
```

## Installation auf Hetzner

### 1. ERiC-Bibliothek herunterladen

1. Login im ELSTER-Entwicklerbereich: https://www.elster.de/entwicklerbereich
2. Download der ERiC-Bibliothek (Linux 64-bit)
3. Entpacken nach `/opt/taskilo/eric/`

```bash
# Verzeichnisstruktur erstellen
mkdir -p /opt/taskilo/eric/{lib,plugins,certificates}
mkdir -p /opt/taskilo/logs/eric

# ERiC-Bibliothek entpacken
tar -xzf ERiC-41.6.2.0-Linux64.tar.gz -C /opt/taskilo/eric/

# Berechtigungen setzen
chmod -R 755 /opt/taskilo/eric/lib
chmod 700 /opt/taskilo/eric/certificates
```

### 2. Webmail-Proxy aktualisieren

```bash
# Lokale Dateien hochladen
scp -r webmail-proxy/src/services/EricService.ts root@mail.taskilo.de:/opt/taskilo/webmail-proxy/src/services/
scp -r webmail-proxy/src/routes/eric.ts root@mail.taskilo.de:/opt/taskilo/webmail-proxy/src/routes/

# Docker Container neu bauen
ssh root@mail.taskilo.de "cd /opt/taskilo/webmail-proxy && docker compose up -d --build"
```

### 3. Testmodus aktivieren

Im Testmodus werden alle Übermittlungen an Testfinanzämter gesendet. 
Der Testmodus ist standardmäßig aktiviert.

```typescript
// In EricService.ts
const config = {
  testMode: true, // true = Testfinanzamt, false = Produktion
};
```

## ELSTER-Zertifikate

### Arten von Zertifikaten

1. **Software-Zertifikat (.pfx)** - Für die meisten Anwendungsfälle
2. **Signaturkarte** - Für höhere Sicherheitsanforderungen

### Zertifikat hochladen

```typescript
// Base64-kodiertes Zertifikat hochladen
await EricHetznerProxy.uploadCertificate(
  companyId,
  certificateBase64,
  'elster.pfx'
);
```

### Speicherort

Zertifikate werden sicher auf Hetzner gespeichert:
- Pfad: `/opt/taskilo/eric/certificates/{companyId}/elster.pfx`
- Berechtigungen: 400 (nur lesbar für Owner)

## UStVA-Kennzahlen

| Kennzahl | Beschreibung |
|----------|--------------|
| Kz 81 | Steuerpflichtige Umsätze 19% (Netto) |
| Kz 86 | Steuerpflichtige Umsätze 7% (Netto) |
| Kz 35 | Steuerfreie Umsätze mit Vorsteuerabzug |
| Kz 77 | Steuerfreie Umsätze ohne Vorsteuerabzug |
| Kz 41 | Innergemeinschaftliche Lieferungen |
| Kz 66 | Abziehbare Vorsteuer |
| Kz 61 | Vorsteuer aus innergemeinschaftlichem Erwerb |
| Kz 62 | Entstandene Einfuhrumsatzsteuer |
| Kz 83 | Zahllast/Erstattung |

## Zeitraumcodes

| Code | Bedeutung |
|------|-----------|
| 01-12 | Monate Januar bis Dezember |
| 41 | 1. Quartal (Q1) |
| 42 | 2. Quartal (Q2) |
| 43 | 3. Quartal (Q3) |
| 44 | 4. Quartal (Q4) |

## Fehlercodes

Die wichtigsten ERiC-Fehlercodes:

| Code | Beschreibung |
|------|--------------|
| 0 | Erfolg (ERIC_OK) |
| 610001001 | Allgemeiner Fehler |
| 610001085 | XML TransferHeader Fehler |
| 610101200 | Steuernummer ungültig |
| 610201001 | Zertifikat nicht gefunden |
| 610201002 | PIN falsch |

## Sicherheit

- Zertifikate werden **nur auf Hetzner** gespeichert
- PINs werden **niemals** persistiert
- Alle Übermittlungen sind TLS-verschlüsselt
- API-Key-Authentifizierung zwischen Vercel und Hetzner
- Audit-Logging aller Steuerübermittlungen

## ERiC Release-Zyklus

```
Mai-Release (technisch)     November-Release (Haupt)      Mindestversion
        │                            │                          │
        ▼                            ▼                          ▼
┌───────────────┐            ┌───────────────┐          ┌───────────────┐
│  ERiC 43      │            │  ERiC 44      │          │  Erhöhung     │
│  Mai 2026     │───────────►│  Nov 2026     │─────────►│  April 2027   │
│  (technisch)  │            │  (Jahresfort- │          │  (ERiC 42+43  │
│               │            │   schreibung) │          │   nicht mehr  │
│               │            │               │          │   nutzbar)    │
└───────────────┘            └───────────────┘          └───────────────┘
```

### Wichtige Hinweise zum Release-Zyklus

| Release | Zeitpunkt | Inhalt |
|---------|-----------|--------|
| **Mai-Release** | Mai | Technische Standards, Schnittstellenänderungen |
| **November-Release** | November | Jahresfortschreibung (neue Veranlagungszeiträume) |
| **Mindestversionserhöhung** | April | Ältere Releases werden deaktiviert |

### Aktuelle Versionen (Stand: Januar 2026)

| Version | Status | Hinweis |
|---------|--------|--------|
| ERiC 43 | ✅ Aktuell | **Empfohlen für Taskilo** |
| ERiC 42 | ✅ Nutzbar | Bis April 2027 |
| ERiC 41 | ⚠️ Veraltet | Mindestversion, bald nicht mehr nutzbar |
| ERiC 40 | ❌ Deaktiviert | Seit 28.04.2025 nicht mehr nutzbar |
| ERiC 39 | ❌ Deaktiviert | Seit 28.04.2025 nicht mehr nutzbar |

### Update-Strategie für Taskilo

1. **November-Release sofort integrieren** - Enthält neue Veranlagungszeiträume
2. **Mai-Release zeitnah integrieren** - Technische Änderungen für nächstes Jahr
3. **Updates regelmäßig prüfen** - ERiC-Updates nur für neueste Version
4. **Entwickler-Newsletter abonnieren** - Wichtige Änderungen werden angekündigt

## ELSTER-Entwicklerportal

- **URL:** https://www.elster.de/entwicklerbereich
- **Benutzerkennung:** entwickler
- **Dokumentation:** `docs/elster/ERiC-43.x.x/Dokumentation/`

### Wichtige Ressourcen

- `ERiC-Entwicklerhandbuch.pdf` - Hauptdokumentation
- `API-Referenz/` - C-API Header-Dokumentation
- `Schnittstellenbeschreibungen/` - XML-Schema-Dokumentation
- `Tutorial/` - Einstiegshilfe

## Nächste Schritte

1. [x] ERiC-Service und Router implementiert
2. [x] Vercel Client-Bibliothek erstellt
3. [x] Docker-Konfiguration aktualisiert
4. [ ] **ERiC Release 43 herunterladen** (Lizenzvertrag akzeptieren im Entwicklerbereich)
5. [ ] ERiC-Bibliothek auf Hetzner installieren (/opt/taskilo/eric/)
6. [ ] Testzertifikat einrichten
7. [ ] Entwickler-Newsletter abonnieren (Ressourcen im Entwicklerbereich)
8. [ ] UStVA-UI im Dashboard implementieren
9. [ ] EÜR-Übermittlung implementieren
10. [ ] Produktions-Zertifikate einrichten

## Geplante Formulare

### Phase 1 (Q1 2026) - Kernfunktionen

| Formular | ELSTER-Name | Status |
|----------|-------------|--------|
| Umsatzsteuer-Voranmeldung | UStVA | 🟡 In Arbeit |
| Umsatzsteuer-Dauerfristverlängerung | UStDV | 🔴 Geplant |
| Zusammenfassende Meldung | ZM | 🔴 Geplant |

### Phase 2 (Q2 2026)

| Formular | ELSTER-Name | Status |
|----------|-------------|--------|
| Einnahmeüberschussrechnung | EÜR | 🔴 Geplant |
| Umsatzsteuererklärung (Jahreserklärung) | USt | 🔴 Geplant |
| Steuerkontoabfrage | - | 🔴 Geplant |

### Phase 3 (Q3 2026)

| Formular | ELSTER-Name | Status |
|----------|-------------|--------|
| Einkommensteuererklärung | ESt | 🔴 Geplant |
| Gewerbesteuererklärung | GewSt | 🔴 Geplant |
| Vorausgefüllte Steuererklärung | VaSt | 🔴 Geplant |

### Phase 4 (Q4 2026) - Personal-Modul

| Formular | ELSTER-Name | Status |
|----------|-------------|--------|
| Lohnsteuer-Anmeldung | LStA | 🔴 Geplant |
| Lohnsteuerbescheinigung | LStB | 🔴 Geplant |
