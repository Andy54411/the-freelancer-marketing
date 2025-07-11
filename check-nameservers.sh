#!/bin/bash

# Script zur Überwachung der Nameserver-Änderung für taskilo.de

DOMAIN="taskilo.de"
EXPECTED_NS1="ns1.vercel-dns.com"
EXPECTED_NS2="ns2.vercel-dns.com"

echo "🔍 Prüfe Nameserver für $DOMAIN..."
echo "================================================"

# Aktuelle Nameserver abrufen
CURRENT_NS=$(dig ns $DOMAIN +short | sort)
echo "📋 Aktuelle Nameserver:"
echo "$CURRENT_NS"

echo ""
echo "🎯 Erwartete Vercel Nameserver:"
echo "$EXPECTED_NS1"
echo "$EXPECTED_NS2"

echo ""
echo "================================================"

# Prüfen ob Vercel Nameserver bereits aktiv sind
if echo "$CURRENT_NS" | grep -q "vercel-dns.com"; then
    echo "✅ Vercel Nameserver sind bereits aktiv!"
    echo "🚀 Sie können jetzt die Domain zu Vercel hinzufügen:"
    echo "   vercel domains add $DOMAIN"
else
    echo "⏳ Nameserver sind noch nicht auf Vercel umgestellt"
    echo "📝 Aktuelle Nameserver:"
    echo "$CURRENT_NS"
    echo ""
    echo "🔧 Nächste Schritte:"
    echo "1. Loggen Sie sich in SiteGround ein"
    echo "2. Gehen Sie zu Domain-Management"
    echo "3. Ändern Sie die Nameserver zu:"
    echo "   - $EXPECTED_NS1"
    echo "   - $EXPECTED_NS2"
    echo ""
    echo "⏱️  Die Änderung kann 24-48 Stunden dauern"
fi

echo ""
echo "🔄 Führen Sie dieses Script regelmäßig aus:"
echo "   ./check-nameservers.sh"
