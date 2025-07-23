# 🎉 Service Account erfolgreich erstellt!

## ✅ Was wurde automatisch erstellt:

### Service Account Details:
- **Name**: `taskilo-newsletter-service`
- **E-Mail**: `taskilo-newsletter-service@tilvo-f142f.iam.gserviceaccount.com`
- **Client ID**: `109480315867268156703`
- **Projekt**: `tilvo-f142f` (TASKO)
- **Berechtigungen**: Editor-Rolle

### Environment Variables hinzugefügt:
```bash
# Bereits in .env.local konfiguriert:
GOOGLE_SERVICE_ACCOUNT_EMAIL=taskilo-newsletter-service@tilvo-f142f.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
GOOGLE_CLOUD_PROJECT_ID=tilvo-f142f
```

## 🔧 Noch zu erledigen:

### 1. OAuth2 Client erstellen:
```bash
# Google Cloud Console → APIs & Services → Credentials
# Create Credentials → OAuth 2.0 Client IDs
# Web application
# Authorized redirect URIs:
#   - http://localhost:3000/api/auth/google/callback
#   - https://taskilo.de/api/auth/google/callback
```

### 2. Domain-wide Delegation aktivieren:
```bash
# Google Admin Console: https://admin.google.com
# Security → API Controls → Domain-wide Delegation
# Client ID eintragen: 109480315867268156703
# Scopes autorisieren:
#   - https://www.googleapis.com/auth/gmail.send
#   - https://www.googleapis.com/auth/spreadsheets
#   - https://www.googleapis.com/auth/documents.readonly
```

### 3. Google Sheets erstellen:
- Neue Google Sheets: "Taskilo Newsletter Abonnenten"
- Header: Timestamp | E-Mail | Name | Präferenzen | Status | Quelle
- Mit Service Account teilen: `taskilo-newsletter-service@tilvo-f142f.iam.gserviceaccount.com`
- Sheet ID zu .env.local hinzufügen

### 4. OAuth2 Credentials zu .env.local hinzufügen:
```bash
GOOGLE_WORKSPACE_CLIENT_ID=your_oauth2_client_id
GOOGLE_WORKSPACE_CLIENT_SECRET=your_oauth2_client_secret
```

## 📊 Status:
- ✅ APIs aktiviert
- ✅ Service Account erstellt
- ✅ Private Key generiert
- ✅ Environment Variables konfiguriert
- ⏳ OAuth2 Client ausstehend
- ⏳ Domain-wide Delegation ausstehend
- ⏳ Google Sheets ausstehend

## 🧪 Nach Abschluss testen:
```bash
npm run dev
./scripts/setup-google-workspace.sh
```

Newsletter-System ist zu 70% fertig! 🚀
