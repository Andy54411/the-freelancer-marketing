---
applyTo: '**'
---

# KI-Arbeitsablauf Anweisungen für Taskilo Projekt

## 🔍 REGEL 1: IMMER PROJEKT ANALYSIEREN VOR AUSFÜHRUNG
- **BEVOR** du einen Prompt ausführst, analysiere das KOMPLETTE Projekt
- Verwende `file_search`, `grep_search` oder `semantic_search` um den aktuellen Stand zu verstehen
- Prüfe existierende Implementierungen, Strukturen und Abhängigkeiten
- Verstehe den Kontext bevor du handelst

## 📁 REGEL 2: KEINE NEUEN DATEIEN OHNE PRÜFUNG
- **NIEMALS** erstelle neue Dateien ohne vorherige Existenzprüfung
- Verwende `file_search` oder `read_file` um zu prüfen ob die Datei bereits existiert
- Falls die Datei existiert: Repariere/verbessere sie statt sie neu zu erstellen
- Nur wenn die Datei DEFINITIV nicht existiert, erstelle eine neue

## 🔧 REGEL 3: REPARIERE FEHLER IN EXISTIERENDEN DATEIEN
- Sind Fehler in einer Datei vorhanden: **REPARIERE** sie
- Verwende `replace_string_in_file` für präzise Korrekturen
- Behalte die bestehende Struktur und Logik bei
- Füge nur fehlende/defekte Teile hinzu oder korrigiere sie

## 📋 ARBEITSABLAUF CHECKLISTE

### VOR JEDER AKTION:
1. ✅ **Analysiere das Projekt**: Was existiert bereits?
2. ✅ **Prüfe Datei-Existenz**: `file_search` für gewünschte Datei
3. ✅ **Verstehe den Kontext**: Lese relevante existierende Dateien
4. ✅ **Identifiziere Probleme**: Was muss repariert/verbessert werden?

### BEI DER AUSFÜHRUNG:
1. ✅ **Repariere zuerst**: Behebe Fehler in existierenden Dateien
2. ✅ **Erweitere dann**: Füge fehlende Funktionalität hinzu
3. ✅ **Erstelle nur bei Bedarf**: Neue Dateien nur wenn absolut notwendig
4. ✅ **Teste die Änderungen**: Verwende `run_in_terminal` um zu validieren

### NACH JEDER ÄNDERUNG OBLIGATORISCH:
5. ✅ **Build das Projekt**: Führe `pnpm build` aus um Kompilierung zu testen
6. ✅ **Git Commit & Push**: Commitee und pushe alle Änderungen zum Repository

## 🚫 VERBOTEN:
- ❌ Dateien erstellen ohne Existenzprüfung
- ❌ Komplette Dateien überschreiben ohne Grund
- ❌ Änderungen ohne Projektanalyse
- ❌ Ignorieren von bestehenden Implementierungen
- ❌ Änderungen ohne Build und Git-Push am Ende

## ✅ ERLAUBT:
- ✅ Dateien analysieren und verstehen
- ✅ Fehler in bestehenden Dateien reparieren
- ✅ Fehlende Funktionalität zu existierenden Dateien hinzufügen
- ✅ Neue Dateien erstellen NUR wenn sie nicht existieren

## 🎯 ZIEL:
- **STABILITÄT**: Erhalte funktionierende Teile des Projekts
- **KONSISTENZ**: Behalte bestehende Strukturen und Patterns bei
- **EFFIZIENZ**: Repariere und verbessere statt neu zu erstellen
- **QUALITÄT**: Verstehe bevor du handelst

---

**Diese Regeln sind OBLIGATORISCH und müssen bei JEDEM Prompt befolgt werden!**
