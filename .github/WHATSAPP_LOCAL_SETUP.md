# WhatsApp Local Setup Guide 🚀

## 🎯 Ziel
WhatsApp QR-Code Integration **100% funktional** in Local Development

## ✅ Voraussetzungen

### 1. **Chrome/Chromium MUSS installiert sein**

#### macOS
```bash
# Wenn nicht installiert:
brew install google-chrome
# ODER
brew install chromium
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install chromium-browser
# ODER
sudo apt-get install google-chrome-stable
```

#### Windows
- Download: https://www.google.com/chrome/
- Oder: `choco install googlechrome`

**Verifiziere die Installation:**
```bash
# macOS
ls "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# Linux
which chromium-browser

# Windows
dir "C:\Program Files\Google\Chrome\Application\chrome.exe"
```

---

## 🔧 Local Development Starten

### 1. **pnpm Abhängigkeiten installieren**
```bash
cd /Users/andystaudinger/Tasko
pnpm install
```

### 2. **whatsapp-web.js Abhängigkeit checken**
```bash
pnpm list whatsapp-web.js
```

Sollte zeigen: `whatsapp-web.js@1.34.1` ✅

### 3. **Development Server starten**
```bash
pnpm run dev
```

Öffne http://localhost:3000

---

## 🔗 WhatsApp Connection testen

### Schritt 1: Firmen-Dashboard öffnen
```
http://localhost:3000/dashboard/company/[YOUR-UID]/whatsapp
```

### Schritt 2: Telefonnummer eingeben
- Beispiel: `+49 123 456789` oder `491234567890`
- Format: Landkennung + Nummer

### Schritt 3: QR-Code generieren
- Klick auf "Verbindung starten" Button
- **Warte 3-5 Sekunden** während Client initialisiert

### Schritt 4: QR scannen
- Öffne web.whatsapp.com auf PC/Mac in separatem Browser
- Klick "QR-Code scannen"
- **Scanne den QR mit deinem Handy**

### Schritt 5: Bestätigung
- WhatsApp sollte sich verbinden
- Du siehst die Nachricht: "WhatsApp verbunden"

---

## 🐛 Fehler-Behebung

### ❌ "Chrome/Chromium nicht gefunden"
```
Fehler: Chrome/Chromium nicht gefunden. Bitte installiere Google Chrome
```

**Lösung:**
```bash
# Überprüfe Installation
which chromium-browser  # Linux
ls "/Applications/Google Chrome.app"  # macOS

# Falls nicht installiert → Install gemäß Plattform oben
```

### ❌ "Client initialization timeout (30s)"
```
Fehler: Client initialization timeout (30s)
```

**Lösung:**
- Warte 30 Sekunden und versuche erneut
- Chrome braucht Zeit beim ersten Start
- Überprüfe ob Chrome nicht minimiert/versteckt ist

### ❌ "QR-Code wurde nicht generiert"
```
Fehler: QR-Code wurde nicht generiert. Versuche es erneut.
```

**Lösung:**
1. Überprüfe Chrome-Installation
2. Versuche mit neuem Tab `localhost:3000` zu öffnen
3. Leere Browser-Cache: DevTools → Application → Clear Storage

### ❌ Schwarzer Screen beim QR-Code Scan
- Stelle sicher, dass web.whatsapp.com in separatem Browser offen ist
- Nutze **NICHT** den Browser wo Taskilo lädt
- Öffne web.whatsapp.com in Chrome/Firefox

---

## 📋 Testing Checkliste

- [ ] Chrome/Chromium ist installiert
- [ ] `pnpm install` erfolgreich
- [ ] `pnpm run dev` läuft ohne Fehler
- [ ] LocalHost lädt: http://localhost:3000
- [ ] Firmen-Dashboard zeigt WhatsApp Tab
- [ ] Telefonnummer eingeben funktioniert
- [ ] QR-Code wird generiert (< 5 Sekunden)
- [ ] QR-Code Bild wird angezeigt
- [ ] Scanner-Button öffnet web.whatsapp.com
- [ ] QR kann mit Handy gescannt werden

---

## 💡 Was läuft im Hintergrund?

```
Frontend (page.tsx)
    ↓
    POST /api/whatsapp/generate-qr
    ↓
Backend (route.ts)
    ├→ Prüfe Chrome-Installation (findChrome())
    ├→ Starte whatsapp-web.js Client
    ├→ Aktiviere LocalAuth Strategie
    ├→ Warte auf 'qr' Event
    └→ Generiere QR-Code Bild (qrcode npm)
    ↓
Return QR-DataURL zu Frontend
    ↓
Frontend zeigt QR-Code Bild
    ↓
User scannt mit Handy via web.whatsapp.com
```

---

## 🔐 Datenspeicherung

Session-Daten werden lokal gespeichert:
```
.whatsapp-auth/[companyId]/
  ├─ .wwebjs_auth/
  ├─ session.json
  └─ other auth files
```

Cleanup (Browser-Cache leeren):
```bash
rm -rf .whatsapp-auth/
# Dann neu starten und verbinden
```

---

## 📞 Support

### Logs prüfen
Öffne Browser DevTools (F12) und schau Console für Fehler

Backend-Logs:
```bash
# Terminal wo `pnpm run dev` läuft
# Suche nach [WhatsApp] Meldungen
```

### Chrome nicht gestartet?
```bash
# Test ob Chrome startet
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --version

# Linux
chromium-browser --version
```

---

## ✨ Alles Ready! 

Sobald alles funktioniert:
1. Öffne WhatsApp Page
2. Gib Nummer ein
3. Scanne QR
4. Schreib deine erste Nachricht! 🎉

