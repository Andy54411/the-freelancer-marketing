import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/clients';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { AdminAuthService } from '@/services/admin/AdminAuthService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { name, email, company, phone, preferredDate, message } = body;

    // Validierung
    if (!name || !email || !company) {
      return NextResponse.json(
        { success: false, error: 'Name, E-Mail und Firma sind erforderlich' },
        { status: 400 }
      );
    }

    // Demo-Anfrage in Firestore speichern
    const demoRequest = {
      name,
      email,
      company,
      phone: phone || '',
      preferredDate: preferredDate || '',
      message: message || '',
      status: 'neu', // neu, in_bearbeitung, zugewiesen, abgeschlossen
      assignedTo: null, // Support-Mitarbeiter ID
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      priority: 'normal', // niedrig, normal, hoch
    };

    const docRef = await addDoc(collection(db, 'demoRequests'), demoRequest);

    return NextResponse.json({
      success: true,
      id: docRef.id,
      message: 'Demo-Anfrage erfolgreich erstellt',
    });
  } catch (error) {
    console.error('Fehler beim Erstellen der Demo-Anfrage:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Erstellen der Demo-Anfrage',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Admin-Authentifizierung prüfen
    const adminUser = await AdminAuthService.verifyFromRequest(request);
    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: 'Nicht autorisiert - Admin-Zugriff erforderlich' },
        { status: 401 }
      );
    }

    // Admin SDK für Server-seitige Abfragen verwenden
    const { db: adminDb } = await import('@/firebase/server');
    
    if (!adminDb) {
      throw new Error('Firebase Admin nicht verfügbar');
    }
    
    const snapshot = await adminDb
      .collection('demoRequests')
      .orderBy('createdAt', 'desc')
      .get();
    
    const requests = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate().toISOString(),
      updatedAt: doc.data().updatedAt?.toDate().toISOString(),
    }));

    return NextResponse.json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Demo-Anfragen:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Abrufen der Demo-Anfragen',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
