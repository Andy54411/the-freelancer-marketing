#!/bin/bash

# Script zur Ermittlung der aktuellen Vercel-IP-Adressen für SiteGround

echo "🔍 Ermittle aktuelle Vercel-IP-Adressen..."
echo "================================================"

VERCEL_IPS=$(dig a cname.vercel-dns.com +short)
echo "📡 Aktuelle Vercel-IPs:"
echo "$VERCEL_IPS"

echo ""
echo "📋 SiteGround DNS-Konfiguration:"
echo "================================================"

echo "🎯 Eintrag #1 (Hauptdomain):"
echo "┌─────────────────────────────────────────┐"
echo "│ Type: A                                 │"
echo "│ Name: [leer lassen]                     │"
echo "│ Value: $(echo "$VERCEL_IPS" | head -n1)                    │"
echo "│ TTL: 1 Stunde                          │"
echo "└─────────────────────────────────────────┘"

echo ""
echo "🎯 Eintrag #2 (www-Subdomain):"
echo "┌─────────────────────────────────────────┐"
echo "│ Type: CNAME                             │"
echo "│ Name: www                               │"
echo "│ Value: cname.vercel-dns.com             │"
echo "│ TTL: 1 Stunde                          │"
echo "└─────────────────────────────────────────┘"

if [ $(echo "$VERCEL_IPS" | wc -l) -gt 1 ]; then
    echo ""
    echo "🎯 Eintrag #3 (Backup A-Record):"
    echo "┌─────────────────────────────────────────┐"
    echo "│ Type: A                                 │"
    echo "│ Name: [leer lassen]                     │"
    echo "│ Value: $(echo "$VERCEL_IPS" | tail -n1)                    │"
    echo "│ TTL: 1 Stunde                          │"
    echo "└─────────────────────────────────────────┘"
fi

echo ""
echo "💡 Tipps für SiteGround:"
echo "- Wenn das Name-Feld Probleme macht, versuchen Sie 'taskilo.de'"
echo "- Wenn @ nicht funktioniert, lassen Sie das Feld leer"
echo "- Verwenden Sie A-Records für die Hauptdomain"
echo "- Verwenden Sie CNAME nur für Subdomains (www)"
