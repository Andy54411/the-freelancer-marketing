#!/usr/bin/env node

const admin = require('firebase-admin');
const path = require('path');

// Firebase Admin initialisieren
const serviceAccount = require('./firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://taskilo-b828a-default-rtdb.europe-west1.firebasedatabase.app',
});

const db = admin.firestore();

// Testbewertungen erstellen
const testReviews = [
  {
    anbieterId: 'company-id-here', // Wird durch den echten companyId ersetzt
    kundeId: 'kunde_12345',
    auftragId: 'auftrag_98765',
    sterne: 5,
    kommentar:
      'Hervorragende Arbeit! Sehr professionell und pünktlich. Die Qualität der Dienstleistung hat meine Erwartungen übertroffen. Kann ich nur weiterempfehlen!',
    kundeProfilePictureURL:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    kategorie: 'Handwerk',
    unterkategorie: 'Elektroarbeiten',
    erstellungsdatum: admin.firestore.Timestamp.fromDate(new Date('2024-12-15T10:30:00Z')),
  },
  {
    anbieterId: 'company-id-here',
    kundeId: 'kunde_67890',
    auftragId: 'auftrag_54321',
    sterne: 4,
    kommentar:
      'Sehr zufrieden mit dem Service. Schnelle Reaktionszeit und saubere Ausführung. Ein kleiner Verbesserungsvorschlag: Kommunikation könnte noch etwas besser sein.',
    kundeProfilePictureURL:
      'https://images.unsplash.com/photo-1494790108755-2616b332c108?w=150&h=150&fit=crop&crop=face',
    kategorie: 'Reinigung',
    unterkategorie: 'Büroreinigung',
    erstellungsdatum: admin.firestore.Timestamp.fromDate(new Date('2024-12-08T14:15:00Z')),
  },
  {
    anbieterId: 'company-id-here',
    kundeId: 'kunde_11111',
    auftragId: 'auftrag_22222',
    sterne: 5,
    kommentar:
      'Absolut perfekt! Terminpünktlich, freundlich und das Ergebnis ist fantastisch. Preis-Leistungs-Verhältnis stimmt zu 100%. Werde definitiv wieder buchen.',
    kundeProfilePictureURL:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    kategorie: 'Garten & Landschaft',
    unterkategorie: 'Gartenpflege',
    erstellungsdatum: admin.firestore.Timestamp.fromDate(new Date('2024-11-28T09:45:00Z')),
  },
  {
    anbieterId: 'company-id-here',
    kundeId: 'kunde_33333',
    auftragId: 'auftrag_44444',
    sterne: 4,
    kommentar:
      'Gute Arbeit und faire Preise. Der Anbieter war sehr hilfsbereit und hat auch Zusatzfragen geduldig beantwortet. Kleine Abzüge für die etwas längere Wartezeit.',
    kundeProfilePictureURL:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    kategorie: 'IT & Technik',
    unterkategorie: 'Computer-Reparatur',
    erstellungsdatum: admin.firestore.Timestamp.fromDate(new Date('2024-11-20T16:20:00Z')),
  },
  {
    anbieterId: 'company-id-here',
    kundeId: 'kunde_55555',
    auftragId: 'auftrag_66666',
    sterne: 5,
    kommentar:
      'Einfach großartig! Von der ersten Kontaktaufnahme bis zur finalen Umsetzung war alles perfekt organisiert. Sehr kompetent und zuverlässig. Vielen Dank!',
    kundeProfilePictureURL:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    kategorie: 'Umzug & Transport',
    unterkategorie: 'Haushaltsumzug',
    erstellungsdatum: admin.firestore.Timestamp.fromDate(new Date('2024-11-10T13:00:00Z')),
  },
];

async function addTestReviews() {
  try {
    // Hier den echten companyId eingeben
    const companyId = process.argv[2];

    if (!companyId) {
      console.error('Bitte geben Sie die companyId als Parameter an:');
      console.error('node add-test-reviews.js YOUR_COMPANY_ID');
      process.exit(1);
    }

    console.log(`Füge Testbewertungen für Company ID: ${companyId} hinzu...`);

    // Reviews mit der echten companyId aktualisieren
    const reviewsToAdd = testReviews.map(review => ({
      ...review,
      anbieterId: companyId,
    }));

    // Reviews zur Datenbank hinzufügen
    const batch = db.batch();

    for (const review of reviewsToAdd) {
      const reviewRef = db.collection('reviews').doc();
      batch.set(reviewRef, review);
      console.log(
        `Review hinzugefügt: ${review.sterne} Sterne - "${review.kommentar.substring(0, 50)}..."`
      );
    }

    await batch.commit();

    console.log('\n✅ Alle 5 Testbewertungen wurden erfolgreich hinzugefügt!');
    console.log('\nÜbersicht:');
    console.log(`- 3x 5-Sterne Bewertungen`);
    console.log(`- 2x 4-Sterne Bewertungen`);
    console.log(`- Durchschnitt: 4.6 Sterne`);

    // Berechne und zeige Durchschnitt
    const totalStars = reviewsToAdd.reduce((sum, review) => sum + review.sterne, 0);
    const averageRating = totalStars / reviewsToAdd.length;
    console.log(`- Durchschnittsbewertung: ${averageRating.toFixed(1)} von 5 Sternen`);
  } catch (error) {
    console.error('Fehler beim Hinzufügen der Testbewertungen:', error);
    process.exit(1);
  } finally {
    // Firebase-Verbindung schließen
    process.exit(0);
  }
}

// Script ausführen
addTestReviews();
