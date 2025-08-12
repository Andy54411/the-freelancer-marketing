#!/bin/bash

# Taskilo Resend Dashboard Setup Guide
# Vollständige Anleitung zur manuellen Konfiguration über das Resend Dashboard

echo "🚀 Taskilo Resend Dashboard Setup Guide"
echo "========================================"
echo ""

# ASCII Art Banner
cat << 'EOF'
 ████████╗ █████╗ ███████╗██╗  ██╗██╗██╗      ██████╗ 
 ╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝██║██║     ██╔═══██╗
    ██║   ███████║███████╗█████╔╝ ██║██║     ██║   ██║
    ██║   ██╔══██║╚════██║██╔═██╗ ██║██║     ██║   ██║
    ██║   ██║  ██║███████║██║  ██╗██║███████╗╚██████╔╝
    ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝╚══════╝ ╚═════╝ 
                                                        
         E-MAIL EMPFANGSSYSTEM SETUP
EOF

echo ""
echo "🎯 ZIEL: Vollständige Konfiguration des E-Mail-Empfangssystems"
echo ""

# Aktuelle Systemstatus
echo "📊 SYSTEMSTATUS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Teste Webhook
WEBHOOK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "https://taskilo.de/api/webhooks/resend" -H "Content-Type: application/json" -d '{"type":"test"}')
printf "%-30s" "🔗 Webhook-Endpoint:"
if [ "$WEBHOOK_STATUS" = "200" ]; then
    echo "✅ FUNKTIONIERT (HTTP $WEBHOOK_STATUS)"
else
    echo "❌ FEHLER (HTTP $WEBHOOK_STATUS)"
fi

# Teste Admin Dashboard
ADMIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://taskilo.de/dashboard/admin/email-management")
printf "%-30s" "🏠 Admin Dashboard:"
if [ "$ADMIN_STATUS" = "200" ]; then
    echo "✅ ERREICHBAR (HTTP $ADMIN_STATUS)"
else
    echo "❌ NICHT ERREICHBAR (HTTP $ADMIN_STATUS)"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📋 SETUP SCHRITTE:"
echo ""

echo "🔑 SCHRITT 1: Resend Dashboard Login"
echo "────────────────────────────────────────────────────────────────────────────────"
echo "1. Öffne: https://resend.com/login"
echo "2. Logge dich in deinen Resend Account ein"
echo "3. Stelle sicher, dass du die richtige Domain (taskilo.de) siehst"
echo ""

echo "🌐 SCHRITT 2: Domain-Konfiguration"
echo "────────────────────────────────────────────────────────────────────────────────"
echo "1. Gehe zu: https://resend.com/domains"
echo "2. Prüfe, ob 'taskilo.de' bereits konfiguriert ist"
echo "3. Falls nicht: Klicke 'Add Domain' und füge 'taskilo.de' hinzu"
echo "4. Kopiere die DNS-Records und konfiguriere sie in deinem DNS-Provider"
echo "5. Warte auf Domain-Verifizierung (kann bis zu 24h dauern)"
echo ""

echo "🪝 SCHRITT 3: Webhook-Konfiguration (WICHTIGSTER SCHRITT)"
echo "────────────────────────────────────────────────────────────────────────────────"
echo "1. Gehe zu: https://resend.com/webhooks"
echo "2. Klicke 'Add Webhook'"
echo "3. Konfiguriere wie folgt:"
echo ""
echo "   📝 WEBHOOK-EINSTELLUNGEN:"
echo "   ┌─────────────────────────────────────────────────────────────────────────────┐"
echo "   │ Name:        Taskilo Email Inbox System                                     │"
echo "   │ URL:         https://taskilo.de/api/webhooks/resend                         │"
echo "   │ Secret:      [Automatisch generiert - KOPIERE ES!]                         │"
echo "   └─────────────────────────────────────────────────────────────────────────────┘"
echo ""
echo "   ✅ EVENTS ZUM AUSWÄHLEN:"
echo "   ┌─────────────────────────────────────────────────────────────────────────────┐"
echo "   │ ☑️ email.sent           - E-Mail wurde gesendet                             │"
echo "   │ ☑️ email.delivered      - E-Mail wurde zugestellt                          │"
echo "   │ ☑️ email.delivery_delayed - Zustellung verzögert                           │"
echo "   │ ☑️ email.complained     - Spam-Beschwerde                                  │"
echo "   │ ☑️ email.bounced        - E-Mail zurückgewiesen                            │"
echo "   │ ☑️ email.opened         - E-Mail geöffnet                                  │"
echo "   │ ☑️ email.clicked        - Link geklickt                                    │"
echo "   └─────────────────────────────────────────────────────────────────────────────┘"
echo ""

echo "🔐 SCHRITT 4: API-Key Berechtigung prüfen"
echo "────────────────────────────────────────────────────────────────────────────────"
echo "1. Gehe zu: https://resend.com/api-keys"
echo "2. Prüfe deinen aktuellen API-Key"
echo "3. Falls nur 'Send emails' berechtigt: Erstelle neuen Key mit allen Berechtigungen"
echo "4. Aktualisiere RESEND_API_KEY in deiner .env.local Datei"
echo ""

echo "📧 SCHRITT 5: E-Mail-Adresse für Empfang konfigurieren"
echo "────────────────────────────────────────────────────────────────────────────────"
echo "1. Gehe zu: https://resend.com/domains/taskilo.de (nach Domain-Setup)"
echo "2. Konfiguriere Inbound-Routing"
echo "3. Leite E-Mails an admin@taskilo.de an den Webhook weiter"
echo "4. Alternativ: Verwende catch-all (*@taskilo.de) Routing"
echo ""

echo "🧪 SCHRITT 6: System testen"
echo "────────────────────────────────────────────────────────────────────────────────"
echo "Nach der Konfiguration teste das System:"
echo ""
echo "1. Sende Test-E-Mail:"
echo "   ./scripts/test-resend-setup.sh"
echo ""
echo "2. Überwache System:"
echo "   ./scripts/monitor-resend-webhooks.sh"
echo ""
echo "3. Teste Admin Dashboard:"
echo "   https://taskilo.de/dashboard/admin/email-management"
echo ""
echo "4. Sende echte E-Mail:"
echo "   Von beliebiger E-Mail an: admin@taskilo.de"
echo ""

echo "🚨 TROUBLESHOOTING"
echo "────────────────────────────────────────────────────────────────────────────────"
echo "Problem: Webhook antwortet nicht"
echo "Lösung: Prüfe URL https://taskilo.de/api/webhooks/resend"
echo ""
echo "Problem: E-Mails kommen nicht an"
echo "Lösung: 1. Prüfe Domain-Verifizierung"
echo "        2. Prüfe Inbound-Routing in Resend"
echo "        3. Prüfe Webhook-Events"
echo ""
echo "Problem: Admin Dashboard lädt nicht"
echo "Lösung: 1. Prüfe Browser-Konsole auf JavaScript-Fehler"
echo "        2. Prüfe Firestore-Verbindung"
echo ""

echo "📱 WICHTIGE URLS"
echo "────────────────────────────────────────────────────────────────────────────────"
echo "🔗 Resend Dashboard:      https://resend.com/dashboard"
echo "🔗 Resend Domains:        https://resend.com/domains"
echo "🔗 Resend Webhooks:       https://resend.com/webhooks"
echo "🔗 Resend API Keys:       https://resend.com/api-keys"
echo "🔗 Taskilo Admin:         https://taskilo.de/dashboard/admin/email-management"
echo "🔗 Webhook-Endpoint:      https://taskilo.de/api/webhooks/resend"
echo ""

echo "✅ ERFOLGSINDIKATOREN"
echo "────────────────────────────────────────────────────────────────────────────────"
echo "☑️ Domain taskilo.de ist verifiziert"
echo "☑️ Webhook ist konfiguriert und aktiv"
echo "☑️ API-Key hat alle nötigen Berechtigungen"
echo "☑️ Test-E-Mails erscheinen im Admin Dashboard"
echo "☑️ Eingehende E-Mails werden automatisch verarbeitet"
echo "☑️ Antworten können aus dem Admin Panel gesendet werden"
echo ""

echo "🎉 Nach erfolgreichem Setup hast du:"
echo "────────────────────────────────────────────────────────────────────────────────"
echo "✨ Vollständiges E-Mail-Empfangssystem"
echo "✨ Admin Dashboard für E-Mail-Management"
echo "✨ Automatische Webhook-Verarbeitung"
echo "✨ Reply-Funktionalität mit Thread-Support"
echo "✨ Real-time E-Mail-Monitoring"
echo ""

echo "💡 TIPP: Speichere das Webhook-Secret sicher ab!"
echo "💡 TIPP: Teste regelmäßig mit ./scripts/monitor-resend-webhooks.sh"
echo ""

echo "🚀 Setup Guide abgeschlossen!"
echo "Bei Fragen: Prüfe die Taskilo Dokumentation oder kontaktiere den Support."
