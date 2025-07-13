#!/bin/bash

# Taskilo Platform Fee Management Script
# Verwendung: ./update-platform-fee.sh 0.05  (für 5%)

NEW_FEE_RATE=$1

if [ -z "$NEW_FEE_RATE" ]; then
    echo "❌ Fehler: Bitte gib den neuen Gebührensatz an (z.B. 0.05 für 5%)"
    echo "Verwendung: ./update-platform-fee.sh 0.05"
    exit 1
fi

echo "🔄 Aktualisiere Plattformgebühren auf ${NEW_FEE_RATE}..."

# 1. Update request-payout API
sed -i '' "s/const platformFeeRate = [0-9.]*;/const platformFeeRate = $NEW_FEE_RATE;/g" src/app/api/request-payout/route.ts

# 2. Update invoice generator
sed -i '' "s/payout.amount \* [0-9.]*/payout.amount * $NEW_FEE_RATE/g" src/app/api/generate-payout-invoice/route.ts

# 3. Update invoice text
PERCENTAGE=$(echo "$NEW_FEE_RATE * 100" | bc)
sed -i '' "s/Plattformgebühr ([0-9.,]*%)/Plattformgebühr ($PERCENTAGE%)/g" src/app/api/generate-payout-invoice/route.ts

echo "✅ Plattformgebühren aktualisiert auf $NEW_FEE_RATE ($PERCENTAGE%)"
echo ""
echo "📝 Nächste Schritte:"
echo "1. pnpm build  # Build testen"
echo "2. git add .   # Änderungen stagen"
echo "3. git commit -m \"Update: Platform fee to $PERCENTAGE%\""
echo "4. git push    # Deployment"
echo ""
echo "🎯 Betroffene Dateien:"
echo "- src/app/api/request-payout/route.ts"
echo "- src/app/api/generate-payout-invoice/route.ts"
