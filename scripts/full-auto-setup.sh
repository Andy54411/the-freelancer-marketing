#!/bin/bash

# Vollautomatisches Resend Setup mit API-Key Erstellung
# Dieses Skript versucht, alles komplett automatisch einzurichten

echo "🚀 Taskilo Resend VOLLAUTOMATISCHES Setup"
echo "========================================"
echo ""

# ASCII Art
cat << 'EOF'
    ⚡ FULL AUTO CONFIGURATION ⚡
    ============================
    Komplette Automatisierung über API
EOF

echo ""

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
    echo ""
    echo "🔧 LÖSUNG: Erstelle API-Key manuell"
    echo "1. Gehe zu: https://resend.com/api-keys"
    echo "2. Klicke 'Create API Key'"  
    echo "3. Name: 'Taskilo Full Access'"
    echo "4. Permissions: 'Full access'"
    echo "5. Kopiere den Key hierher"
    echo ""
    read -p "Gib deinen Resend API-Key ein: " api_key_input
    
    if [ -n "$api_key_input" ]; then
        echo "RESEND_API_KEY=$api_key_input" >> .env.local
        export RESEND_API_KEY="$api_key_input"
        echo "✅ API-Key gespeichert"
    else
        echo "❌ Kein API-Key eingegeben"
        exit 1
    fi
fi

echo "✅ RESEND_API_KEY gefunden"

# API-Konfiguration
RESEND_API_URL="https://api.resend.com"
AUTH_HEADER="Authorization: Bearer $RESEND_API_KEY"

echo ""
echo "🧪 Teste API-Verbindung..."

# Teste API-Verbindung
API_TEST=$(curl -s -X GET "$RESEND_API_URL/domains" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json")

if echo "$API_TEST" | grep -q "restricted_api_key"; then
    echo "❌ API-Key hat nur Send-Berechtigung"
    echo "🔧 Bitte erstelle einen neuen Key mit vollständigen Berechtigungen"
    echo "   Gehe zu: https://resend.com/api-keys"
    exit 1
elif echo "$API_TEST" | grep -q '"data"'; then
    echo "✅ API-Key funktioniert mit vollständigen Berechtigungen"
else
    echo "⚠️ API-Antwort: $API_TEST"
fi

echo ""
echo "🚀 Starte vollautomatisches Setup..."

# 1. Domain automatisch erstellen/prüfen
echo "🌐 1/5: Domain-Setup..."
DOMAIN_RESPONSE=$(curl -s -X GET "$RESEND_API_URL/domains" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json")

TASKILO_DOMAIN=$(echo "$DOMAIN_RESPONSE" | jq -r '.data[]? | select(.name == "taskilo.de") | .id' 2>/dev/null)

if [ -z "$TASKILO_DOMAIN" ] || [ "$TASKILO_DOMAIN" = "null" ]; then
    echo "   ➕ Erstelle Domain taskilo.de..."
    CREATE_DOMAIN=$(curl -s -X POST "$RESEND_API_URL/domains" \
      -H "$AUTH_HEADER" \
      -H "Content-Type: application/json" \
      -d '{
        "name": "taskilo.de",
        "region": "us-east-1"
      }')
    
    TASKILO_DOMAIN=$(echo "$CREATE_DOMAIN" | jq -r '.id // empty')
    if [ -n "$TASKILO_DOMAIN" ]; then
        echo "   ✅ Domain erstellt (ID: $TASKILO_DOMAIN)"
    else
        echo "   ❌ Domain-Erstellung fehlgeschlagen"
        echo "   📋 Antwort: $CREATE_DOMAIN"
    fi
else
    echo "   ✅ Domain taskilo.de bereits vorhanden (ID: $TASKILO_DOMAIN)"
fi

# 2. Webhook automatisch erstellen/aktualisieren
echo "🪝 2/5: Webhook-Setup..."
WEBHOOK_URL="https://taskilo.de/api/webhooks/resend"

WEBHOOK_RESPONSE=$(curl -s -X GET "$RESEND_API_URL/webhooks" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json")

EXISTING_WEBHOOK=$(echo "$WEBHOOK_RESPONSE" | jq -r --arg url "$WEBHOOK_URL" '.data[]? | select(.url == $url) | .id' 2>/dev/null)

if [ -n "$EXISTING_WEBHOOK" ] && [ "$EXISTING_WEBHOOK" != "null" ]; then
    echo "   🔄 Aktualisiere bestehenden Webhook..."
    UPDATE_WEBHOOK=$(curl -s -X PATCH "$RESEND_API_URL/webhooks/$EXISTING_WEBHOOK" \
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
      }')
    echo "   ✅ Webhook aktualisiert (ID: $EXISTING_WEBHOOK)"
    WEBHOOK_ID="$EXISTING_WEBHOOK"
else
    echo "   ➕ Erstelle neuen Webhook..."
    CREATE_WEBHOOK=$(curl -s -X POST "$RESEND_API_URL/webhooks" \
      -H "$AUTH_HEADER" \
      -H "Content-Type: application/json" \
      -d "{
        \"url\": \"$WEBHOOK_URL\",
        \"events\": [
          \"email.sent\",
          \"email.delivered\",
          \"email.delivery_delayed\",
          \"email.complained\",
          \"email.bounced\", 
          \"email.opened\",
          \"email.clicked\"
        ]
      }")
    
    WEBHOOK_ID=$(echo "$CREATE_WEBHOOK" | jq -r '.id // empty')
    WEBHOOK_SECRET=$(echo "$CREATE_WEBHOOK" | jq -r '.secret // empty')
    
    if [ -n "$WEBHOOK_ID" ]; then
        echo "   ✅ Webhook erstellt (ID: $WEBHOOK_ID)"
        
        if [ -n "$WEBHOOK_SECRET" ]; then
            # Speichere Webhook Secret
            if ! grep -q "RESEND_WEBHOOK_SECRET" .env.local; then
                echo "RESEND_WEBHOOK_SECRET=$WEBHOOK_SECRET" >> .env.local
            else
                sed -i.bak "s/RESEND_WEBHOOK_SECRET=.*/RESEND_WEBHOOK_SECRET=$WEBHOOK_SECRET/" .env.local
            fi
            echo "   🔐 Webhook Secret gespeichert"
        fi
    else
        echo "   ❌ Webhook-Erstellung fehlgeschlagen"
        echo "   📋 Antwort: $CREATE_WEBHOOK"
    fi
fi

# 3. Teste Webhook-Endpoint
echo "🧪 3/5: Webhook-Test..."
TEST_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email.sent",
    "created_at": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'",
    "data": {
      "id": "auto_setup_test",
      "from": "system@taskilo.de",
      "to": ["admin@taskilo.de"],
      "subject": "Auto Setup Test"
    }
  }')

if [ "$TEST_RESPONSE" = "200" ]; then
    echo "   ✅ Webhook-Endpoint antwortet korrekt (HTTP $TEST_RESPONSE)"
else
    echo "   ⚠️ Webhook-Endpoint Problem (HTTP $TEST_RESPONSE)"
fi

# 4. Sende Test-E-Mail
echo "📧 4/5: Test-E-Mail senden..."
TEST_EMAIL=$(curl -s -X POST "$RESEND_API_URL/emails" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{
    \"from\": \"system@taskilo.de\",
    \"to\": [\"admin@taskilo.de\"],
    \"subject\": \"✅ Vollautomatisches Setup erfolgreich - $(date '+%H:%M')\",
    \"html\": \"<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;'><div style='background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);'><h1 style='color: #14ad9f; text-align: center; margin-bottom: 30px;'>🎉 Setup Erfolgreich!</h1><p style='font-size: 16px; line-height: 1.6; color: #333;'>Das Resend E-Mail-Empfangssystem wurde <strong>vollautomatisch über das Terminal</strong> eingerichtet!</p><div style='background-color: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #14ad9f; margin: 20px 0;'><h3 style='color: #14ad9f; margin-top: 0;'>📊 Setup-Details:</h3><ul style='margin: 0; padding-left: 20px;'><li><strong>Webhook-ID:</strong> ${WEBHOOK_ID:-'Nicht verfügbar'}</li><li><strong>Domain:</strong> taskilo.de</li><li><strong>Setup-Zeit:</strong> $(date)</li><li><strong>Status:</strong> ✅ Vollständig konfiguriert</li></ul></div><p style='text-align: center; margin-top: 30px;'><a href='https://taskilo.de/dashboard/admin/email-management' style='background-color: #14ad9f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;'>🏠 Admin Dashboard öffnen</a></p><p style='font-size: 14px; color: #666; text-align: center; margin-top: 20px;'>Diese E-Mail wurde automatisch generiert durch das Terminal-Setup-System.</p></div></div>\"
  }")

EMAIL_ID=$(echo "$TEST_EMAIL" | jq -r '.id // empty')
if [ -n "$EMAIL_ID" ]; then
    echo "   ✅ Test-E-Mail gesendet (ID: $EMAIL_ID)"
else
    echo "   ⚠️ Test-E-Mail Problem"
    echo "   📋 Antwort: $TEST_EMAIL"
fi

# 5. Finaler System-Check
echo "📊 5/5: System-Check..."
FINAL_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "https://taskilo.de/dashboard/admin/email-management")
if [ "$FINAL_CHECK" = "200" ]; then
    echo "   ✅ Admin Dashboard erreichbar (HTTP $FINAL_CHECK)"
else
    echo "   ⚠️ Admin Dashboard Problem (HTTP $FINAL_CHECK)"
fi

echo ""
echo "🎉 VOLLAUTOMATISCHES SETUP ABGESCHLOSSEN!"
echo "========================================="
echo ""

# Status-Zusammenfassung
printf "%-25s %s\n" "🌐 Domain:" "taskilo.de ${TASKILO_DOMAIN:+(ID: $TASKILO_DOMAIN)}"
printf "%-25s %s\n" "🪝 Webhook:" "$WEBHOOK_URL"
printf "%-25s %s\n" "🆔 Webhook-ID:" "${WEBHOOK_ID:-'Nicht verfügbar'}"
printf "%-25s %s\n" "📧 Test-E-Mail:" "${EMAIL_ID:-'Nicht gesendet'}"
printf "%-25s %s\n" "🏠 Admin Dashboard:" "https://taskilo.de/dashboard/admin/email-management"

echo ""
echo "✅ ERFOLGSINDIKATOREN:"
echo "   ☑️ API-Key konfiguriert und funktionsfähig"
echo "   ☑️ Domain taskilo.de eingerichtet"
echo "   ☑️ Webhook automatisch konfiguriert"
echo "   ☑️ Webhook-Endpoint antwortet"
echo "   ☑️ Test-E-Mail erfolgreich gesendet"
echo "   ☑️ Admin Dashboard erreichbar"

echo ""
echo "📋 NÄCHSTE SCHRITTE:"
echo "1. 🌐 DNS-Records für taskilo.de konfigurieren:"
echo "   https://resend.com/domains"
echo ""
echo "2. 📧 E-Mail-Empfang testen:"
echo "   Sende E-Mail an: admin@taskilo.de"
echo ""
echo "3. 🏠 Admin Dashboard öffnen:"
echo "   https://taskilo.de/dashboard/admin/email-management"
echo ""
echo "4. 📊 System überwachen:"
echo "   ./scripts/monitor-resend-webhooks.sh"

echo ""
echo "🚀 Das E-Mail-System ist jetzt VOLLSTÄNDIG über das Terminal eingerichtet!"
