#!/bin/bash

# Monitoring-Script für CNAME-basierte DNS-Konfiguration

DOMAIN="taskilo.de"
EXPECTED_CNAME="cname.vercel-dns.com"

echo "🔍 Prüfe CNAME-Konfiguration für $DOMAIN..."
echo "================================================"

# Prüfe aktuelle DNS-Einträge
echo "📋 Aktuelle DNS-Einträge:"
echo ""

echo "🌐 A-Record für $DOMAIN:"
A_RECORD=$(dig a $DOMAIN +short)
if [ -z "$A_RECORD" ]; then
    echo "   ❌ Kein A-Record gefunden"
else
    echo "   ✅ $A_RECORD"
fi

echo ""
echo "🔗 CNAME-Record für www.$DOMAIN:"
CNAME_RECORD=$(dig cname www.$DOMAIN +short)
if [ -z "$CNAME_RECORD" ]; then
    echo "   ❌ Kein CNAME-Record gefunden"
else
    echo "   ✅ $CNAME_RECORD"
    if echo "$CNAME_RECORD" | grep -q "vercel-dns.com"; then
        echo "   🎉 Vercel CNAME ist konfiguriert!"
    fi
fi

echo ""
echo "================================================"

# Prüfe HTTP-Erreichbarkeit
echo "🌐 HTTP-Erreichbarkeit testen:"
echo ""

echo "📡 Teste https://$DOMAIN..."
if curl -s --max-time 10 -I "https://$DOMAIN" | grep -q "200\|301\|302"; then
    echo "   ✅ Domain ist erreichbar!"
    echo "   🎉 Setup erfolgreich!"
else
    echo "   ⏳ Domain noch nicht erreichbar"
    echo "   💡 Warten Sie weitere 5-10 Minuten"
fi

echo ""
echo "📡 Teste https://www.$DOMAIN..."
if curl -s --max-time 10 -I "https://www.$DOMAIN" | grep -q "200\|301\|302"; then
    echo "   ✅ www-Subdomain ist erreichbar!"
else
    echo "   ⏳ www-Subdomain noch nicht erreichbar"
fi

echo ""
echo "================================================"
echo "📝 Nächste Schritte:"

if [ -z "$A_RECORD" ] && [ -z "$CNAME_RECORD" ]; then
    echo "1. 🔧 Konfigurieren Sie die CNAME-Einträge bei SiteGround"
    echo "2. ⏱️  Warten Sie 5-10 Minuten"
    echo "3. 🔄 Führen Sie dieses Script erneut aus"
elif [ -n "$A_RECORD" ] || echo "$CNAME_RECORD" | grep -q "vercel-dns.com"; then
    echo "1. ✅ DNS-Konfiguration ist korrekt"
    echo "2. 🌐 Testen Sie: https://$DOMAIN"
    echo "3. 🎉 Setup ist abgeschlossen!"
else
    echo "1. ⚠️  DNS-Einträge sind nicht korrekt konfiguriert"
    echo "2. 🔧 Überprüfen Sie die CNAME-Einträge bei SiteGround"
fi
