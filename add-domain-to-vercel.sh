#!/bin/bash

# Script zum automatischen Hinzufügen der Domain zu Vercel
# Dieses Script soll ausgeführt werden, nachdem die Nameserver geändert wurden

DOMAIN="taskilo.de"

echo "🚀 Versuche Domain $DOMAIN zu Vercel hinzuzufügen..."
echo "================================================"

# Prüfe zuerst ob Vercel Nameserver aktiv sind
if dig ns $DOMAIN +short | grep -q "vercel-dns.com"; then
    echo "✅ Vercel Nameserver sind aktiv!"
    echo "🔗 Füge Domain zu Vercel hinzu..."
    
    # Versuche Domain hinzuzufügen
    if vercel domains add $DOMAIN; then
        echo "✅ Domain erfolgreich hinzugefügt!"
        echo "📊 Domain-Status:"
        vercel domains ls
        echo ""
        echo "🎉 Fertig! Die Domain sollte in wenigen Minuten aktiv sein."
        echo "🌐 URL: https://$DOMAIN"
    else
        echo "❌ Fehler beim Hinzufügen der Domain"
        echo "💡 Versuchen Sie es manuell:"
        echo "   vercel domains add $DOMAIN"
    fi
else
    echo "⏳ Nameserver sind noch nicht auf Vercel umgestellt"
    echo "🔍 Aktuelle Nameserver:"
    dig ns $DOMAIN +short
    echo ""
    echo "⏱️  Warten Sie, bis die Nameserver-Änderung propagiert wurde"
fi
