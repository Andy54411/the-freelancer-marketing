# Gemini Integration für Taskilo Support

Diese Dokumentation beschreibt, wie Gemini als Support-AI automatisch auf aktuelle Taskilo-Informationen zugreifen kann.

## 🚀 API-Endpunkt für Gemini

**URL:** `https://taskilo.de/api/gemini/blog-content`  
**Methode:** `GET`  
**Content-Type:** `application/json`

## 📋 Was Gemini erhält

Die API stellt strukturierte Daten bereit, die alle wichtigen Informationen über Taskilo enthalten:

### Plattform-Informationen
- **Name:** Taskilo
- **Beschreibung:** Deutschlands moderne Service-Plattform
- **Typ:** B2C & B2B Service-Marktplatz
- **Website:** https://taskilo.de

### Service-Kategorien
1. **Haushaltsservices** - Reinigung, Gartenpflege, Handwerk, Umzüge
2. **Handwerk** - Maler, Elektriker, Klempner, Schreiner, Fachkräfte  
3. **Digitale Services** - Webdesign, Marketing, IT-Support, Grafik
4. **Business Services** - Beratung, Übersetzungen, Buchhaltung, Legal

### 💳 Zahlungssystem (Stripe Connect)
- **Sicherheit:** Bank-Level, SSL-Verschlüsselung, PCI DSS Level 1
- **Zahlungsmethoden:** Kreditkarten, SEPA, Apple Pay, Google Pay
- **Treuhandkonto-System:** Geld wird sicher gehalten bis zur Freigabe

#### Für Kunden:
- Sofortige sichere Zahlung
- Geld wird erst nach Bestätigung freigegeben
- Transparente Preisgestaltung
- Dispute-Management bei Problemen

#### Für Dienstleister:
- Stripe Connect Einrichtung erforderlich
- Automatische Auszahlung täglich um 16:00 Uhr
- 5-10% Platform-Gebühr
- Kostenlose Auszahlungen

### 🛡️ Sicherheit & Schutz
- Geprüfte und verifizierte Dienstleister
- DSGVO-konforme Datenverarbeitung
- Treuhandkonto-System für sichere Zahlungen
- Dispute-Management für Problemfälle

### 📞 Support-Kontakte
- **Live Chat:** Mo-Fr 9:00-18:00 Uhr
- **E-Mail:** support@taskilo.de
- **Telefon:** +49 (0) 30 1234 5678

## 🔧 Integration in Gemini

### Schritt 1: API-Zugriff konfigurieren
```bash
curl -X GET "https://taskilo.de/api/gemini/blog-content" \
  -H "Content-Type: application/json"
```

### Schritt 2: Automatische Datenaktualisierung
Die API sollte regelmäßig (z.B. täglich) abgerufen werden, um aktuelle Informationen zu erhalten.

### Schritt 3: Gemini-Prompts anpassen
Nutzen Sie die strukturierten Daten, um Gemini präzise Antworten zu ermöglichen:

```
"Basierend auf den aktuellen Taskilo-Informationen von https://taskilo.de/api/gemini/blog-content beantworte folgende Frage: [BENUTZERFRAGE]"
```

## 📊 Beispiel-Response

```json
{
  "success": true,
  "content": {
    "lastUpdated": "2025-07-27T...",
    "platform": {
      "name": "Taskilo",
      "description": "Deutschlands moderne Service-Plattform...",
      "website": "https://taskilo.de"
    },
    "paymentSystem": {
      "provider": "Stripe Connect",
      "security": "Bank-Level Sicherheit...",
      "methods": ["Kreditkarten", "SEPA", "Apple Pay", "Google Pay"]
    },
    // ... weitere strukturierte Daten
  },
  "usage": {
    "purpose": "Gemini Support AI Knowledge Base",
    "instructions": "Diese Daten enthalten alle wichtigen Informationen...",
    "lastUpdate": "..."
  }
}
```

## 🎯 Häufige Support-Szenarien

### Zahlungsfragen
- "Wie funktionieren die Zahlungen?" → Stripe Connect Erklärung
- "Ist mein Geld sicher?" → Treuhandkonto-System erklären
- "Wann bekomme ich als Dienstleister mein Geld?" → Tägliche Auszahlung um 16:00 Uhr

### Service-Buchung
- "Welche Services gibt es?" → Service-Kategorien auflisten
- "Wie buche ich einen Service?" → Buchungsprozess erklären
- "Was kostet die Registrierung?" → Kostenlos für alle

### Zusätzliche Arbeitszeit
- "Was passiert bei Mehrarbeit?" → Zusätzliche Stunden Prozess erklären
- "Wie werden Extra-Stunden abgerechnet?" → Genehmigungsprozess und sofortige Zahlung

## 🔄 Aktualisierung der Daten

Die API wird automatisch aktualisiert, wenn:
- Neue Blog-Artikel hinzugefügt werden
- Zahlungsprozesse geändert werden  
- Support-Informationen aktualisiert werden
- Neue Service-Kategorien hinzugefügt werden

## 📈 Monitoring & Analytics

- Alle API-Aufrufe werden geloggt
- Performance-Monitoring für schnelle Antworten
- Fehlerbehandlung für Ausfallsicherheit

## 🔗 Wichtige Links

- **Hauptseite:** https://taskilo.de
- **Blog:** https://taskilo.de/blog
- **Zahlungsanleitungen:** https://taskilo.de/blog/zahlungsablaeufe
- **Support:** https://taskilo.de/contact

---

**Ziel:** Gemini soll mit diesen aktuellen, strukturierten Daten präzise und hilfreiche Support-Antworten für Taskilo-Nutzer liefern können.
