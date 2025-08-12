#!/bin/bash

# Resend Webhook Monitoring für Taskilo
echo "📊 Taskilo Resend Webhook Monitoring..."

WEBHOOK_URL="https://taskilo.de/api/webhooks/resend"
ADMIN_INBOX_URL="https://taskilo.de/api/admin/emails/inbox"

echo ""
echo "🔍 1. Teste Webhook-Endpoint..."
WEBHOOK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"type":"test","data":{"id":"monitoring_test"}}')

if [ "$WEBHOOK_STATUS" = "200" ]; then
    echo "✅ Webhook-Endpoint antwortet (HTTP $WEBHOOK_STATUS)"
else
    echo "❌ Webhook-Endpoint Problem (HTTP $WEBHOOK_STATUS)"
fi

echo ""
echo "🔍 2. Teste Admin Inbox API..."
INBOX_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$ADMIN_INBOX_URL")

if [ "$INBOX_STATUS" = "200" ]; then
    echo "✅ Admin Inbox API antwortet (HTTP $INBOX_STATUS)"
    
    # Anzahl E-Mails im Posteingang abrufen
    INBOX_COUNT=$(curl -s "$ADMIN_INBOX_URL" | jq '.emails | length // 0')
    echo "📧 E-Mails im Posteingang: $INBOX_COUNT"
else
    echo "❌ Admin Inbox API Problem (HTTP $INBOX_STATUS)"
fi

echo ""
echo "🔍 3. Prüfe Firestore-Verbindung..."
# Verwende den vorhandenen Debug-Endpoint für Firestore
FIRESTORE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://taskilo.de/api/debug/firestore-test")

if [ "$FIRESTORE_STATUS" = "200" ]; then
    echo "✅ Firestore-Verbindung funktioniert (HTTP $FIRESTORE_STATUS)"
else
    echo "⚠️ Firestore-Verbindung prüfen (HTTP $FIRESTORE_STATUS)"
fi

echo ""
echo "📨 4. Sende Test-Webhook-Event..."
TEST_TIME=$(date +"%Y%m%d_%H%M%S")

curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"email.sent\",
    \"created_at\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",
    \"data\": {
      \"id\": \"monitor_test_$TEST_TIME\",
      \"from\": \"monitor@taskilo.de\",
      \"to\": [\"admin@taskilo.de\"],
      \"subject\": \"Monitoring Test - $TEST_TIME\",
      \"html\": \"<h1>Monitoring Test</h1><p>Automatischer Test des Webhook-Systems um $(date)</p>\",
      \"created_at\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\"
    }
  }" | jq '.'

echo ""
echo "⏱️ 5. Warte 3 Sekunden und prüfe ob E-Mail angekommen ist..."
sleep 3

# Prüfe ob die Test-E-Mail im Posteingang ist
UPDATED_COUNT=$(curl -s "$ADMIN_INBOX_URL" | jq '.emails | length // 0')
echo "📧 E-Mails nach Test: $UPDATED_COUNT"

if [ "$UPDATED_COUNT" -gt "$INBOX_COUNT" ]; then
    echo "✅ Test-E-Mail erfolgreich im Posteingang angekommen!"
else
    echo "⚠️ Test-E-Mail möglicherweise nicht angekommen (prüfe Logs)"
fi

echo ""
echo "📊 6. System-Status Zusammenfassung:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
printf "%-25s %s\n" "Webhook-Endpoint:" "$([ "$WEBHOOK_STATUS" = "200" ] && echo "✅ OK" || echo "❌ FEHLER")"
printf "%-25s %s\n" "Admin Inbox API:" "$([ "$INBOX_STATUS" = "200" ] && echo "✅ OK" || echo "❌ FEHLER")"
printf "%-25s %s\n" "Firestore:" "$([ "$FIRESTORE_STATUS" = "200" ] && echo "✅ OK" || echo "⚠️ PRÜFEN")"
printf "%-25s %s\n" "E-Mails im Posteingang:" "$UPDATED_COUNT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "🔗 URLs zum manuellen Testen:"
echo "• Admin Dashboard: https://taskilo.de/dashboard/admin/email-management"
echo "• Webhook-Endpoint: $WEBHOOK_URL"
echo "• Inbox API: $ADMIN_INBOX_URL"
echo "• Resend Dashboard: https://resend.com/webhooks"

echo ""
echo "💡 Tipps für Problembehebung:"
echo "• Prüfe Browser-Konsole auf JavaScript-Fehler"
echo "• Überprüfe Resend Webhook-Konfiguration"
echo "• Teste mit echten E-Mails an admin@taskilo.de"
echo "• Monitoring läuft erfolgreich ✅"
