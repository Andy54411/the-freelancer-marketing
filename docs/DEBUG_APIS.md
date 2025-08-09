# Debug APIs Dokumentation für Taskilo Platform

> Letzte Aktualisierung: November 2024 | Status: Aktiv

## Übersicht

Diese Dokumentation listet alle verfügbaren Debug- und Test-APIs im Taskilo-Projekt auf. Diese Endpoints sind für Entwicklung, Debugging und System-Diagnose optimiert.

## Quick Navigation

- [Google Ads Debug APIs](#google-ads-debug-apis)
- [DATEV Debug APIs](#datev-debug-apis)
- [finAPI Debug APIs](#finapi-debug-apis)
- [Admin Debug APIs](#admin-debug-apis)
- [General Debug APIs](#general-debug-apis)
- [Firebase Debug APIs](#firebase-debug-apis)
- [Payment Debug APIs](#payment-debug-apis)
- [Email & Notification Debug APIs](#email--notification-debug-apis)
- [System Testing APIs](#system-testing-apis)& Routes - Taskilo Platform

Diese Dokumentation listet alle verfügbaren Debug-APIs und -Routes im Taskilo-Projekt auf. Diese sind primär für Entwicklung, Debugging und Systemdiagnose gedacht.

## 📋 Inhaltsverzeichnis

- [Google Ads Debug APIs](#-google-ads-debug-apis)
- [DATEV Debug APIs](#-datev-debug-apis)
- [finAPI Debug APIs](#-finapi-debug-apis)
- [Admin Debug APIs](#-admin-debug-apis)
- [General Debug APIs](#-general-debug-apis)
- [Firebase & Database Debug](#-firebase--database-debug)
- [Payment & Stripe Debug](#-payment--stripe-debug)

---

## 🔍 Google Ads Debug APIs

### 1. Google Ads System Diagnose
**Endpoint:** `GET /api/google-ads/diagnose`
**Parameter:** `?detailed=true` für detaillierte Informationen

**Zweck:** Vollständige Systemdiagnose der Google Ads Integration
```bash
curl "https://taskilo.de/api/google-ads/diagnose?detailed=true"
```

**Response:**
```json
{
  "success": true,
  "status": "READY|ERROR|WARNING",
  "description": "System-Status Beschreibung",
  "actionItems": ["Liste der empfohlenen Aktionen"],
  "details": {
    "environment": {...},
    "service": {...},
    "api": {...}
  }
}
```

### 2. Google Ads Firestore Debug
**Endpoint:** `GET /api/google-ads/firestore-debug`
**Parameter:** `?companyId=xxx` (optional)

**Zweck:** Zeigt alle gespeicherten Google Ads Konfigurationen in Firestore
```bash
# Alle Google Ads Konfigurationen
curl "https://taskilo.de/api/google-ads/firestore-debug"

# Spezifische Company
curl "https://taskilo.de/api/google-ads/firestore-debug?companyId=0Rj5vGkBjeXrzZKBr4cFfV0jRuw1"
```

**Response:**
```json
{
  "success": true,
  "totalCompanies": 4,
  "googleAdsConfigs": [
    {
      "companyId": "xxx",
      "data": {...},
      "path": "companies/xxx/integrations/googleAds"
    }
  ],
  "count": 1
}
```

### 3. Google Ads Setup Validation
**Endpoint:** `GET /api/google-ads/validate-setup`

**Zweck:** Validiert Google Ads Environment-Variablen und Konfiguration
```bash
curl "https://taskilo.de/api/google-ads/validate-setup"
```

### 4. Google Ads Connection Status
**Endpoint:** `GET /api/google-ads/status`
**Parameter:** `?companyId=xxx` (required)

**Zweck:** Prüft Verbindungsstatus mit intelligentem Company-ID Lookup
```bash
curl "https://taskilo.de/api/google-ads/status?companyId=tasko_demo_company"
```

---

## 🏢 DATEV Debug APIs

### 1. DATEV Complete Debug
**Endpoint:** `GET /api/datev/debug`

**Zweck:** Vollständige DATEV System-Diagnose
```bash
curl "https://taskilo.de/api/datev/debug"
```

### 2. DATEV OAuth Flow Test
**Endpoint:** `GET /api/datev/debug-oauth-flow`

**Zweck:** Testet den kompletten DATEV OAuth-Flow
```bash
curl "https://taskilo.de/api/datev/debug-oauth-flow"
```

### 3. DATEV Credentials Debug
**Endpoint:** `GET /api/datev/debug-credentials`

**Zweck:** Überprüft DATEV API-Credentials (ohne Secrets preiszugeben)
```bash
curl "https://taskilo.de/api/datev/debug-credentials"
```

### 4. DATEV Token Debug
**Endpoint:** `GET /api/datev/debug-tokens`
**Parameter:** `?companyId=xxx`

**Zweck:** Analysiert DATEV Token-Status
```bash
curl "https://taskilo.de/api/datev/debug-tokens?companyId=xxx"
```

### 5. DATEV PKCE Debug
**Endpoint:** `GET /api/datev/debug-pkce`

**Zweck:** Debuggt PKCE-Parameter für OAuth
```bash
curl "https://taskilo.de/api/datev/debug-pkce"
```

### 6. DATEV Callback Debug
**Endpoint:** `GET /api/datev/debug-callback`

**Zweck:** Simuliert und testet DATEV OAuth-Callback
```bash
curl "https://taskilo.de/api/datev/debug-callback"
```

### 7. DATEV Cookies Debug
**Endpoint:** `GET /api/datev/debug-cookies`

**Zweck:** Überprüft Cookie-basierte DATEV Authentication
```bash
curl "https://taskilo.de/api/datev/debug-cookies"
```

### 8. DATEV OAuth URL Debug
**Endpoint:** `GET /api/datev/debug-oauth-url`

**Zweck:** Generiert und validiert DATEV OAuth-URLs
```bash
curl "https://taskilo.de/api/datev/debug-oauth-url"
```

### 9. DATEV Test APIs
**Endpoint:** `GET /api/datev/test-apis`

**Zweck:** Testet alle verfügbaren DATEV API-Endpunkte
```bash
curl "https://taskilo.de/api/datev/test-apis"
```

### 10. DATEV Sandbox Connection Test
**Endpoint:** `GET /api/datev/test-sandbox-connection`

**Zweck:** Testet Verbindung zur DATEV Sandbox
```bash
curl "https://taskilo.de/api/datev/test-sandbox-connection"
```

---

## 🏦 finAPI Debug APIs

### 1. finAPI Debug (General)
**Endpoint:** `GET /api/finapi/debug`

**Zweck:** Allgemeine finAPI System-Diagnose
```bash
curl "https://taskilo.de/api/finapi/debug"
```

### 2. finAPI Permissions Debug
**Endpoint:** `GET /api/finapi/debug-permissions`

**Zweck:** Überprüft finAPI Berechtigungen und Scopes
```bash
curl "https://taskilo.de/api/finapi/debug-permissions"
```

### 3. finAPI Comprehensive Test
**Endpoint:** `GET /api/finapi/comprehensive-test`

**Zweck:** Umfassender finAPI Funktionstest
```bash
curl "https://taskilo.de/api/finapi/comprehensive-test"
```

### 4. finAPI Test Suite
**Endpoint:** `GET /api/finapi/test-suite`

**Zweck:** Führt komplette finAPI Test-Suite aus
```bash
curl "https://taskilo.de/api/finapi/test-suite"
```

---

## 👨‍💼 Admin Debug APIs

### 1. Admin B2B Debug
**Endpoint:** `GET /api/admin/b2b-debug`

**Zweck:** B2B-System Debugging für Admin-Panel
```bash
curl "https://taskilo.de/api/admin/b2b-debug"
```

### 2. Admin Debug Logs
**Endpoint:** `GET /api/admin/debug-logs`

**Zweck:** Abrufen von System-Debug-Logs
```bash
curl "https://taskilo.de/api/admin/debug-logs"
```

### 3. Admin Transfer Debug
**Endpoint:** `GET /api/admin/debug-transfers`

**Zweck:** Debuggt Stripe Transfer-Probleme
```bash
curl "https://taskilo.de/api/admin/debug-transfers"
```

### 4. Admin Transfer Issue Debug
**Endpoint:** `GET /api/admin/debug-transfer-issue`

**Zweck:** Spezifische Transfer-Problem-Analyse
```bash
curl "https://taskilo.de/api/admin/debug-transfer-issue"
```

### 5. Admin Company Debug
**Endpoint:** `GET /api/admin/companies/[id]/debug`

**Zweck:** Spezifische Company-Debug-Informationen
```bash
curl "https://taskilo.de/api/admin/companies/COMPANY_ID/debug"
```

---

## 🔧 General Debug APIs

### 1. Debug Provider Load
**Endpoint:** `GET /api/debug-provider-load`

**Zweck:** Debuggt Provider-Ladeprobleme
```bash
curl "https://taskilo.de/api/debug-provider-load"
```

### 2. Debug Auth Status
**Endpoint:** `GET /api/debug/auth-status`

**Zweck:** Überprüft Authentication-Status
```bash
curl "https://taskilo.de/api/debug/auth-status"
```

### 3. Debug Environment Variables
**Endpoint:** `GET /api/debug/env`

**Zweck:** Zeigt verfügbare Environment-Variablen (ohne Secrets)
```bash
curl "https://taskilo.de/api/debug/env"
```

### 4. Debug Onboarding Status
**Endpoint:** `GET /api/debug/onboarding-status`

**Zweck:** Überprüft Company-Onboarding-Status
```bash
curl "https://taskilo.de/api/debug/onboarding-status"
```

### 5. Fix Onboarding
**Endpoint:** `POST /api/debug/fix-onboarding`

**Zweck:** Repariert defekte Onboarding-States
```bash
curl -X POST "https://taskilo.de/api/debug/fix-onboarding"
```

---

## 🔥 Firebase & Database Debug

### 1. Firebase Test
**Endpoint:** `GET /firebase-test` (Frontend-Route)

**Zweck:** Testet Firebase-Verbindung und -Funktionalität

### 2. Debug Cookies
**Endpoint:** `GET /debug-cookies` (Frontend-Route)

**Zweck:** Zeigt aktuelle Browser-Cookies für Debugging

---

## 💳 Payment & Stripe Debug

### 1. Stripe Error Monitor
**Endpoint:** `GET /api/stripe-error-monitor`

**Zweck:** Überwacht und analysiert Stripe-Fehler
```bash
curl "https://taskilo.de/api/stripe-error-monitor"
```

### 2. Stripe Logs
**Endpoint:** `GET /api/stripe-logs`

**Zweck:** Abrufen von Stripe-Transaction-Logs
```bash
curl "https://taskilo.de/api/stripe-logs"
```

### 3. Check Webhook Logs
**Endpoint:** `GET /api/check-webhook-logs`

**Zweck:** Überprüft Webhook-Logs und -Status
```bash
curl "https://taskilo.de/api/check-webhook-logs"
```

### 4. Test B2B Webhook
**Endpoint:** `POST /api/test-b2b-webhook`

**Zweck:** Testet B2B-Webhook-Funktionalität
```bash
curl -X POST "https://taskilo.de/api/test-b2b-webhook"
```

---

## 🧪 Weitere Test & Debug Endpoints

### 1. Gemini Test
**Endpoint:** `GET /gemini-test` (Frontend-Route)

**Zweck:** Testet Google Gemini AI-Integration

### 2. Test Provider
**Endpoint:** `GET /api/test-provider`

**Zweck:** Testet Provider-Funktionalität
```bash
curl "https://taskilo.de/api/test-provider"
```

### 3. Test Resend
**Endpoint:** `GET /api/test-resend`

**Zweck:** Testet Resend Email-Service
```bash
curl "https://taskilo.de/api/test-resend"
```

### 4. Test Simple Email
**Endpoint:** `GET /api/test-simple-email`

**Zweck:** Testet einfache Email-Funktionalität
```bash
curl "https://taskilo.de/api/test-simple-email"
```

---

---

## Email & Notification Debug APIs

### Resend Email Testing API
**Endpoint:** `GET/POST /api/test-resend`

Testet die Resend Email Service Konfiguration und Verbindung.

**Features:**
- ✅ API Key Validierung
- ✅ Domain-Test mit bekannter E-Mail
- ✅ Vollständiger E-Mail-Versand-Test
- ✅ Error Handling und Logging

**Beispiel Response:**
```json
{
  "success": true,
  "message": "Resend API Test erfolgreich",
  "testEmailId": "email_id_12345",
  "to": "andy.staudinger@taskilo.de"
}
```

**Debug Features:**
- Console-Logging für API-Aufrufe
- Error-Detail-Reporting
- Test-E-Mail mit HTML-Template

---

## System Testing APIs

### Chat Moderation API
**Endpoint:** `POST /api/chat-moderation`

Moderiert und validiert Chat-Nachrichten mit Gemini AI.

**Features:**
- ✅ AI-basierte Content-Moderation
- ✅ Spam und Abuse Detection
- ✅ Contact-Info Detection (E-Mail, Telefon)
- ✅ Gemini 1.5 Flash Integration

**Request Body:**
```json
{
  "message": "Chat message to moderate",
  "chatId": "chat_12345",
  "senderId": "user_67890"
}
```

**Response:**
```json
{
  "approved": true,
  "reason": null,
  "message": "Message approved for sending"
}
```

### Newsletter Clean Send API
**Endpoint:** `POST /api/newsletter/send-clean`

Sendet bereinigte Newsletter ohne problematische Inhalte.

**Features:**
- ✅ Content-Bereinigung
- ✅ Resend Integration
- ✅ Batch-Versand Support
- ✅ Delivery-Tracking

**Test Example:**
```bash
curl -X POST https://taskilo.de/api/newsletter/send-clean \
  -H "Content-Type: application/json" \
  -d '{"recipient": "test@example.com", "subject": "Newsletter", "content": "HTML content"}'
```

---

## 📊 Status & Monitoring APIs

### 1. AI Config
**Endpoint:** `GET /api/ai-config`

**Zweck:** Zeigt aktuelle AI-Konfiguration
```bash
curl "https://taskilo.de/api/ai-config"
```

### 2. Platform Stats
**Endpoint:** `GET /api/admin/platform-stats`

**Zweck:** Platform-weite Statistiken für Debugging
```bash
curl "https://taskilo.de/api/admin/platform-stats"
```

### 3. Monitoring
**Endpoint:** `GET /api/admin/monitoring`

**Zweck:** System-Monitoring und Health-Checks
```bash
curl "https://taskilo.de/api/admin/monitoring"
```

---

---

## 🔧 Debug Workflow Empfehlungen

### 1. System Health Check
```bash
# 1. Google Ads Status prüfen
curl https://taskilo.de/api/google-ads/status?companyId=YOUR_ID

# 2. DATEV Verbindung testen
curl https://taskilo.de/api/datev/debug/test-connection

# 3. finAPI Status überprüfen
curl https://taskilo.de/api/finapi/debug/status

# 4. E-Mail System testen
curl https://taskilo.de/api/test-resend
```

### 2. Firmen-Debugging
```bash
# Vollständige Firmen-Analyse
curl https://taskilo.de/api/admin/companies/COMPANY_ID/debug

# Onboarding Status prüfen
curl https://taskilo.de/api/debug/onboarding-status?companyUid=COMPANY_ID
```

### 3. Integration Troubleshooting
```bash
# Google Ads Firestore Debug
curl https://taskilo.de/api/google-ads/firestore-debug

# DATEV Advanced Debug
curl https://taskilo.de/api/datev/debug/advanced

# Payment System Check
curl https://taskilo.de/api/payments/debug
```

---

## 🛠️ Verwendungshinweise

### Authentifizierung
Die meisten Admin-APIs erfordern entsprechende Berechtigungen. Stelle sicher, dass du als Admin authentifiziert bist.

### Rate Limiting
Einige APIs haben Rate Limits. Verwende sie sparsam in Produktionsumgebungen.

### Sensitive Daten
Debug-APIs zeigen niemals sensitive Daten wie Passwords, Private Keys oder vollständige Access Tokens an.

### Logging
Alle Debug-API-Aufrufe werden geloggt. Verwende sie verantwortungsvoll.

---

## 📝 Hinzufügen neuer Debug APIs

Beim Hinzufügen neuer Debug-APIs:

1. **Prefix verwenden**: `/api/debug/` für allgemeine Debug-APIs
2. **Sicherheit beachten**: Keine sensitive Daten preisgeben
3. **Dokumentation**: Diese Datei entsprechend aktualisieren
4. **Structured Response**: Konsistente JSON-Response-Struktur verwenden

### Beispiel Debug API Structure:
```typescript
export async function GET(request: NextRequest) {
  try {
    const debugInfo = {
      success: true,
      timestamp: new Date().toISOString(),
      status: 'OK',
      data: {
        // Debug-Informationen hier
      }
    };
    
    return NextResponse.json(debugInfo);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
```

---

**Letzte Aktualisierung:** 9. August 2025
**Version:** 1.0
**Maintainer:** Taskilo Development Team
