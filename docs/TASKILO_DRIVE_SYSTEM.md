# Taskilo Drive System - Technische Dokumentation

## Uebersicht

Taskilo Drive ist ein Cloud-Speicher-System fuer Taskilo Webmail-Nutzer, gehostet auf dem Hetzner Server (mail.taskilo.de). Das System ermoeglicht Datei- und Ordnerverwaltung aehnlich wie Google Drive.

---

## 1. Architektur

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           VERCEL (taskilo.de)                           │
├─────────────────────────────────────────────────────────────────────────┤
│  Frontend                                                               │
│  ├── /webmail/drive                    # Hauptseite (Root)              │
│  ├── /webmail/drive/folders/[folderId] # Ordner-Ansicht                 │
│  ├── /dashboard/admin/drive            # Admin Dashboard                │
│  └── /api/webmail/drive/*              # API Proxy zu Hetzner           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      HETZNER (mail.taskilo.de)                          │
├─────────────────────────────────────────────────────────────────────────┤
│  Docker: taskilo-webmail-proxy                                          │
│  ├── Express.js API (Port 3100)                                         │
│  ├── SQLite Datenbank (/data/drive.db)                                  │
│  └── Datei-Storage (/data/drive-files/)                                 │
│                                                                         │
│  Docker: taskilo-redis                                                  │
│  └── Session Cache, Rate Limiting                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Speicherplaene

| Plan | Speicher | Preis/Monat | Features |
|------|----------|-------------|----------|
| Free | 15 GB | 0,00 EUR | Basis-Funktionen |
| Plus | 50 GB | 0,99 EUR | + Papierkorb 30 Tage |
| Pro | 100 GB | 1,99 EUR | + Versionierung, Priority Support |

### Speicher-Tracking

```typescript
interface UserStorage {
  userId: string;           // E-Mail Adresse
  plan: 'free' | 'plus' | 'pro';
  storageUsed: number;      // Bytes verwendet
  storageLimit: number;     // Bytes Limit (15GB/50GB/100GB)
  fileCount: number;        // Anzahl Dateien
  folderCount: number;      // Anzahl Ordner
  subscriptionStart?: Date; // Abo-Start (null bei Free)
  subscriptionEnd?: Date;   // Abo-Ende
}
```

---

## 3. Datenbank-Schema (SQLite)

### 3.1 Tabelle: users

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,              -- E-Mail Adresse
  plan TEXT DEFAULT 'free',         -- free | plus | pro
  storage_used INTEGER DEFAULT 0,   -- Bytes
  storage_limit INTEGER DEFAULT 15737418240,  -- 15GB in Bytes
  file_count INTEGER DEFAULT 0,
  folder_count INTEGER DEFAULT 0,
  subscription_start INTEGER,       -- Unix Timestamp
  subscription_end INTEGER,         -- Unix Timestamp
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

### 3.2 Tabelle: folders

```sql
CREATE TABLE folders (
  id TEXT PRIMARY KEY,              -- UUID (z.B. "1BazEG63XiEK0owIhsFK9fistWNhs-6RU")
  user_id TEXT NOT NULL,            -- FK zu users.id
  name TEXT NOT NULL,
  parent_id TEXT,                   -- null = root, sonst folder.id
  is_deleted INTEGER DEFAULT 0,     -- Soft Delete
  deleted_at INTEGER,               -- Wann geloescht
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (parent_id) REFERENCES folders(id)
);

CREATE INDEX idx_folders_user ON folders(user_id);
CREATE INDEX idx_folders_parent ON folders(parent_id);
```

### 3.3 Tabelle: files

```sql
CREATE TABLE files (
  id TEXT PRIMARY KEY,              -- UUID
  user_id TEXT NOT NULL,            -- FK zu users.id
  folder_id TEXT,                   -- null = root, sonst folder.id
  name TEXT NOT NULL,
  mime_type TEXT,
  size INTEGER NOT NULL,            -- Bytes
  storage_path TEXT NOT NULL,       -- Pfad auf Disk: /data/drive-files/{userId}/{fileId}
  is_deleted INTEGER DEFAULT 0,     -- Soft Delete
  deleted_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (folder_id) REFERENCES folders(id)
);

CREATE INDEX idx_files_user ON files(user_id);
CREATE INDEX idx_files_folder ON files(folder_id);
```

### 3.4 Tabelle: file_versions (nur Pro Plan)

```sql
CREATE TABLE file_versions (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (file_id) REFERENCES files(id)
);
```

---

## 4. API Endpoints

### 4.1 Ordner-Verwaltung

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| GET | `/drive/folders` | Root-Ordner und Top-Level Inhalte |
| GET | `/drive/folders/:id` | Ordner-Details |
| GET | `/drive/folders/:id/contents` | Inhalt eines Ordners (Unterordner + Dateien) |
| POST | `/drive/folders` | Neuen Ordner erstellen |
| PATCH | `/drive/folders/:id` | Ordner umbenennen/verschieben |
| DELETE | `/drive/folders/:id` | Ordner loeschen (Soft Delete) |

### 4.2 Datei-Verwaltung

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| POST | `/drive/files/upload` | Datei hochladen (multipart/form-data) |
| GET | `/drive/files/:id` | Datei herunterladen |
| GET | `/drive/files/:id/metadata` | Datei-Metadaten |
| PATCH | `/drive/files/:id` | Datei umbenennen/verschieben |
| DELETE | `/drive/files/:id` | Datei loeschen (Soft Delete) |

### 4.3 Benutzer/Storage

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| GET | `/drive/storage` | Speicherverbrauch des Users |
| GET | `/drive/trash` | Papierkorb-Inhalt |
| POST | `/drive/trash/:id/restore` | Aus Papierkorb wiederherstellen |
| DELETE | `/drive/trash/:id/permanent` | Endgueltig loeschen |

### 4.4 Admin Endpoints

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| GET | `/drive/admin/users` | Alle Drive-Nutzer (Paginiert) |
| GET | `/drive/admin/users/:id` | User-Details inkl. Storage |
| PATCH | `/drive/admin/users/:id/plan` | Plan aendern |
| GET | `/drive/admin/stats` | Gesamtstatistiken |
| POST | `/drive/admin/cleanup` | Alte Papierkorb-Eintraege loeschen |

---

## 5. Request/Response Formate

### 5.1 Ordner erstellen

**Request:**
```json
POST /drive/folders
{
  "name": "Neuer Ordner",
  "parentId": null  // oder Ordner-ID
}
```

**Response:**
```json
{
  "success": true,
  "folder": {
    "id": "1BazEG63XiEK0owIhsFK9fistWNhs-6RU",
    "name": "Neuer Ordner",
    "parentId": null,
    "createdAt": "2025-12-27T10:30:00.000Z",
    "updatedAt": "2025-12-27T10:30:00.000Z"
  }
}
```

### 5.2 Ordner-Inhalt abrufen

**Request:**
```
GET /drive/folders/1BazEG63XiEK0owIhsFK9fistWNhs-6RU/contents
```

**Response:**
```json
{
  "success": true,
  "folder": {
    "id": "1BazEG63XiEK0owIhsFK9fistWNhs-6RU",
    "name": "REFERENZEN Bilder",
    "parentId": null
  },
  "breadcrumbs": [
    { "id": null, "name": "Meine Ablage" },
    { "id": "1BazEG63XiEK0owIhsFK9fistWNhs-6RU", "name": "REFERENZEN Bilder" }
  ],
  "contents": {
    "folders": [
      { "id": "abc123", "name": "Unterordner", "updatedAt": "..." }
    ],
    "files": [
      { "id": "xyz789", "name": "bild.png", "mimeType": "image/png", "size": 123456, "updatedAt": "..." }
    ]
  }
}
```

### 5.3 Datei hochladen

**Request:**
```
POST /drive/files/upload
Content-Type: multipart/form-data

file: [Binary Data]
folderId: "1BazEG63XiEK0owIhsFK9fistWNhs-6RU" (optional)
```

**Response:**
```json
{
  "success": true,
  "file": {
    "id": "xyz789",
    "name": "dokument.pdf",
    "mimeType": "application/pdf",
    "size": 1234567,
    "folderId": "1BazEG63XiEK0owIhsFK9fistWNhs-6RU",
    "createdAt": "2025-12-27T10:35:00.000Z"
  }
}
```

### 5.4 Storage Info

**Request:**
```
GET /drive/storage
```

**Response:**
```json
{
  "success": true,
  "storage": {
    "plan": "free",
    "used": 5368709120,      // 5 GB
    "limit": 15737418240,    // 15 GB
    "usedPercent": 34.1,
    "fileCount": 127,
    "folderCount": 23,
    "formattedUsed": "5.0 GB",
    "formattedLimit": "15.0 GB"
  }
}
```

---

## 6. Admin Dashboard

### 6.1 Seiten-Struktur

```
/dashboard/admin/drive/
├── page.tsx                    # Uebersicht (Statistiken)
├── users/
│   ├── page.tsx               # Benutzer-Liste
│   └── [userId]/
│       └── page.tsx           # Benutzer-Details + Dateien
├── storage/
│   └── page.tsx               # Storage-Analyse
└── settings/
    └── page.tsx               # Drive-Einstellungen
```

### 6.2 Admin Dashboard - Uebersicht

**Statistik-Karten:**
- Gesamtspeicher verwendet / verfuegbar
- Anzahl aktive Nutzer
- Anzahl Dateien / Ordner
- Umsatz (Paid Plans)

**Grafiken:**
- Storage-Nutzung ueber Zeit
- Uploads pro Tag
- Plan-Verteilung (Pie Chart)

### 6.3 Admin Dashboard - Benutzer

**Tabelle:**
| E-Mail | Plan | Speicher | Dateien | Ordner | Registriert | Aktionen |
|--------|------|----------|---------|--------|-------------|----------|
| user@example.com | Free | 2.3/15 GB | 45 | 8 | 01.12.2025 | Details, Plan aendern |

**Aktionen:**
- Plan upgraden/downgraden
- Speicher-Warnung senden
- Account sperren
- Alle Dateien anzeigen

### 6.4 Admin Dashboard - Storage-Analyse

**Features:**
- Groesste Dateien
- Inaktive Accounts (lange nicht eingeloggt)
- Papierkorb-Groesse
- Orphaned Files (Dateien ohne Ordner)

---

## 7. Datei-Struktur auf Hetzner

```
/opt/taskilo/webmail-proxy/
├── data/
│   ├── drive.db                    # SQLite Datenbank
│   └── drive-files/                # Datei-Storage
│       ├── user1@example.com/      # Pro User ein Ordner
│       │   ├── abc123              # Datei (ohne Extension)
│       │   ├── def456
│       │   └── ...
│       └── user2@example.com/
│           └── ...
├── src/
│   ├── routes/
│   │   └── drive.ts
│   └── services/
│       └── DriveService.ts
└── docker-compose.yml
```

---

## 8. Sicherheit

### 8.1 Authentifizierung
- Gleiche Auth wie Webmail (IMAP Credentials)
- API Key fuer Server-zu-Server Kommunikation
- Session-Token fuer Frontend

### 8.2 Autorisierung
- User kann NUR eigene Dateien sehen/bearbeiten
- Admin kann alle Dateien sehen
- Rate Limiting: 100 Requests/Minute

### 8.3 Datei-Validierung
- Max Upload Size: 100 MB (Free), 500 MB (Plus/Pro)
- Verbotene MIME-Types: executable, script
- Virus-Scan (optional, spaeter)

### 8.4 Backup
- Taegliches Backup der SQLite DB
- Datei-Backup auf separatem Volume

---

## 9. Frontend URLs

| URL | Beschreibung |
|-----|--------------|
| `/webmail/drive` | Root-Verzeichnis |
| `/webmail/drive/folders/{folderId}` | Ordner-Inhalt |
| `/webmail/drive/file/{fileId}` | Datei-Vorschau |
| `/webmail/drive/trash` | Papierkorb |
| `/webmail/drive/storage` | Speicher-Uebersicht |
| `/dashboard/admin/drive` | Admin Dashboard |

---

## 10. Implementierungs-Reihenfolge

### Phase 1: Backend (Hetzner)
1. SQLite Datenbank einrichten
2. DriveService.ts erstellen
3. drive.ts Routes implementieren
4. Docker Volume fuer Dateien konfigurieren
5. Deployment auf Hetzner

### Phase 2: Frontend (Vercel)
1. API Proxy Routes erstellen
2. page.tsx auf echte API umstellen
3. Folder-Navigation mit URLs
4. Upload/Download Funktionen

### Phase 3: Admin Dashboard
1. /dashboard/admin/drive Seiten
2. Statistiken
3. Benutzer-Verwaltung

### Phase 4: Billing Integration
1. Stripe Integration fuer Plus/Pro
2. Speicher-Upgrade Flow
3. Automatische Plan-Verwaltung

---

## 11. Geschaetzte Ressourcen

### Hetzner Server
- Aktuell: CX21 (2 vCPU, 4GB RAM, 40GB SSD)
- Empfohlen fuer Drive: CX31 (2 vCPU, 8GB RAM, 80GB SSD) oder zusaetzliches Volume

### Storage Volume
- Storage Box oder Cloud Volume
- 100 GB = ca. 4,65 EUR/Monat (Hetzner)
- 500 GB = ca. 23,25 EUR/Monat

---

## 12. Offene Fragen

1. **Sharing**: Sollen Dateien/Ordner mit anderen geteilt werden koennen?
2. **Oeffentliche Links**: Download-Links fuer externe Personen?
3. **Synchronisation**: Desktop-App fuer Sync?
4. **Vorschau**: Welche Dateitypen sollen Vorschau haben? (PDF, Bilder, Videos)

---

*Dokument erstellt: 27. Dezember 2025*
*Version: 1.0*
