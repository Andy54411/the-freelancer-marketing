# Taskilo Dokumentation

## 📁 Verzeichnisstruktur

### `/gtm/` - Google Tag Manager
- [`GTM-API-WORKFLOW.md`](./gtm/GTM-API-WORKFLOW.md) - Automatisierte GTM-API Integration
- [`gtm-integration.md`](./gtm/gtm-integration.md) - GTM Integration Guide
- [`gtm-setup.md`](./gtm/gtm-setup.md) - GTM Setup Anleitung

### `/performance/` - Performance & Monitoring
- [`PERFORMANCE.md`](./performance/PERFORMANCE.md) - Performance Optimierungen und Monitoring

### `/oauth/` - Google OAuth Integration
- Dokumentation für Google Workspace OAuth (wird erstellt)

### `/setup/` - Setup Guides
- [`SUBCATEGORY_TRACKING_SUMMARY.md`](./setup/SUBCATEGORY_TRACKING_SUMMARY.md) - Subkategorie Tracking
- [`GTM_MANUAL_FIX.md`](./setup/GTM_MANUAL_FIX.md) - Manuelle GTM Korrekturen

### `/archive/` - Archivierte Dokumentation
- Ältere Dokumentationen und abgeschlossene Projekte

## 🔧 Aktuelle Arbeiten

### OAuth Integration Status
- **Problem**: OAuth client 401 Fehler auf Live-Site
- **Aktuell**: Mock Credentials (1753257955229-d0bsd2sk4.apps.googleusercontent.com) 
- **Nächster Schritt**: Echte Google Cloud Console Credentials erstellen

### Build Status
- ✅ Production Build funktioniert
- ✅ Jose Dependency hinzugefügt
- ✅ Environment Variables in Vercel gesetzt
- ❌ OAuth Authentication fehlschlägt (401 Error)

## 🚀 Nächste Schritte

1. **CRITICAL**: Echte OAuth Credentials in Google Cloud Console erstellen
2. **URGENT**: Vercel Environment Variables mit echten Credentials aktualisieren
3. **TEST**: Google Workspace Newsletter Integration testen
4. **DOCUMENT**: OAuth Setup Guide erstellen

## 📋 Wichtige Dateien
- [`README.md`](../README.md) - Hauptdokumentation des Projekts
- [`.github/instructions/AI-Workflow.instructions.md`](../.github/instructions/AI-Workflow.instructions.md) - KI-Arbeitsablauf Anweisungen

