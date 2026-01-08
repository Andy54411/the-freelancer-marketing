# Taskilo WhatsApp Business Integration

> Professionelle WhatsApp-Kommunikation direkt in Ihrem Taskilo Dashboard

---

## Übersicht

Die Taskilo WhatsApp Business Integration ermöglicht es Unternehmen, ihre Kundenkommunikation über WhatsApp professionell zu verwalten - alles in einer zentralen Oberfläche.

---

## Hauptfunktionen

### 1. WhatsApp Business API Anbindung

**Einfache Einrichtung mit Meta Embedded Signup**

- Verbinden Sie Ihre WhatsApp Business Nummer in wenigen Klicks
- Kein technisches Wissen erforderlich
- Sichere OAuth-Authentifizierung über Meta
- Automatische Token-Verwaltung (kein manuelles Erneuern nötig)

**So funktioniert's:**
1. Klicken Sie auf "WhatsApp verbinden"
2. Melden Sie sich bei Meta an
3. Wählen Sie Ihre Business-Nummer
4. Fertig - Sie können sofort loslegen

---

### 2. Team-Inbox

**Alle WhatsApp-Nachrichten an einem Ort**

- **Zentraler Posteingang**: Alle eingehenden Nachrichten übersichtlich in einer Liste
- **Echtzeit-Updates**: Neue Nachrichten erscheinen sofort ohne Seiten-Refresh
- **Ungelesen-Badges**: Sehen Sie auf einen Blick, welche Chats Aufmerksamkeit benötigen

---

### 3. Intelligente Chat-Filter

**Behalten Sie den Überblick mit smarten Filtern**

| Filter | Beschreibung |
|--------|--------------|
| **Offen** | Alle aktiven Chats (nicht archiviert oder geschlossen) |
| **Wartet auf mich** | Kunde hat geschrieben - Sie müssen antworten |
| **Wartet auf Kunde** | Sie haben geschrieben - Kunde muss antworten |

**Zusätzliche Sortierung:**
- Neueste Nachrichten oben (Toggle)
- Alphabetisch nach Name
- Suchfunktion über alle Chats

---

### 4. Info-Panel (rechte Seitenleiste)

**Alle Informationen zum aktuellen Chat**

#### Kontakt-Tab
- Kundendaten aus dem CRM (Name, E-Mail, Telefon, Adresse)
- Direkte Verlinkung zum Kundenprofil
- Firmeninfos bei Geschäftskunden

#### Tags-Tab
- Organisieren Sie Chats mit farbigen Tags
- Vordefinierte Tags: Wichtig, Neu, VIP, Support, Verkauf, Mahnung, Zahlung, Angebot
- Tags werden mit dem Kundenprofil synchronisiert

#### Historie-Tab
- Chronologischer Verlauf aller Chat-Aktivitäten
- Wann wurde der Chat geöffnet/geschlossen
- Welcher Mitarbeiter hat geantwortet
- Tag-Änderungen dokumentiert

---

### 5. Nachrichten-Funktionen

**Professionelle Kommunikation**

- **Textnachrichten**: Schreiben Sie direkt aus dem Dashboard
- **Medien**: Bilder, Videos, Dokumente senden und empfangen
- **Sprachnachrichten**: Empfangen und abspielen
- **Standorte**: Standortfreigaben vom Kunden empfangen
- **Lese-Status**: Sehen Sie wann Ihre Nachricht gelesen wurde (✓✓ blau)

**Nachrichtenvorlagen:**
- Genehmigte WhatsApp-Vorlagen verwenden
- Schnellantworten für häufige Fragen
- Personalisierung mit Kundendaten

---

### 6. Gelesen-Funktion

**Organisieren Sie Ihre Arbeit**

- Ungelesene Nachrichten werden mit Badge angezeigt
- Beim Öffnen eines Chats werden Nachrichten automatisch als gelesen markiert
- Filter zeigt Anzahl ungelesener Chats pro Kategorie

---

### 7. CRM-Integration

**Nahtlose Verbindung mit Ihren Kundendaten**

#### Im WhatsApp-Chat:
- Kundenprofil direkt einsehen
- Offene Rechnungen sehen
- Bestellhistorie prüfen
- Tags zwischen WhatsApp und CRM synchronisiert

#### Im Kundenprofil:
- Neuer "WhatsApp"-Tab zeigt Kommunikationsverlauf
- Nachrichtenstatistik (Gesendet/Empfangen)
- Aktivitäten-Log für interne Dokumentation
- Direktlink zum WhatsApp-Chat

---

### 8. Rechnung per WhatsApp senden

**Schneller Rechnungsversand**

- Ein-Klick-Button im Kundenprofil bei jeder Rechnung
- PDF-Rechnung wird automatisch angehängt
- Begleittext mit Rechnungsnummer und Betrag
- Aktivität wird im Kundenprofil dokumentiert

---

### 9. Automatische Token-Erneuerung

**Sorgenfreier Dauerbetrieb**

- WhatsApp-Tokens sind 60 Tage gültig
- Taskilo erneuert Tokens automatisch 7 Tage vor Ablauf
- Täglicher Cron-Job prüft alle Unternehmens-Verbindungen
- Keine manuelle Wartung erforderlich

---

### 10. Webhook-Integration

**Eingehende Nachrichten in Echtzeit**

- Meta sendet neue Nachrichten sofort an Taskilo
- Automatische Zuordnung zum richtigen Unternehmen
- Status-Updates (gesendet, zugestellt, gelesen) werden synchronisiert
- Kontaktname aus WhatsApp-Profil wird übernommen

---

## Technische Details

### Unterstützte Nachrichtentypen

| Typ | Senden | Empfangen |
|-----|--------|-----------|
| Text | ✅ | ✅ |
| Bilder | ✅ | ✅ |
| Videos | ✅ | ✅ |
| Dokumente | ✅ | ✅ |
| Sprachnachrichten | ❌ | ✅ |
| Standorte | ❌ | ✅ |
| Kontakte | ❌ | ✅ |
| Sticker | ❌ | ✅ |
| Button-Antworten | ❌ | ✅ |

### Datenspeicherung

- Alle Nachrichten werden in Firebase Firestore gespeichert
- Pro Unternehmen separate Collection (`/companies/{companyId}/whatsappMessages`)
- DSGVO-konform auf deutschen Servern
- Verschlüsselte Übertragung (TLS 1.3)

### API-Endpunkte

| Endpunkt | Beschreibung |
|----------|--------------|
| `POST /api/whatsapp/send` | Nachricht senden |
| `GET /api/whatsapp/templates` | Vorlagen abrufen |
| `POST /api/whatsapp/webhook` | Eingehende Nachrichten (Meta Webhook) |
| `GET /api/whatsapp/chat/tags` | Chat-Tags laden |
| `POST /api/whatsapp/chat/tags` | Chat-Tags speichern |
| `GET /api/whatsapp/chat/history` | Chat-Historie laden |
| `GET /api/whatsapp/chat/contact` | Kontakt-Infos laden |
| `POST /api/whatsapp/activity` | Aktivität protokollieren |

---

## Preise

Die WhatsApp Business Integration ist als Premium-Modul verfügbar:

| Plan | Preis |
|------|-------|
| WhatsApp Business Modul | 14,99 €/Monat |
| Im Bundle (alle 4 Module) | 49,99 €/Monat (28% Ersparnis) |

**Inklusive:**
- 7 Tage kostenlose Testphase
- Unbegrenzte Nachrichten (Meta-Gebühren separat)
- Team-Inbox für alle Mitarbeiter
- Automatische Token-Verwaltung
- CRM-Integration
- Priority-Support

---

## Voraussetzungen

1. **Meta Business Account** - Kostenlos erstellbar unter business.facebook.com
2. **WhatsApp Business Nummer** - Kann bestehende oder neue Nummer sein
3. **Verifiziertes Unternehmen** - Meta prüft Ihre Unternehmensdaten
4. **Taskilo Business Abo** - Basis für alle Premium-Module

---

## FAQ

### Kann ich meine bestehende WhatsApp-Nummer verwenden?
Ja, Sie können Ihre bestehende WhatsApp Business Nummer mit Taskilo verbinden. Die Nummer kann jedoch nur mit einer Plattform gleichzeitig verbunden sein.

### Wie viele Mitarbeiter können WhatsApp nutzen?
Unbegrenzt viele Mitarbeiter können über die Team-Inbox auf WhatsApp zugreifen. Jeder Mitarbeiter benötigt einen Dashboard-Zugang (Seat).

### Werden Nachrichten gespeichert?
Ja, alle Nachrichten werden sicher in der Cloud gespeichert und sind jederzeit abrufbar. Die Speicherung erfolgt DSGVO-konform auf deutschen Servern.

### Was passiert bei Verbindungsproblemen?
Taskilo erneuert Token automatisch und benachrichtigt Sie per E-Mail, falls ein manueller Eingriff erforderlich ist.

### Kann ich automatische Antworten einrichten?
Ja, über WhatsApp-Vorlagen können Sie genehmigte Nachrichten automatisch senden. Für komplexere Automatisierungen kontaktieren Sie unseren Support.

### Wie sehe ich, ob der Kunde meine Nachricht gelesen hat?
Gelesene Nachrichten zeigen zwei blaue Häkchen (✓✓). Diese Information wird in Echtzeit von WhatsApp synchronisiert.

---

## Support

Bei Fragen zur WhatsApp-Integration:

- **E-Mail**: support@taskilo.de
- **Dashboard**: Support-Ticket erstellen
- **Dokumentation**: docs.taskilo.de/whatsapp

---

*Stand: Januar 2026 - Taskilo WhatsApp Business Integration v2.6*
