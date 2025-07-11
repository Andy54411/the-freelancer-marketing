#!/bin/bash

# Alternative Lösung: CNAME-Einträge statt Nameserver-Änderung
# Diese Methode ist stabiler und funktioniert sofort

DOMAIN="taskilo.de"
VERCEL_TARGET="cname.vercel-dns.com"

echo "🔧 Alternative DNS-Konfiguration für $DOMAIN"
echo "================================================"

echo "❌ Problem: Nameserver springen auf SiteGround zurück"
echo "✅ Lösung: CNAME-Einträge verwenden"
echo ""

echo "📋 Anweisungen für SiteGround DNS-Einstellungen:"
echo "================================================"
echo ""
echo "1. 🔐 Loggen Sie sich in SiteGround ein"
echo "2. 🌐 Gehen Sie zu: Domains → $DOMAIN → DNS Zone Editor"
echo "3. 📝 Erstellen Sie folgende DNS-Einträge:"
echo ""
echo "   📌 CNAME-Eintrag #1:"
echo "   ┌─────────────────────────────────────────┐"
echo "   │ Type: CNAME                             │"
echo "   │ Name: @                                 │"
echo "   │ Value: $VERCEL_TARGET │"
echo "   │ TTL: 300 (5 Minuten)                   │"
echo "   └─────────────────────────────────────────┘"
echo ""
echo "   📌 CNAME-Eintrag #2:"
echo "   ┌─────────────────────────────────────────┐"
echo "   │ Type: CNAME                             │"
echo "   │ Name: www                               │"
echo "   │ Value: $VERCEL_TARGET │"
echo "   │ TTL: 300 (5 Minuten)                   │"
echo "   └─────────────────────────────────────────┘"
echo ""
echo "4. 💾 Speichern Sie die Änderungen"
echo "5. ⏱️  Warten Sie 5-10 Minuten"
echo ""

echo "🔍 Aktuelle DNS-Einträge prüfen:"
echo "================================================"
echo "A-Record für $DOMAIN:"
dig a $DOMAIN +short
echo ""
echo "CNAME-Record für www.$DOMAIN:"
dig cname www.$DOMAIN +short
echo ""

echo "🎯 Nach der CNAME-Konfiguration sollten Sie sehen:"
echo "- $DOMAIN → IP-Adresse von Vercel"
echo "- www.$DOMAIN → $VERCEL_TARGET"
echo ""

echo "✅ Vorteile dieser Methode:"
echo "- Nameserver bleiben bei SiteGround"
echo "- Keine Rücksprünge"
echo "- Sofortige Kontrolle"
echo "- Einfacher zu verwalten"
