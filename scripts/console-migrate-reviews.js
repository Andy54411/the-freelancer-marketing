/**
 * BROWSER CONSOLE SCRIPT - Review Migration
 * 
 * Kopiere und führe dieses Script in der Browser-Console aus (localhost:3000)
 */

(async function migrateReviews() {
  try {
    console.log('🚀 Starte Review-Migration...');
    
    // Prüfe ob Firebase verfügbar ist
    if (!window.firebase && !window.db) {
      throw new Error('Firebase nicht gefunden. Stelle sicher, dass du auf localhost:3000 bist.');
    }
    
    // Verwende die bereits geladene Firebase-Instanz
    const { db } = window;
    
    // Firebase v9 Funktionen importieren (falls verfügbar)
    let collection, getDocs, doc, setDoc, query, where;
    
    if (window.firebase?.firestore) {
      // Firebase v8 Syntax
      console.log('📦 Verwende Firebase v8 Syntax');
      
      // 1. Lade alle Reviews aus Top-Level Collection
      const reviewsRef = db.collection('reviews');
      const reviewsSnapshot = await reviewsRef.get();
      
      console.log(`📊 Gefunden: ${reviewsSnapshot.size} Reviews`);
      
      if (reviewsSnapshot.empty) {
        console.log('✅ Keine Reviews zu migrieren');
        return;
      }
      
      let migratedCount = 0;
      
      // 2. Migriere jede Review
      for (const reviewDoc of reviewsSnapshot.docs) {
        const reviewId = reviewDoc.id;
        const reviewData = reviewDoc.data();
        
        console.log(`🔄 Migriere Review ${reviewId}:`, {
          providerId: reviewData.providerId,
          rating: reviewData.rating
        });
        
        if (!reviewData.providerId) {
          console.log(`❌ Überspringe ${reviewId} - keine providerId`);
          continue;
        }
        
        // Erstelle Review in Subcollection
        const subcollectionRef = db
          .collection('companies')
          .doc(reviewData.providerId)
          .collection('reviews')
          .doc(reviewId);
        
        // Migrierte Daten mit Metadaten
        const migratedData = {
          ...reviewData,
          migratedAt: new Date(),
          migratedFrom: 'reviews',
          migrationVersion: '1.0'
        };
        
        await subcollectionRef.set(migratedData);
        migratedCount++;
        
        console.log(`✅ Review ${reviewId} migriert`);
      }
      
      console.log(`\n🎉 Migration abgeschlossen: ${migratedCount} Reviews migriert`);
      
      // 3. Validiere spezifische Review
      const testProviderId = 'LLc8PX1VYHfpoFknk8o51LAOfSA2';
      const testReviewId = '5Ok62RDfegdOOq84ROik';
      
      const testRef = db
        .collection('companies')
        .doc(testProviderId)
        .collection('reviews')
        .doc(testReviewId);
      
      const testDoc = await testRef.get();
      
      if (testDoc.exists) {
        console.log(`✅ Validierung erfolgreich:`, testDoc.data());
      } else {
        console.log(`❌ Validierung fehlgeschlagen - Review nicht gefunden`);
      }
      
    } else {
      throw new Error('Firebase v8 nicht verfügbar');
    }
    
  } catch (error) {
    console.error('❌ Migration fehlgeschlagen:', error);
  }
})();