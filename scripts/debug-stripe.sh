#!/bin/bash

# Debug-Skript für Stripe-Probleme
# /Users/andystaudinger/Tasko/scripts/debug-stripe.sh

echo "🔍 Debugging Stripe-Konfiguration..."
echo ""

# Überprüfe Environment-Variablen
echo "📋 Environment-Variablen:"
if [ -z "$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" ]; then
    echo "❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ist nicht gesetzt"
else
    echo "✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ist gesetzt (${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:0:20}...)"
fi

echo ""

# Überprüfe Browser-Konsole-Logs nach Stripe-Fehlern
echo "🚨 Häufige Stripe-Probleme und Lösungen:"
echo ""
echo "1. FetchError: Error fetching https://r.stripe.com/b"
echo "   → Das sind harmlose Analytics-Fehler von Stripe"
echo "   → Werden durch Adblocker oder Netzwerkprobleme verursacht"
echo "   → Können ignoriert werden, beeinträchtigen die Zahlungsfunktion NICHT"
echo ""
echo "2. Apple Pay Domain-Warnung"
echo "   → Domain ist nicht bei Stripe für Apple Pay registriert"
echo "   → In Development normal und harmlos"
echo "   → Für Production: Domain bei Stripe registrieren"
echo ""
echo "3. Stripe Elements nicht geladen"
echo "   → Überprüfe NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
echo "   → Überprüfe Internetverbindung"
echo "   → Überprüfe Browser-Entwicklertools"
echo ""

# Teste Stripe-Konnektivität
echo "🌐 Teste Stripe-Konnektivität..."
if curl -s --max-time 5 https://js.stripe.com/v3/ > /dev/null; then
    echo "✅ Stripe JS Library erreichbar"
else
    echo "❌ Stripe JS Library nicht erreichbar - Überprüfe Internetverbindung"
fi

echo ""
echo "✨ Debug-Script abgeschlossen!"
echo "💡 Tipp: Öffne die Browser-Entwicklertools und schaue in die Console für weitere Details"
