#!/bin/bash

# Resend-Konfigurationsskript für Taskilo
# Dieses Skript konfiguriert alle Resend-Einstellungen über die API

echo "🚀 Taskilo Resend-Konfiguration gestartet..."

# Lade Umgebungsvariablen
if [ -f .env.local ]; then
    source .env.local
    echo "✅ Umgebungsvariablen geladen"
else
    echo "❌ .env.local Datei nicht gefunden"
    exit 1
fi

# Prüfe API-Key
if [ -z "$RESEND_API_KEY" ]; then
    echo "❌ RESEND_API_KEY nicht gesetzt"
    exit 1
fi

echo "✅ RESEND_API_KEY gefunden"

# Basis-URL und Header für Resend API
RESEND_API_URL="https://api.resend.com"
AUTH_HEADER="Authorization: Bearer $RESEND_API_KEY"

echo ""
echo "📋 1. Aktuelle Domains abfragen..."
curl -s -X GET "$RESEND_API_URL/domains" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" | jq '.'

echo ""
echo "📋 2. Aktuelle Webhooks abfragen..."
curl -s -X GET "$RESEND_API_URL/webhooks" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" | jq '.'

echo ""
echo "🔧 3. Webhook für eingehende E-Mails konfigurieren..."

# Webhook-URL für eingehende E-Mails
WEBHOOK_URL="https://taskilo.de/api/webhooks/resend"

# Prüfe ob Webhook bereits existiert
EXISTING_WEBHOOK=$(curl -s -X GET "$RESEND_API_URL/webhooks" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" | jq -r --arg url "$WEBHOOK_URL" '.data[] | select(.url == $url) | .id')

if [ "$EXISTING_WEBHOOK" != "null" ] && [ -n "$EXISTING_WEBHOOK" ]; then
    echo "⚠️ Webhook bereits vorhanden (ID: $EXISTING_WEBHOOK)"
    
    # Webhook aktualisieren
    echo "🔄 Aktualisiere bestehenden Webhook..."
    curl -s -X PATCH "$RESEND_API_URL/webhooks/$EXISTING_WEBHOOK" \
      -H "$AUTH_HEADER" \
      -H "Content-Type: application/json" \
      -d '{
        "events": [
          "email.sent",
          "email.delivered",
          "email.delivery_delayed",
          "email.complained",
          "email.bounced",
          "email.opened",
          "email.clicked"
        ]
      }' | jq '.'
else
    echo "➕ Erstelle neuen Webhook..."
    curl -s -X POST "$RESEND_API_URL/webhooks" \
      -H "$AUTH_HEADER" \
      -H "Content-Type: application/json" \
      -d '{
        "url": "'$WEBHOOK_URL'",
        "events": [
          "email.sent",
          "email.delivered",
          "email.delivery_delayed",
          "email.complained",
          "email.bounced",
          "email.opened",
          "email.clicked"
        ]
      }' | jq '.'
fi

echo ""
echo "📧 4. Domain-Konfiguration prüfen..."

# Prüfe ob taskilo.de Domain konfiguriert ist
DOMAIN_EXISTS=$(curl -s -X GET "$RESEND_API_URL/domains" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" | jq -r '.data[] | select(.name == "taskilo.de") | .id')

if [ "$DOMAIN_EXISTS" != "null" ] && [ -n "$DOMAIN_EXISTS" ]; then
    echo "✅ Domain taskilo.de bereits konfiguriert (ID: $DOMAIN_EXISTS)"
    
    # Domain-Details anzeigen
    echo "📊 Domain-Details:"
    curl -s -X GET "$RESEND_API_URL/domains/$DOMAIN_EXISTS" \
      -H "$AUTH_HEADER" \
      -H "Content-Type: application/json" | jq '.'
      
else
    echo "⚠️ Domain taskilo.de nicht gefunden"
    echo "ℹ️ Füge Domain manuell über das Resend Dashboard hinzu: https://resend.com/domains"
fi

echo ""
echo "📨 5. Test-E-Mail für Webhook senden..."

# Sende Test-E-Mail um Webhook zu testen
curl -s -X POST "$RESEND_API_URL/emails" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "system@taskilo.de",
    "to": ["admin@taskilo.de"],
    "subject": "Resend Webhook Test - Taskilo Admin",
    "html": "<h1>Webhook Test</h1><p>Diese E-Mail testet die Webhook-Konfiguration für das Taskilo Admin Email Management System.</p><p>Gesendet am: '$(date)'</p>"
  }' | jq '.'

echo ""
echo "🔍 6. API-Limits und Account-Info abfragen..."
curl -s -X GET "$RESEND_API_URL/emails" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" | jq '.data | length' | xargs -I {} echo "📊 Gesendete E-Mails in letzter Zeit: {}"

echo ""
echo "✅ Resend-Konfiguration abgeschlossen!"
echo ""
echo "📋 Nächste Schritte:"
echo "1. Prüfe das Taskilo Admin Dashboard unter: https://taskilo.de/dashboard/admin/email-management"
echo "2. Teste eingehende E-Mails an: admin@taskilo.de"
echo "3. Überwache Webhook-Logs in der Browser-Konsole"
echo "4. Bei Problemen prüfe die API-Route: /api/webhooks/resend"
echo ""
echo "🔗 Resend Dashboard: https://resend.com/webhooks"
echo "🔗 Taskilo Admin: https://taskilo.de/dashboard/admin"
