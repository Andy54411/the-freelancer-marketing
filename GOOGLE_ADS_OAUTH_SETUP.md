# Google Ads OAuth Setup - Taskilo Integration

## 🔧 Google Cloud Console Konfiguration

### 1. OAuth Client Konfiguration
- **Projekt**: TASKO (tilvo-f142f)
- **Client ID**: `1022290879475-tr7pp4pr7ildsd0s3sj4tnjir1apn8ch.apps.googleusercontent.com`
- **Client Type**: Web Application

### 2. Autorisierte Redirect URIs
Fügen Sie diese URIs in der Google Cloud Console hinzu:

**Development:**
```
http://localhost:3000/api/google-ads/callback
```

**Production:**
```
https://taskilo.de/api/google-ads/callback
```

### 3. OAuth Scopes
Die folgenden Scopes werden angefordert:
- `https://www.googleapis.com/auth/adwords` (Google Ads API Zugriff)
- `https://www.googleapis.com/auth/userinfo.profile` (Benutzer-Informationen)

## 🔐 Environment Variables

Fügen Sie diese zu Ihrer `.env.local` hinzu:

```bash
# Google OAuth (bereits vorhanden)
GOOGLE_CLIENT_ID=1022290879475-tr7pp4pr7ildsd0s3sj4tnjir1apn8ch.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-[Ihr-Secret]

# Google Ads API (neu)
GOOGLE_ADS_DEVELOPER_TOKEN=[Ihr-Developer-Token]
GOOGLE_ADS_LOGIN_CUSTOMER_ID=[Ihr-Manager-Account-ID]

# Base URLs
NEXT_PUBLIC_BASE_URL=https://taskilo.de
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🚀 OAuth Flow

### 1. Initiierung
```
GET /api/multi-platform-advertising/auth/google-ads?companyId={companyId}
```
**Weiterleitung zu:** Google OAuth mit Scopes `adwords` und `userinfo.profile`

### 2. Callback
```
GET /api/multi-platform-advertising/auth/google-ads/callback?code={code}&state={companyId}
```
**Verarbeitung:**
- Token Exchange
- Google Ads Account-Informationen abrufen
- Verbindung in Firestore speichern
- Weiterleitung zurück zur App

### 3. Erfolg
```
GET /dashboard/company/{companyId}/taskilo-advertising/google-ads?success=connected&account={customerId}
```

## 🛠️ Google Ads API Setup

### Developer Token beantragen
1. Google Ads Account erstellen/verwenden
2. In Google Ads → Tools → API Center
3. Developer Token beantragen
4. **Wichtig**: Für Tests `TEST_TOKEN` verwenden

### Manager Account (Optional)
- Nicht zwingend erforderlich für OAuth
- Nur für erweiterte Account-Verwaltung
- Login Customer ID setzen wenn vorhanden

## 🧪 Testing

### Development Test
```bash
# Server starten
pnpm dev

# Browser öffnen
http://localhost:3000/dashboard/company/[uid]/taskilo-advertising/google-ads

# "Connect Google Ads" klicken
# OAuth Flow durchlaufen
# Erfolgreiche Verbindung prüfen
```

### Debug Console Logs
- ✅ OAuth initiation logs
- 🔄 Token exchange logs  
- 📊 Google Ads API logs
- 💾 Firestore save logs

## 🔍 Troubleshooting

### Häufige Probleme

**1. Redirect URI Error**
```
Error: redirect_uri_mismatch
```
**Lösung**: URI in Google Cloud Console hinzufügen

**2. Invalid Client Error**
```
Error: invalid_client
```
**Lösung**: Client ID/Secret prüfen

**3. Access Denied**
```
Error: access_denied
```
**Lösung**: User hat OAuth abgelehnt (normal)

**4. Developer Token Error**
```
Error: UNAUTHENTICATED
```
**Lösung**: Developer Token korrekt setzen

### Debugging Commands
```bash
# Environment Variables prüfen
echo $GOOGLE_CLIENT_ID
echo $GOOGLE_CLIENT_SECRET

# Logs verfolgen
tail -f .next/server.js.log
```

## 📝 Next Steps

1. **Google Cloud Console**: Redirect URIs hinzufügen
2. **Developer Token**: Bei Google Ads beantragen  
3. **Environment Variables**: Korrekt setzen
4. **Testing**: OAuth Flow durchführen
5. **Production**: Live-Test auf taskilo.de

---

**Statusupdate**: OAuth Flow implementiert mit bestehender Google Cloud Konfiguration. Redirect URIs müssen in Console hinzugefügt werden.