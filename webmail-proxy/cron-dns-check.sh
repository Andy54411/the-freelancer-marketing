#!/bin/bash

# DNS Auto-Check Cron Job
# Führt alle 15 Minuten eine DNS-Verifizierung für alle pending Domains durch

API_URL="http://localhost:3100/api/dns/check-pending"
LOG_FILE="/opt/taskilo/logs/dns-check.log"

# Erstelle Log-Verzeichnis falls nicht vorhanden
mkdir -p /opt/taskilo/logs

# Timestamp für Log
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TIMESTAMP] Starting DNS check..." >> "$LOG_FILE"

# API aufrufen
RESPONSE=$(curl -s -X GET "$API_URL")

# Response loggen
echo "[$TIMESTAMP] Response: $RESPONSE" >> "$LOG_FILE"

# Parse Result
CHECKED=$(echo "$RESPONSE" | jq -r '.checked // 0' 2>/dev/null)

echo "[$TIMESTAMP] Checked $CHECKED pending DNS configurations" >> "$LOG_FILE"
echo "----------------------------------------" >> "$LOG_FILE"

exit 0
