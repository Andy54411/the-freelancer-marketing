#!/bin/bash
# Revolut Token Refresh Script
# Läuft alle 30 Minuten via Cron
# Kosten: 0 EUR (Hetzner Cron ist kostenlos)

set -e

LOG_FILE="/var/log/revolut-token-refresh.log"
ENV_FILE="/opt/taskilo/webmail-proxy/.env"
API_KEY="2b5f0cfb074fb7eac0eaa3a7a562ba0a390e2efd0b115d6fa317e932e609e076"
PROXY_URL="http://localhost:3100/api/revolut-proxy/refresh-token"

# Lade aktuellen Refresh Token
source $ENV_FILE

echo "[$(date)] Starting token refresh..." >> $LOG_FILE

# Refresh Token via Proxy
RESPONSE=$(curl -s -X POST \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\": \"$REVOLUT_REFRESH_TOKEN\"}" \
  "$PROXY_URL")

# Prüfe Erfolg
SUCCESS=$(echo $RESPONSE | jq -r '.success')

if [ "$SUCCESS" = "true" ]; then
  NEW_TOKEN=$(echo $RESPONSE | jq -r '.access_token')
  EXPIRES_IN=$(echo $RESPONSE | jq -r '.expires_in')
  
  # Aktualisiere .env Datei
  sed -i "s/REVOLUT_ACCESS_TOKEN=.*/REVOLUT_ACCESS_TOKEN=\"$NEW_TOKEN\"/" $ENV_FILE
  
  echo "[$(date)] Token refreshed successfully. Expires in ${EXPIRES_IN}s" >> $LOG_FILE
else
  ERROR=$(echo $RESPONSE | jq -r '.error // .details // "Unknown error"')
  echo "[$(date)] ERROR: Token refresh failed - $ERROR" >> $LOG_FILE
  exit 1
fi
