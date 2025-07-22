# 🚀 Taskilo Newsletter - Live Site Deployment

## Production Environment Variables für Vercel

Fügen Sie diese Environment Variables in Vercel hinzu:

### Google Workspace Configuration
```env
GOOGLE_WORKSPACE_CLIENT_ID=YOUR_OAUTH2_CLIENT_ID
GOOGLE_WORKSPACE_CLIENT_SECRET=YOUR_OAUTH2_CLIENT_SECRET
GOOGLE_WORKSPACE_REDIRECT_URI=https://taskilo.de/api/auth/google/callback

# Service Account (für automatisierte Newsletter)
GOOGLE_SERVICE_ACCOUNT_EMAIL=taskilo-newsletter-service@tilvo-f142f.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"

# Google Sheets
GOOGLE_SHEETS_NEWSLETTER_ID=YOUR_GOOGLE_SHEETS_ID

# Newsletter Configuration
NEWSLETTER_FROM_EMAIL=newsletter@taskilo.de
NEWSLETTER_FROM_NAME=Taskilo Team
SUPPORT_EMAIL=support@taskilo.de
ADMIN_EMAIL=andy.staudinger@taskilo.de
NOREPLY_EMAIL=noreply@taskilo.de
GOOGLE_WORKSPACE_DOMAIN=taskilo.de
```

## Live-Site Testing URLs

### Newsletter API Endpoints:
- **Newsletter Anmeldung**: `POST https://taskilo.de/api/newsletter/subscribers`
- **Admin Newsletter**: `PUT https://taskilo.de/api/newsletter/subscribers`
- **Newsletter senden**: `POST https://taskilo.de/api/newsletter/send`

### Test-Anfragen:

#### 1. Newsletter-Anmeldung (Footer):
```bash
curl -X POST https://taskilo.de/api/newsletter/subscribers \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "source": "Live Site Footer"
  }'
```

#### 2. Newsletter senden (Admin):
```bash
curl -X POST https://taskilo.de/api/newsletter/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": ["test@example.com"],
    "subject": "Test Newsletter von Taskilo",
    "template": "welcome",
    "variables": {
      "NAME": "Test User",
      "WEBSITE_URL": "https://taskilo.de"
    }
  }'
```

## Browser-Testing

### 1. Footer Newsletter-Anmeldung:
1. Besuchen Sie: https://taskilo.de
2. Scrollen Sie zum Footer
3. E-Mail-Adresse eingeben
4. "Abonnieren" klicken
5. Erfolgsbestätigung prüfen

### 2. Admin Dashboard:
1. Besuchen Sie: https://taskilo.de/dashboard/admin/newsletter
2. Newsletter erstellen und versenden
3. Google Sheets überprüfen

## Monitoring & Debugging

### Vercel Logs überprüfen:
```bash
vercel logs --follow
```

### API Response testen:
```javascript
// Browser Console Testing
fetch('/api/newsletter/subscribers', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    name: 'Browser Test',
    source: 'Live Site Browser'
  })
}).then(r => r.json()).then(console.log)
```

## Google Workspace Live-Setup

### Domain-wide Delegation (Admin erforderlich):
1. https://admin.google.com
2. Security → API Controls → Domain-wide Delegation
3. Client ID: 109480315867268156703
4. Scopes autorisieren

### Google Sheets Permission:
1. Newsletter-Spreadsheet öffnen
2. Service Account hinzufügen: `taskilo-newsletter-service@tilvo-f142f.iam.gserviceaccount.com`
3. Editor-Berechtigung geben

## Status Checklist:

- [ ] Environment Variables in Vercel gesetzt
- [ ] OAuth2 Client für Production-Domain konfiguriert  
- [ ] Domain-wide Delegation aktiviert
- [ ] Google Sheets mit Service Account geteilt
- [ ] Footer Newsletter-Form getestet
- [ ] Admin Newsletter-Dashboard getestet
- [ ] E-Mail-Versendung getestet

Nach dem Deployment können Sie das System live testen!
