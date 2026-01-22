# Taskilo Webmail App - Deployment Guide

## 🏗️ Flutter Web App auf Hetzner

Diese Flutter-App wird als statische Web-App auf dem Hetzner Server (`mail.taskilo.de`) gehostet.

## 📍 Speicherorte

- **Lokal**: `/Users/andystaudinger/Tasko/taskilo_webmail_app/`
- **Hetzner**: `/opt/taskilo/webmail-proxy/public/app/`
- **URL**: https://mail.taskilo.de/app/

## 🚀 Deployment

### 1. Full Deployment (Build + Upload)
```bash
./deploy-to-hetzner.sh
```
- Flutter clean
- Flutter pub get
- Flutter build web
- Upload via rsync
- Set permissions

### 2. Quick Deployment (nur Upload)
```bash
./deploy-quick.sh
```
Nutze dies wenn du den Build bereits lokal erstellt hast.

## 🔧 Manuelle Schritte

### Build lokal
```bash
flutter clean
flutter pub get
flutter build web --release
```

### Upload per SCP
```bash
rsync -avz --delete build/web/ root@mail.taskilo.de:/opt/taskilo/webmail-proxy/public/app/
```

### Permissions setzen
```bash
ssh root@mail.taskilo.de "chown -R root:root /opt/taskilo/webmail-proxy/public/app && chmod -R 755 /opt/taskilo/webmail-proxy/public/app"
```

## 🌐 Nginx Configuration

Die App wird über den webmail-proxy Express-Server ausgeliefert. Falls Nginx-Config nötig ist, siehe `nginx-webmail-app.conf`.

## 🔍 Troubleshooting

### App lädt nicht
```bash
# Prüfe ob Dateien vorhanden sind
ssh root@mail.taskilo.de "ls -la /opt/taskilo/webmail-proxy/public/app/"

# Prüfe webmail-proxy Container
ssh root@mail.taskilo.de "docker ps | grep webmail"
ssh root@mail.taskilo.de "docker logs taskilo-webmail-proxy | tail -50"
```

### Nginx 404 Error
Die App muss über den webmail-proxy Express-Server geroutet werden. Falls `/app` nicht funktioniert, prüfe die Express static middleware in `src/server.ts`.

## 📦 Dependencies

- Flutter 3.38.4+
- Node.js (für webmail-proxy)
- Docker (auf Hetzner)

## 🔐 Environment Variables

Die App lädt `.env` aus `assets/.env`. Diese Datei wird beim Build eingebunden.

**Wichtig**: Keine Production-Secrets in die `.env` committen!

## 📝 Git

Das `taskilo_webmail_app/` Verzeichnis ist in der Haupt-Repo `.gitignore` und wird **nicht** ins GitHub-Repo committed. Es ist ein separates Projekt.
