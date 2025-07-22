import json
import subprocess
import requests

print("📊 Erstelle Google Sheets für Newsletter-Abonnenten...")

try:
    # Access Token von gcloud abrufen
    token_result = subprocess.run(['gcloud', 'auth', 'print-access-token'], 
                                 capture_output=True, text=True)
    access_token = token_result.stdout.strip()
    
    if not access_token:
        print("❌ Fehler: Kein Access Token erhalten")
        exit(1)
    
    print("✅ Access Token erhalten")
    
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
    
    print("📝 Erstelle Spreadsheet...")
    
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
        
        print("📋 Füge Header-Zeile hinzu...")
        
        header_response = requests.put(
            f'https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values/Newsletter-Abonnenten!A1:F1?valueInputOption=USER_ENTERED',
            headers=headers,
            json=header_data
        )
        
        if header_response.status_code == 200:
            print("✅ Header-Zeile hinzugefügt")
        else:
            print(f"⚠️ Header-Fehler: {header_response.status_code}")
        
        # Spreadsheet ID zu .env.local hinzufügen
        with open('.env.local', 'a') as f:
            f.write(f'\nGOOGLE_SHEETS_NEWSLETTER_ID={spreadsheet_id}\n')
        
        print("✅ Spreadsheet ID zu .env.local hinzugefügt")
        print("🎉 Google Sheets Setup erfolgreich!")
        
    else:
        print(f"❌ Fehler beim Erstellen des Spreadsheets: {response.status_code}")
        print(f"Response: {response.text}")
        
except Exception as e:
    print(f"❌ Fehler: {e}")
    print("💡 Stellen Sie sicher, dass Sie bei gcloud angemeldet sind: gcloud auth login")
