#!/bin/bash

# Kontinuierliches DNS-Monitoring für taskilo.de
# Läuft alle 2 Minuten bis die Domain erreichbar ist

DOMAIN="taskilo.de"
EXPECTED_IP="76.76.21.93"
EXPECTED_CNAME="cname.vercel-dns.com"

echo "🔄 Kontinuierliches DNS-Monitoring für $DOMAIN"
echo "================================================"
echo "⏰ Gestartet: $(date)"
echo "🎯 Erwartete IP: $EXPECTED_IP"
echo "🎯 Erwarteter CNAME: $EXPECTED_CNAME"
echo "================================================"

# Überwachungsschleife
while true; do
    echo ""
    echo "🔍 Prüfung um $(date +"%H:%M:%S")..."
    echo "----------------------------------------"
    
    # A-Record prüfen
    A_RECORD=$(dig a $DOMAIN +short)
    if [ -n "$A_RECORD" ]; then
        echo "✅ A-Record gefunden: $A_RECORD"
        if [ "$A_RECORD" = "$EXPECTED_IP" ]; then
            echo "🎉 A-Record ist korrekt!"
            A_CORRECT=true
        else
            echo "⚠️  A-Record ist nicht korrekt (erwartet: $EXPECTED_IP)"
            A_CORRECT=false
        fi
    else
        echo "⏳ A-Record noch nicht propagiert"
        A_CORRECT=false
    fi
    
    # CNAME-Record prüfen
    CNAME_RECORD=$(dig cname www.$DOMAIN +short)
    if [ -n "$CNAME_RECORD" ]; then
        echo "✅ CNAME-Record gefunden: $CNAME_RECORD"
        if echo "$CNAME_RECORD" | grep -q "vercel-dns.com"; then
            echo "🎉 CNAME-Record ist korrekt!"
            CNAME_CORRECT=true
        else
            echo "⚠️  CNAME-Record ist nicht korrekt"
            CNAME_CORRECT=false
        fi
    else
        echo "⏳ CNAME-Record noch nicht propagiert"
        CNAME_CORRECT=false
    fi
    
    # HTTP-Test
    if curl -s --max-time 10 -I "https://$DOMAIN" | grep -q "200\|301\|302"; then
        echo "🌐 ✅ https://$DOMAIN ist erreichbar!"
        HTTP_WORKING=true
    else
        echo "🌐 ⏳ https://$DOMAIN noch nicht erreichbar"
        HTTP_WORKING=false
    fi
    
    # Erfolgreich? Dann beenden
    if [ "$A_CORRECT" = true ] && [ "$CNAME_CORRECT" = true ] && [ "$HTTP_WORKING" = true ]; then
        echo ""
        echo "🎉🎉🎉 ERFOLG! Domain ist vollständig konfiguriert! 🎉🎉🎉"
        echo "🌐 Ihre Website ist jetzt erreichbar unter:"
        echo "   https://$DOMAIN"
        echo "   https://www.$DOMAIN"
        echo ""
        echo "⏰ Monitoring beendet: $(date)"
        break
    fi
    
    # 2 Minuten warten
    echo "⏱️  Warte 2 Minuten bis zur nächsten Prüfung..."
    sleep 120
done
