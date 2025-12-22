# Admin Authentication Migration: AWS zu Firebase

**Datum:** 22. Dezember 2025  
**Kategorie:** Migration  
**Betrifft:** Admin Dashboard, Authentifizierung

## Zusammenfassung

Das Admin-Authentifizierungssystem wurde von AWS DynamoDB auf Firebase Firestore migriert. Dies vereinfacht die Infrastruktur und eliminiert die Abhaengigkeit von AWS.

## Aenderungen

### Vorher (AWS DynamoDB)
- Login/Verify nutzte AWS DynamoDB Client
- Admin-Users in `taskilo-admin-data` DynamoDB Tabelle
- AWS Credentials erforderlich (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
- Fehler: 500 Server Error wegen AWS Verbindungsproblemen

### Nachher (Firebase Firestore)
- Login/Verify nutzt Firebase Admin SDK
- Admin-Users in `adminUsers` Firestore Collection
- Keine zusaetzlichen Credentials erforderlich (Firebase ist bereits konfiguriert)
- Sichere Passwort-Hashing mit bcryptjs

## Neue Dateien

- [AdminAuthService.ts](src/services/admin/AdminAuthService.ts) - Komplett neuer Service mit Firebase Admin SDK

## Geaenderte Dateien

- [login/route.ts](src/app/api/admin/auth/login/route.ts) - Nutzt jetzt AdminAuthService
- [verify/route.ts](src/app/api/admin/auth/verify/route.ts) - Nutzt jetzt AdminAuthService

## Features

### AdminAuthService
- `login(email, password)` - Anmeldung mit Passwort-Validierung
- `verifyToken(token)` - JWT Token Verifizierung
- `createAdminUser(data)` - Neuen Admin erstellen
- `changePassword(userId, current, new)` - Passwort aendern
- `getAllAdminUsers()` - Alle Admins abrufen
- `toggleUserStatus(userId)` - Admin aktivieren/deaktivieren
- `initializeMasterAdmin()` - Erstellt initialen Master-Admin

### Sicherheit
- Paswoerter werden mit bcryptjs gehasht (Salt-Rounds: 12)
- JWT Tokens mit 24h Ablaufzeit
- Automatische Erstellung des Master-Admins beim ersten Login

## Initialer Master-Admin

Beim ersten Login wird automatisch ein Master-Admin erstellt:
- E-Mail: `andy.staudinger@taskilo.de`
- Passwort: `taskilo2024` (sollte nach erstem Login geaendert werden)
- Rolle: `master-admin`

## Abhangigkeiten

Neue Dependencies hinzugefuegt:
- `bcryptjs` - Passwort-Hashing

## Testen

```bash
# Login testen
curl -X POST http://localhost:3000/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "andy.staudinger@taskilo.de", "password": "taskilo2024"}'
```

## Hinweise

- AWS DynamoDB wird fuer Admin-Auth nicht mehr benoetigt
- Bestehende Admin-Sessions werden invalidiert (Neuanmeldung erforderlich)
- Master-Admin Passwort sollte nach Migration geaendert werden
