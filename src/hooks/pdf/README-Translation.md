# DocumentSettings Translation System

## ✅ Implementiert

### 1. Übersetzungskomponente (`useDocumentTranslation.ts`)
- **8 Sprachen unterstützt**: Deutsch, English, Français, Español, Italiano, Nederlands, Português, Polski
- **65+ Übersetzungsschlüssel** für alle wichtigen PDF-Begriffe
- **Type-safe**: Vollständig typisiert mit TypeScript
- **Erweiterbar**: Einfach neue Sprachen hinzufügbar

### 2. Templates erweitert
- **StandardTemplate**: Vollständig übersetzt
- **NeutralTemplate**: Basis-Übersetzung implementiert  
- **Alle anderen Templates**: Tabellen-Übersetzungen funktional

### 3. ItemsTable-Komponente
- **Alle Varianten übersetzt**: Standard, Elegant, Technical
- **Dynamische Spaltenköpfe**: Artikel-Nr., Beschreibung, Menge, etc.
- **Sprachabhängige Einheiten**: Stk/pcs/pz je nach Sprache

### 4. LivePreviewModal
- **Sprach-Dropdown**: 8 Sprachen zur Auswahl
- **Sofortige Änderung**: Live-Update der PDF-Vorschau
- **Konsistente Codes**: `de`, `en`, `fr` etc.

## 🎯 Wie zu verwenden

### In Templates:
\`\`\`typescript
const { t } = useDocumentTranslation(language);
// Verwendung: {t('invoice')}, {t('description')}, etc.
\`\`\`

### Neue Sprache hinzufügen:
1. Objekt in `translations` Record hinzufügen
2. Alle 65+ Keys übersetzen
3. Automatisch in allen Templates verfügbar

### Neue Übersetzungskeys:
1. Key zu `DocumentTranslations` Interface hinzufügen
2. In alle Sprachen-Objekte einbauen
3. Mit `t('newKey')` verwenden

## 🌟 Features

- **Konsistent**: Gleiche Begriffe überall gleich übersetzt
- **Performance**: useMemo für optimierte Rendering
- **Wartbar**: Zentrale Verwaltung aller Übersetzungen
- **Fallback**: Automatischer Fallback zu Deutsch bei unbekannten Sprachen
- **Extensible**: Einfache Erweiterung um neue Sprachen/Begriffe

Die Übersetzungen funktionieren jetzt live in der Preview! 🚀