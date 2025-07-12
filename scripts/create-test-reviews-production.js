// Script zum Erstellen von Test-Bewertungen für die Live-Umgebung
// Dieses Script nutzt die gleiche Firebase-Konfiguration wie die App

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';

// Firebase-Konfiguration aus der App
const firebaseConfig = {
    apiKey: "AIzaSyDu2sT4tZL8dU5FxLzM1PwJ5YhqgTmRkKs", // Ersetzen Sie mit Ihrer echten API Key
    authDomain: "tasko-39322.firebaseapp.com", // Ersetzen Sie mit Ihrer echten Domain
    projectId: "tasko-39322", // Ersetzen Sie mit Ihrer echten Project ID
    storageBucket: "tasko-39322.appspot.com", // Ersetzen Sie mit Ihrem echten Storage Bucket
    messagingSenderId: "123456789012", // Ersetzen Sie mit Ihrer echten Messaging Sender ID
    appId: "1:123456789012:web:abc123def456ghi789" // Ersetzen Sie mit Ihrer echten App ID
};

// Firebase initialisieren
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createTestReviews() {
    try {
        console.log('🚀 Erstelle Test-Bewertungen für Mietkoch Andy in der Live-Umgebung...');

        // WICHTIG: Ersetzen Sie diese Provider-ID mit der echten ID aus Ihrer Datenbank
        const providerId = "ECHTE_PROVIDER_ID_HIER_EINFUEGEN"; // ← Hier die echte Provider-ID eintragen!

        // Test-Bewertung 1: Marina Schmidt
        const review1 = {
            providerId: providerId,
            reviewerId: "marina-schmidt-user-id",
            reviewerName: "Marina_Schmidt",
            rating: 5,
            text: "Andy hat für unser Firmenjubiläum ein unglaubliches 5-Gänge-Menü gezaubert! Seine kulinarischen Fähigkeiten sind einfach erstklassig. Von der Vorspeise bis zum Dessert war jeder Gang ein absolutes Highlight. Besonders beeindruckt waren unsere Gäste von seinem selbstgemachten Trüffel-Risotto und dem perfekt zubereiteten Rindersteak. Andy ist nicht nur ein hervorragender Koch, sondern auch sehr professionell, pünktlich und hat eine angenehme Art. Die Präsentation der Speisen war wie in einem Sternerestaurant. Absolute Empfehlung!",
            date: Timestamp.fromDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)), // vor 3 Tagen
            projectPrice: "800€-1.200€",
            projectDuration: "1 Tag",
            isVerified: true,
            helpfulVotes: {
                yes: 12,
                no: 1
            },
            providerResponse: {
                text: "Vielen Dank für diese wunderbare Bewertung, Marina! Es war mir eine große Freude, für Ihr Firmenjubiläum zu kochen. Solche besonderen Anlässe sind genau das, was mich als Koch antreibt. Ich hoffe, wir sehen uns bald wieder!",
                date: Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
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
            date: Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)), // vor 1 Woche
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
            date: Timestamp.fromDate(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)), // vor 2 Wochen
            projectPrice: "1.500€-2.000€",
            projectDuration: "1 Tag",
            isVerified: true,
            helpfulVotes: {
                yes: 15,
                no: 0
            },
            providerResponse: {
                text: "Es war mir eine Ehre, bei Ihrer Hochzeit kochen zu dürfen! Solche besonderen Momente machen meinen Beruf so erfüllend. Alles Gute für die Zukunft!",
                date: Timestamp.fromDate(new Date(Date.now() - 13 * 24 * 60 * 60 * 1000)),
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
            date: Timestamp.fromDate(new Date(Date.now() - 21 * 24 * 60 * 60 * 1000)), // vor 3 Wochen
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
            date: Timestamp.fromDate(new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)), // vor 4 Wochen
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
        
        console.log(`📝 Füge ${reviews.length} Bewertungen hinzu...`);
        
        for (let i = 0; i < reviews.length; i++) {
            const docRef = await addDoc(collection(db, 'reviews'), reviews[i]);
            console.log(`✅ Bewertung ${i + 1} erstellt mit ID: ${docRef.id}`);
            console.log(`   👤 ${reviews[i].reviewerName} (${reviews[i].rating}⭐)`);
        }

        console.log('\n🎉 Alle Test-Bewertungen erfolgreich erstellt!');
        console.log('\n📋 Übersicht der erstellten Bewertungen:');
        console.log('1. Marina_Schmidt (5⭐) - Firmenjubiläum mit 5-Gänge-Menü');
        console.log('2. Thomas_Weber (5⭐) - Wiederkehrender Kunde, italienische Dinnerparty');
        console.log('3. Lisa_Müller (5⭐) - Hochzeit mit 4-Gänge-Menü');
        console.log('4. Michael_Hoffmann (4⭐) - Gutes Menü, Timing verbesserungswürdig');
        console.log('5. Sarah_Becker (5⭐) - Wiederkehrender Kunde, mediterranes Menü');
        
        console.log('\n⚠️  WICHTIG: Diese Bewertungen wurden mit der Provider-ID erstellt: ' + providerId);
        console.log('   Stellen Sie sicher, dass diese ID mit einem echten Provider in Ihrer Datenbank übereinstimmt!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Fehler beim Erstellen der Test-Bewertungen:', error);
        console.error('\n🔍 Mögliche Ursachen:');
        console.error('1. Falsche Firebase-Konfiguration');
        console.error('2. Firestore-Berechtigung fehlt');
        console.error('3. Provider-ID existiert nicht');
        console.error('4. Netzwerkverbindung');
        process.exit(1);
    }
}

// Script ausführen
createTestReviews();
