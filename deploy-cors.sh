#!/bin/bash

# Firebase Storage CORS Konfiguration deployen
# Dieses Script muss einmalig ausgeführt werden

echo "🚀 Deploying Firebase Storage CORS configuration..."

# Prüfe ob gcloud installiert ist
if ! command -v gcloud &> /dev/null
then
    echo "❌ ERROR: gcloud CLI ist nicht installiert!"
    echo "📦 Installation: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Projekt ID aus firebase.json holen
PROJECT_ID="tilvo-f142f"

echo "📋 Projekt: $PROJECT_ID"
echo "📁 CORS Config: cors.json"

# CORS Konfiguration anwenden
gsutil cors set cors.json gs://${PROJECT_ID}.appspot.com

if [ $? -eq 0 ]; then
    echo "✅ CORS Konfiguration erfolgreich deployed!"
    echo ""
    echo "📝 Angewendete Regeln:"
    echo "   - Origin: * (alle Domains erlaubt)"
    echo "   - Methods: GET, HEAD"
    echo "   - Max Age: 3600 Sekunden"
    echo ""
    echo "🔍 Überprüfung:"
    gsutil cors get gs://${PROJECT_ID}.appspot.com
else
    echo "❌ Fehler beim Deployment der CORS-Konfiguration"
    exit 1
fi
