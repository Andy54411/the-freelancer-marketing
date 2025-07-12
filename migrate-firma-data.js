// Script zur Migration von Firmen-Daten von users zu firma Collection
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function migrateFirmaData() {
  try {
    console.log('🔄 Migriere Firmendaten von users zu firma Collection...');
    
    // Hole alle Benutzer mit user_type "firma"
    const usersSnapshot = await db.collection('users')
      .where('user_type', '==', 'firma')
      .get();
    
    console.log(`📊 Gefunden: ${usersSnapshot.size} Firmen in users Collection`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      console.log(`\n🏢 Verarbeite Firma: ${userData.companyName || 'Unbenannt'} (${userId})`);
      
      // Prüfe, ob bereits in firma Collection existiert
      const firmaDocRef = db.collection('firma').doc(userId);
      const existingFirmaDoc = await firmaDocRef.get();
      
      if (existingFirmaDoc.exists) {
        console.log(`   ⏩ Bereits in firma Collection vorhanden, überspringe`);
        skippedCount++;
        continue;
      }
      
      // Erstelle Firmendokument für Service-Discovery
      const firmaData = {
        // Basis-Informationen
        uid: userId,
        companyName: userData.companyName || userData.step2?.companyName || 'Unbenannt',
        email: userData.email || userData.step1?.email,
        firstName: userData.firstName || userData.step1?.firstName,
        lastName: userData.lastName || userData.step1?.lastName,
        phoneNumber: userData.phoneNumber || userData.step1?.phoneNumber,
        
        // Adresse
        companyAddressLine1: userData.companyAddressLine1ForBackend || userData.step1?.personalStreet,
        companyCity: userData.companyCityForBackend || userData.step1?.personalCity,
        companyPostalCode: userData.companyPostalCodeForBackend || userData.step1?.personalPostalCode,
        companyCountry: userData.companyCountryForBackend || userData.step1?.personalCountry || 'DE',
        
        // Service-Informationen
        selectedCategory: userData.selectedCategory || '',
        selectedSubcategory: userData.selectedSubcategory || '',
        hourlyRate: userData.hourlyRate || 0,
        radiusKm: userData.radiusKm || 30,
        
        // Geolocation (falls vorhanden)
        lat: userData.lat || null,
        lng: userData.lng || null,
        
        // Profilbild
        profilePictureFirebaseUrl: userData.profilePictureFirebaseUrl || userData.step3?.profilePictureURL,
        
        // Zusätzliche Metadaten
        legalForm: userData.legalForm || userData.step2?.legalForm,
        industryMcc: userData.industryMcc || userData.step2?.industryMcc,
        user_type: 'firma',
        stripeAccountId: userData.stripeAccountId,
        
        // Timestamps
        createdAt: userData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        
        // Service-Discovery Flags
        isActive: true,
        isVerified: userData.stripeAccountDetailsSubmitted || false,
      };
      
      // Erstelle das Firmendokument
      await firmaDocRef.set(firmaData);
      migratedCount++;
      
      console.log(`   ✅ Erfolgreich migriert: ${firmaData.companyName}`);
      console.log(`      - Kategorie: ${firmaData.selectedCategory || 'Nicht gesetzt'}`);
      console.log(`      - Subkategorie: ${firmaData.selectedSubcategory || 'Nicht gesetzt'}`);
      console.log(`      - Adresse: ${firmaData.companyCity || 'Nicht gesetzt'}`);
    }
    
    console.log(`\n📊 MIGRATION ABGESCHLOSSEN:`);
    console.log(`   ✅ Migriert: ${migratedCount} Firmen`);
    console.log(`   ⏩ Übersprungen: ${skippedCount} Firmen (bereits vorhanden)`);
    console.log(`   📍 Gesamte Firmen: ${usersSnapshot.size}`);
    
    // Prüfe das Ergebnis
    console.log(`\n🔍 VERIFIKATION:`);
    const firmaSnapshot = await db.collection('firma').get();
    console.log(`   📈 Jetzt in firma Collection: ${firmaSnapshot.size} Dokumente`);
    
    // Zeige Mietkoch-Anbieter
    const miekochSnapshot = await db.collection('firma')
      .where('selectedSubcategory', '==', 'Mietkoch')
      .get();
    console.log(`   👨‍🍳 Mietkoch-Anbieter: ${miekochSnapshot.size}`);
    
    if (miekochSnapshot.size > 0) {
      console.log(`   🎉 Migration erfolgreich! Die Service-Seite sollte jetzt Anbieter anzeigen.`);
    }
    
  } catch (error) {
    console.error('❌ Fehler bei der Migration:', error);
  }
}

migrateFirmaData();
