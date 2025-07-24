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

## 🌐 REGEL 4: NUR LIVE TESTING - KEINE LOKALEN TESTS
- **IMMER** teste direkt live auf der Production Website: https://taskilo.de
- **NIEMALS** lokale Tests, Entwicklungsserver oder Emulatoren verwenden
- **SOFORT** nach jedem Git Push die live Website testen
- **VERMEIDE** jegliche lokale Entwicklungsumgebung - nur Production zählt

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
4. ✅ **LIVE TESTEN**: Nach jedem Git Push sofort auf https://taskilo.de testen

### NACH JEDER ÄNDERUNG OBLIGATORISCH:
5. ✅ **Build das Projekt**: Führe `pnpm build` aus um Kompilierung zu testen
6. ✅ **Git Commit & Push**: Commitee und pushe alle Änderungen zum Repository
7. ✅ **LIVE TESTING**: Teste SOFORT die Änderungen live auf https://taskilo.de

## 🚫 VERBOTEN:
- ❌ Dateien erstellen ohne Existenzprüfung
- ❌ Komplette Dateien überschreiben ohne Grund
- ❌ Änderungen ohne Projektanalyse
- ❌ Ignorieren von bestehenden Implementierungen
- ❌ Änderungen ohne Build und Git-Push am Ende
- ❌ **LOKALE TESTS oder Entwicklungsserver verwenden**
- ❌ **Testing ohne Live-Production Website (https://taskilo.de)**
- ❌ **Emulatoren oder localhost für Tests nutzen**

## ✅ ERLAUBT:
- ✅ Dateien analysieren und verstehen
- ✅ Fehler in bestehenden Dateien reparieren
- ✅ Fehlende Funktionalität zu existierenden Dateien hinzufügen
- ✅ Neue Dateien erstellen NUR wenn sie nicht existieren
- ✅ **NUR LIVE TESTING auf https://taskilo.de nach jedem Deployment**
- ✅ **Sofortige Production-Tests nach Git Push**

## 🎯 ZIEL:
- **STABILITÄT**: Erhalte funktionierende Teile des Projekts
- **KONSISTENZ**: Behalte bestehende Strukturen und Patterns bei
- **EFFIZIENZ**: Repariere und verbessere statt neu zu erstellen
- **QUALITÄT**: Verstehe bevor du handelst

---

**Diese Regeln sind OBLIGATORISCH und müssen bei JEDEM Prompt befolgt werden!**
