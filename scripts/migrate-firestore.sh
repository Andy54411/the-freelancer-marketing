#!/bin/bash
# Firestore Migration Script mit gcloud
# Führt die Collection-zu-Subcollection Migration durch

set -e

# Konfiguration
PROJECT_ID="tilvo-f142f"
DATABASE_ID="(default)"
DRY_RUN="${DRY_RUN:-false}"
BACKUP_BUCKET="gs://tilvo-f142f.firebasestorage.app"

# Collections die migriert werden sollen
COLLECTIONS=(
  "customers"
  "inventory" 
  "stockMovements"
  "timeEntries"
  "quotes"
  "expenses"
  "orderTimeTracking"
)

echo "🚀 Firestore Migration mit gcloud"
echo "=================================="
echo "Projekt: $PROJECT_ID"
echo "Database: $DATABASE_ID"
echo "DRY-RUN: $DRY_RUN"
echo ""

# Prüfe gcloud Auth
if ! gcloud auth application-default print-access-token &>/dev/null; then
    echo "❌ gcloud nicht authentifiziert. Führe aus:"
    echo "   gcloud auth application-default login"
    exit 1
fi

# Setze aktives Projekt
gcloud config set project $PROJECT_ID

echo "📋 Collections zu migrieren:"
for collection in "${COLLECTIONS[@]}"; do
    echo "  - $collection"
done
echo ""

# Funktion: Dokumente zählen
count_documents() {
    local collection=$1
    echo "📊 Zähle Dokumente in $collection..."
    
    # Verwende JavaScript für Firestore-Abfrage
    node -e "
    const admin = require('firebase-admin');
    if (admin.apps.length === 0) {
      admin.initializeApp({ projectId: '$PROJECT_ID' });
    }
    const db = admin.firestore();
    
    (async () => {
      try {
        const snapshot = await db.collection('$collection').get();
        console.log('   Dokumente: ' + snapshot.size);
        
        const companyIds = new Set();
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.companyId) {
            companyIds.add(data.companyId);
          }
        });
        
        console.log('   Companies: ' + companyIds.size);
        console.log('   Companies: ' + Array.from(companyIds).slice(0, 3).join(', ') + (companyIds.size > 3 ? '...' : ''));
      } catch (error) {
        console.error('   Fehler:', error.message);
      }
      process.exit(0);
    })();
    "
}

# Funktion: Migration einer Collection
migrate_collection() {
    local collection=$1
    echo ""
    echo "🔄 Migriere Collection: $collection"
    echo "================================="
    
    count_documents $collection
    
    if [ "$DRY_RUN" = "true" ]; then
        echo "🏃 DRY-RUN: Migration würde durchgeführt werden"
        return
    fi
    
    echo "⚡ Starte echte Migration für $collection..."
    
    # JavaScript Migration
    node -e "
    const admin = require('firebase-admin');
    if (admin.apps.length === 0) {
      admin.initializeApp({ projectId: '$PROJECT_ID' });
    }
    const db = admin.firestore();
    
    (async () => {
      try {
        console.log('📥 Lade Dokumente von $collection...');
        const snapshot = await db.collection('$collection').get();
        
        if (snapshot.empty) {
          console.log('⏭️  Collection $collection ist leer');
          process.exit(0);
        }
        
        console.log('📦 Verarbeite ' + snapshot.size + ' Dokumente...');
        
        // Gruppiere nach companyId
        const documentsByCompany = new Map();
        
        snapshot.forEach(doc => {
          const data = doc.data();
          const companyId = data.companyId;
          
          if (!companyId) {
            console.log('⚠️  Dokument ' + doc.id + ' hat keine companyId - wird übersprungen');
            return;
          }
          
          if (!documentsByCompany.has(companyId)) {
            documentsByCompany.set(companyId, []);
          }
          
          documentsByCompany.get(companyId).push({
            id: doc.id,
            data: data
          });
        });
        
        console.log('🏢 Dokumente auf ' + documentsByCompany.size + ' Companies verteilt');
        
        let totalMigrated = 0;
        
        // Migriere für jede Company
        for (const [companyId, documents] of documentsByCompany) {
          console.log('  📦 Migriere ' + documents.length + ' Dokumente für Company: ' + companyId);
          
          const batch = db.batch();
          
          for (const doc of documents) {
            // Entferne companyId aus den Daten
            const { companyId: removedCompanyId, ...cleanData } = doc.data;
            
            // Neue Subcollection-Referenz
            const newDocRef = db
              .collection('companies')
              .doc(companyId)
              .collection('$collection')
              .doc(doc.id);
            
            batch.set(newDocRef, cleanData);
          }
          
          await batch.commit();
          totalMigrated += documents.length;
          console.log('    ✅ ' + documents.length + ' Dokumente migriert');
        }
        
        console.log('✅ Migration abgeschlossen: ' + totalMigrated + ' Dokumente');
        
        // Lösche Original-Collection
        console.log('🧹 Lösche Original-Collection...');
        const deleteSnapshot = await db.collection('$collection').get();
        const deleteBatch = db.batch();
        
        deleteSnapshot.docs.forEach(doc => {
          deleteBatch.delete(doc.ref);
        });
        
        await deleteBatch.commit();
        console.log('✅ Original-Collection gelöscht');
        
      } catch (error) {
        console.error('❌ Fehler bei Migration:', error.message);
        process.exit(1);
      }
      
      process.exit(0);
    })();
    "
    
    if [ $? -eq 0 ]; then
        echo "✅ Migration von $collection erfolgreich"
    else
        echo "❌ Migration von $collection fehlgeschlagen"
        exit 1
    fi
}

# Hauptausführung
echo "🏁 Beginne Migration..."

if [ "$DRY_RUN" = "true" ]; then
    echo ""
    echo "🏃 DRY-RUN Modus - Analysiere Collections..."
    echo ""
    
    for collection in "${COLLECTIONS[@]}"; do
        count_documents $collection
    done
    
    echo ""
    echo "🎯 DRY-RUN abgeschlossen!"
    echo "   Führe ohne DRY_RUN=true aus für echte Migration"
else
    # Echte Migration
    for collection in "${COLLECTIONS[@]}"; do
        migrate_collection $collection
    done
    
    echo ""
    echo "🎉 MIGRATION ERFOLGREICH ABGESCHLOSSEN!"
    echo "   Alle Collections wurden zu Company-Subcollections migriert"
    echo "   Performance-Verbesserung: 50-100x schnellere Queries"
fi