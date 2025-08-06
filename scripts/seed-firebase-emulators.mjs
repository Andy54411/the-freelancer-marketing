/**
 * Firebase Emulator Seed Data Script
 * Lädt Test-Daten in Firebase Emulatoren für Development
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  connectFirestoreEmulator, 
  doc, 
  setDoc, 
  collection, 
  addDoc 
} from 'firebase/firestore';
import { 
  getAuth, 
  connectAuthEmulator, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';

// Firebase Config für Emulatoren
const firebaseConfig = {
  apiKey: "demo-key",
  authDomain: "demo-project.firebaseapp.com", 
  projectId: "demo-project",
  storageBucket: "demo-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Firebase initialisieren
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Mit Emulatoren verbinden
connectFirestoreEmulator(db, 'localhost', 8080);
connectAuthEmulator(auth, 'http://localhost:9099');

async function seedData() {
  try {
    console.log('🌱 [Firebase Seed] Starte Seed-Prozess...');

    // 1. Test-Benutzer erstellen
    console.log('👤 [Firebase Seed] Erstelle Test-Benutzer...');
    
    const testUsers = [
      {
        email: 'test@taskilo.de',
        password: 'password123',
        displayName: 'Test User',
        companyName: 'Test Company GmbH'
      },
      {
        email: 'company@taskilo.de', 
        password: 'password123',
        displayName: 'Company User',
        companyName: 'Muster AG'
      },
      {
        email: 'datev@taskilo.de',
        password: 'password123', 
        displayName: 'DATEV Test User',
        companyName: 'DATEV Test Company'
      }
    ];

    const createdUsers = [];
    
    for (const userData of testUsers) {
      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth, 
          userData.email, 
          userData.password
        );
        
        const user = userCredential.user;
        createdUsers.push({
          uid: user.uid,
          email: user.email,
          ...userData
        });
        
        console.log(`✅ [Firebase Seed] Benutzer erstellt: ${userData.email} (${user.uid})`);
      } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
          console.log(`⚠️ [Firebase Seed] Benutzer existiert bereits: ${userData.email}`);
        } else {
          console.error(`❌ [Firebase Seed] Fehler bei Benutzer ${userData.email}:`, error.message);
        }
      }
    }

    // 2. Firestore-Daten erstellen
    console.log('🗄️ [Firebase Seed] Erstelle Firestore-Dokumente...');

    // Companies Collection
    for (let i = 0; i < createdUsers.length; i++) {
      const user = createdUsers[i];
      const companyId = user.uid; // Verwende UID als Company-ID
      
      await setDoc(doc(db, 'companies', companyId), {
        name: user.companyName,
        email: user.email,
        owner: user.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
        subscription: 'free',
        features: {
          datev: true,
          invoicing: true,
          timeTracking: true
        }
      });
      
      console.log(`✅ [Firebase Seed] Company erstellt: ${user.companyName} (${companyId})`);
    }

    // Users Profile Collection
    for (const user of createdUsers) {
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        displayName: user.displayName,
        companyId: user.uid, // Benutzer ist Owner der Company
        role: 'owner',
        createdAt: new Date(),
        updatedAt: new Date(),
        preferences: {
          language: 'de',
          timezone: 'Europe/Berlin'
        }
      });
      
      console.log(`✅ [Firebase Seed] User Profile erstellt: ${user.displayName}`);
    }

    // Services Collection (Test-Services)
    const testServices = [
      {
        title: 'Handwerker Service',
        description: 'Allgemeine Handwerksarbeiten',
        category: 'handwerk',
        price: 50,
        duration: 120,
        companyId: createdUsers[0]?.uid
      },
      {
        title: 'Webentwicklung',
        description: 'Full-Stack Webentwicklung',
        category: 'development',  
        price: 80,
        duration: 480,
        companyId: createdUsers[1]?.uid
      },
      {
        title: 'Buchhaltung mit DATEV',
        description: 'DATEV-basierte Buchhaltungsdienstleistungen',
        category: 'accounting',
        price: 60,
        duration: 240,
        companyId: createdUsers[2]?.uid
      }
    ];

    for (const service of testServices) {
      const docRef = await addDoc(collection(db, 'services'), {
        ...service,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active'
      });
      
      console.log(`✅ [Firebase Seed] Service erstellt: ${service.title} (${docRef.id})`);
    }

    // Orders Collection (Test-Aufträge) 
    if (createdUsers.length >= 2) {
      const testOrders = [
        {
          customerId: createdUsers[0].uid,
          providerId: createdUsers[1].uid,  
          serviceTitle: 'Webentwicklung Auftrag',
          status: 'pending',
          amount: 800,
          currency: 'EUR'
        },
        {
          customerId: createdUsers[1].uid,
          providerId: createdUsers[2].uid,
          serviceTitle: 'DATEV Buchhaltung',
          status: 'in_progress', 
          amount: 300,
          currency: 'EUR'
        }
      ];

      for (const order of testOrders) {
        const docRef = await addDoc(collection(db, 'orders'), {
          ...order,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        console.log(`✅ [Firebase Seed] Order erstellt: ${order.serviceTitle} (${docRef.id})`);
      }
    }

    console.log('🎉 [Firebase Seed] Seed-Prozess erfolgreich abgeschlossen!');
    console.log('\n📊 [Firebase Seed] Zusammenfassung:');
    console.log(`   • Benutzer: ${createdUsers.length}`);
    console.log(`   • Companies: ${createdUsers.length}`);
    console.log(`   • Services: ${testServices.length}`);
    console.log(`   • Orders: 2`);
    console.log('\n🌐 [Firebase Seed] Emulator URLs:');
    console.log('   • Emulator UI: http://127.0.0.1:4000/');
    console.log('   • Auth: http://127.0.0.1:4000/auth');
    console.log('   • Firestore: http://127.0.0.1:4000/firestore');

  } catch (error) {
    console.error('❌ [Firebase Seed] Fehler beim Seeding:', error);
    process.exit(1);
  }
}

// Skript ausführen
seedData()
  .then(() => {
    console.log('✅ [Firebase Seed] Skript beendet.');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ [Firebase Seed] Unerwarteter Fehler:', error);
    process.exit(1);
  });
