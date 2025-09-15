/**
 * Browser-basierte Review Migration
 * Verschiebt Reviews von Top-Level Collection zu Company Subcollections
 * 
 * Führe das Script in der Browser-Console auf localhost:3000 aus
 */

/**
 * Migriert Reviews von reviews/{reviewId} zu companies/{companyId}/reviews/{reviewId}
 */
async function migrateReviewsToSubcollections() {
  try {
    console.log('🚀 Starte Review-Migration zu Subcollections...');
    
    // Firebase Client SDK verwenden (bereits geladen auf der Seite)
    const { db } = window;
    if (!db) {
      throw new Error('Firebase db nicht verfügbar. Stelle sicher, dass du auf localhost:3000 bist.');
    }
    
    // Firebase v9+ Funktionen importieren
    const { collection, getDocs, doc, setDoc, query, where, deleteDoc } = window.firestoreExports || {};
    if (!collection) {
      throw new Error('Firestore Funktionen nicht verfügbar. Prüfe die Firebase-Imports.');
    }
    
    // 1. Alle Reviews aus der Top-Level Collection laden
    console.log('📊 Lade Reviews aus Top-Level Collection...');
    const reviewsSnapshot = await getDocs(collection(db, 'reviews'));
    
    console.log(`📊 Gefunden: ${reviewsSnapshot.size} Reviews zum Migrieren`);
    
    if (reviewsSnapshot.empty) {
      console.log('✅ Keine Reviews zu migrieren gefunden');
      return;
    }
    
    let migratedCount = 0;
    let errorCount = 0;
    const results = [];
    
    // 2. Durch alle Reviews iterieren
    for (const reviewDoc of reviewsSnapshot.docs) {
      const reviewId = reviewDoc.id;
      const reviewData = reviewDoc.data();
      
      console.log(`\n🔄 Migriere Review: ${reviewId}`);
      console.log(`   Provider: ${reviewData.providerId}`);
      console.log(`   Customer: ${reviewData.customerId}`);
      console.log(`   Rating: ${reviewData.rating}`);
      
      // Validierung
      if (!reviewData.providerId) {
        console.log(`❌ Überspringe Review ${reviewId} - keine providerId`);
        errorCount++;
        results.push({ reviewId, status: 'error', reason: 'keine providerId' });
        continue;
      }
      
      try {
        // 3. Review in Subcollection kopieren
        const subcollectionRef = doc(
          db, 
          'companies', 
          reviewData.providerId, 
          'reviews', 
          reviewId
        );
        
        // Review-Daten mit Migration-Metadaten
        const migratedReviewData = {
          ...reviewData,
          // Migration-Metadaten hinzufügen
          migratedAt: new Date(),
          migratedFrom: 'reviews',
          migrationVersion: '1.0'
        };
        
        // Review in Subcollection erstellen
        await setDoc(subcollectionRef, migratedReviewData);
        
        console.log(`✅ Review ${reviewId} erfolgreich migriert`);
        migratedCount++;
        results.push({ 
          reviewId, 
          status: 'success', 
          providerId: reviewData.providerId,
          rating: reviewData.rating
        });
        
      } catch (error) {
        console.log(`❌ Fehler bei Review ${reviewId}:`, error.message);
        errorCount++;
        results.push({ reviewId, status: 'error', reason: error.message });
      }
    }
    
    console.log(`\n✅ Migration abgeschlossen!`);
    console.log(`   Migriert: ${migratedCount} Reviews`);
    console.log(`   Fehler: ${errorCount} Reviews`);
    
    // 4. Detaillierte Ergebnisse
    console.table(results);
    
    // 5. Validierung für spezifische Review
    await validateSpecificReview();
    
    return { migratedCount, errorCount, results };
    
  } catch (error) {
    console.error('❌ Migration fehlgeschlagen:', error);
    throw error;
  }
}

/**
 * Validiert die Migration für eine spezifische Review
 */
async function validateSpecificReview() {
  try {
    const { db } = window;
    const { doc, getDoc } = window.firestoreExports || {};
    
    console.log(`\n🔍 Validiere spezifische Review...`);
    
    const specificProviderId = 'LLc8PX1VYHfpoFknk8o51LAOfSA2';
    const specificReviewId = '5Ok62RDfegdOOq84ROik';
    
    // Prüfe in Subcollection
    const subcollectionRef = doc(
      db, 
      'companies', 
      specificProviderId, 
      'reviews', 
      specificReviewId
    );
    
    const subcollectionDoc = await getDoc(subcollectionRef);
    
    if (subcollectionDoc.exists()) {
      const data = subcollectionDoc.data();
      console.log(`✅ Review in Subcollection gefunden:`);
      console.log(`   Rating: ${data.rating}`);
      console.log(`   Text: ${data.reviewText}`);
      console.log(`   MigratedAt: ${data.migratedAt}`);
      return true;
    } else {
      console.log(`❌ Review nicht in Subcollection gefunden`);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Validierung fehlgeschlagen:', error);
    return false;
  }
}

/**
 * Löscht alte Reviews aus der Top-Level Collection
 * VORSICHT: Nur nach erfolgreicher Validierung!
 */
async function deleteOldReviews() {
  const confirmation = confirm('⚠️ WARNUNG: Möchtest du wirklich alle alten Reviews aus der Top-Level Collection löschen?\n\nStelle sicher, dass die Migration erfolgreich war!');
  
  if (!confirmation) {
    console.log('❌ Löschung abgebrochen');
    return;
  }
  
  try {
    const { db } = window;
    const { collection, getDocs, deleteDoc } = window.firestoreExports || {};
    
    console.log('🗑️ Lösche alte Reviews...');
    
    const reviewsSnapshot = await getDocs(collection(db, 'reviews'));
    let deleteCount = 0;
    
    for (const reviewDoc of reviewsSnapshot.docs) {
      await deleteDoc(reviewDoc.ref);
      deleteCount++;
      console.log(`🗑️ Gelöscht: ${reviewDoc.id}`);
    }
    
    console.log(`✅ ${deleteCount} alte Reviews gelöscht`);
    return deleteCount;
    
  } catch (error) {
    console.error('❌ Fehler beim Löschen alter Reviews:', error);
    throw error;
  }
}

// Funktionen für globalen Zugriff verfügbar machen
window.migrateReviewsToSubcollections = migrateReviewsToSubcollections;
window.validateSpecificReview = validateSpecificReview;
window.deleteOldReviews = deleteOldReviews;

console.log(`
🔧 Review Migration Tool geladen!

Verfügbare Funktionen:
- migrateReviewsToSubcollections() - Migriert alle Reviews
- validateSpecificReview()         - Validiert spezifische Review
- deleteOldReviews()              - Löscht alte Reviews (VORSICHT!)

Starte Migration mit:
migrateReviewsToSubcollections()
`);