# 🚀 VERCEL LIVE DEPLOYMENT - Google Workspace Fix

## DRINGEND: Live-Seite Google Workspace Konfiguration

### Problem
Die Google Workspace Integration funktioniert nicht auf der Live-Seite (taskilo.de), weil die Umgebungsvariablen in Vercel fehlen.

### Sofortige Lösung für Live-Seite

#### Schritt 1: Vercel Dashboard öffnen
1. Gehen Sie zu [Vercel Dashboard](https://vercel.com/dashboard)
2. Wählen Sie das Tasko-Projekt
3. Gehen Sie zu **Settings** → **Environment Variables**

#### Schritt 2: Google OAuth2-Credentials hinzufügen

Fügen Sie folgende Environment Variables in Vercel hinzu:

```bash
# Production Google Workspace OAuth2
GOOGLE_WORKSPACE_CLIENT_ID = your-client-id.apps.googleusercontent.com
GOOGLE_WORKSPACE_CLIENT_SECRET = your-client-secret  
GOOGLE_WORKSPACE_REDIRECT_URI = https://taskilo.de/api/auth/google/callback

# Newsletter Configuration
NEWSLETTER_FROM_EMAIL = newsletter@taskilo.de
NEWSLETTER_FROM_NAME = Taskilo Team
```

#### Schritt 3: Google Cloud Console - Redirect URI aktualisieren
1. Gehen Sie zur [Google Cloud Console](https://console.cloud.google.com)
2. **APIs & Services** → **Credentials**
3. Wählen Sie Ihren OAuth2-Client
4. Fügen Sie hinzu: `https://taskilo.de/api/auth/google/callback`

#### Schritt 4: Deployment neu starten
Nach dem Hinzufügen der Environment Variables in Vercel:
1. Gehen Sie zu **Deployments**
2. Klicken Sie auf **Redeploy** für das letzte Deployment

### Wichtige URLs für Produktion:
- **Live-Site**: https://taskilo.de
- **OAuth Callback**: https://taskilo.de/api/auth/google/callback
- **Newsletter Admin**: https://taskilo.de/dashboard/admin/newsletter

### Nach der Konfiguration testen:
1. Gehen Sie zu: https://taskilo.de/dashboard/admin/newsletter
2. Klicken Sie auf "Google Workspace verbinden"
3. Der OAuth-Flow sollte funktionieren

### Debug-API für Live-Seite:
```bash
curl https://taskilo.de/api/debug/google-config
```

---

## ⚠️ KRITISCH: Ohne diese Konfiguration funktioniert das Newsletter-System auf der Live-Seite nicht!
