#!/bin/bash

# Quick Google Cloud Setup für Taskilo
echo "🚀 Taskilo Google Cloud Setup Guide"
echo "===================================="

# Farben
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "\n${BLUE}✅ E-Mail-Adressen bereits erstellt:${NC}"
echo "   • newsletter@taskilo.de"
echo "   • support@taskilo.de" 
echo "   • noreply@taskilo.de"
echo "   • andy.staudinger@taskilo.de"

echo -e "\n${YELLOW}📋 Nächste Schritte - Google Cloud Console:${NC}"

echo -e "\n${GREEN}1. Google Cloud Project erstellen:${NC}"
echo "   → https://console.cloud.google.com"
echo "   → Neues Projekt: 'Taskilo Newsletter'"
echo "   → Projekt-ID notieren"

echo -e "\n${GREEN}2. APIs aktivieren:${NC}"
echo "   → APIs & Services → Library"
echo "   → Gmail API aktivieren"
echo "   → Google Sheets API aktivieren"
echo "   → Google Docs API aktivieren"
echo "   → Google Drive API aktivieren"

echo -e "\n${GREEN}3. Service Account erstellen:${NC}"
echo "   → IAM & Admin → Service Accounts"
echo "   → Create Service Account"
echo "   → Name: taskilo-newsletter-service"
echo "   → Rolle: Editor"
echo "   → Key erstellen (JSON herunterladen)"

echo -e "\n${GREEN}4. OAuth2 Client erstellen:${NC}"
echo "   → APIs & Services → Credentials"
echo "   → Create Credentials → OAuth 2.0 Client IDs"
echo "   → Web application"
echo "   → Authorized redirect URIs:"
echo "     • http://localhost:3000/api/auth/google/callback"
echo "     • https://taskilo.de/api/auth/google/callback"

echo -e "\n${GREEN}5. Domain-wide Delegation:${NC}"
echo "   → Service Account → Enable Domain-wide Delegation"
echo "   → Google Admin Console: admin.google.com"
echo "   → Security → API Controls → Domain-wide Delegation"
echo "   → Client ID eintragen, Scopes autorisieren"

echo -e "\n${GREEN}6. Google Sheets erstellen:${NC}"
echo "   → Neue Google Sheets: 'Taskilo Newsletter Abonnenten'"
echo "   → Header: Timestamp | E-Mail | Name | Präferenzen | Status | Quelle"
echo "   → Mit Service Account teilen"
echo "   → Sheet ID notieren"

echo -e "\n${GREEN}7. Environment Variables:${NC}"
echo "   → .env.local erstellen:"
echo "   → cp .env.google-workspace.example .env.local"
echo "   → Alle Credentials eintragen"

echo -e "\n${BLUE}🔗 Wichtige Links:${NC}"
echo "   Google Cloud Console: https://console.cloud.google.com"
echo "   Google Admin Console: https://admin.google.com"
echo "   Google Sheets: https://sheets.google.com"

echo -e "\n${YELLOW}💡 Nach dem Setup:${NC}"
echo "   ./scripts/setup-google-workspace.sh"
echo "   npm run dev"

echo -e "\n===================================="
echo "Status: E-Mails ✅ | Google Cloud ⏳"
