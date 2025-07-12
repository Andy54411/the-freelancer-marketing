const admin = require('firebase-admin');

// Service Account Key laden
const serviceAccount = require('../firebase-service-account-key.json');

// Firebase Admin initialisieren
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
    });
}

const db = admin.firestore();

async function findProvider() {
    try {
        console.log('🔍 Suche nach Mietkoch Andy in der Datenbank...');
        
        // Suche in der firma Collection
        console.log('\n📂 Durchsuche firma Collection...');
        const firmaSnapshot = await db.collection('firma').get();
        
        firmaSnapshot.forEach(doc => {
            const data = doc.data();
            const name = data.companyName || data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim();
            
            if (name.toLowerCase().includes('andy') || name.toLowerCase().includes('mietkoch')) {
                console.log(`✅ Gefunden in firma: ${doc.id}`);
                console.log(`   Name: ${name}`);
                console.log(`   Daten:`, {
                    companyName: data.companyName,
                    displayName: data.displayName,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    description: data.description?.substring(0, 100) + '...'
                });
            }
        });
        
        // Suche in der users Collection
        console.log('\n📂 Durchsuche users Collection...');
        const usersSnapshot = await db.collection('users').get();
        
        usersSnapshot.forEach(doc => {
            const data = doc.data();
            const name = data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim();
            
            if (name.toLowerCase().includes('andy') || name.toLowerCase().includes('mietkoch')) {
                console.log(`✅ Gefunden in users: ${doc.id}`);
                console.log(`   Name: ${name}`);
                console.log(`   Daten:`, {
                    displayName: data.displayName,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    email: data.email
                });
            }
        });
        
        // Zeige alle Provider IDs
        console.log('\n📋 Alle verfügbaren Provider IDs:');
        console.log('\n--- Firma Collection ---');
        firmaSnapshot.forEach(doc => {
            const data = doc.data();
            const name = data.companyName || data.displayName || 'Unbekannt';
            console.log(`${doc.id}: ${name}`);
        });
        
        console.log('\n--- Users Collection ---');
        const userDocs = [];
        usersSnapshot.forEach(doc => {
            const data = doc.data();
            const name = data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Unbekannt';
            userDocs.push({ id: doc.id, name });
        });
        
        // Nur die ersten 10 anzeigen, um die Ausgabe übersichtlich zu halten
        userDocs.slice(0, 10).forEach(user => {
            console.log(`${user.id}: ${user.name}`);
        });
        
        if (userDocs.length > 10) {
            console.log(`... und ${userDocs.length - 10} weitere`);
        }
        
        console.log('\n💡 Kopieren Sie eine echte Provider-ID und verwenden Sie sie mit:');
        console.log('   node create-test-reviews-admin.js <echte-provider-id>');
        
    } catch (error) {
        console.error('❌ Fehler beim Suchen:', error);
    }
    
    process.exit(0);
}

findProvider();
