# 🚨 SOFORTIGER GOOGLE CLOUD CONSOLE FIX

## PROBLEM: Falsche Redirect URIs in Google Cloud Console

Die OAuth Client Konfiguration hat die **FALSCHEN** Redirect URIs!

### ❌ AKTUELL (FALSCH):
```
https://taskilo.vercel.app/api/auth/google-workspace/callback
http://localhost:3000/api/auth/google-workspace/callback
```

### ✅ KORRIGIERT (RICHTIG):
```
https://taskilo.vercel.app/api/auth/google/callback
http://localhost:3000/api/auth/google/callback
```

## SOFORTIGER FIX:

### 1. Google Cloud Console öffnen:
https://console.cloud.google.com/apis/credentials?project=tilvo-f142f

### 2. OAuth Client bearbeiten:
- Client-ID: `1753259666356-c2dc15bbc54d72aa.apps.googleusercontent.com`
- Klicke auf das Bearbeiten-Symbol (Stift)

### 3. Authorized redirect URIs KORRIGIEREN:
**ENTFERNEN:**
- https://taskilo.vercel.app/api/auth/google-workspace/callback
- http://localhost:3000/api/auth/google-workspace/callback

**HINZUFÜGEN:**
- https://taskilo.vercel.app/api/auth/google/callback
- http://localhost:3000/api/auth/google/callback

### 4. SPEICHERN!

## Nach dem Fix:
- Google OAuth sollte funktionieren
- "invalid_client" Fehler verschwindet
- Redirect funktioniert korrekt

## Aktueller Status:
✅ OAuth Credentials sind korrekt
✅ Environment Variables sind gesetzt
❌ Redirect URIs in Google Console sind FALSCH → MUSS GEÄNDERT WERDEN

**DIESER FIX MUSS MANUELL IN DER GOOGLE CLOUD CONSOLE GEMACHT WERDEN!**
