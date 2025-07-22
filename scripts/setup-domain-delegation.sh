#!/bin/bash

echo "🔐 Domain-wide Delegation Setup für Taskilo Newsletter"
echo "=================================================="

echo -e "\n📋 Service Account Details:"
echo "Client ID: 109480315867268156703"
echo "E-Mail: taskilo-newsletter-service@tilvo-f142f.iam.gserviceaccount.com"

echo -e "\n🔧 Google Admin Console Setup:"
echo "1. Öffnen Sie: https://admin.google.com"
echo "2. Gehen Sie zu: Security → API Controls → Domain-wide Delegation"
echo "3. Klicken Sie: Add new"
echo "4. Client ID eingeben: 109480315867268156703"
echo "5. OAuth Scopes hinzufügen:"
echo "   https://www.googleapis.com/auth/gmail.send"
echo "   https://www.googleapis.com/auth/spreadsheets"
echo "   https://www.googleapis.com/auth/documents.readonly"
echo "   https://www.googleapis.com/auth/drive"
echo "6. Autorisieren klicken"

echo -e "\n⚠️  WICHTIG: Dieser Schritt muss als Google Workspace Admin durchgeführt werden!"
echo "Nach der Autorisierung können Sie das Newsletter-System nutzen."

echo -e "\n🧪 Nach der Autorisierung testen:"
echo "./scripts/setup-google-workspace.sh"

echo "=================================================="
