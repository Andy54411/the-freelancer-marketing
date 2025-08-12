#!/bin/bash

# Taskilo Resend Quick Setup - Alle Tools in einem Befehl

echo "🚀 Taskilo Resend Quick Setup"
echo "=============================="
echo ""

# Menü anzeigen
echo "Wähle eine Option:"
echo ""
echo "1️⃣  📋 Setup Guide anzeigen"
echo "2️⃣  🧪 Test-E-Mail senden" 
echo "3️⃣  📊 System-Monitoring starten"
echo "4️⃣  🔧 Resend konfigurieren (mit API-Key)"
echo "5️⃣  🏠 Admin Dashboard öffnen"
echo "6️⃣  📈 Vollständiger System-Check"
echo "7️⃣  🔄 Alle Scripts ausführen"
echo "0️⃣  ❌ Beenden"
echo ""

read -p "Deine Wahl (0-7): " choice

case $choice in
    1)
        echo "📋 Zeige Setup Guide..."
        ./scripts/resend-setup-guide.sh
        ;;
    2)
        echo "🧪 Sende Test-E-Mail..."
        ./scripts/test-resend-setup.sh
        ;;
    3)
        echo "📊 Starte System-Monitoring..."
        ./scripts/monitor-resend-webhooks.sh
        ;;
    4)
        echo "🔧 Konfiguriere Resend..."
        ./scripts/configure-resend.sh
        ;;
    5)
        echo "🏠 Öffne Admin Dashboard..."
        if command -v open &> /dev/null; then
            open "https://taskilo.de/dashboard/admin/email-management"
        else
            echo "🔗 Gehe zu: https://taskilo.de/dashboard/admin/email-management"
        fi
        ;;
    6)
        echo "📈 Führe vollständigen System-Check aus..."
        echo ""
        echo "1. Setup Guide..."
        ./scripts/resend-setup-guide.sh
        echo ""
        echo "2. Test-E-Mail..."
        ./scripts/test-resend-setup.sh
        echo ""
        echo "3. System-Monitoring..."
        ./scripts/monitor-resend-webhooks.sh
        ;;
    7)
        echo "🔄 Führe alle Scripts aus..."
        echo ""
        echo "═══════════════════════════════════════════════════════════════════"
        echo "1/4: SETUP GUIDE"
        echo "═══════════════════════════════════════════════════════════════════"
        ./scripts/resend-setup-guide.sh
        echo ""
        echo "═══════════════════════════════════════════════════════════════════"
        echo "2/4: RESEND KONFIGURATION"
        echo "═══════════════════════════════════════════════════════════════════"
        ./scripts/configure-resend.sh
        echo ""
        echo "═══════════════════════════════════════════════════════════════════"
        echo "3/4: TEST-E-MAIL"
        echo "═══════════════════════════════════════════════════════════════════"
        ./scripts/test-resend-setup.sh
        echo ""
        echo "═══════════════════════════════════════════════════════════════════"
        echo "4/4: SYSTEM-MONITORING"
        echo "═══════════════════════════════════════════════════════════════════"
        ./scripts/monitor-resend-webhooks.sh
        echo ""
        echo "🎉 Alle Scripts abgeschlossen!"
        ;;
    0)
        echo "❌ Setup beendet."
        exit 0
        ;;
    *)
        echo "❌ Ungültige Auswahl. Bitte wähle 0-7."
        ;;
esac

echo ""
echo "💡 Um das Quick Setup erneut zu starten: ./scripts/quick-setup.sh"
