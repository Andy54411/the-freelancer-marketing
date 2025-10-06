// Fix für Angebote mit leeren ID-Feldern
// Dieses Skript entfernt das leere "id"-Feld aus allen Angebots-Dokumenten

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, deleteField } from 'firebase/firestore';

// Firebase Konfiguration (aus deiner .env oder firebase config)
const firebaseConfig = {
  // Hier deine Firebase-Konfiguration eintragen
  // oder aus process.env laden
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixQuoteIds() {
  console.log('🔧 Starte Bereinigung der Angebots-IDs...');
  
  try {
    // Alle Companies durchgehen
    const companiesRef = collection(db, 'companies');
    const companiesSnapshot = await getDocs(companiesRef);
    
    let totalFixed = 0;
    
    for (const companyDoc of companiesSnapshot.docs) {
      const companyId = companyDoc.id;
      console.log(`📋 Prüfe Company: ${companyId}`);
      
      // Alle Quotes dieser Company
      const quotesRef = collection(db, 'companies', companyId, 'quotes');
      const quotesSnapshot = await getDocs(quotesRef);
      
      console.log(`   Gefunden: ${quotesSnapshot.docs.length} Angebote`);
      
      for (const quoteDoc of quotesSnapshot.docs) {
        const quoteData = quoteDoc.data();
        const documentId = quoteDoc.id;
        
        // Prüfen ob ein "id" Feld existiert
        if ('id' in quoteData) {
          console.log(`   ⚠️  Angebot ${documentId} hat id-Feld:`, quoteData.id);
          
          // Leeres oder falsches ID-Feld entfernen
          if (!quoteData.id || quoteData.id.trim() === '' || quoteData.id !== documentId) {
            console.log(`   🔧 Bereinige Angebot ${documentId}...`);
            
            const quoteRef = doc(db, 'companies', companyId, 'quotes', documentId);
            await updateDoc(quoteRef, {
              id: deleteField() // Entfernt das "id"-Feld komplett
            });
            
            totalFixed++;
            console.log(`   ✅ Bereinigt!`);
          }
        }
      }
    }
    
    console.log(`🎉 Bereinigung abgeschlossen! ${totalFixed} Angebote wurden bereinigt.`);
    
  } catch (error) {
    console.error('❌ Fehler bei der Bereinigung:', error);
  }
}

// Skript ausführen
fixQuoteIds();