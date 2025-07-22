#!/bin/bash

# Google Workspace Setup Script für Taskilo
echo "🚀 Taskilo Google Workspace Setup"
echo "=================================="

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Funktion für farbigen Output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Environment Variables prüfen
echo -e "\n📋 Environment Variables prüfen..."

if [ -z "$GOOGLE_WORKSPACE_CLIENT_ID" ]; then
    print_error "GOOGLE_WORKSPACE_CLIENT_ID nicht gesetzt"
    echo "   Setzen Sie diese Variable in .env.local"
else
    print_status "GOOGLE_WORKSPACE_CLIENT_ID gefunden"
fi

if [ -z "$GOOGLE_WORKSPACE_CLIENT_SECRET" ]; then
    print_error "GOOGLE_WORKSPACE_CLIENT_SECRET nicht gesetzt"
else
    print_status "GOOGLE_WORKSPACE_CLIENT_SECRET gefunden"
fi

if [ -z "$GOOGLE_SERVICE_ACCOUNT_EMAIL" ]; then
    print_warning "GOOGLE_SERVICE_ACCOUNT_EMAIL nicht gesetzt"
    echo "   Für automatisierte Newsletter benötigt"
else
    print_status "GOOGLE_SERVICE_ACCOUNT_EMAIL gefunden"
fi

if [ -z "$GOOGLE_SHEETS_NEWSLETTER_ID" ]; then
    print_warning "GOOGLE_SHEETS_NEWSLETTER_ID nicht gesetzt"
    echo "   Erstellen Sie ein Google Sheets für Newsletter-Abonnenten"
else
    print_status "GOOGLE_SHEETS_NEWSLETTER_ID gefunden"
fi

# Node.js Dependencies prüfen
echo -e "\n📦 Dependencies prüfen..."

if npm list googleapis &>/dev/null; then
    print_status "googleapis package installiert"
else
    print_error "googleapis package fehlt"
    echo "   Führen Sie aus: npm install googleapis"
fi

# API Endpoints testen
echo -e "\n🔌 API Endpoints testen..."

# Server starten (falls nicht bereits läuft)
if ! curl -s http://localhost:3000/api/newsletter/subscribers &>/dev/null; then
    print_warning "Development Server läuft nicht"
    echo "   Starten Sie: npm run dev"
else
    print_status "Development Server läuft"
    
    # Newsletter API testen
    echo -e "\n🧪 Newsletter API testen..."
    
    TEST_EMAIL="test-$(date +%s)@example.com"
    
    RESPONSE=$(curl -s -X POST http://localhost:3000/api/newsletter/subscribers \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$TEST_EMAIL\",\"name\":\"Test User\",\"source\":\"Setup Script\"}")
    
    if echo "$RESPONSE" | grep -q '"success":true'; then
        print_status "Newsletter API funktioniert"
    else
        print_error "Newsletter API Fehler"
        echo "   Response: $RESPONSE"
    fi
fi

# Google Workspace URLs
echo -e "\n🔗 Nützliche Links:"
echo "   Google Cloud Console: https://console.cloud.google.com"
echo "   Google Admin Console: https://admin.google.com"
echo "   API Library: https://console.cloud.google.com/apis/library"
echo "   Credentials: https://console.cloud.google.com/apis/credentials"

# Next Steps
echo -e "\n📝 Nächste Schritte:"
echo "   1. Erstellen Sie die benötigten E-Mail-Adressen in Google Workspace"
echo "   2. Konfigurieren Sie OAuth2 Client in Google Cloud Console"
echo "   3. Erstellen Sie Service Account für automatisierte Newsletter"
echo "   4. Aktualisieren Sie .env.local mit allen Credentials"
echo "   5. Erstellen Sie Google Sheets für Newsletter-Abonnenten"
echo "   6. Testen Sie die Newsletter-Anmeldung über den Footer"

echo -e "\n✨ Setup-Dokumentation: ./GOOGLE_WORKSPACE_SETUP.md"
echo "=================================="
