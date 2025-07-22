# Taskilo Google Workspace - Konfigurationsstatus
# ================================================

## ✅ Erstellte E-Mail-Adressen

| E-Mail | Zweck | Status |
|--------|-------|--------|
| `newsletter@taskilo.de` | Newsletter-Versendung | ✅ Erstellt |
| `support@taskilo.de` | Kundensupport | ✅ Erstellt |
| `noreply@taskilo.de` | System-E-Mails | ✅ Erstellt |
| `andy.staudinger@taskilo.de` | Admin | ✅ Erstellt |

## 🔧 Nächste Schritte

### 1. Google Cloud Project Setup
```bash
# Öffnen Sie: https://console.cloud.google.com
# 1. Neues Projekt erstellen: "Taskilo Newsletter"
# 2. Projekt-ID notieren (z.B.: taskilo-newsletter-123456)
```

### 2. APIs aktivieren
Gehen Sie zu "APIs & Services" → "Library" und aktivieren Sie:
- [x] Gmail API
- [x] Google Sheets API  
- [x] Google Docs API
- [x] Google Drive API

### 3. Service Account erstellen
```bash
# IAM & Admin → Service Accounts → Create Service Account
# Name: taskilo-newsletter-service
# Description: Service Account for automated newsletter sending
# Rolle: Editor oder spezifische Gmail/Sheets Rollen
```

### 4. OAuth2 Client erstellen
```bash
# APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client IDs
# Application type: Web application
# Name: Taskilo Newsletter OAuth
# Authorized redirect URIs:
#   - http://localhost:3000/api/auth/google/callback
#   - https://taskilo.de/api/auth/google/callback
```

### 5. Domain-wide Delegation aktivieren
```bash
# Service Account → Enable Domain-wide Delegation
# OAuth Scopes hinzufügen:
#   - https://www.googleapis.com/auth/gmail.send
#   - https://www.googleapis.com/auth/spreadsheets
#   - https://www.googleapis.com/auth/documents.readonly
```

### 6. Google Workspace Admin Setup
```bash
# Google Admin Console: https://admin.google.com
# Security → API Controls → Domain-wide Delegation
# Client ID vom Service Account eintragen
# Scopes autorisieren
```

## 📋 Benötigte Credentials

Nach dem Setup sammeln Sie folgende Informationen:

```env
# OAuth2 Client
GOOGLE_WORKSPACE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_WORKSPACE_CLIENT_SECRET=GOCSPX-xxxxxxxxxx

# Service Account
GOOGLE_SERVICE_ACCOUNT_EMAIL=taskilo-newsletter-service@taskilo-newsletter-123456.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Newsletter Setup
NEWSLETTER_FROM_EMAIL=newsletter@taskilo.de
NEWSLETTER_FROM_NAME=Taskilo Team
```

## 🧪 Testing

Sobald konfiguriert, testen Sie mit:
```bash
./scripts/setup-google-workspace.sh
```

Status: 🟡 E-Mails erstellt, Google Cloud Setup ausstehend
