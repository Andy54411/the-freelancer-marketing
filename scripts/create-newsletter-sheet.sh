#!/bin/bash

# Google Sheets für Newsletter-Abonnenten erstellen
echo "📊 Google Sheets für Newsletter-Abonnenten erstellen..."

# Google Sheets über API erstellen
cat > create_newsletter_sheet.py << 'EOF'
import json
import os
from googleapiclient.discovery import build
from google.oauth2 import service_account

# Service Account Credentials laden
SERVICE_ACCOUNT_FILE = 'temp_service_account.json'

# Credentials von Environment Variables erstellen
service_account_info = {
    "type": "service_account",
    "project_id": "tilvo-f142f",
    "private_key_id": "",
    "private_key": os.environ.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY', '').replace('\\n', '\n'),
    "client_email": "taskilo-newsletter-service@tilvo-f142f.iam.gserviceaccount.com",
    "client_id": "109480315867268156703",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/taskilo-newsletter-service%40tilvo-f142f.iam.gserviceaccount.com"
}

# Credentials erstellen
credentials = service_account.Credentials.from_service_account_info(
    service_account_info,
    scopes=[
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
    ]
)

# Google Sheets Service erstellen
sheets_service = build('sheets', 'v4', credentials=credentials)
drive_service = build('drive', 'v3', credentials=credentials)

try:
    # Spreadsheet erstellen
    spreadsheet_body = {
        'properties': {
            'title': 'Taskilo Newsletter Abonnenten'
        },
        'sheets': [{
            'properties': {
                'title': 'Newsletter-Abonnenten'
            }
        }]
    }
    
    spreadsheet = sheets_service.spreadsheets().create(body=spreadsheet_body).execute()
    spreadsheet_id = spreadsheet['spreadsheetId']
    
    print(f"✅ Google Sheets erstellt: {spreadsheet_id}")
    
    # Header-Zeile hinzufügen
    values = [['Timestamp', 'E-Mail', 'Name', 'Präferenzen', 'Status', 'Quelle']]
    
    body = {
        'values': values
    }
    
    sheets_service.spreadsheets().values().update(
        spreadsheetId=spreadsheet_id,
        range='Newsletter-Abonnenten!A1:F1',
        valueInputOption='USER_ENTERED',
        body=body
    ).execute()
    
    print("✅ Header-Zeile hinzugefügt")
    
    # Datei für alle freigeben (lesbar)
    permission = {
        'type': 'anyone',
        'role': 'reader'
    }
    
    drive_service.permissions().create(
        fileId=spreadsheet_id,
        body=permission
    ).execute()
    
    print("✅ Spreadsheet öffentlich freigegeben")
    print(f"📊 Spreadsheet ID: {spreadsheet_id}")
    print(f"🔗 URL: https://docs.google.com/spreadsheets/d/{spreadsheet_id}")
    
    # Spreadsheet ID in Environment-Datei speichern
    with open('.env.local', 'a') as f:
        f.write(f'\nGOOGLE_SHEETS_NEWSLETTER_ID={spreadsheet_id}\n')
    
    print("✅ Spreadsheet ID zu .env.local hinzugefügt")
    
except Exception as e:
    print(f"❌ Fehler: {e}")

EOF

# Python-Script ausführen
python3 create_newsletter_sheet.py

# Cleanup
rm -f create_newsletter_sheet.py temp_service_account.json

echo "📊 Google Sheets Setup abgeschlossen!"
