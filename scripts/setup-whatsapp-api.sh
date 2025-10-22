#!/bin/bash

# WhatsApp Business API Setup Script
# Automatisiert so viel wie möglich vom Meta/Facebook Setup

set -e

echo "🚀 WhatsApp Business API Setup für Taskilo"
echo "=========================================="
echo ""

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Prüfe ob jq installiert ist (für JSON parsing)
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}⚠️  jq nicht installiert. Installiere mit: brew install jq${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} jq ist installiert"
echo ""

# Schritt 1: Access Token abfragen
echo "📋 Schritt 1: Meta Access Token"
echo "--------------------------------"
echo ""
echo "Du benötigst einen Access Token von Meta."
echo ""
echo "🌐 Öffne: https://developers.facebook.com/apps"
echo ""
echo "Anleitung:"
echo "1. Erstelle eine neue App → 'Business' Type"
echo "2. Füge 'WhatsApp' Product hinzu"
echo "3. Gehe zu: WhatsApp → API Setup"
echo "4. Kopiere den 'Temporary access token'"
echo ""
read -p "Access Token eingeben: " ACCESS_TOKEN

if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}❌ Kein Token eingegeben. Abbruch.${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Access Token gespeichert"
echo ""

# Schritt 2: Phone Number ID abrufen
echo "📋 Schritt 2: Phone Number ID abrufen"
echo "--------------------------------------"
echo ""
echo "Versuche Phone Number ID automatisch abzurufen..."

# Test API Call - Get Business Phone Numbers
PHONE_NUMBERS=$(curl -s -X GET \
  "https://graph.facebook.com/v18.0/me/phone_numbers" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

# Prüfe ob erfolgreich
if echo "$PHONE_NUMBERS" | jq -e '.data' > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} API-Verbindung erfolgreich!"
    echo ""
    
    # Zeige verfügbare Nummern
    echo "Verfügbare WhatsApp Business Nummern:"
    echo "$PHONE_NUMBERS" | jq -r '.data[] | "\(.id) - \(.display_phone_number) (verified: \(.verified_name))"'
    echo ""
    
    # Erste Nummer als Default
    PHONE_NUMBER_ID=$(echo "$PHONE_NUMBERS" | jq -r '.data[0].id')
    
    if [ -z "$PHONE_NUMBER_ID" ] || [ "$PHONE_NUMBER_ID" == "null" ]; then
        echo -e "${YELLOW}⚠️  Keine Phone Number ID gefunden.${NC}"
        echo "Bitte im Facebook Business Manager eine Nummer hinzufügen:"
        echo "https://business.facebook.com/wa/manage/phone-numbers/"
        echo ""
        read -p "Phone Number ID manuell eingeben: " PHONE_NUMBER_ID
    else
        echo -e "${GREEN}✓${NC} Phone Number ID gefunden: $PHONE_NUMBER_ID"
    fi
else
    echo -e "${YELLOW}⚠️  Automatischer Abruf fehlgeschlagen.${NC}"
    echo "Fehler: $(echo "$PHONE_NUMBERS" | jq -r '.error.message // "Unbekannt"')"
    echo ""
    echo "Bitte Phone Number ID manuell eingeben:"
    echo "Zu finden unter: WhatsApp → API Setup → Phone Number ID"
    echo ""
    read -p "Phone Number ID: " PHONE_NUMBER_ID
fi

if [ -z "$PHONE_NUMBER_ID" ]; then
    echo -e "${RED}❌ Keine Phone Number ID. Abbruch.${NC}"
    exit 1
fi

echo ""

# Schritt 3: Test-Nachricht (optional)
echo "📋 Schritt 3: Test-Nachricht senden (optional)"
echo "-----------------------------------------------"
echo ""
read -p "Möchtest du eine Test-Nachricht senden? (j/n): " SEND_TEST

if [ "$SEND_TEST" == "j" ] || [ "$SEND_TEST" == "J" ]; then
    echo ""
    read -p "Test-Telefonnummer (mit +, z.B. +491234567890): " TEST_PHONE
    
    # Entferne + für API
    TEST_PHONE_CLEAN=$(echo "$TEST_PHONE" | sed 's/[^0-9]//g')
    
    echo ""
    echo "Sende Test-Nachricht..."
    
    TEST_RESPONSE=$(curl -s -X POST \
      "https://graph.facebook.com/v18.0/$PHONE_NUMBER_ID/messages" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"messaging_product\": \"whatsapp\",
        \"recipient_type\": \"individual\",
        \"to\": \"$TEST_PHONE_CLEAN\",
        \"type\": \"text\",
        \"text\": {
          \"body\": \"🎉 Taskilo WhatsApp Test erfolgreich!\"
        }
      }")
    
    # Prüfe Erfolg
    if echo "$TEST_RESPONSE" | jq -e '.messages[0].id' > /dev/null 2>&1; then
        MESSAGE_ID=$(echo "$TEST_RESPONSE" | jq -r '.messages[0].id')
        echo -e "${GREEN}✓${NC} Test-Nachricht gesendet! Message ID: $MESSAGE_ID"
        echo "📱 Check dein WhatsApp!"
    else
        echo -e "${RED}❌ Fehler beim Senden:${NC}"
        echo "$TEST_RESPONSE" | jq -r '.error.message // "Unbekannt"'
        echo ""
        echo "Mögliche Gründe:"
        echo "- Telefonnummer nicht im WhatsApp Business Sandbox registriert"
        echo "- Access Token abgelaufen"
        echo "- Nummer ist kein WhatsApp-Konto"
    fi
fi

echo ""

# Schritt 4: .env.local aktualisieren
echo "📋 Schritt 4: .env.local aktualisieren"
echo "---------------------------------------"
echo ""

ENV_FILE=".env.local"

# Prüfe ob Datei existiert
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}⚠️  .env.local nicht gefunden. Erstelle neue Datei...${NC}"
    touch "$ENV_FILE"
fi

# Prüfe ob WhatsApp-Variablen bereits existieren
if grep -q "META_WHATSAPP_ACCESS_TOKEN" "$ENV_FILE"; then
    echo -e "${YELLOW}⚠️  WhatsApp-Variablen existieren bereits.${NC}"
    read -p "Überschreiben? (j/n): " OVERWRITE
    
    if [ "$OVERWRITE" != "j" ] && [ "$OVERWRITE" != "J" ]; then
        echo "Abgebrochen. Bitte manuell in .env.local eintragen:"
        echo ""
        echo "META_WHATSAPP_ACCESS_TOKEN=\"$ACCESS_TOKEN\""
        echo "META_WHATSAPP_PHONE_NUMBER_ID=\"$PHONE_NUMBER_ID\""
        exit 0
    fi
    
    # Entferne alte Einträge
    sed -i.bak '/META_WHATSAPP_/d' "$ENV_FILE"
fi

# Füge neue Variablen hinzu
echo "" >> "$ENV_FILE"
echo "# WhatsApp Business API (Setup: $(date))" >> "$ENV_FILE"
echo "META_WHATSAPP_ACCESS_TOKEN=\"$ACCESS_TOKEN\"" >> "$ENV_FILE"
echo "META_WHATSAPP_PHONE_NUMBER_ID=\"$PHONE_NUMBER_ID\"" >> "$ENV_FILE"
echo "META_WHATSAPP_WEBHOOK_VERIFY_TOKEN=\"taskilo_whatsapp_2024\"" >> "$ENV_FILE"

echo -e "${GREEN}✓${NC} .env.local aktualisiert!"
echo ""

# Schritt 5: Webhook einrichten (Info)
echo "📋 Schritt 5: Webhook einrichten (manuell)"
echo "-------------------------------------------"
echo ""
echo "⚠️  Webhook muss manuell im Facebook Developer Portal eingerichtet werden:"
echo ""
echo "1. Gehe zu: https://developers.facebook.com/apps"
echo "2. Wähle deine App → WhatsApp → Configuration"
echo "3. Klicke 'Edit' bei Webhook"
echo ""
echo "Webhook URL:"
echo "  🌐 https://taskilo.de/api/whatsapp/webhook"
echo ""
echo "Verify Token:"
echo "  🔑 taskilo_whatsapp_2024"
echo ""
echo "Subscribe to:"
echo "  ✅ messages"
echo ""
echo "4. Klicke 'Verify and Save'"
echo ""

# Schritt 6: Zusammenfassung
echo "✅ Setup abgeschlossen!"
echo "======================="
echo ""
echo "📝 Zusammenfassung:"
echo "  - Access Token: ✅"
echo "  - Phone Number ID: ✅ ($PHONE_NUMBER_ID)"
echo "  - .env.local: ✅ Aktualisiert"
echo "  - Webhook: ⚠️  Manuell einrichten (siehe oben)"
echo ""
echo "🚀 Nächste Schritte:"
echo "  1. Dev-Server neu starten: pnpm dev"
echo "  2. Status prüfen: curl http://localhost:3000/api/whatsapp/status"
echo "  3. Webhook im Facebook Portal einrichten (siehe oben)"
echo ""
echo "📖 Docs: docs/WHATSAPP_INTEGRATION.md"
echo ""
echo -e "${GREEN}🎉 Fertig!${NC}"
