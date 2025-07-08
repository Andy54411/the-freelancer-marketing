// scripts/migrateProfilePictureUrls.js
// Skript zur Migration aller profilePictureURL/profilePictureFirebaseUrl Felder auf reine Storage-Pfade

const admin = require('firebase-admin');
admin.initializeApp();

function extractStoragePath(url) {
    if (!url) return null;
    // Firebase Download-URL
    const matchFirebase = url.match(/\/o\/(.+)\?alt=media/);
    if (matchFirebase) return decodeURIComponent(matchFirebase[1]);
    // Google Storage URL
    const matchStorage = url.match(/storage\.googleapis\.com\/[^\/]+\/(.+)/);
    if (matchStorage) return decodeURIComponent(matchStorage[1]);
    // Wenn schon ein Pfad
    if (!url.startsWith('http')) return url;
    return null;
}

async function migrateCollection(collectionName) {
    const snapshot = await admin.firestore().collection(collectionName).get();
    for (const doc of snapshot.docs) {
        const data = doc.data();
        let url = data.profilePictureURL || data.profilePictureFirebaseUrl;
        const path = extractStoragePath(url);
        if (path && path !== url) {
            await doc.ref.update({ profilePictureURL: path });
            console.log(`Updated ${collectionName}/${doc.id}: ${path}`);
        }
    }
}

(async () => {
    await migrateCollection('users');
    await migrateCollection('companies');
    process.exit(0);
})();
