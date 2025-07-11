#!/bin/bash

# Script für die Umbenennung von "Tasko" zu "Taskilo" im gesamten Frontend

echo "🔄 Umbenennung von 'Tasko' zu 'Taskilo' im Frontend"
echo "================================================="

# Backup erstellen
echo "📋 Erstelle Backup..."
cp -r src src_backup_$(date +%Y%m%d_%H%M%S)

# Zähler für Änderungen
CHANGES=0

# Funktion für Datei-Ersetzungen
replace_in_file() {
    local file=$1
    local old_text=$2
    local new_text=$3
    
    if [ -f "$file" ]; then
        # Prüfen ob Datei den Text enthält
        if grep -q "$old_text" "$file"; then
            echo "🔧 Bearbeite: $file"
            # Ersetzung durchführen
            sed -i '' "s/$old_text/$new_text/g" "$file"
            CHANGES=$((CHANGES + 1))
        fi
    fi
}

# Hauptfunktion für alle Ersetzungen
perform_replacements() {
    echo "🔍 Suche nach Dateien mit 'Tasko'..."
    
    # Finde alle relevanten Dateien
    find src -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" | while read file; do
        # Verschiedene Varianten ersetzen
        replace_in_file "$file" "Tasko" "Taskilo"
        replace_in_file "$file" "TASKO" "TASKILO"
        replace_in_file "$file" "tasko" "taskilo"
    done
    
    # Auch andere wichtige Dateien
    replace_in_file "vercel.json" "tasko" "taskilo"
    replace_in_file "package.json" "tasko" "taskilo"
    replace_in_file "README.md" "Tasko" "Taskilo"
    replace_in_file "README.md" "TASKO" "TASKILO"
    replace_in_file "README.md" "tasko" "taskilo"
}

# Führe Ersetzungen durch
perform_replacements

echo "================================================="
echo "✅ Umbenennung abgeschlossen!"
echo "📊 Anzahl bearbeiteter Dateien: $CHANGES"
echo "📋 Backup erstellt in: src_backup_$(date +%Y%m%d_%H%M%S)"
echo ""
echo "🔍 Überprüfe die Änderungen:"
echo "   git diff"
echo ""
echo "🚀 Nach der Überprüfung deployments ausführen:"
echo "   npm run build"
echo "   vercel --prod"
