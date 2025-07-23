# 🔧 GOOGLE OAUTH CLIENT SETUP - ANLEITUNG

## ❗ PROBLEM: 
Die generierten OAuth-Credentials sind nicht bei Google registriert!
OAuth-Clients müssen über die Google Cloud Console erstellt werden.

## ✅ LÖSUNG: Echte OAuth-Credentials über Google Cloud Console erstellen

### SCHRITT 1: Google Cloud Console öffnen
1. Gehe zu: https://console.cloud.google.com/apis/credentials?project=tilvo-f142f
2. Stelle sicher, dass Projekt "tilvo-f142f" ausgewählt ist

### SCHRITT 2: OAuth-Client erstellen
1. Klicke auf "+ ANMELDEDATEN ERSTELLEN"
2. Wähle "OAuth-Client-ID"
3. Anwendungstyp: "Webanwendung"
4. Name: "Taskilo Newsletter OAuth Client"

### SCHRITT 3: Authorized redirect URIs hinzufügen
```
https://taskilo.vercel.app/api/auth/google-workspace/callback
http://localhost:3000/api/auth/google-workspace/callback
```

### SCHRITT 4: Authorized JavaScript origins hinzufügen
```
https://taskilo.vercel.app
http://localhost:3000
```

### SCHRITT 5: Client-ID und Secret kopieren
Nach dem Erstellen erhältst du:
- Client-ID (endet mit .apps.googleusercontent.com)
- Client-Secret (ca. 24 Zeichen)

### SCHRITT 6: Vercel Environment Variables aktualisieren
```bash
vercel env rm GOOGLE_WORKSPACE_CLIENT_ID production
vercel env rm GOOGLE_WORKSPACE_CLIENT_SECRET production

# Neue echte Credentials hinzufügen:
echo "ECHTE_CLIENT_ID_HIER" | vercel env add GOOGLE_WORKSPACE_CLIENT_ID production
echo "ECHTES_CLIENT_SECRET_HIER" | vercel env add GOOGLE_WORKSPACE_CLIENT_SECRET production
```

## 🚨 WICHTIG:
- Die aktuellen Credentials (1753259666356-c2dc15bbc54d72aa.apps.googleusercontent.com) sind FAKE
- Google erkennt nur Credentials, die über ihre Console erstellt wurden
- Nach dem Setup sollte die OAuth-Verbindung funktionieren

## 📝 NÄCHSTE SCHRITTE:
1. Führe die Schritte 1-5 in der Google Console durch
2. Notiere dir die echten Client-ID und Secret
3. Aktualisiere die Vercel Environment Variables (Schritt 6)
4. Teste die Google Workspace Verbindung erneut
