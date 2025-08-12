#!/bin/bash

# Automatische Resend Webhook-Einrichtung über Terminal
# Dieses Skript richtet den Webhook komplett automatisch ein

echo "🚀 Taskilo Resend Webhook Auto-Setup"
echo "====================================="
echo ""

# ASCII Art
cat << 'EOF'
    🔗 WEBHOOK AUTO-CONFIGURATION
    =============================
    Automatische Einrichtung über Resend API
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
    echo "💡 Setze deinen Resend API-Key in .env.local"
    exit 1
fi

echo "✅ RESEND_API_KEY gefunden"

# API-Konfiguration
RESEND_API_URL="https://api.resend.com"
AUTH_HEADER="Authorization: Bearer $RESEND_API_KEY"
WEBHOOK_URL="https://taskilo.de/api/webhooks/resend"
WEBHOOK_NAME="Taskilo Email Inbox System"

echo ""
echo "🔍 Prüfe API-Key Berechtigungen..."

# Teste API-Key Berechtigungen durch Domains-Aufruf
DOMAIN_TEST=$(curl -s -X GET "$RESEND_API_URL/domains" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json")

if echo "$DOMAIN_TEST" | grep -q "restricted_api_key"; then
    echo "⚠️ Aktueller API-Key hat nur Send-Berechtigung"
    echo ""
    echo "🔧 LÖSUNG: Erstelle neuen API-Key mit vollständigen Berechtigungen"
    echo "1. Gehe zu: https://resend.com/api-keys"
    echo "2. Klicke 'Create API Key'"
    echo "3. Name: 'Taskilo Full Access'"
    echo "4. Permissions: Wähle 'Full access' oder alle einzelnen Berechtigungen"
    echo "5. Kopiere den neuen Key in deine .env.local Datei"
    echo ""
    echo "🎯 Benötigte Berechtigungen:"
    echo "   - Send emails"
    echo "   - Manage domains" 
    echo "   - Manage webhooks"
    echo "   - View analytics"
    echo ""
    
    read -p "Hast du einen neuen API-Key mit vollständigen Berechtigungen? (y/N): " has_full_key
    
    if [[ $has_full_key =~ ^[Yy]$ ]]; then
        read -p "Bitte gib den neuen API-Key ein: " new_api_key
        if [ -n "$new_api_key" ]; then
            # Backup alte .env.local
            cp .env.local .env.local.backup
            # Ersetze API-Key in .env.local
            sed -i.bak "s/RESEND_API_KEY=.*/RESEND_API_KEY=$new_api_key/" .env.local
            echo "✅ API-Key aktualisiert"
            source .env.local
            AUTH_HEADER="Authorization: Bearer $RESEND_API_KEY"
        else
            echo "❌ Kein API-Key eingegeben. Setup abgebrochen."
            exit 1
        fi
    else
        echo "❌ Setup abgebrochen. Erstelle zuerst einen API-Key mit vollständigen Berechtigungen."
        exit 1
    fi
fi

echo ""
echo "🌐 Prüfe Domain-Status..."

# Prüfe Domains
DOMAINS_RESPONSE=$(curl -s -X GET "$RESEND_API_URL/domains" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json")

echo "📋 Verfügbare Domains:"
echo "$DOMAINS_RESPONSE" | jq -r '.data[]? | "• \(.name) - Status: \(.status)"' 2>/dev/null || echo "Keine Domains gefunden oder API-Fehler"

# Prüfe ob taskilo.de existiert
TASKILO_DOMAIN=$(echo "$DOMAINS_RESPONSE" | jq -r '.data[]? | select(.name == "taskilo.de") | .id' 2>/dev/null)

if [ -n "$TASKILO_DOMAIN" ] && [ "$TASKILO_DOMAIN" != "null" ]; then
    echo "✅ Domain taskilo.de gefunden (ID: $TASKILO_DOMAIN)"
else
    echo "⚠️ Domain taskilo.de nicht gefunden"
    echo ""
    echo "🔧 Erstelle Domain automatisch..."
    
    CREATE_DOMAIN_RESPONSE=$(curl -s -X POST "$RESEND_API_URL/domains" \
      -H "$AUTH_HEADER" \
      -H "Content-Type: application/json" \
      -d '{
        "name": "taskilo.de",
        "region": "us-east-1"
      }')
    
    echo "📧 Domain-Erstellung Antwort:"
    echo "$CREATE_DOMAIN_RESPONSE" | jq '.' 2>/dev/null || echo "$CREATE_DOMAIN_RESPONSE"
    
    # Extrahiere Domain-ID
    TASKILO_DOMAIN=$(echo "$CREATE_DOMAIN_RESPONSE" | jq -r '.id // empty' 2>/dev/null)
    
    if [ -n "$TASKILO_DOMAIN" ]; then
        echo "✅ Domain taskilo.de erfolgreich erstellt (ID: $TASKILO_DOMAIN)"
        echo ""
        echo "⚠️ WICHTIG: Konfiguriere DNS-Records für die Domain!"
        echo "   Gehe zu: https://resend.com/domains/$TASKILO_DOMAIN"
        echo "   Kopiere die DNS-Records und füge sie zu deinem DNS-Provider hinzu"
    else
        echo "❌ Fehler beim Erstellen der Domain"
    fi
fi

echo ""
echo "🪝 Konfiguriere Webhook..."

# Prüfe bestehende Webhooks
WEBHOOKS_RESPONSE=$(curl -s -X GET "$RESEND_API_URL/webhooks" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json")

echo "📋 Bestehende Webhooks:"
echo "$WEBHOOKS_RESPONSE" | jq -r '.data[]? | "• \(.url) - Events: \(.events | join(", "))"' 2>/dev/null || echo "Keine Webhooks gefunden"

# Prüfe ob unser Webhook bereits existiert
EXISTING_WEBHOOK=$(echo "$WEBHOOKS_RESPONSE" | jq -r --arg url "$WEBHOOK_URL" '.data[]? | select(.url == $url) | .id' 2>/dev/null)

if [ -n "$EXISTING_WEBHOOK" ] && [ "$EXISTING_WEBHOOK" != "null" ]; then
    echo "⚠️ Webhook bereits vorhanden (ID: $EXISTING_WEBHOOK)"
    echo ""
    read -p "Möchtest du den bestehenden Webhook aktualisieren? (y/N): " update_webhook
    
    if [[ $update_webhook =~ ^[Yy]$ ]]; then
        echo "🔄 Aktualisiere bestehenden Webhook..."
        
        UPDATE_RESPONSE=$(curl -s -X PATCH "$RESEND_API_URL/webhooks/$EXISTING_WEBHOOK" \
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
        
        echo "📧 Webhook-Update Antwort:"
        echo "$UPDATE_RESPONSE" | jq '.' 2>/dev/null || echo "$UPDATE_RESPONSE"
        
        WEBHOOK_ID="$EXISTING_WEBHOOK"
    else
        echo "⏭️ Überspringe Webhook-Konfiguration"
        WEBHOOK_ID="$EXISTING_WEBHOOK"
    fi
else
    echo "➕ Erstelle neuen Webhook..."
    
    CREATE_WEBHOOK_RESPONSE=$(curl -s -X POST "$RESEND_API_URL/webhooks" \
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
    
    echo "📧 Webhook-Erstellung Antwort:"
    echo "$CREATE_WEBHOOK_RESPONSE" | jq '.' 2>/dev/null || echo "$CREATE_WEBHOOK_RESPONSE"
    
    # Extrahiere Webhook-ID und Secret
    WEBHOOK_ID=$(echo "$CREATE_WEBHOOK_RESPONSE" | jq -r '.id // empty' 2>/dev/null)
    WEBHOOK_SECRET=$(echo "$CREATE_WEBHOOK_RESPONSE" | jq -r '.secret // empty' 2>/dev/null)
    
    if [ -n "$WEBHOOK_ID" ]; then
        echo "✅ Webhook erfolgreich erstellt (ID: $WEBHOOK_ID)"
        
        if [ -n "$WEBHOOK_SECRET" ]; then
            echo "🔐 Webhook Secret: $WEBHOOK_SECRET"
            echo ""
            echo "💾 Speichere Webhook Secret in .env.local..."
            
            # Füge Webhook Secret zur .env.local hinzu
            if ! grep -q "RESEND_WEBHOOK_SECRET" .env.local; then
                echo "RESEND_WEBHOOK_SECRET=$WEBHOOK_SECRET" >> .env.local
                echo "✅ Webhook Secret gespeichert"
            else
                sed -i.bak "s/RESEND_WEBHOOK_SECRET=.*/RESEND_WEBHOOK_SECRET=$WEBHOOK_SECRET/" .env.local
                echo "✅ Webhook Secret aktualisiert"
            fi
        fi
    else
        echo "❌ Fehler beim Erstellen des Webhooks"
        exit 1
    fi
fi

echo ""
echo "🧪 Teste Webhook-Konfiguration..."

# Teste Webhook mit Mock-Event
TEST_EVENT='{
  "type": "email.sent",
  "created_at": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'",
  "data": {
    "id": "test_'$(date +%s)'",
    "from": "system@taskilo.de",
    "to": ["admin@taskilo.de"],
    "subject": "Webhook Test - Auto Setup",
    "created_at": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"
  }
}'

echo "📡 Sende Test-Event an Webhook..."
WEBHOOK_TEST_RESPONSE=$(curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "$TEST_EVENT")

echo "📧 Webhook-Test Antwort:"
echo "$WEBHOOK_TEST_RESPONSE" | jq '.' 2>/dev/null || echo "$WEBHOOK_TEST_RESPONSE"

# Teste echte E-Mail senden
echo ""
echo "📨 Sende Test-E-Mail..."

TEST_EMAIL_RESPONSE=$(curl -s -X POST "$RESEND_API_URL/emails" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{
    \"from\": \"system@taskilo.de\",
    \"to\": [\"admin@taskilo.de\"],
    \"subject\": \"Webhook Auto-Setup Test - $(date)\",
    \"html\": \"<div style='font-family: Arial; padding: 20px;'><h1 style='color: #14ad9f;'>🎉 Webhook Auto-Setup erfolgreich!</h1><p>Diese E-Mail wurde automatisch über das Terminal-Setup gesendet.</p><p><strong>Setup-Zeit:</strong> $(date)</p><p><strong>Webhook-ID:</strong> $WEBHOOK_ID</p><p>Das E-Mail-Empfangssystem ist jetzt vollständig konfiguriert!</p></div>\"
  }")

echo "📧 Test-E-Mail Antwort:"
echo "$TEST_EMAIL_RESPONSE" | jq '.' 2>/dev/null || echo "$TEST_EMAIL_RESPONSE"

EMAIL_ID=$(echo "$TEST_EMAIL_RESPONSE" | jq -r '.id // empty' 2>/dev/null)

echo ""
echo "✅ WEBHOOK AUTO-SETUP ABGESCHLOSSEN!"
echo "======================================"
echo ""

printf "%-25s %s\n" "🔗 Webhook-URL:" "$WEBHOOK_URL"
printf "%-25s %s\n" "🆔 Webhook-ID:" "${WEBHOOK_ID:-'Nicht gefunden'}"
printf "%-25s %s\n" "📧 Test-E-Mail-ID:" "${EMAIL_ID:-'Nicht gesendet'}"
printf "%-25s %s\n" "🌐 Domain:" "taskilo.de"

echo ""
echo "📋 Nächste Schritte:"
echo "1. ✅ Prüfe Admin Dashboard: https://taskilo.de/dashboard/admin/email-management"
echo "2. ✅ Teste E-Mail-Empfang: Sende E-Mail an admin@taskilo.de"
echo "3. ✅ Überwache System: ./scripts/monitor-resend-webhooks.sh"
echo ""

if [ -n "$TASKILO_DOMAIN" ]; then
    echo "⚠️ WICHTIG: Domain DNS-Konfiguration"
    echo "   Gehe zu: https://resend.com/domains"
    echo "   Konfiguriere die DNS-Records für taskilo.de"
    echo ""
fi

echo "🎉 Das E-Mail-Empfangssystem ist jetzt vollständig über das Terminal eingerichtet!"
