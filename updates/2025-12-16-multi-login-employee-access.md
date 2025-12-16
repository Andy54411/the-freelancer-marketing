# Multi-Login System: Mitarbeiter-Dashboard-Zugang

**Datum:** 2025-12-16  
**Typ:** Feature  
**Bereich:** Personal, Authentifizierung, Multi-Login

## Zusammenfassung
Ein vollständiges Multi-Login-System wurde implementiert. Mitarbeiter können mit ihrem bestehenden Taskilo-Account auf das Dashboard ihres Arbeitgebers zugreifen. Der Firma-Admin kann Berechtigungen detailliert festlegen.

## Neue Funktionen

### 1. Multi-Login System
- Ein Benutzer kann sich mit EINEM Account bei mehreren Firmen einloggen
- Automatische Verknüpfung über E-Mail-Adresse
- Keine separate Registrierung erforderlich
- `linkedCompanies` Array im User-Profil

### 2. Berechtigungsbasierter Zugang
Der Admin kann für jeden Mitarbeiter individuell festlegen, welche Sidebar-Menüpunkte sichtbar sind:
- Übersicht
- Kalender
- Personal (Mein Bereich, Dienstplan, Zeiterfassung, Abwesenheit)
- Mitarbeiterverwaltung
- Aufträge / Angebote / Rechnungen
- Kunden
- Workspace
- Finanzen / Ausgaben
- Lager
- Einstellungen

### 3. Drei Berechtigungs-Vorlagen
- **Basis:** Dienstplan, Zeiterfassung, Kalender, Workspace
- **Erweitert:** + Aufträge, Kunden, Auswertungen
- **Manager:** Voller Zugang inkl. Finanzen und Mitarbeiter

### 4. Automatische Account-Verknüpfung
- Bei aktiviertem Dashboard-Zugang sucht das System automatisch nach einem Taskilo-Account mit der Mitarbeiter-E-Mail
- Gefunden: Sofortige Verknüpfung + Benachrichtigungs-E-Mail
- Nicht gefunden: Einladungs-E-Mail zur Registrierung

### 5. Login-Zeit Verknüpfung
- Bei jedem Login wird geprüft, ob neue Firmenverknüpfungen pending sind
- API-Route: `/api/auth/check-company-links`

## Technische Änderungen

### Neue/Geänderte Dateien

#### API Routes
- `src/app/api/company/[uid]/employees/invite/route.ts` - Dashboard-Zugang aktivieren
- `src/app/api/auth/check-company-links/route.ts` - Automatische Verknüpfung beim Login

#### AuthContext
- `LinkedCompany` Interface mit Berechtigungen
- `UserProfile.linkedCompanies` Array
- Automatischer API-Call bei Login für Verknüpfungsprüfung

#### Sidebar-Komponenten
- `EmployeePermissions` Interface exportiert
- `getEmployeeNavigation()` Funktion für dynamische Navigation
- `employeePermissions` Prop für berechtigungsbasierte Navigation

#### Employee Interface
- `dashboardAccess.enabled` statt `registered`
- `dashboardAccess.linkedUserId` für Verknüpfung
- `dashboardAccess.permissions` mit 17 Berechtigungsfeldern

#### EmployeeInviteDialog
- Komplett überarbeitet
- Berechtigungs-Auswahl mit Vorlagen (Basis/Erweitert/Manager)
- Individuelle Checkbox-Steuerung
- Anzeige ob sofort verknüpft oder Einladung gesendet

## E-Mail-Benachrichtigungen
- **Account existiert:** "Dashboard-Zugang aktiviert" mit Login-Link
- **Account existiert nicht:** "Einladung zu Taskilo" mit Registrierungs-Link

## Hinweise
- Mitarbeiter können sich nur auf Company Dashboards zugreifen, bei denen sie verknüpft sind
- Die Berechtigungen können jederzeit vom Admin geändert werden
- Alte `/join/employee` Registrierungsseite wurde entfernt
