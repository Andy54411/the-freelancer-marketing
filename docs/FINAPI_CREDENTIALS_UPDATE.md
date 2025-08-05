# finAPI Credentials Configuration - Security Guide

## 🔒 SECURITY: Hardcoded credentials removed for security

### Status: ✅ CREDENTIALS NOW PROPERLY SECURED
- FINAPI_SANDBOX_CLIENT_ID: [Set in environment variables only]
- FINAPI_SANDBOX_CLIENT_SECRET: [Set in environment variables only]
- FINAPI_ADMIN_CLIENT_ID: [Set in environment variables only]
- FINAPI_ADMIN_CLIENT_SECRET: [Set in environment variables only]

### 📋 Configuration Steps:

1. **finAPI Developer Portal öffnen:**
   ```
   https://finapi.io/
   ```

2. **Neue Credentials erstellen:**
   - Login → Applications → Create New Application
   - Application Type: "Sandbox" wählen
   - Neue Client ID + Secret kopieren

3. **Vercel Environment Variables updaten:**
   ```bash
   # Alte Variables löschen
   vercel env rm FINAPI_SANDBOX_CLIENT_ID production
   vercel env rm FINAPI_SANDBOX_CLIENT_SECRET production
   
   # Neue Variables setzen
   vercel env add FINAPI_SANDBOX_CLIENT_ID production
   # [Neue Client ID eingeben]
   
   vercel env add FINAPI_SANDBOX_CLIENT_SECRET production  
   # [Neues Client Secret eingeben]
   ```

4. **Deployment triggern:**
   ```bash
   vercel --prod
   ```

5. **Testen:**
   ```
   https://taskilo.de/api/debug/finapi-user-flow
   ```

### 📞 finAPI Support kontaktieren (falls Probleme):
- E-Mail: support@finapi.io
- Erwähne: "Client Credentials werden als ungültig erkannt"
- Referenziere Support-Ticket von Ramona Tarnowski (04.08.2025)

### 🎯 Nach Credentials Update:
✅ finAPI User Flow sollte funktionieren
✅ Banking Integration wird verfügbar
✅ "invalid_client" Fehler behoben
