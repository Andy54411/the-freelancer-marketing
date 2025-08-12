#!/bin/bash

# Intelligente Resend Webhook-Einrichtung mit Dashboard-Integration
# Kombiniert API-Automatisierung mit Dashboard-Anweisungen

echo "🚀 Taskilo Smart Webhook Setup"
echo "============================="
echo ""

# ASCII Art
cat << 'EOF'
    🧠 INTELLIGENT SETUP
    ====================
    API + Dashboard Integration
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
    echo "🔧 Setze API-Key für das Setup:"
    read -p "Gib deinen Resend API-Key ein: " api_key_input
    
    if [ -n "$api_key_input" ]; then
        # Backup und Update
        cp .env.local .env.local.backup
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
WEBHOOK_URL="https://taskilo.de/api/webhooks/resend"

echo ""
echo "🧪 Teste API-Funktionalität..."

# Teste API mit Domain-Aufruf (das funktioniert definitiv)
DOMAIN_TEST=$(curl -s -X GET "$RESEND_API_URL/domains" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json")

if echo "$DOMAIN_TEST" | grep -q "restricted_api_key"; then
    echo "⚠️ API-Key hat nur Send-Berechtigung"
    echo "🔄 Für vollständige Funktionalität benötigst du einen Key mit Domain-Berechtigungen"
elif echo "$DOMAIN_TEST" | grep -q '"data"'; then
    echo "✅ API-Key funktioniert mit erweiterten Berechtigungen"
    
    # Zeige verfügbare Domains
    echo ""
    echo "📋 Verfügbare Domains:"
    echo "$DOMAIN_TEST" | jq -r '.data[]? | "• \(.name) - Status: \(.status) - ID: \(.id)"' 2>/dev/null || echo "Keine Domains gefunden"
    
    # Prüfe taskilo.de
    TASKILO_DOMAIN=$(echo "$DOMAIN_TEST" | jq -r '.data[]? | select(.name == "taskilo.de") | .id' 2>/dev/null)
    
    if [ -n "$TASKILO_DOMAIN" ] && [ "$TASKILO_DOMAIN" != "null" ]; then
        echo "✅ Domain taskilo.de gefunden (ID: $TASKILO_DOMAIN)"
    else
        echo "⚠️ Domain taskilo.de nicht gefunden - muss manuell hinzugefügt werden"
    fi
else
    echo "❌ API-Fehler: $DOMAIN_TEST"
fi

echo ""
echo "🔍 Teste Webhook-Endpoint..."

# Teste unseren Webhook-Endpoint direkt
WEBHOOK_TEST=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email.sent",
    "created_at": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'",
    "data": {
      "id": "smart_setup_test",
      "from": "system@taskilo.de",
      "to": ["admin@taskilo.de"],
      "subject": "Smart Setup Test"
    }
  }')

if [ "$WEBHOOK_TEST" = "200" ]; then
    echo "✅ Webhook-Endpoint antwortet korrekt (HTTP $WEBHOOK_TEST)"
else
    echo "⚠️ Webhook-Endpoint Problem (HTTP $WEBHOOK_TEST)"
fi

echo ""
echo "📧 Sende Test-E-Mail..."

# Teste E-Mail-Versand
TEST_EMAIL=$(curl -s -X POST "$RESEND_API_URL/emails" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{
    \"from\": \"system@taskilo.de\",
    \"to\": [\"admin@taskilo.de\"],
    \"subject\": \"Smart Webhook Setup Test - $(date '+%H:%M')\",
    \"html\": \"<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;'><h1 style='color: #14ad9f; text-align: center;'>🧠 Smart Setup Test</h1><p>Diese E-Mail wurde über das intelligente Terminal-Setup gesendet.</p><div style='background: #f0f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #14ad9f; margin: 20px 0;'><h3 style='color: #14ad9f; margin-top: 0;'>📋 Setup-Status:</h3><p><strong>Webhook-URL:</strong> $WEBHOOK_URL</p><p><strong>Zeit:</strong> $(date)</p><p><strong>Status:</strong> Bereit für Webhook-Konfiguration</p></div><p style='text-align: center;'><a href='https://taskilo.de/dashboard/admin/email-management' style='background: #14ad9f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;'>🏠 Admin Dashboard</a></p></div>\"
  }")

EMAIL_ID=$(echo "$TEST_EMAIL" | jq -r '.id // empty' 2>/dev/null)
if [ -n "$EMAIL_ID" ]; then
    echo "✅ Test-E-Mail erfolgreich gesendet (ID: $EMAIL_ID)"
else
    echo "❌ E-Mail-Versand fehlgeschlagen"
    echo "📋 Antwort: $TEST_EMAIL"
fi

echo ""
echo "🪝 WEBHOOK-KONFIGURATION IM DASHBOARD"
echo "======================================"
echo ""

# Browser öffnen (falls möglich)
if command -v open &> /dev/null; then
    echo "🌐 Öffne Resend Dashboard..."
    open "https://resend.com/webhooks"
    sleep 2
    echo "✅ Browser geöffnet"
else
    echo "🌐 Gehe zu: https://resend.com/webhooks"
fi

echo ""
echo "📝 SCHRITT-FÜR-SCHRITT WEBHOOK-KONFIGURATION:"
echo ""
echo "1️⃣ Klicke 'Add Webhook' im Resend Dashboard"
echo ""
echo "2️⃣ Konfiguriere folgende Einstellungen:"
echo "   ┌─────────────────────────────────────────────────────────────────────┐"
echo "   │ Name:         Taskilo Email Inbox System                            │"
echo "   │ Endpoint URL: $WEBHOOK_URL    │"
echo "   └─────────────────────────────────────────────────────────────────────┘"
echo ""
echo "3️⃣ Wähle diese Events aus:"
echo "   ☑️ email.sent"
echo "   ☑️ email.delivered"
echo "   ☑️ email.delivery_delayed"
echo "   ☑️ email.complained"
echo "   ☑️ email.bounced"
echo "   ☑️ email.opened"
echo "   ☑️ email.clicked"
echo ""
echo "4️⃣ Klicke 'Create Webhook'"
echo ""
echo "5️⃣ WICHTIG: Kopiere das generierte 'Signing Secret'"
echo ""

# Warte auf Webhook Secret
echo "🔐 Webhook Secret eingeben:"
echo "Nach der Webhook-Erstellung im Dashboard:"
read -p "Füge das Webhook Signing Secret hier ein: " webhook_secret

if [ -n "$webhook_secret" ]; then
    # Speichere Webhook Secret
    if ! grep -q "RESEND_WEBHOOK_SECRET" .env.local; then
        echo "RESEND_WEBHOOK_SECRET=$webhook_secret" >> .env.local
    else
        sed -i.bak "s/RESEND_WEBHOOK_SECRET=.*/RESEND_WEBHOOK_SECRET=$webhook_secret/" .env.local
    fi
    echo "✅ Webhook Secret gespeichert"
else
    echo "⚠️ Kein Webhook Secret eingegeben - kann später manuell hinzugefügt werden"
fi

echo ""
echo "🧪 FINALER TEST..."

# Finaler Webhook-Test
echo "📡 Teste Webhook nach Konfiguration..."
FINAL_WEBHOOK_TEST=$(curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email.sent",
    "created_at": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'",
    "data": {
      "id": "final_test_'$(date +%s)'",
      "from": "system@taskilo.de", 
      "to": ["admin@taskilo.de"],
      "subject": "Final Webhook Test",
      "created_at": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"
    }
  }')

echo "📧 Webhook-Test Antwort:"
echo "$FINAL_WEBHOOK_TEST" | jq '.' 2>/dev/null || echo "$FINAL_WEBHOOK_TEST"

# Admin Dashboard Test
ADMIN_TEST=$(curl -s -o /dev/null -w "%{http_code}" "https://taskilo.de/dashboard/admin/email-management")

echo ""
echo "✅ SMART SETUP ABGESCHLOSSEN!"
echo "=============================="
echo ""

printf "%-25s %s\n" "🔗 Webhook-URL:" "$WEBHOOK_URL"
printf "%-25s %s\n" "📧 Test-E-Mail-ID:" "${EMAIL_ID:-'Nicht gesendet'}"
printf "%-25s %s\n" "🌐 Domain Status:" "${TASKILO_DOMAIN:+Konfiguriert (ID: $TASKILO_DOMAIN)}"
printf "%-25s %s\n" "🏠 Admin Dashboard:" "$([ "$ADMIN_TEST" = "200" ] && echo "✅ Erreichbar" || echo "⚠️ HTTP $ADMIN_TEST")"
printf "%-25s %s\n" "🔐 Webhook Secret:" "${webhook_secret:+✅ Gespeichert}"

echo ""
echo "📋 NÄCHSTE SCHRITTE:"
echo ""
echo "1. ✅ Teste E-Mail-Empfang:"
echo "   Sende E-Mail an: admin@taskilo.de"
echo ""
echo "2. 🏠 Öffne Admin Dashboard:"
echo "   https://taskilo.de/dashboard/admin/email-management"
echo ""
echo "3. 📊 Überwache System:"
echo "   ./scripts/monitor-resend-webhooks.sh"
echo ""
echo "4. 🌐 Verwalte Webhooks:"
echo "   https://resend.com/webhooks"

echo ""
echo "🎉 Das E-Mail-Empfangssystem ist jetzt intelligent über Terminal + Dashboard eingerichtet!"
