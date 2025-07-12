const admin = require('firebase-admin');

// Service Account Key laden (falls vorhanden)
const serviceAccount = require('../firebase-service-account-key.json');

// Firebase Admin initialisieren
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
});

const db = admin.firestore();

async function createInternationalTestReviews() {
    try {
        console.log('Erstelle internationale Test-Bewertungen mit Übersetzungsfunktionen...');
        console.log(`Project ID: ${serviceAccount.project_id}`);

        // Provider-ID - Diese muss mit einer echten Provider-ID aus der Datenbank übereinstimmen
        const providerId = process.argv[2] || "test-provider-id";
        
        console.log(`Verwende Provider-ID: ${providerId}`);
        console.log('💡 Tipp: Sie können eine spezifische Provider-ID als Argument übergeben:');
        console.log('   node create-international-reviews.js <echte-provider-id>');

        const reviewsData = [
            {
                rating: 5,
                comment: "I highly suggest choosing this service! very professional great quality product, and above and beyond what I expected! will be working with him to continue to bring us quality products!",
                reviewerName: "cannavistco",
                reviewerCountry: "Vereinigte Staaten",
                reviewerCountryCode: "US",
                projectTitle: "Website-Entwicklung",
                projectPrice: "1.000€-1.500€",
                projectDuration: "6 Wochen",
                isVerified: true,
                isReturningCustomer: true,
                helpfulVotes: 8,
                originalLanguage: "en",
                projectImages: [
                    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop",
                    "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400&h=300&fit=crop"
                ],
                providerResponse: {
                    comment: "Thank you so much for your kind words, wishing you the best of luck going forward!",
                    date: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 24 * 55)),
                    originalLanguage: "en"
                }
            },
            {
                rating: 5,
                comment: "Excelente trabajo! La comunicación fue perfecta y el resultado superó mis expectativas. Definitivamente volveré a trabajar con este freelancer.",
                reviewerName: "maria_rodriguez",
                reviewerCountry: "Spanien",
                reviewerCountryCode: "ES",
                projectTitle: "Logo-Design",
                projectPrice: "200€-500€",
                projectDuration: "2 Wochen",
                isVerified: true,
                isReturningCustomer: false,
                helpfulVotes: 5,
                originalLanguage: "es",
                projectImages: [
                    "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=400&h=300&fit=crop"
                ],
                providerResponse: {
                    comment: "¡Muchas gracias por tu confianza! Fue un placer trabajar contigo.",
                    date: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 24 * 45)),
                    originalLanguage: "es"
                }
            },
            {
                rating: 4,
                comment: "Très bon travail dans l'ensemble. Le freelancer a su répondre à mes attentes et a livré dans les temps. Quelques petites améliorations auraient pu être apportées mais je suis satisfait du résultat.",
                reviewerName: "pierre_dubois",
                reviewerCountry: "Frankreich",
                reviewerCountryCode: "FR",
                projectTitle: "Content Marketing",
                projectPrice: "500€-750€",
                projectDuration: "3 Wochen",
                isVerified: false,
                isReturningCustomer: false,
                helpfulVotes: 3,
                originalLanguage: "fr",
                projectImages: [
                    "https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=400&h=300&fit=crop",
                    "https://images.unsplash.com/photo-1553028826-f4804a6dba3b?w=400&h=300&fit=crop",
                    "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&h=300&fit=crop"
                ]
            },
            {
                rating: 5,
                comment: "Hervorragende Arbeit! Der Anbieter war sehr professionell, pünktlich und das Ergebnis hat meine Erwartungen übertroffen. Die Kommunikation war ausgezeichnet und ich würde definitiv wieder zusammenarbeiten.",
                reviewerName: "hans_mueller",
                reviewerCountry: "Deutschland",
                reviewerCountryCode: "DE",
                projectTitle: "E-Commerce Integration",
                projectPrice: "800€-1.200€",
                projectDuration: "4 Wochen",
                isVerified: true,
                isReturningCustomer: true,
                helpfulVotes: 12,
                originalLanguage: "de",
                projectImages: [
                    "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop",
                    "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&h=300&fit=crop"
                ],
                providerResponse: {
                    comment: "Vielen Dank für Ihre freundlichen Worte! Es war ein Vergnügen, mit Ihnen zu arbeiten.",
                    date: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 24 * 25)),
                    originalLanguage: "de"
                }
            },
            {
                rating: 4,
                comment: "Great experience overall! The freelancer delivered quality work on time and was very responsive throughout the project. Would recommend to others looking for similar services.",
                reviewerName: "sarah_johnson",
                reviewerCountry: "Kanada",
                reviewerCountryCode: "US", // Using US flag for Canada
                projectTitle: "Mobile App UI",
                projectPrice: "600€-900€",
                projectDuration: "5 Wochen",
                isVerified: true,
                isReturningCustomer: false,
                helpfulVotes: 7,
                originalLanguage: "en",
                projectImages: [
                    "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&h=300&fit=crop",
                    "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400&h=300&fit=crop",
                    "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=400&h=300&fit=crop",
                    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop"
                ],
                providerResponse: {
                    comment: "Thank you Sarah! I'm glad you're happy with the results. Looking forward to future collaborations!",
                    date: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 24 * 15)),
                    originalLanguage: "en"
                }
            }
        ];

        let createdCount = 0;
        let totalRating = 0;

        for (const reviewData of reviewsData) {
            const reviewDoc = {
                providerId: providerId,
                reviewerId: `${reviewData.reviewerName.toLowerCase()}-${Date.now()}`,
                reviewerName: reviewData.reviewerName,
                reviewerCountry: reviewData.reviewerCountry,
                reviewerCountryCode: reviewData.reviewerCountryCode,
                rating: reviewData.rating,
                comment: reviewData.comment,
                projectTitle: reviewData.projectTitle,
                projectPrice: reviewData.projectPrice,
                projectDuration: reviewData.projectDuration,
                isVerified: reviewData.isVerified,
                isReturningCustomer: reviewData.isReturningCustomer,
                helpfulVotes: reviewData.helpfulVotes,
                originalLanguage: reviewData.originalLanguage,
                projectImages: reviewData.projectImages,
                date: admin.firestore.Timestamp.fromDate(new Date(Date.now() - createdCount * 1000 * 60 * 60 * 24 * 10)), // Verteilt über Zeit
                createdAt: admin.firestore.Timestamp.now(),
                updatedAt: admin.firestore.Timestamp.now()
            };

            // Provider Response hinzufügen falls vorhanden
            if (reviewData.providerResponse) {
                reviewDoc.providerResponse = reviewData.providerResponse;
            }

            // Review zur Datenbank hinzufügen
            const docRef = await db.collection('reviews').add(reviewDoc);
            console.log(`Created review with ID: ${docRef.id}`);
            
            createdCount++;
            totalRating += reviewData.rating;
        }

        const averageRating = totalRating / createdCount;

        console.log('\n🎉 Erfolg!');
        console.log(`✅ Alle ${createdCount} internationale Reviews erstellt!`);
        console.log(`⭐ Durchschnittliche Bewertung: ${averageRating.toFixed(1)}`);
        console.log(`🌍 Sprachen: Englisch, Spanisch, Französisch, Deutsch`);
        console.log(`🖼️  Projektbilder: Enthalten`);
        console.log(`🔄 Übersetzungsfunktion: Bereit`);
        console.log(`📱 Test die Bewertungen auf der Provider-Seite!`);

    } catch (error) {
        console.error('Fehler beim Erstellen der Reviews:', error);
    } finally {
        process.exit(0);
    }
}

// Skript ausführen
createInternationalTestReviews();
