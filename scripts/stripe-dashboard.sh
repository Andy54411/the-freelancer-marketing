#!/bin/bash

# Taskilo Stripe Platform Dashboard
echo "🏦 Taskilo Stripe Platform Management Dashboard"
echo "=============================================="

# Check if stripe CLI is logged in
if ! stripe config --list > /dev/null 2>&1; then
    echo "❌ Stripe CLI ist nicht eingeloggt. Bitte führe 'stripe login' aus."
    exit 1
fi

echo ""
echo "💰 Platform Balance:"
stripe balance retrieve | grep -E '"amount"|"currency"' | head -4

echo ""
echo "📊 Letzte 5 Application Fees:"
stripe application_fees list --limit 5 | grep -E '"amount"|"currency"|"created"' | head -15

echo ""
echo "🏢 Connected Accounts (Top 3):"
stripe accounts list --limit 3 | grep -E '"id"|"email"|"charges_enabled"' | head -9

echo ""
echo "💸 Letzte 3 Transfers:"
stripe transfers list --limit 3 | grep -E '"amount"|"currency"|"destination"' | head -9

echo ""
echo "🛠️ Verfügbare Commands:"
echo "- ./scripts/update-platform-fee.sh 0.05    # Gebühren auf 5% ändern"
echo "- stripe application_fees list             # Alle Application Fees"
echo "- stripe accounts list                     # Alle Connected Accounts"
echo "- stripe balance retrieve                  # Platform Balance"
echo "- stripe transfers list                    # Alle Transfers"

echo ""
echo "📈 Aktuelle Konfiguration:"
echo "- Gebührensatz: 4.5% (hardcoded in API routes)"
echo "- Account Typ: Custom Connected Accounts"
echo "- Fee Payer: Application (Platform zahlt Stripe Fees)"
