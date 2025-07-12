#!/bin/bash

# Script zum schnellen Erstellen von Test-Bewertungen
# Verwendung: ./create-reviews.sh [PROVIDER_ID]

echo "🚀 Tasko - Test-Bewertungen erstellen"
echo "====================================="

# Provider-ID als Parameter oder Standardwert
PROVIDER_ID=${1:-"test-provider-id"}

echo "📝 Erstelle Test-Bewertungen für Provider-ID: $PROVIDER_ID"
echo ""

# Node.js Script ausführen
node -e "
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, Timestamp } = require('firebase/firestore');

// Firebase Config - BITTE ANPASSEN!
const firebaseConfig = {
    apiKey: 'AIzaSyDu2sT4tZL8dU5FxLzM1PwJ5YhqgTmRkKs',
    authDomain: 'tasko-39322.firebaseapp.com',
    projectId: 'tasko-39322',
    storageBucket: 'tasko-39322.appspot.com',
    messagingSenderId: '123456789012',
    appId: '1:123456789012:web:abc123def456ghi789'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const providerId = process.argv[1] || '$PROVIDER_ID';

async function createReviews() {
    const reviews = [
        {
            providerId,
            reviewerId: 'marina-schmidt-' + Date.now(),
            reviewerName: 'Marina_Schmidt',
            rating: 5,
            text: 'Andy hat für unser Firmenjubiläum ein unglaubliches 5-Gänge-Menü gezaubert! Seine kulinarischen Fähigkeiten sind einfach erstklassig.',
            date: Timestamp.now(),
            projectPrice: '800€-1.200€',
            projectDuration: '1 Tag',
            isVerified: true,
            helpfulVotes: { yes: 12, no: 1 }
        },
        {
            providerId,
            reviewerId: 'thomas-weber-' + Date.now(),
            reviewerName: 'Thomas_Weber',
            rating: 5,
            text: 'Bereits zum dritten Mal habe ich Andy gebucht und bin jedes Mal aufs Neue begeistert! Seine italienische Küche ist authentisch.',
            date: Timestamp.now(),
            projectPrice: '600€-900€',
            projectDuration: '1 Abend',
            isVerified: true,
            isReturningCustomer: true,
            helpfulVotes: { yes: 8, no: 0 }
        }
    ];

    for (const review of reviews) {
        const docRef = await addDoc(collection(db, 'reviews'), review);
        console.log('✅ Bewertung erstellt:', docRef.id, '- ' + review.reviewerName);
    }
    console.log('🎉 Alle Bewertungen erstellt!');
}

createReviews().catch(console.error);
" "$PROVIDER_ID"

echo ""
echo "✅ Test-Bewertungen wurden erstellt!"
echo "🌐 Sie können jetzt das Design in Ihrer Live-App überprüfen."
