# Taskilo Webmail Proxy

Standalone IMAP/SMTP Proxy Server für Taskilo Webmail - läuft auf Hetzner.

## Warum dieser Proxy?

- **Reduziert Vercel-Kosten**: IMAP-Verbindungen sind langlaufende Prozesse
- **Bessere Performance**: Direkter Server statt Serverless Cold Starts  
- **Keine Timeout-Limits**: Vercel hat 30s Limit, Hetzner nicht

## Installation auf Hetzner

### 1. Server vorbereiten

```bash
# SSH zum Server
ssh root@your-hetzner-ip

# Updates installieren
apt update && apt upgrade -y

# Docker installieren
curl -fsSL https://get.docker.com | sh

# Docker Compose installieren
apt install docker-compose-plugin -y
```

### 2. Projekt deployen

```bash
# Ordner erstellen
mkdir -p /opt/taskilo
cd /opt/taskilo

# Repository klonen (oder Dateien kopieren)
git clone https://github.com/your-repo/webmail-proxy.git
cd webmail-proxy

# Environment-Datei erstellen
cp .env.example .env
nano .env  # API Key setzen!
```

### 3. Mit Docker starten

```bash
# Container bauen und starten
docker compose up -d

# Logs prüfen
docker compose logs -f

# Status prüfen
curl http://localhost:3100/health
```

### 4. Nginx Reverse Proxy (optional, für HTTPS)

```nginx
server {
    listen 443 ssl http2;
    server_name webmail-api.taskilo.de;
    
    ssl_certificate /etc/letsencrypt/live/webmail-api.taskilo.de/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/webmail-api.taskilo.de/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }
}
```

### 5. SSL mit Certbot

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d webmail-api.taskilo.de
```

## Lokale Entwicklung

```bash
# Dependencies installieren
pnpm install

# Development Server starten
pnpm dev

# Build für Production
pnpm build

# Production Server starten
pnpm start
```

## API Endpoints

Alle Endpoints erfordern den Header `X-API-Key` mit dem konfigurierten API-Schlüssel.

| Endpoint | Method | Beschreibung |
|----------|--------|--------------|
| `/health` | GET | Health Check (kein API Key nötig) |
| `/api/mailboxes` | POST | Mailboxen abrufen |
| `/api/messages` | POST | Nachrichten abrufen |
| `/api/message` | POST | Einzelne Nachricht abrufen |
| `/api/send` | POST | E-Mail senden |
| `/api/actions` | POST | Aktionen (löschen, verschieben, etc.) |
| `/api/test` | POST | Verbindung testen |

## Beispiel Request

```bash
curl -X POST https://webmail-api.taskilo.de/api/mailboxes \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"email": "user@taskilo.de", "password": "secret"}'
```

## PM2 Alternative (ohne Docker)

```bash
# PM2 installieren
npm install -g pm2

# Build
pnpm build

# Mit PM2 starten
pm2 start dist/server.js --name webmail-proxy

# Autostart konfigurieren
pm2 startup
pm2 save
```

## Monitoring

```bash
# Docker Logs
docker compose logs -f webmail-proxy

# PM2 Logs
pm2 logs webmail-proxy

# Health Check
curl http://localhost:3100/health
```
