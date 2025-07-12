const admin = require('firebase-admin');

// Service Account Key laden (falls vorhanden)
const serviceAccount = require('../firebase-service-account-key.json');

// Firebase Admin initialisieren
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
});

const db = admin.firestore();

async function createTestReviews() {
    try {
        console.log('Erstelle Test-Bewertungen für Mietkoch Andy mit Admin-Rechten...');
        console.log(`Project ID: ${serviceAccount.project_id}`);

        // Provider-ID - Diese muss mit einer echten Provider-ID aus der Datenbank übereinstimmen
        const providerId = process.argv[2] || "test-mietkoch-andy-provider-id";
        
        console.log(`Verwende Provider-ID: ${providerId}`);
        console.log('💡 Tipp: Sie können eine spezifische Provider-ID als Argument übergeben:');
        console.log('   node create-test-reviews-admin.js <echte-provider-id>');

        // Test-Bewertung 1: Marina Schmidt
        const review1 = {
            providerId: providerId,
            reviewerId: "marina-schmidt-user-id",
            reviewerName: "Marina_Schmidt",
            rating: 5,
            text: "Andy hat für unser Firmenjubiläum ein unglaubliches 5-Gänge-Menü gezaubert! Seine kulinarischen Fähigkeiten sind einfach erstklassig. Von der Vorspeise bis zum Dessert war jeder Gang ein absolutes Highlight. Besonders beeindruckt waren unsere Gäste von seinem selbstgemachten Trüffel-Risotto und dem perfekt zubereiteten Rindersteak. Andy ist nicht nur ein hervorragender Koch, sondern auch sehr professionell, pünktlich und hat eine angenehme Art. Die Präsentation der Speisen war wie in einem Sternerestaurant. Absolute Empfehlung!",
            date: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)), // vor 3 Tagen
            projectPrice: "800€-1.200€",
            projectDuration: "1 Tag",
            isVerified: true,
            helpfulVotes: {
                yes: 12,
                no: 1
            },
            providerResponse: {
                text: "Vielen Dank für diese wunderbare Bewertung, Marina! Es war mir eine große Freude, für Ihr Firmenjubiläum zu kochen. Solche besonderen Anlässe sind genau das, was mich als Koch antreibt. Ich hoffe, wir sehen uns bald wieder!",
                date: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
                providerName: "Mietkoch Andy"
            }
        };

        // Test-Bewertung 2: Thomas Weber (Wiederkehrender Kunde)
        const review2 = {
            providerId: providerId,
            reviewerId: "thomas-weber-user-id",
            reviewerName: "Thomas_Weber",
            rating: 5,
            text: "Bereits zum dritten Mal habe ich Andy für meine Dinnerparty gebucht und bin jedes Mal aufs Neue begeistert! Seine italienische Küche ist authentisch und geschmackvoll. Besonders sein hausgemachter Burrata und die Osso Buco waren der absolute Hammer. Andy bringt nicht nur kulinarische Exzellenz mit, sondern auch eine wunderbare Persönlichkeit, die jeden Abend zu etwas Besonderem macht.",
            date: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)), // vor 1 Woche
            projectPrice: "600€-900€",
            projectDuration: "1 Abend",
            isVerified: true,
            isReturningCustomer: true,
            helpfulVotes: {
                yes: 8,
                no: 0
            }
        };

        // Test-Bewertung 3: Lisa Müller
        const review3 = {
            providerId: providerId,
            reviewerId: "lisa-mueller-user-id",
            reviewerName: "Lisa_Müller",
            rating: 5,
            text: "Andy hat unsere Hochzeit kulinarisch unvergesslich gemacht! Das 4-Gänge-Menü war perfekt abgestimmt und alle Gäste waren begeistert. Besonders das Lammcarré und das Dessert waren Weltklasse. Vielen Dank für diesen besonderen Tag!",
            date: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)), // vor 2 Wochen
            projectPrice: "1.500€-2.000€",
            projectDuration: "1 Tag",
            isVerified: true,
            helpfulVotes: {
                yes: 15,
                no: 0
            },
            providerResponse: {
                text: "Es war mir eine Ehre, bei Ihrer Hochzeit kochen zu dürfen! Solche besonderen Momente machen meinen Beruf so erfüllend. Alles Gute für die Zukunft!",
                date: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 13 * 24 * 60 * 60 * 1000)),
                providerName: "Mietkoch Andy"
            }
        };

        // Test-Bewertung 4: Michael Hoffmann
        const review4 = {
            providerId: providerId,
            reviewerId: "michael-hoffmann-user-id",
            reviewerName: "Michael_Hoffmann",
            rating: 4,
            text: "Sehr gute Kochkünste und professioneller Service. Das Menü war lecker, nur das Timing hätte etwas besser sein können. Trotzdem eine klare Empfehlung für besondere Anlässe.",
            date: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 21 * 24 * 60 * 60 * 1000)), // vor 3 Wochen
            projectPrice: "400€-600€",
            projectDuration: "1 Abend",
            isVerified: true,
            helpfulVotes: {
                yes: 5,
                no: 2
            }
        };

        // Test-Bewertung 5: Sarah Becker (Wiederkehrender Kunde)
        const review5 = {
            providerId: providerId,
            reviewerId: "sarah-becker-user-id",
            reviewerName: "Sarah_Becker",
            rating: 5,
            text: "Schon das zweite Mal gebucht und wieder vollkommen zufrieden! Andy's Kochkünste sind einfach außergewöhnlich. Diesmal hat er ein mediterranes Menü gezaubert, das alle Erwartungen übertroffen hat.",
            date: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)), // vor 4 Wochen
            projectPrice: "700€-1.000€",
            projectDuration: "1 Abend",
            isVerified: true,
            isReturningCustomer: true,
            helpfulVotes: {
                yes: 9,
                no: 0
            }
        };

        // Bewertungen in die Datenbank einfügen
        const reviews = [review1, review2, review3, review4, review5];
        
        console.log(`\n📤 Erstelle ${reviews.length} Bewertungen in der Datenbank...`);
        
        for (let i = 0; i < reviews.length; i++) {
            const docRef = await db.collection('reviews').add(reviews[i]);
            console.log(`✅ Bewertung ${i + 1}/5 erstellt: ${reviews[i].reviewerName} (${reviews[i].rating}⭐) - ID: ${docRef.id}`);
        }

        console.log('\n🎉 Alle Test-Bewertungen erfolgreich erstellt!');
        console.log('\n📋 Übersicht der erstellten Bewertungen:');
        console.log('1. Marina_Schmidt (5⭐) - Firmenjubiläum mit 5-Gänge-Menü');
        console.log('2. Thomas_Weber (5⭐) - Wiederkehrender Kunde, italienische Dinnerparty');
        console.log('3. Lisa_Müller (5⭐) - Hochzeit mit 4-Gänge-Menü');
        console.log('4. Michael_Hoffmann (4⭐) - Gutes Menü, Timing verbesserungswürdig');
        console.log('5. Sarah_Becker (5⭐) - Wiederkehrender Kunde, mediterranes Menü');
        
        console.log(`\n🔗 Provider-ID: ${providerId}`);
        console.log('✨ Die Bewertungen sollten jetzt in der App sichtbar sein!');
        
        // Durchschnittsbewertung berechnen
        const avgRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
        console.log(`📊 Durchschnittsbewertung: ${avgRating.toFixed(1)}⭐`);

        process.exit(0);

    } catch (error) {
        console.error('❌ Fehler beim Erstellen der Test-Bewertungen:', error);
        
        if (error.code === 'permission-denied') {
            console.log('\n💡 Mögliche Lösungen:');
            console.log('1. Überprüfen Sie die Firestore-Sicherheitsregeln');
            console.log('2. Stellen Sie sicher, dass die Service Account Datei korrekt ist');
            console.log('3. Überprüfen Sie die Admin-Rechte des Service Accounts');
        }
        
        if (error.code === 'project-not-found') {
            console.log('\n💡 Das Firebase-Projekt wurde nicht gefunden.');
            console.log('Überprüfen Sie die Service Account Konfiguration');
        }
        
        process.exit(1);
    }
}

// Script ausführen
createTestReviews();
