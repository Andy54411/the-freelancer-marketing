# Google Workspace Setup für Taskilo Newsletter

## 1. Benötigte E-Mail-Adressen

Erstellen Sie folgende E-Mail-Adressen in Ihrer Google Workspace Admin Console:

### Newsletter & Marketing
- `newsletter@taskilo.com` - Hauptkonto für Newsletter-Versendung
- `marketing@taskilo.com` - Marketing-Kampagnen
- `noreply@taskilo.com` - System-E-Mails

### Support & Service
- `support@taskilo.com` - Kundensupport
- `team@taskilo.com` - Allgemeine Anfragen
- `admin@taskilo.com` - Administrative Anfragen

## 2. Google Cloud Project Setup

### Service Account erstellen:
1. Gehen Sie zur [Google Cloud Console](https://console.cloud.google.com)
2. Erstellen Sie ein neues Projekt oder wählen Sie ein bestehendes
3. Aktivieren Sie folgende APIs:
   - Gmail API
   - Google Sheets API
   - Google Docs API
   - Google Drive API

### Service Account konfigurieren:
```bash
# In Google Cloud Console:
# 1. IAM & Admin → Service Accounts
# 2. Create Service Account
# 3. Name: "Taskilo Newsletter Service"
# 4. Rolle: "Editor" oder spezifische Rollen
```

## 3. OAuth2 Konfiguration

### OAuth2 Client erstellen:
1. APIs & Services → Credentials
2. Create Credentials → OAuth 2.0 Client IDs
3. Application type: Web application
4. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/google/callback` (Development)
   - `https://taskilo.com/api/auth/google/callback` (Production)

## 4. Domain-wide Delegation (für Service Account)

### Delegation aktivieren:
1. Service Account → Keys
2. Download JSON Key
3. Admin Console → Security → API Controls
4. Domain-wide Delegation → Add new
5. Client ID vom Service Account eintragen
6. OAuth Scopes hinzufügen:
   ```
   https://www.googleapis.com/auth/gmail.send
   https://www.googleapis.com/auth/spreadsheets
   https://www.googleapis.com/auth/documents.readonly
   https://www.googleapis.com/auth/drive.readonly
   ```

## 5. Environment Variables

Fügen Sie zu Ihrer `.env.local` hinzu:

```env
# Google Workspace Configuration
GOOGLE_WORKSPACE_CLIENT_ID=your_oauth2_client_id
GOOGLE_WORKSPACE_CLIENT_SECRET=your_oauth2_client_secret
GOOGLE_WORKSPACE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Service Account für automatisierte Newsletter
GOOGLE_SERVICE_ACCOUNT_EMAIL=newsletter-service@your-project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Newsletter Google Sheets
GOOGLE_SHEETS_NEWSLETTER_ID=your_spreadsheet_id

# Newsletter Sender
NEWSLETTER_FROM_EMAIL=newsletter@taskilo.com
NEWSLETTER_FROM_NAME=Taskilo Team
```

## 6. Google Sheets Setup

### Newsletter-Abonnenten Spreadsheet erstellen:
1. Erstellen Sie eine neue Google Sheets Datei
2. Nennen Sie sie "Taskilo Newsletter Abonnenten"
3. Erste Zeile (Header):
   | Timestamp | E-Mail | Name | Präferenzen | Status | Quelle |
4. Teilen Sie die Datei mit dem Service Account
5. Kopieren Sie die Spreadsheet ID aus der URL

## 7. Testing

### Verbindung testen:
```bash
# Im Projekt-Verzeichnis
npm run dev

# Newsletter-API testen:
curl -X POST http://localhost:3000/api/newsletter/subscribers \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User","source":"API Test"}'
```

## 8. Produktionsumgebung

### Vercel/Production Setup:
1. Fügen Sie alle Environment Variables zu Vercel hinzu
2. Aktualisieren Sie die Redirect URI auf Ihre Production-Domain
3. Testen Sie die Newsletter-Anmeldung über den Footer

## 9. Sicherheit

### Wichtige Sicherheitsmaßnahmen:
- Begrenzen Sie die OAuth2 Scopes auf das Minimum
- Verwenden Sie unterschiedliche Service Accounts für verschiedene Umgebungen
- Rotieren Sie regelmäßig die API Keys
- Überwachen Sie die API-Nutzung in der Google Cloud Console

## 10. Monitoring

### API-Limits überwachen:
- Gmail API: 1 Milliarde Quota-Einheiten pro Tag
- Sheets API: 100 Requests pro 100 Sekunden pro Nutzer
- Docs API: 100 Requests pro 100 Sekunden pro Nutzer

Kontaktieren Sie mich, wenn Sie Hilfe bei der technischen Implementierung benötigen!
