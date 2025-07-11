#!/bin/bash

# Spezifisches Monitoring für taskilo.de nach DNS-Korrektur

echo "🔍 Prüfe DNS-Konfiguration für taskilo.de..."
echo "================================================"

echo "📋 Erwartete Konfiguration:"
echo "- taskilo.de → A-Record → 76.76.21.93"
echo "- www.taskilo.de → CNAME → cname.vercel-dns.com"
echo ""

echo "📊 Aktuelle DNS-Einträge:"
echo "================================================"

# A-Record für Hauptdomain
echo "🌐 A-Record für taskilo.de:"
A_RECORD=$(dig +short A taskilo.de)
if [ -z "$A_RECORD" ]; then
    echo "   ❌ Kein A-Record gefunden"
    echo "   🔧 Erstellen Sie: A-Record taskilo.de → 76.76.21.93"
else
    echo "   ✅ $A_RECORD"
    if echo "$A_RECORD" | grep -q "76.76.21.93"; then
        echo "   🎉 Korrekte Vercel-IP!"
    else
        echo "   ⚠️  Unerwartete IP-Adresse"
    fi
fi

echo ""

# CNAME für www
echo "🔗 CNAME-Record für www.taskilo.de:"
CNAME_RECORD=$(dig +short CNAME www.taskilo.de)
if [ -z "$CNAME_RECORD" ]; then
    echo "   ❌ Kein CNAME-Record gefunden"
    echo "   🔧 Erstellen Sie: CNAME www → cname.vercel-dns.com"
else
    echo "   ✅ $CNAME_RECORD"
    if echo "$CNAME_RECORD" | grep -q "vercel-dns.com"; then
        echo "   🎉 Korrekte Vercel-CNAME!"
    else
        echo "   ⚠️  Unerwarteter CNAME-Wert"
    fi
fi

echo ""
echo "================================================"

# HTTP-Tests
echo "🌐 HTTP-Erreichbarkeit:"
echo ""

# Test Hauptdomain
echo "📡 Teste https://taskilo.de..."
if curl -s --max-time 10 -I "https://taskilo.de" | head -1 | grep -q "200\|301\|302"; then
    echo "   ✅ Hauptdomain erreichbar!"
else
    echo "   ⏳ Hauptdomain noch nicht erreichbar"
fi

# Test www-Subdomain
echo "📡 Teste https://www.taskilo.de..."
if curl -s --max-time 10 -I "https://www.taskilo.de" | head -1 | grep -q "200\|301\|302"; then
    echo "   ✅ www-Subdomain erreichbar!"
else
    echo "   ⏳ www-Subdomain noch nicht erreichbar"
fi

echo ""
echo "================================================"

# Status-Bewertung
if [ -n "$A_RECORD" ] && [ -n "$CNAME_RECORD" ]; then
    echo "🎉 DNS-Konfiguration ist vollständig!"
    echo "⏱️  Warten Sie 5-10 Minuten für die Propagation"
    echo "🌐 Dann testen Sie: https://taskilo.de"
elif [ -n "$A_RECORD" ]; then
    echo "⚠️  A-Record ist konfiguriert, aber CNAME fehlt"
    echo "🔧 Erstellen Sie noch: CNAME www → cname.vercel-dns.com"
elif [ -n "$CNAME_RECORD" ]; then
    echo "⚠️  CNAME ist konfiguriert, aber A-Record fehlt"
    echo "🔧 Erstellen Sie noch: A-Record taskilo.de → 76.76.21.93"
else
    echo "❌ Beide DNS-Einträge fehlen noch"
    echo "🔧 Konfigurieren Sie beide Einträge bei SiteGround"
fi
