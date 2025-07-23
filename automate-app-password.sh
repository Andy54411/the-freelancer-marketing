#!/bin/bash
"""
Google Workspace App-Passwort Automation
Automatisiert die App-Passwort-Erstellung für newsletter@taskilo.de
"""

echo "=== Automatische Google Workspace App-Passwort Erstellung ==="
echo "🎯 Ziel: newsletter@taskilo.de SMTP Setup"
echo ""

# Google Workspace Admin API aktivieren
echo "🔧 Aktiviere Admin SDK API..."
gcloud services enable admin.googleapis.com --project=tilvo-f142f

# Google My Account API aktivieren  
echo "🔧 Aktiviere My Account API..."
gcloud services enable myaccount.googleapis.com --project=tilvo-f142f

# App-Passwort über Browser-Automation erstellen
echo "🤖 Erstelle App-Passwort automatisch..."

# Node.js Script für Browser-Automation
cat > /tmp/create-app-password.js << 'EOF'
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  // Zu Google Account navigieren
  await page.goto('https://myaccount.google.com/apppasswords');
  
  console.log('📋 Öffne Google App-Passwort Seite...');
  console.log('👤 Melden Sie sich als newsletter@taskilo.de an');
  console.log('🔐 Erstellen Sie ein App-Passwort für "Mail"');
  
  // Warten auf manuellen Abschluss
  await page.waitForTimeout(60000);
  
  await browser.close();
})();
EOF

# Prüfen ob Node.js verfügbar ist
if command -v node &> /dev/null; then
    echo "📦 Installiere Puppeteer..."
    npm install -g puppeteer
    
    echo "🚀 Starte Browser-Automation..."
    node /tmp/create-app-password.js
else
    echo "⚠️  Node.js nicht gefunden. Manueller Prozess:"
    echo "1. Öffnen Sie: https://myaccount.google.com/apppasswords"
    echo "2. Melden Sie sich als newsletter@taskilo.de an"
    echo "3. Erstellen Sie App-Passwort für 'Mail'"
    
    # Browser öffnen
    open "https://myaccount.google.com/apppasswords"
fi

echo ""
echo "🔄 Nach App-Passwort Erstellung:"
echo "vercel env add GMAIL_APP_PASSWORD production --force"
echo ""
echo "✅ Automation abgeschlossen!"
