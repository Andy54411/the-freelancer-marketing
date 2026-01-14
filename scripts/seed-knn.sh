#!/bin/bash
# Seed k-NN mit bestehenden Fotos aus der Datenbank
# Dieses Script läuft auf dem Hetzner-Server

DB_PATH="/opt/taskilo/webmail-proxy/data/photos.db"
KI_URL="http://taskilo-ki:8000/api/v1/photos/photo/learn"

echo "=== KI Seed Script ==="
echo "Datenbank: $DB_PATH"

# Prüfe ob Datenbank existiert
if [ ! -f "$DB_PATH" ]; then
    echo "FEHLER: Datenbank nicht gefunden!"
    exit 1
fi

# Zähle Fotos
total=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM photos WHERE primary_category IS NOT NULL AND primary_category != 'unbekannt' AND primary_category != '';")
echo "Gefunden: $total Fotos mit Kategorien"

# Kategorien-Übersicht
echo "Kategorien-Verteilung:"
sqlite3 "$DB_PATH" "SELECT primary_category, COUNT(*) FROM photos WHERE primary_category IS NOT NULL AND primary_category != 'unbekannt' AND primary_category != '' GROUP BY primary_category;"

echo ""
echo "Starte Seed-Vorgang..."

seeded=0
failed=0

# Fotos verarbeiten
sqlite3 "$DB_PATH" "SELECT storage_path || '|' || primary_category FROM photos WHERE primary_category IS NOT NULL AND primary_category != 'unbekannt' AND primary_category != '';" | while IFS='|' read -r filepath category; do
    if [ -z "$filepath" ]; then continue; fi
    
    if [ ! -f "$filepath" ]; then
        echo "  ✗ Datei nicht gefunden: $filepath"
        continue
    fi
    
    # Base64 encodieren
    base64_img=$(base64 -w 0 "$filepath")
    
    # JSON erstellen und in temp-file speichern
    echo "{\"image_base64\": \"$base64_img\", \"category\": \"$category\", \"source\": \"seed\"}" > /tmp/learn_request.json
    
    # An KI senden mit wget
    result=$(wget -q -O - --header="Content-Type: application/json" --post-file=/tmp/learn_request.json "$KI_URL" 2>&1)
    
    if echo "$result" | grep -q '"success":true' || echo "$result" | grep -q 'success'; then
        echo "  ✓ $category"
    else
        echo "  ✗ $category"
    fi
    
    # Kurze Pause
    sleep 0.1
done

echo ""
echo "=== Seed abgeschlossen ==="
