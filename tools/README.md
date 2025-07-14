# Taskilo Tools

Dieser Ordner enthält Hilfsskripte und Tools für die Wartung und Verwaltung des Taskilo-Projekts.

## 🛠️ Verfügbare Tools

### `fix-html-translations.js`
**Zweck:** Automatische Korrektur deutscher Begriffe in englischen Übersetzungen  
**Verwendung:** `node tools/fix-html-translations.js`  
**Features:**
- Löscht automatisch alte Backup-Dateien
- Ersetzt deutsche Wörter in `messages/en.json`
- Erstellt Sicherungsbackups
- Über 5000 Übersetzungsregeln

### `cleanup-unused-files.js`
**Zweck:** Sichere Bereinigung ungenutzter Dateien im Projekt  
**Verwendung:** `node tools/cleanup-unused-files.js`  
**Features:**
- Automatische Git-Backup-Erstellung
- Löscht Build-Artifacts sicher
- Entfernt ungenutzte Analyse-Skripte
- Interaktive Auswahl für riskante Löschungen

### `analyze-component-usage.js`
**Zweck:** Analyse der Komponentenverwendung im Projekt  
**Verwendung:** `node tools/analyze-component-usage.js`  
**Features:**
- Findet ungenutzte React-Komponenten
- Zeigt Abhängigkeiten zwischen Komponenten
- Generiert Verwendungsstatistiken

## 🔒 Sicherheit

Alle Tools:
- Erstellen automatisch Backups
- Haben Schutz für wichtige Dateien
- Nutzen Git für Versionskontrolle
- Zeigen Vorschau vor Änderungen

## 📝 Entwicklung

Beim Hinzufügen neuer Tools:
1. Executable machen: `chmod +x tools/neues-tool.js`
2. Shebang hinzufügen: `#!/usr/bin/env node`
3. Diese README aktualisieren
4. Backup-Funktionalität einbauen
