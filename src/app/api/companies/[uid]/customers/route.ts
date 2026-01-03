import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Zod Schema für Kunden-Validierung
const CustomerSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  email: z.string().email('Gültige E-Mail erforderlich').optional().or(z.literal('')),
  phone: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  address: z.string().optional(),
  taxNumber: z.string().optional(),
  vatId: z.string().optional(),
  contactPersons: z.array(z.any()).optional(),
  notes: z.string().optional(),
  customerNumber: z.string().optional(),
  companyName: z.string().optional(),
});

// Runtime Firebase initialization to prevent build-time issues
async function getFirebaseDb(companyId: string): Promise<any> {
  try {
    // Dynamically import Firebase services
    const firebaseModule = await import('@/firebase/server');

    // Check if we have valid db service
    if (!firebaseModule.db) {
      // Try to get from admin if needed
      const { admin } = firebaseModule;
      if (admin && admin.apps.length > 0) {
        const { getFirestore } = await import('firebase-admin/firestore');
        return getFirestore();
      }
      throw new Error('Firebase database unavailable');
    }

    return firebaseModule.db;
  } catch (error) {
    throw new Error('Firebase database unavailable');
  }
}

/**
 * API Route für Customers
 * GET /api/companies/[uid]/customers
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const { uid } = await params;

    if (!uid) {
      return NextResponse.json({ error: 'UID ist erforderlich' }, { status: 400 });
    }

    // Get Firebase DB dynamically
    const db = await getFirebaseDb(uid);

    // Lade nur echte Kunden aus Firestore (keine Lieferanten)
    const customersQuery = await db
      .collection('companies')
      .doc(uid)
      .collection('customers')

      .orderBy('createdAt', 'desc')
      .get();

    const customers: any[] = [];

    customersQuery.forEach((doc: any) => {
      const data = doc.data();

      // Filter: Nur echte Kunden, keine Lieferanten
      const isSupplier = data.isSupplier === true;
      const customerNumber = data.customerNumber || '';
      const isLieferantNumber = customerNumber.startsWith('LF-');

      // Überspringe Lieferanten basierend auf isSupplier Flag oder LF-Nummer
      if (isSupplier || isLieferantNumber) {
        return;
      }

      customers.push({
        id: doc.id,
        customerNumber: data.customerNumber || '',
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        // Legacy address fallback
        address: data.address || '',
        // Strukturierte Adresse
        street: data.street || '',
        city: data.city || '',
        postalCode: data.postalCode || '',
        country: data.country || '',
        taxNumber: data.taxNumber || '',
        vatId: data.vatId || '',
        vatValidated: data.vatValidated || false,
        totalInvoices: data.totalInvoices || 0,
        totalAmount: data.totalAmount || 0,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        contactPersons: data.contactPersons || [],
        companyId: data.companyId || uid,
      });
    });

    return NextResponse.json({
      success: true,
      customers,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Interner Serverfehler beim Laden der Kunden' },
      { status: 500 }
    );
  }
}

/**
 * API Route für neuen Customer
 * POST /api/companies/[uid]/customers
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;
    const body = await request.json();

    if (!uid) {
      return NextResponse.json({ error: 'UID ist erforderlich' }, { status: 400 });
    }

    // Zod-Validierung
    const validationResult = CustomerSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Validierungsfehler',
        details: validationResult.error.errors.map(e => e.message).join(', '),
      }, { status: 400 });
    }

    const validatedData = validationResult.data;

    // Get Firebase DB dynamically
    const db = await getFirebaseDb(uid);

    // Prüfe ob Kunde mit gleicher E-Mail bereits existiert (nur wenn E-Mail vorhanden)
    if (validatedData.email && validatedData.email.trim() !== '') {
      const existingCustomerQuery = await db
        .collection('companies')
        .doc(uid)
        .collection('customers')
        .where('email', '==', validatedData.email)
        .limit(1)
        .get();

      if (!existingCustomerQuery.empty) {
        const existingCustomer = existingCustomerQuery.docs[0];
        const existingData = existingCustomer.data();
        return NextResponse.json({
          success: false,
          exists: true,
          existingCustomerId: existingCustomer.id,
          existingCustomerName: existingData.name || existingData.companyName || 'Unbekannt',
          error: `Ein Kunde mit der E-Mail "${validatedData.email}" existiert bereits`,
        }, { status: 409 });
      }
    }

    // Generiere fortlaufende Kundennummer mit Transaktion (atomar)
    const companyRef = db.collection('companies').doc(uid);
    const customerNumber = await db.runTransaction(async (transaction: FirebaseFirestore.Transaction) => {
      const companyDoc = await transaction.get(companyRef);
      
      // Hole aktuelle Kundennummer-Sequenz oder starte bei 1000
      const currentSequence = companyDoc.exists && companyDoc.data()?.customerNumberSequence
        ? companyDoc.data().customerNumberSequence
        : 1000;
      
      const nextSequence = currentSequence + 1;
      
      // Update die Sequenz in der Company
      transaction.update(companyRef, { customerNumberSequence: nextSequence });
      
      return `KD-${nextSequence}`;
    });

    // Erstelle neuen Kunden (nur vorhandene Felder, keine leeren Strings)
    const newCustomer: Record<string, unknown> = {
      companyId: uid,
      customerNumber,
      name: validatedData.name,
      vatValidated: false,
      totalInvoices: 0,
      totalAmount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Füge nur vorhandene optionale Felder hinzu (keine Fallbacks!)
    if (validatedData.email && validatedData.email.trim() !== '') newCustomer.email = validatedData.email;
    if (validatedData.phone) newCustomer.phone = validatedData.phone;
    if (validatedData.street) newCustomer.street = validatedData.street;
    if (validatedData.city) newCustomer.city = validatedData.city;
    if (validatedData.postalCode) newCustomer.postalCode = validatedData.postalCode;
    if (validatedData.country) newCustomer.country = validatedData.country;
    if (validatedData.address) newCustomer.address = validatedData.address;
    if (validatedData.taxNumber) newCustomer.taxNumber = validatedData.taxNumber;
    if (validatedData.vatId) newCustomer.vatId = validatedData.vatId;
    if (validatedData.contactPersons && validatedData.contactPersons.length > 0) {
      newCustomer.contactPersons = validatedData.contactPersons;
    }
    if (validatedData.notes) newCustomer.notes = validatedData.notes;
    if (validatedData.companyName) newCustomer.companyName = validatedData.companyName;

    const docRef = await db
      .collection('companies')
      .doc(uid)
      .collection('customers')
      .add(newCustomer);

    return NextResponse.json({
      success: true,
      customerId: docRef.id,
      customer: {
        id: docRef.id,
        ...newCustomer,
      },
      message: 'Kunde erfolgreich erstellt',
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Kunden:', error);
    return NextResponse.json(
      { error: 'Interner Serverfehler beim Erstellen des Kunden', details: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      { status: 500 }
    );
  }
}
