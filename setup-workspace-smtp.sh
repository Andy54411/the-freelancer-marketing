#!/bin/bash

echo "=== Google Workspace SMTP Setup für Vercel ==="
echo "🎯 Setze App-Passwort für newsletter@taskilo.de"
echo ""

echo "📋 Aktueller Status:"
echo "✅ GMAIL_USERNAME: newsletter@taskilo.de (bereits gesetzt)"
echo "⏳ GMAIL_APP_PASSWORD: Wird jetzt gesetzt..."
echo ""

echo "🔧 Setze Vercel Environment Variable..."
vercel env add GMAIL_APP_PASSWORD production --force

echo ""
echo "✅ Google Workspace SMTP Setup abgeschlossen!"
echo ""
echo "🧪 Test das System mit:"
echo "curl -X POST https://taskilo.de/api/newsletter/send-gmail \\"
echo '  -H "Content-Type: application/json" \'
echo '  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \'
echo '  -d '"'"'{'
echo '    "recipients": ["andy.staudinger@taskilo.de"],'
echo '    "subject": "Google Workspace SMTP Test",'
echo '    "htmlContent": "<h1>✅ Erfolgreich!</h1><p>Google Workspace SMTP funktioniert perfekt.</p>"'
echo '  }'"'"''
echo ""
