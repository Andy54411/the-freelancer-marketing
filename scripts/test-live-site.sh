#!/bin/bash

# Taskilo Newsletter Live Site Testing
echo "🚀 Taskilo Newsletter Live Site Testing"
echo "======================================="

# Farben für Output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Live Site URL
LIVE_URL="https://taskilo.de"
API_URL="$LIVE_URL/api/newsletter"

echo -e "\n${BLUE}🌐 Testing Live Site: $LIVE_URL${NC}"

# 1. Newsletter-Anmeldung testen
echo -e "\n${YELLOW}📧 1. Newsletter-Anmeldung testen...${NC}"

TEST_EMAIL="live-test-$(date +%s)@example.com"

RESPONSE=$(curl -s -X POST "$API_URL/subscribers" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"name\": \"Live Site Test User\",
    \"source\": \"Live Site API Test\"
  }")

echo "Test E-Mail: $TEST_EMAIL"
echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Newsletter-Anmeldung funktioniert${NC}"
else
    echo -e "${RED}❌ Newsletter-Anmeldung Fehler${NC}"
fi

# 2. Site Verfügbarkeit prüfen
echo -e "\n${YELLOW}🌍 2. Website Verfügbarkeit prüfen...${NC}"

STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$LIVE_URL")

if [ "$STATUS_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Website erreichbar (Status: $STATUS_CODE)${NC}"
else
    echo -e "${RED}❌ Website Fehler (Status: $STATUS_CODE)${NC}"
fi

# 3. Footer Newsletter-Form prüfen
echo -e "\n${YELLOW}📝 3. Footer Newsletter-Form prüfen...${NC}"

FOOTER_CHECK=$(curl -s "$LIVE_URL" | grep -c "Newsletter")

if [ "$FOOTER_CHECK" -gt 0 ]; then
    echo -e "${GREEN}✅ Newsletter-Form im Footer gefunden${NC}"
else
    echo -e "${RED}❌ Newsletter-Form nicht gefunden${NC}"
fi

# 4. API Endpoints prüfen
echo -e "\n${YELLOW}🔌 4. API Endpoints prüfen...${NC}"

# Newsletter API Health Check
API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/subscribers")

if [ "$API_HEALTH" = "405" ] || [ "$API_HEALTH" = "400" ]; then
    echo -e "${GREEN}✅ Newsletter API erreichbar (Status: $API_HEALTH)${NC}"
else
    echo -e "${RED}❌ Newsletter API Fehler (Status: $API_HEALTH)${NC}"
fi

# 5. Environment Variables Check (für Admin)
echo -e "\n${YELLOW}⚙️ 5. Environment Setup Check...${NC}"

echo "📋 Vercel Environment Variables überprüfen:"
echo "   1. GOOGLE_WORKSPACE_CLIENT_ID"
echo "   2. GOOGLE_WORKSPACE_CLIENT_SECRET" 
echo "   3. GOOGLE_SERVICE_ACCOUNT_EMAIL"
echo "   4. GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY"
echo "   5. GOOGLE_SHEETS_NEWSLETTER_ID"
echo "   6. NEWSLETTER_FROM_EMAIL"

# 6. Browser Testing Anweisungen
echo -e "\n${BLUE}🌐 Browser Testing:${NC}"
echo "1. Öffnen Sie: $LIVE_URL"
echo "2. Scrollen Sie zum Footer"
echo "3. Testen Sie die Newsletter-Anmeldung"
echo "4. Überprüfen Sie die Erfolgsbestätigung"

# 7. Admin Dashboard Testing
echo -e "\n${BLUE}👨‍💼 Admin Dashboard Testing:${NC}"
echo "1. Öffnen Sie: $LIVE_URL/dashboard/admin/newsletter"
echo "2. Newsletter erstellen und senden"
echo "3. Google Sheets überprüfen"

# 8. Monitoring
echo -e "\n${BLUE}📊 Monitoring:${NC}"
echo "Vercel Logs: vercel logs --follow"
echo "Google Sheets: https://docs.google.com/spreadsheets/"

# Zusammenfassung
echo -e "\n${GREEN}✨ Live Site Testing abgeschlossen!${NC}"
echo "======================================="

echo -e "\n${YELLOW}📝 Nächste Schritte:${NC}"
echo "1. Browser-Test durchführen"
echo "2. Environment Variables in Vercel überprüfen"
echo "3. Google Workspace Domain-wide Delegation aktivieren"
echo "4. E-Mail-Versendung testen"

echo -e "\n${BLUE}📧 Test-E-Mail verwendet: $TEST_EMAIL${NC}"
echo "Prüfen Sie diese E-Mail in Ihren Google Sheets!"

exit 0
