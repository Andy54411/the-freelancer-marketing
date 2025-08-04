# finAPI Credentials Update - Anleitung

## 🎉 ERFOLG: Neue finAPI Credentials erhalten und bestätigt!

### Status: ✅ ALLE CREDENTIALS GÜLTIG
- FINAPI_SANDBOX_CLIENT_ID: ac54e888-8ccf-40ef-9b92-b27c9dc02f29
- FINAPI_SANDBOX_CLIENT_SECRET: 73689ad2-95e5-4180-93a2-7209ba6e10aa
- FINAPI_ADMIN_CLIENT_ID: a2d8cf0e-c68c-45fa-b4ad-4184a355094e
- FINAPI_ADMIN_CLIENT_SECRET: 478a0e66-8c9a-49ee-84cd-e49d87d077c9

### 📋 Lösung:

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
