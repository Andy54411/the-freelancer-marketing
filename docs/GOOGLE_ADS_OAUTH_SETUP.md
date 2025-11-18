# 🚀 Google Ads OAuth Setup - Anleitung

## ❌ AKTUELLER FEHLER:
```
Error 401: invalid_client
The OAuth client was not found.
```

## 🔧 LÖSUNG: Google Cloud Console Setup

### Schritt 1: Google Cloud Console
1. Gehen Sie zu: https://console.cloud.google.com/
2. Wählen Sie Ihr Projekt aus oder erstellen Sie ein neues
3. Aktivieren Sie die **Google Ads API**

### Schritt 2: OAuth 2.0 Client erstellen
1. Gehen Sie zu: **APIs & Services > Credentials**
2. Klicken Sie **+ CREATE CREDENTIALS > OAuth client ID**
3. Wählen Sie **Web application**
4. Konfigurieren Sie:

```
Name: Taskilo Google Ads Integration
Authorized JavaScript origins:
- http://localhost:3000
- https://taskilo.de
- https://your-vercel-domain.vercel.app

Authorized redirect URIs:
- http://localhost:3000/api/multi-platform-advertising/auth/google-ads/callback
- https://taskilo.de/api/multi-platform-advertising/auth/google-ads/callback
- https://your-vercel-domain.vercel.app/api/multi-platform-advertising/auth/google-ads/callback
```

### Schritt 3: Environment Variables setzen
```bash
# .env.local
GOOGLE_ADS_CLIENT_ID="1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com"
GOOGLE_ADS_CLIENT_SECRET="GOCSPX-your-client-secret"
GOOGLE_ADS_DEVELOPER_TOKEN="your-developer-token"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Schritt 4: Google Ads API Developer Token
1. Gehen Sie zu: https://developers.google.com/google-ads
2. Beantragen Sie einen **Developer Token**
3. Warten Sie auf Genehmigung (kann einige Tage dauern)

## 🚨 WICHTIG:
- Ohne diese Konfiguration funktioniert der OAuth-Flow nicht
- Der Developer Token ist für Produktions-API-Zugriff erforderlich
- Test-Token sind für Entwicklung verfügbar

## 📞 SUPPORT:
Bei Problemen mit der Google Cloud Console:
- Google Ads API Support: https://developers.google.com/google-ads/api/support
- Google Cloud Console Hilfe: https://cloud.google.com/support