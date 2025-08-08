#!/bin/bash

# Taskilo E-Mail-System Test Script
# Verwendung: chmod +x test-email-curl.sh && ./test-email-curl.sh

echo "🧪 Teste Taskilo E-Mail-System mit cURL..."

# Test-Daten (ersetzen Sie diese mit echten Werten)
INVOICE_ID="sNDDpufWI1lWTbS4h0ke"  # Echte Invoice-ID aus Firestore
RECIPIENT_EMAIL="andystaudinger@gmail.com"  # Ihre Test-E-Mail
RECIPIENT_NAME="Andy Staudinger"
SUBJECT="Test: Ihre Rechnung von Taskilo"
MESSAGE="Dies ist eine Test-E-Mail vom neuen intelligenten E-Mail-System."
SENDER_NAME="Mietkoch Andy"

echo "📤 Sende Test-E-Mail an: $RECIPIENT_EMAIL"
echo "📋 Invoice ID: $INVOICE_ID"

# API-Aufruf
curl -X POST http://localhost:3000/api/send-invoice-email \
  -H "Content-Type: application/json" \
  -d "{
    \"invoiceId\": \"$INVOICE_ID\",
    \"recipientEmail\": \"$RECIPIENT_EMAIL\",
    \"recipientName\": \"$RECIPIENT_NAME\",
    \"subject\": \"$SUBJECT\",
    \"message\": \"$MESSAGE\",
    \"senderName\": \"$SENDER_NAME\"
  }" \
  -w "\n\n📊 HTTP Status: %{http_code}\n⏱️ Response Time: %{time_total}s\n" \
  -s

echo ""
echo "✅ Test abgeschlossen!"
echo ""
echo "💡 Tipps:"
echo "   - Überprüfen Sie die Logs in der Konsole für Details"
echo "   - Ersetzen Sie INVOICE_ID mit einer echten Rechnung aus Firestore"
echo "   - Ändern Sie RECIPIENT_EMAIL zu Ihrer Test-E-Mail-Adresse"
