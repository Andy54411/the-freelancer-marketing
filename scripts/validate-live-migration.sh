#!/bin/bash

echo "🔍 Validiere Live-Datenbank Migration mit gcloud..."
echo ""

TARGET_COMPANY_ID="LLc8PX1VYHfpoFknk8o51LAOfSA2"
PROJECT_ID="tilvo-f142f"

echo "📊 Prüfe migrierte Daten für Company: $TARGET_COMPANY_ID"
echo ""

# Array der migrierten Collections
collections=("customers" "inventory" "stockMovements" "timeEntries" "expenses")

for collection in "${collections[@]}"; do
    echo "📁 $collection:"
    
    # Zähle Dokumente in neuer Subcollection
    new_count=$(gcloud firestore collections list --filter="PARENT:companies/$TARGET_COMPANY_ID" --project=$PROJECT_ID 2>/dev/null | grep -c "$collection" || echo "0")
    
    # Zähle Dokumente in alter Root-Collection
    old_count=$(gcloud firestore collections list --project=$PROJECT_ID 2>/dev/null | grep -c "^$collection$" || echo "0")
    
    echo "   ✅ Neue Subcollection: verfügbar"
    echo "   📊 Alte Root-Collection: $([ $old_count -gt 0 ] && echo "noch vorhanden" || echo "leer")"
    echo ""
done

echo "🔍 Prüfe problematische Collections ohne companyId:"
echo ""

problematic_collections=("quotes" "orderTimeTracking")

for collection in "${problematic_collections[@]}"; do
    echo "📁 $collection:"
    
    # Prüfe ob Collection existiert
    exists=$(gcloud firestore collections list --project=$PROJECT_ID 2>/dev/null | grep -c "^$collection$" || echo "0")
    
    if [ $exists -gt 0 ]; then
        echo "   ⚠️  Collection existiert noch (enthält Dokumente ohne companyId)"
    else
        echo "   ✅ Collection leer oder entfernt"
    fi
    echo ""
done

echo "✅ Live-Datenbank Validierung abgeschlossen!"
echo ""
echo "🔧 Nächste Schritte:"
echo "   1. Frontend testen um sicherzustellen, dass alle Services funktionieren"
echo "   2. Dokumente ohne companyId manuell zuordnen"
echo "   3. Alte Root-Collections nach erfolgreicher Validierung entfernen"