const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccount = require('../firebase_functions/service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'tilvo-f142f',
  storageBucket: 'tilvo-f142f.firebasestorage.app',
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function checkAndFixCompanyImages() {
  console.log('🔍 Überprüfe Company Profile Images...');

  try {
    // Hole alle Companies
    const companiesSnapshot = await db.collection('companies').get();
    console.log(`📊 Gefunden: ${companiesSnapshot.size} Companies`);

    let fixedCount = 0;
    let brokenCount = 0;

    for (const doc of companiesSnapshot.docs) {
      const data = doc.data();
      const companyId = doc.id;
      const profilePictureURL = data.profilePictureURL;

      console.log(`\n🏢 Company: ${data.name || companyId}`);
      console.log(`📷 Current URL: ${profilePictureURL}`);

      if (!profilePictureURL) {
        console.log('❌ Keine profilePictureURL vorhanden');
        // Setze Standard-Logo für Companies ohne Bild
        await doc.ref.update({ profilePictureURL: '/icon/default-company-logo.svg' });
        console.log('✅ Standard-Logo gesetzt');
        fixedCount++;
        continue;
      }

      // Extrahiere den Storage-Pfad aus der URL
      let storagePath = null;
      try {
        if (profilePictureURL.includes('firebasestorage.app')) {
          // Firebase Storage URL - verschiedene Formate unterstützen
          if (profilePictureURL.includes('/o/')) {
            // Standard Firebase URL Format
            const urlParts = profilePictureURL.split('/o/')[1];
            if (urlParts) {
              storagePath = decodeURIComponent(urlParts.split('?')[0]);
            }
          } else if (profilePictureURL.includes('user_uploads%2F')) {
            // URL-encoded Format
            const match = profilePictureURL.match(/user_uploads%2F[^?]+/);
            if (match) {
              storagePath = decodeURIComponent(match[0].replace(/%2F/g, '/'));
            }
          }
        } else if (profilePictureURL.startsWith('user_uploads/')) {
          // Direkter Storage-Pfad
          storagePath = profilePictureURL;
        }

        if (storagePath) {
          console.log(`🔍 Prüfe Storage-Pfad: ${storagePath}`);

          // Prüfe ob die Datei existiert
          const file = bucket.file(storagePath);
          const [exists] = await file.exists();

          if (exists) {
            console.log('✅ Datei existiert - OK');

            // Generiere korrekte Download URL
            const [downloadURL] = await file.getSignedUrl({
              action: 'read',
              expires: '03-09-2491',
            });

            // Update Firestore mit korrekter URL falls nötig
            if (profilePictureURL !== downloadURL) {
              await doc.ref.update({ profilePictureURL: downloadURL });
              console.log('🔄 URL aktualisiert');
              fixedCount++;
            }
          } else {
            console.log('❌ Datei existiert nicht!');
            brokenCount++;

            // Suche nach anderen Dateien für diesen User
            const userIdMatch = storagePath.match(/user_uploads\/([^\/]+)\//);
            if (userIdMatch) {
              const userId = userIdMatch[1];
              console.log(`🔍 Suche nach anderen Dateien für User: ${userId}`);

              const [files] = await bucket.getFiles({
                prefix: `user_uploads/${userId}/`,
              });

              const imageFiles = files.filter(file => {
                const name = file.name.toLowerCase();
                return (
                  name.includes('business_icon') ||
                  name.includes('profile') ||
                  name.match(/\.(jpg|jpeg|png|gif|webp)$/)
                );
              });

              if (imageFiles.length > 0) {
                const latestFile = imageFiles.sort(
                  (a, b) => new Date(b.metadata.timeCreated) - new Date(a.metadata.timeCreated)
                )[0];

                console.log(`🔄 Verwende stattdessen: ${latestFile.name}`);

                const [newDownloadURL] = await latestFile.getSignedUrl({
                  action: 'read',
                  expires: '03-09-2491',
                });

                await doc.ref.update({ profilePictureURL: newDownloadURL });
                console.log('✅ URL repariert');
                fixedCount++;
                brokenCount--;
              } else {
                console.log('❌ Keine alternativen Bilder gefunden');
                // Setze auf null oder default
                await doc.ref.update({ profilePictureURL: null });
                console.log('🗑️ URL auf null gesetzt');
              }
            }
          }
        } else {
          console.log('❌ Konnte Storage-Pfad nicht extrahieren');
          brokenCount++;
        }
      } catch (error) {
        console.error(`❌ Fehler bei ${companyId}:`, error.message);
        brokenCount++;
      }
    }

    console.log(`\n📊 Zusammenfassung:`);
    console.log(`✅ Repariert: ${fixedCount}`);
    console.log(`❌ Problematisch: ${brokenCount}`);
    console.log(`📝 Gesamt: ${companiesSnapshot.size}`);
  } catch (error) {
    console.error('❌ Fehler:', error);
  }
}

// Führe das Script aus
checkAndFixCompanyImages()
  .then(() => {
    console.log('🎉 Script abgeschlossen');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script-Fehler:', error);
    process.exit(1);
  });
