# 🧹 Taskilo Projekt Cleanup Tools

Diese Sammlung von Skripten hilft dabei, ungenutzte Dateien und Komponenten im Taskilo-Projekt zu identifizieren und sicher zu entfernen.

## 📋 Verfügbare Skripte

### 1. `analyze-unused-files.js` - Vollständige Projektanalyse
**Zweck:** Umfassende Analyse aller Dateien im Projekt
```bash
node analyze-unused-files.js
```

**Features:**
- ✅ Analysiert 568 Dateien
- ✅ Verfolgt Import-Dependencies 
- ✅ Identifiziert 316 ungenutzte Dateien
- ✅ Kategorisiert nach Dateitypen (Komponenten, Skripte, Styles, etc.)
- ✅ Zeigt große Dateien (>100KB)
- ✅ Findet Duplikate von Komponenten-Namen
- ✅ Generiert Löschbefehle

**Ergebnis-Beispiel:**
```
📁 Gesamte Dateien: 568
✅ Verwendete Dateien: 252  
❌ Ungenutzte Dateien: 316
```

### 2. `analyze-component-usage.js` - React-Komponenten-Analyse
**Zweck:** Detaillierte Analyse von React-Komponenten und deren Verwendung
```bash
node analyze-component-usage.js
```

**Features:**
- ✅ Analysiert 234 React-Dateien
- ✅ Identifiziert 248 ungenutzte Komponenten
- ✅ Findet 156 möglicherweise ungenutzte Dateien
- ✅ Berechnet Komponentenkomplexität
- ✅ Zeigt Import-Verbindungen
- ✅ Identifiziert komplexeste Komponenten

**Ergebnis-Beispiel:**
```
🧩 Exportierte Komponenten: 410
🚫 Ungenutzte Komponenten: 248
📊 Durchschnittliche Komplexität: 192
```

### 3. `cleanup-unused-files.js` - Sicherer Cleanup
**Zweck:** Sicheres Löschen von ungenutzten Dateien mit Backup
```bash
node cleanup-unused-files.js
```

**Features:**
- ✅ Erstellt automatisches Git-Backup
- ✅ Kategorisierte Löschung (Build-Artifacts, Scripts, etc.)
- ✅ Schutz vor Löschung wichtiger Dateien
- ✅ Interaktive Bestätigung
- ✅ Detaillierter Bericht

**Sichere Kategorien:**
- 🗂️ Build Artifacts (`.firebase/`, `.next/`, `dist/`)
- 📜 Analyse-Skripte (alle `analyze-*.js`, `test-*.js`)
- 🌍 Übersetzungs-Artefakte (`*.json` Übersetzungsdateien)
- 📄 Scripts Ordner (`scripts/`)

## 🚀 Empfohlener Workflow

### Schritt 1: Vollanalyse
```bash
# Vollständige Projektanalyse
node analyze-unused-files.js
```

### Schritt 2: Komponenten-Detail-Analyse  
```bash
# React-Komponenten-spezifische Analyse
node analyze-component-usage.js
```

### Schritt 3: Sicherer Cleanup
```bash
# Sichere Löschung mit Backup
node cleanup-unused-files.js
```

### Schritt 4: Testen
```bash
# Nach dem Cleanup testen
npm run dev
npm run build
```

## 📊 Analyse-Ergebnisse (Aktueller Stand)

### Allgemeine Statistiken
- **Gesamte Dateien:** 568
- **Verwendete Dateien:** 252 (44.4%)
- **Ungenutzte Dateien:** 316 (55.6%)
- **Potenzielle Speicherersparnis:** ~53-105MB

### Komponenten-Statistiken
- **React-Dateien:** 234
- **Exportierte Komponenten:** 410
- **Ungenutzte Komponenten:** 248 (60.5%)
- **Komplexeste Komponente:** `LanguageContext.tsx` (1407 Komplexität)

### Kategorien ungenutzter Dateien
- 🧩 **Komponenten:** 61 Dateien
- 📜 **Skripte:** 130 Dateien  
- 🎨 **Styles:** 1 Datei
- ⚙️ **Konfiguration:** 27 Dateien
- 📄 **Andere:** 97 Dateien

## ⚠️ Wichtige Sicherheitshinweise

### Vor dem Cleanup
1. **Git-Status prüfen:** `git status`
2. **Backup erstellen:** `git add . && git commit -m "Backup before cleanup"`
3. **Branch erstellen:** `git checkout -b cleanup-$(date +%s)`

### Nach dem Cleanup
1. **Projekt testen:** `npm run dev` und `npm run build`
2. **Funktionalität prüfen:** Alle wichtigen Features testen
3. **Bei Problemen:** `git checkout main` (Rollback)
4. **Bei Erfolg:** `git merge cleanup-branch` (Anwenden)

### Nicht löschen
❌ **Niemals löschen:**
- `package.json`, `package-lock.json`
- `next.config.mjs`, `tailwind.config.js`
- `firebase.json`, `vercel.json`
- `src/app/layout.tsx`, `src/app/page.tsx`
- `.env*` Dateien
- `README.md`, `LICENSE`

## 🔍 Manuelle Überprüfung empfohlen

### Komponenten prüfen vor Löschung:
- `src/components/Modal.tsx`
- `src/components/SubcategorySelectionModal.tsx`
- `src/components/ProjectGallery.tsx`
- `src/components/ReviewForm.tsx`

### Dateien die dynamisch importiert werden könnten:
- API Routes (`src/app/api/`)
- Layout-Dateien (`layout.tsx`)
- Middleware (`middleware.ts`)

## 💡 Cleanup-Empfehlungen

### Sofort löschbar (sicher):
```bash
# Build Artifacts
rm -rf .firebase/
rm -rf .next/
rm -rf dist/

# Analyse-Skripte  
rm analyze-*.js
rm test-*.js
rm check-*.js
rm debug-*.js

# Übersetzungs-Artefakte
rm *-translations.json
rm ui-texts-extracted.json
```

### Vorsichtig prüfen:
```bash
# Diese Komponenten manuell überprüfen
ls src/components/Modal.tsx
ls src/components/ui/sidebar.tsx  
ls src/components/ProjectGallery.tsx
```

### Komplexität reduzieren:
```bash
# Diese Dateien überarbeiten/aufteilen
src/contexts/LanguageContext.tsx      # 1407 Komplexität
src/components/SettingsPage.tsx       # 1070 Komplexität  
src/components/Header.tsx             # 1047 Komplexität
```

## 🎯 Nächste Schritte

1. **Führe die Analyse aus** um aktuelle Zahlen zu erhalten
2. **Starte mit sicheren Kategorien** (Build Artifacts, Scripts)
3. **Prüfe Komponenten manuell** vor der Löschung
4. **Teste gründlich** nach jeder Cleanup-Phase
5. **Dokumentiere Änderungen** für das Team

## 📈 Erwartete Verbesserungen

Nach dem Cleanup:
- ✅ ~316 weniger Dateien 
- ✅ ~53-105MB weniger Speicher
- ✅ Sauberere Projekt-Struktur
- ✅ Schnellere Build-Zeiten
- ✅ Einfachere Navigation im Code
- ✅ Weniger Verwirrung für Entwickler

---

**⚠️ Denke daran:** Bei Unsicherheit immer ein Backup erstellen und vorsichtig vorgehen!
