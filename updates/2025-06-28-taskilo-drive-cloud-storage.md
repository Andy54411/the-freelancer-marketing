# Taskilo Drive - Cloud-Speicher System

**Datum:** 28. Juni 2025  
**Kategorie:** Feature  
**Betrifft:** Webmail, Admin Dashboard, Hetzner Backend

## Zusammenfassung

Neues Cloud-Speicher-System "Taskilo Drive" implementiert, vergleichbar mit Google Drive. Dateien und Ordner werden auf dem Hetzner-Server mit SQLite-Datenbank gespeichert.

## Neue Features

### 1. Hetzner Backend (DriveService)
- SQLite-Datenbank fuer Benutzer, Ordner und Dateien
- Hierarchische Ordnerstruktur mit Parent-ID
- Soft-Delete mit Papierkorb-Funktion
- Storage-Tracking pro Benutzer

### 2. Speicherplaene
| Plan | Speicher | Preis |
|------|----------|-------|
| Free | 15 GB | kostenlos |
| Plus | 50 GB | 0,99 EUR/Monat |
| Pro | 100 GB | 1,99 EUR/Monat |

### 3. Admin Dashboard
- Neues Dashboard unter `/dashboard/admin/drive`
- Statistiken: Gesamtspeicher, Nutzer, Dateien, Ordner
- Plan-Verteilung mit Fortschrittsbalken
- Benutzerverwaltung mit Plan-Aenderung
- Papierkorb-Bereinigung

### 4. Frontend UI
- Neue Drive-Seite unter `/webmail/drive`
- Grid- und Listenansicht
- Ordner-Navigation mit Breadcrumbs
- Datei-Upload mit Fortschrittsanzeige
- Datei-Vorschau fuer Bilder
- Umbenennen und Loeschen

### 5. API Endpoints

**Benutzer API:**
- `GET /api/webmail/drive/storage` - Speicherinfo
- `GET /api/webmail/drive/folders` - Root-Inhalte
- `GET /api/webmail/drive/folders/[id]/contents` - Ordner-Inhalte
- `POST /api/webmail/drive/folders` - Ordner erstellen
- `PATCH /api/webmail/drive/folders/[id]` - Ordner umbenennen
- `DELETE /api/webmail/drive/folders/[id]` - Ordner loeschen
- `POST /api/webmail/drive/files/upload` - Datei hochladen
- `GET /api/webmail/drive/files/[id]` - Datei herunterladen
- `PATCH /api/webmail/drive/files/[id]` - Datei umbenennen
- `DELETE /api/webmail/drive/files/[id]` - Datei loeschen

**Admin API:**
- `GET /api/webmail/drive/admin/stats` - Gesamtstatistiken
- `GET /api/webmail/drive/admin/users` - Alle Benutzer
- `PATCH /api/webmail/drive/admin/users/[id]/plan` - Plan aendern
- `POST /api/webmail/drive/admin/cleanup` - Papierkorb bereinigen

## Technische Details

- **Backend:** Express.js auf Hetzner (mail.taskilo.de:3100)
- **Datenbank:** SQLite mit better-sqlite3
- **Dateispeicher:** /opt/taskilo/webmail-proxy/data/drive-files/
- **Frontend:** Next.js mit Proxy-Routes zu Hetzner

## Dateien

### Hetzner Backend
- `webmail-proxy/src/services/DriveService.ts`
- `webmail-proxy/src/routes/drive.ts`

### Frontend
- `src/app/webmail/drive/page.tsx`
- `src/services/drive/DriveApiService.ts`
- `src/hooks/useDrive.ts`
- `src/app/api/webmail/drive/*`

### Admin
- `src/app/dashboard/admin/drive/page.tsx`

## Migration

Das System ersetzt die bisherige IndexedDB/localStorage-basierte Speicherung. Bestehende lokale Daten werden nicht automatisch migriert.
