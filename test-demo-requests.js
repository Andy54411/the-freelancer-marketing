/**
 * Test Script für Demo-Anfragen API
 * 
 * Testet alle Endpoints:
 * 1. POST /api/demo-requests (Demo erstellen)
 * 2. GET /api/demo-requests (Alle abrufen mit Admin-Auth)
 * 3. PATCH /api/demo-requests/[id]/assign (Zuweisung mit Admin-Auth)
 */

const BASE_URL = 'http://localhost:3000';
const ADMIN_EMAIL = 'andy.staudinger@taskilo.de';

// Schritt 1: Admin Login
async function loginAdmin(password) {
  console.log('\n🔐 Schritt 1: Admin Login...');
  
  const response = await fetch(`${BASE_URL}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Login fehlgeschlagen: ${response.status} - ${error}`);
  }

  const data = await response.json();
  
  // Cookie aus Response-Header extrahieren
  const cookies = response.headers.get('set-cookie');
  console.log('✅ Admin Login erfolgreich');
  console.log('Admin:', data.user?.name || ADMIN_EMAIL);
  
  return cookies;
}

// Schritt 2: Demo-Anfrage erstellen (öffentlich)
async function createDemoRequest() {
  console.log('\n📝 Schritt 2: Demo-Anfrage erstellen...');
  
  const demoData = {
    name: 'Test User API',
    email: 'test-api@example.com',
    company: 'Test Company GmbH',
    phone: '+49 123 456789',
    preferredDate: '2025-12-30',
    message: 'Dies ist ein automatisierter API-Test',
  };

  const response = await fetch(`${BASE_URL}/api/demo-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(demoData),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Demo-Erstellung fehlgeschlagen: ${response.status} - ${error}`);
  }

  const data = await response.json();
  console.log('✅ Demo-Anfrage erstellt');
  console.log('ID:', data.id);
  
  return data.id;
}

// Schritt 3: Alle Demo-Anfragen abrufen (Admin-Only)
async function getAllDemoRequests(cookies) {
  console.log('\n📋 Schritt 3: Demo-Anfragen abrufen (Admin-Auth)...');
  
  const response = await fetch(`${BASE_URL}/api/demo-requests`, {
    method: 'GET',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': cookies,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Abrufen fehlgeschlagen: ${response.status} - ${error}`);
  }

  const data = await response.json();
  console.log('✅ Demo-Anfragen abgerufen');
  console.log('Anzahl:', data.requests?.length || 0);
  
  if (data.requests?.length > 0) {
    console.log('\nErste Anfrage:');
    const first = data.requests[0];
    console.log('  -', first.name, '|', first.company, '|', first.email);
    console.log('  - Status:', first.status);
    console.log('  - Erstellt:', new Date(first.createdAt).toLocaleString('de-DE'));
  }
  
  return data.requests;
}

// Schritt 4: Demo-Anfrage zuweisen (Admin-Only)
async function assignDemoRequest(requestId, cookies) {
  console.log('\n👤 Schritt 4: Demo-Anfrage zuweisen (Admin-Auth)...');
  
  const response = await fetch(`${BASE_URL}/api/demo-requests/${requestId}/assign`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': cookies,
    },
    body: JSON.stringify({
      assignedTo: 'test-support-1',
      status: 'zugewiesen',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Zuweisung fehlgeschlagen: ${response.status} - ${error}`);
  }

  const data = await response.json();
  console.log('✅ Demo-Anfrage zugewiesen');
  console.log('Message:', data.message);
  
  return data;
}

// Haupttest-Funktion
async function runTests() {
  console.log('🚀 Demo-Anfragen API Test');
  console.log('='.repeat(50));
  console.log('Base URL:', BASE_URL);
  console.log('Admin:', ADMIN_EMAIL);
  
  try {
    // Passwort aus Kommandozeile
    const password = process.argv[2];
    if (!password) {
      console.error('\n❌ Fehler: Passwort fehlt!');
      console.log('\nUsage: node test-demo-requests.js <admin-password>');
      process.exit(1);
    }

    // Test 1: Admin Login
    const cookies = await loginAdmin(password);
    
    // Test 2: Demo-Anfrage erstellen
    const demoId = await createDemoRequest();
    
    // Kurze Pause für Firestore
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 3: Alle Anfragen abrufen
    const requests = await getAllDemoRequests(cookies);
    
    // Test 4: Zuweisung (verwende erstellte ID)
    if (demoId) {
      await assignDemoRequest(demoId, cookies);
    }
    
    // Finale Prüfung
    console.log('\n📊 Schritt 5: Finale Prüfung...');
    const finalRequests = await getAllDemoRequests(cookies);
    const updatedRequest = finalRequests.find(r => r.id === demoId);
    
    if (updatedRequest) {
      console.log('✅ Anfrage gefunden:');
      console.log('  - Status:', updatedRequest.status);
      console.log('  - Zugewiesen an:', updatedRequest.assignedTo);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ ALLE TESTS ERFOLGREICH!');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('\n' + '='.repeat(50));
    console.error('❌ TEST FEHLGESCHLAGEN');
    console.error('='.repeat(50));
    console.error('\nFehler:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

// Test starten
runTests();
