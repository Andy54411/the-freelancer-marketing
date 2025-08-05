# DATEV OAuth Proxy Server

Dieser Proxy-Server ist notwendig, um DATEV Sandbox OAuth Callbacks zu handhaben, da DATEV für Confidential Clients nur `http://localhost` (Port 80) als Redirect-URL zulässt.

## Setup

1. **Proxy Server starten** (benötigt sudo für Port 80):
   ```bash
   cd datev-proxy
   sudo node datev-proxy.js
   ```

2. **Next.js App starten** (separates Terminal):
   ```bash
   npm run dev
   ```

3. **DATEV Developer Portal Konfiguration**:
   - Redirect-URL: `http://localhost` (exakt so eintragen)

## Funktionsweise

1. DATEV sendet OAuth Callbacks an `http://localhost` (Port 80)
2. Proxy Server erkennt DATEV-Parameter (`code`, `state`, `error`)  
3. Proxy leitet automatisch weiter zu `http://localhost:3000/api/datev/callback-cookie`
4. Next.js App verarbeitet den Callback normal

## Fehlerbehandlung

- Überprüfe, dass Port 80 nicht von anderen Services belegt ist
- Stoppe Apache/Nginx falls sie Port 80 verwenden: `sudo service apache2 stop`
- Proxy muss mit sudo gestartet werden für Port 80 Zugriff

## Logs

Der Proxy Server zeigt alle eingehenden DATEV Callbacks in der Konsole an.
