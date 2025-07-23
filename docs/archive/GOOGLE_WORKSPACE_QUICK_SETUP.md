# Google Workspace OAuth Setup - Schnellanleitung

## Problem
Die Google Workspace Integration ist nicht konfiguriert. Es fehlen die OAuth2-Credentials.

## Lösung: Google OAuth2-Credentials einrichten

### Schritt 1: Google Cloud Console
1. Gehen Sie zu [Google Cloud Console](https://console.cloud.google.com)
2. Wählen Sie Ihr Projekt oder erstellen Sie ein neues

### Schritt 2: OAuth2-Client erstellen
1. Navigieren Sie zu: **APIs & Services** → **Credentials**
2. Klicken Sie auf **+ CREATE CREDENTIALS** → **OAuth 2.0 Client IDs**
3. Wählen Sie **Web application**
4. Konfigurieren Sie:
   - **Name**: "Taskilo Newsletter OAuth"
   - **Authorized redirect URIs**: 
     - `http://localhost:3000/api/auth/google/callback` (Development)
     - `https://ihre-domain.com/api/auth/google/callback` (Production)

### Schritt 3: Credentials in .env.local eintragen
```bash
# Ersetzen Sie diese Werte in Ihrer .env.local Datei:
GOOGLE_WORKSPACE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_WORKSPACE_CLIENT_SECRET=your-client-secret
GOOGLE_WORKSPACE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

### Schritt 4: APIs aktivieren
Aktivieren Sie folgende APIs in der Google Cloud Console:
- Gmail API
- Google Sheets API (optional)
- Google Docs API (optional)
- Google Drive API (optional)

## Aktueller Status
Die folgenden Umgebungsvariablen fehlen oder sind falsch konfiguriert:
- `GOOGLE_WORKSPACE_CLIENT_ID` (fehlt oder ungültig)
- `GOOGLE_WORKSPACE_CLIENT_SECRET` (nicht richtig gesetzt)

## Nach der Konfiguration
1. Starten Sie den Development-Server neu: `pnpm dev`
2. Gehen Sie zur Newsletter-Verwaltung
3. Klicken Sie auf "Google Workspace verbinden"
4. Folgen Sie dem OAuth-Flow

## Debug-API
Sie können die aktuelle Konfiguration überprüfen:
```
GET /api/debug/google-config
```
