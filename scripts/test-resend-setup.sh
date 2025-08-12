#!/bin/bash

# Resend E-Mail Test und Webhook-Setup für Taskilo
echo "🚀 Taskilo Resend E-Mail Test gestartet..."

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

echo "✅ RESEND_API_KEY gefunden (nur Send-Berechtigung)"

# Basis-URL und Header für Resend API
RESEND_API_URL="https://api.resend.com"
AUTH_HEADER="Authorization: Bearer $RESEND_API_KEY"

echo ""
echo "📨 Sende Test-E-Mail für Webhook..."

# Aktuelle Zeit für eindeutige Test-ID
TEST_ID=$(date +"%Y%m%d_%H%M%S")

# Sende Test-E-Mail
RESPONSE=$(curl -s -X POST "$RESEND_API_URL/emails" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{
    \"from\": \"system@taskilo.de\",
    \"to\": [\"admin@taskilo.de\"],
    \"subject\": \"Resend Webhook Test $TEST_ID - Taskilo Admin\",
    \"html\": \"<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;'><h1 style='color: #14ad9f;'>🔧 Webhook Test - Taskilo Admin</h1><p>Diese E-Mail testet die Webhook-Konfiguration für das Taskilo Admin Email Management System.</p><ul><li><strong>Test-ID:</strong> $TEST_ID</li><li><strong>Gesendet am:</strong> $(date)</li><li><strong>Webhook-URL:</strong> https://taskilo.de/api/webhooks/resend</li></ul><p style='background-color: #f0f9ff; padding: 15px; border-left: 4px solid #14ad9f;'><strong>📋 Erwartete Webhook-Events:</strong><br>• email.sent<br>• email.delivered<br>• email.opened<br>• email.clicked</p><p>Diese E-Mail sollte im <a href='https://taskilo.de/dashboard/admin/email-management' style='color: #14ad9f;'>Taskilo Admin Email Management</a> Posteingang erscheinen.</p></div>\"
  }")

echo "📧 Test-E-Mail Antwort:"
echo "$RESPONSE" | jq '.'

# Extrahiere E-Mail-ID aus Antwort
EMAIL_ID=$(echo "$RESPONSE" | jq -r '.id // empty')

if [ -n "$EMAIL_ID" ]; then
    echo ""
    echo "✅ Test-E-Mail erfolgreich gesendet!"
    echo "📧 E-Mail-ID: $EMAIL_ID"
    echo ""
    echo "📋 Manuelle Webhook-Konfiguration erforderlich:"
    echo ""
    echo "🔗 1. Gehe zu Resend Dashboard: https://resend.com/webhooks"
    echo "🔗 2. Erstelle neuen Webhook mit URL: https://taskilo.de/api/webhooks/resend"
    echo "📝 3. Wähle folgende Events aus:"
    echo "   • email.sent"
    echo "   • email.delivered" 
    echo "   • email.delivery_delayed"
    echo "   • email.complained"
    echo "   • email.bounced"
    echo "   • email.opened"
    echo "   • email.clicked"
    echo ""
    echo "🏢 4. Domain-Setup (falls noch nicht gemacht):"
    echo "   • Gehe zu: https://resend.com/domains"
    echo "   • Füge Domain hinzu: taskilo.de"
    echo "   • Konfiguriere DNS-Records"
    echo ""
else
    echo "❌ Fehler beim Senden der Test-E-Mail"
fi

echo ""
echo "🔍 Teste Webhook-Empfang direkt..."

# Teste unsere Webhook-Route mit einem Mock-Event
echo "📡 Teste Webhook-Route..."
curl -s -X POST "https://taskilo.de/api/webhooks/resend" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"email.sent\",
    \"created_at\": \"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",
    \"data\": {
      \"id\": \"test_$TEST_ID\",
      \"from\": \"system@taskilo.de\",
      \"to\": [\"admin@taskilo.de\"],
      \"subject\": \"Test Webhook Event - $TEST_ID\",
      \"created_at\": \"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\"
    }
  }" | jq '.' || echo "Webhook-Test gesendet (möglicherweise keine JSON-Antwort)"

echo ""
echo "✅ Resend-Konfiguration und Test abgeschlossen!"
echo ""
echo "📋 Nächste Schritte:"
echo "1. ✅ Teste das Admin Dashboard: https://taskilo.de/dashboard/admin/email-management"
echo "2. 🔧 Konfiguriere Webhook manuell im Resend Dashboard"
echo "3. 📧 Teste E-Mail-Empfang an: admin@taskilo.de"
echo "4. 📊 Überwache Logs in der Browser-Konsole"
echo ""
echo "🚨 WICHTIG: Für vollständige Webhook-Funktionalität benötigst du:"
echo "   • Einen Resend API-Key mit Domain- und Webhook-Berechtigungen"
echo "   • Manuelle Webhook-Konfiguration im Resend Dashboard"
echo "   • Domain-Verifizierung für taskilo.de"
