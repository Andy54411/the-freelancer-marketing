#!/bin/bash

echo "🔑 OAuth2 Client für Taskilo Newsletter erstellen"
echo "=============================================="

# OAuth2 Client über gcloud erstellen
echo "📝 Erstelle OAuth2 Web-Client..."

# Authorized redirect URIs für den OAuth2 Client
REDIRECT_URIS="http://localhost:3000/api/auth/google/callback,https://taskilo.de/api/auth/google/callback"

# OAuth2 Client erstellen (funktioniert nur mit aktivierter OAuth Consent Screen)
echo "💡 OAuth2 Client muss über Google Cloud Console erstellt werden:"
echo "   1. https://console.cloud.google.com/apis/credentials"
echo "   2. Create Credentials → OAuth 2.0 Client IDs"
echo "   3. Web application"
echo "   4. Authorized redirect URIs:"
echo "      - http://localhost:3000/api/auth/google/callback"
echo "      - https://taskilo.de/api/auth/google/callback"

echo -e "\n📊 Erstelle temporäres Google Sheets für Newsletter-Abonnenten..."

# Google Sheets über gcloud erstellen (vereinfacht)
cat > temp_create_sheet.py << 'EOF'
import json
import subprocess

# Verwende gcloud für die Authentifizierung
try:
    # Erstelle ein einfaches Sheet über die REST API
    import requests
    
    # Access Token von gcloud abrufen
    token_result = subprocess.run(['gcloud', 'auth', 'print-access-token'], 
                                 capture_output=True, text=True)
    access_token = token_result.stdout.strip()
    
    if not access_token:
        print("❌ Fehler: Kein Access Token erhalten")
        exit(1)
    
    # Erstelle Spreadsheet über Google Sheets API
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    spreadsheet_data = {
        'properties': {
            'title': 'Taskilo Newsletter Abonnenten'
        },
        'sheets': [{
            'properties': {
                'title': 'Newsletter-Abonnenten'
            }
        }]
    }
    
    response = requests.post(
        'https://sheets.googleapis.com/v4/spreadsheets',
        headers=headers,
        json=spreadsheet_data
    )
    
    if response.status_code == 200:
        spreadsheet = response.json()
        spreadsheet_id = spreadsheet['spreadsheetId']
        
        print(f"✅ Google Sheets erstellt: {spreadsheet_id}")
        print(f"🔗 URL: https://docs.google.com/spreadsheets/d/{spreadsheet_id}")
        
        # Header hinzufügen
        header_data = {
            'values': [['Timestamp', 'E-Mail', 'Name', 'Präferenzen', 'Status', 'Quelle']]
        }
        
        header_response = requests.put(
            f'https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values/Newsletter-Abonnenten!A1:F1?valueInputOption=USER_ENTERED',
            headers=headers,
            json=header_data
        )
        
        if header_response.status_code == 200:
            print("✅ Header-Zeile hinzugefügt")
        
        # Spreadsheet ID zu .env.local hinzufügen
        with open('.env.local', 'a') as f:
            f.write(f'\nGOOGLE_SHEETS_NEWSLETTER_ID={spreadsheet_id}\n')
        
        print("✅ Spreadsheet ID zu .env.local hinzugefügt")
        
    else:
        print(f"❌ Fehler beim Erstellen des Spreadsheets: {response.status_code}")
        print(response.text)
        
except Exception as e:
    print(f"❌ Fehler: {e}")
    print("💡 Verwenden Sie die Google Cloud Console um das Spreadsheet manuell zu erstellen")

EOF

python3 temp_create_sheet.py
rm -f temp_create_sheet.py

echo "=============================================="
echo "📊 Google Sheets Setup abgeschlossen!"
