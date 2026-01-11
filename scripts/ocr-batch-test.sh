#!/bin/bash
# OCR Batch Test Script
# Testet alle Belege im Ordner und zeigt die extrahierten Daten

BELEGE_DIR="/Users/andystaudinger/Tasko/public/belege"
OCR_URL="https://mail.taskilo.de/ocr/extract"
API_KEY="taskilo-ocr-eb62b9b7fb92053eebc3bbc45e3f55c6"

echo "=========================================="
echo "OCR BATCH TEST - $(date)"
echo "=========================================="
echo ""

# Zähler für Statistik
total=0
success=0
with_vendor=0
with_amount=0
with_date=0

# Finde alle Bilddateien
find "$BELEGE_DIR" -type f \( -name "*.JPG" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.JPEG" -o -name "*.png" -o -name "*.PNG" -o -name "*.HEIC" -o -name "*.heic" \) | while read file; do
    
    filename=$(basename "$file")
    total=$((total + 1))
    
    echo "----------------------------------------"
    echo "📄 Beleg $total: $filename"
    echo "----------------------------------------"
    
    # HEIC muss erst konvertiert werden
    if [[ "$filename" == *.HEIC ]] || [[ "$filename" == *.heic ]]; then
        echo "⚠️  HEIC-Format - konvertiere zu JPEG..."
        sips -s format jpeg "$file" --out "/tmp/ocr_test.jpg" 2>/dev/null
        file="/tmp/ocr_test.jpg"
    fi
    
    # OCR-Aufruf via multipart (einfacher zu testen)
    result=$(curl -s -X POST "$OCR_URL" \
        -H "X-Api-Key: $API_KEY" \
        -F "file=@$file" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        success=$((success + 1))
        
        # Extrahiere die wichtigsten Felder
        vendor=$(echo "$result" | grep -o '"vendor_name":"[^"]*"' | cut -d'"' -f4 | head -1)
        amount=$(echo "$result" | grep -o '"total_gross":[0-9.]*' | cut -d':' -f2 | head -1)
        date=$(echo "$result" | grep -o '"invoice_date":"[^"]*"' | cut -d'"' -f4 | head -1)
        invoice_nr=$(echo "$result" | grep -o '"invoice_number":"[^"]*"' | cut -d'"' -f4 | head -1)
        
        echo "   Firma:    ${vendor:-❌ nicht erkannt}"
        echo "   Betrag:   ${amount:-❌ nicht erkannt}"
        echo "   Datum:    ${date:-❌ nicht erkannt}"
        echo "   Rech-Nr:  ${invoice_nr:-❌ nicht erkannt}"
        
        [ -n "$vendor" ] && with_vendor=$((with_vendor + 1))
        [ -n "$amount" ] && with_amount=$((with_amount + 1))
        [ -n "$date" ] && with_date=$((with_date + 1))
        
        # Zeige auch den OCR-Text (erste 200 Zeichen)
        text=$(echo "$result" | grep -o '"text":"[^"]*"' | cut -d'"' -f4 | head -c 200)
        echo "   OCR-Text: ${text:0:100}..."
    else
        echo "   ❌ FEHLER beim OCR-Aufruf"
    fi
    
    echo ""
done

echo "=========================================="
echo "STATISTIK"
echo "=========================================="
echo "Gesamt:      $total Belege"
echo "Erfolgreich: $success OCR-Aufrufe"
echo ""
echo "Erkennungsrate:"
echo "  Firma:     $with_vendor / $total ($(( with_vendor * 100 / (total > 0 ? total : 1) ))%)"
echo "  Betrag:    $with_amount / $total ($(( with_amount * 100 / (total > 0 ? total : 1) ))%)"
echo "  Datum:     $with_date / $total ($(( with_date * 100 / (total > 0 ? total : 1) ))%)"
echo "=========================================="
