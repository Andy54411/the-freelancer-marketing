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
  // Lieferanten-Felder
  isSupplier: z.boolean().optional(),
  organizationType: z.enum(['Kunde', 'Lieferant', 'Partner', 'Interessenten']).optional(),
  // Buchhaltungskonten
  debitorNumber: z.string().optional(),
  creditorNumber: z.string().optional(),
  // Person-Felder
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  title: z.string().optional(),
  position: z.string().optional(),
  // Geschäftsdaten
  website: z.string().optional(),
  companySize: z.string().optional(),
  industry: z.string().optional(),
  paymentTerms: z.string().optional(),
  discount: z.number().optional(),
  creditLimit: z.number().optional(),
  currency: z.string().optional(),
  language: z.string().optional(),
  // Bankdaten
  bankName: z.string().optional(),
  iban: z.string().optional(),
  bic: z.string().optional(),
  accountHolder: z.string().optional(),
  // Zahlungsbedingungen
  preferredPaymentMethod: z.string().optional(),
  defaultInvoiceDueDate: z.number().optional(),
  earlyPaymentDiscount: z.number().optional(),
  earlyPaymentDays: z.number().optional(),
  // E-Rechnung
  eInvoiceEnabled: z.boolean().optional(),
  customerReference: z.string().optional(),
  leitwegId: z.string().optional(),
  vatValidated: z.boolean().optional(),
});

// Runtime Firebase initialization to prevent build-time issues
async function getFirebaseDb(_companyId: string): Promise<any> {
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
  } catch {
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
  } catch {
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

      if (existingCustomerQuery.docs.length > 0) {
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

    // Generiere fortlaufende Nummer basierend auf organizationType
    const companyRef = db.collection('companies').doc(uid);
    const isSupplier = validatedData.isSupplier === true || validatedData.organizationType === 'Lieferant';
    const organizationType = validatedData.organizationType || (isSupplier ? 'Lieferant' : 'Kunde');
    
    // Bestimme Präfix basierend auf Typ
    const prefixMap: Record<string, string> = {
      'Kunde': 'KD',
      'Lieferant': 'LF',
      'Partner': 'PA',
      'Interessenten': 'IN',
    };
    const prefix = prefixMap[organizationType] || 'KD';
    const sequenceField = `${prefix.toLowerCase()}NumberSequence`;
    
    const customerNumber = await db.runTransaction(async (transaction: FirebaseFirestore.Transaction) => {
      const companyDoc = await transaction.get(companyRef) as FirebaseFirestore.DocumentSnapshot;
      
      // Hole aktuelle Sequenz für diesen Typ oder starte bei 1000
      const currentSequence = companyDoc.exists && companyDoc.data()?.[sequenceField]
        ? companyDoc.data()?.[sequenceField]
        : 1000;
      
      const nextSequence = currentSequence + 1;
      
      // Update die Sequenz in der Company
      transaction.update(companyRef, { [sequenceField]: nextSequence });
      
      return `${prefix}-${nextSequence}`;
    });

    // Erstelle neuen Kontakt mit allen Feldern
    const newCustomer: Record<string, unknown> = {
      companyId: uid,
      customerNumber,
      isSupplier,
      organizationType,
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
    if (validatedData.vatValidated) newCustomer.vatValidated = validatedData.vatValidated;
    if (validatedData.contactPersons && validatedData.contactPersons.length > 0) {
      newCustomer.contactPersons = validatedData.contactPersons;
    }
    if (validatedData.notes) newCustomer.notes = validatedData.notes;
    if (validatedData.companyName) newCustomer.companyName = validatedData.companyName;
    
    // Person-spezifische Felder
    if (validatedData.firstName) newCustomer.firstName = validatedData.firstName;
    if (validatedData.lastName) newCustomer.lastName = validatedData.lastName;
    if (validatedData.title) newCustomer.title = validatedData.title;
    if (validatedData.position) newCustomer.position = validatedData.position;
    
    // Buchhaltungskonten
    if (validatedData.debitorNumber) newCustomer.debitorNumber = validatedData.debitorNumber;
    if (validatedData.creditorNumber) newCustomer.creditorNumber = validatedData.creditorNumber;
    
    // Geschäftsdaten
    if (validatedData.website) newCustomer.website = validatedData.website;
    if (validatedData.companySize) newCustomer.companySize = validatedData.companySize;
    if (validatedData.industry) newCustomer.industry = validatedData.industry;
    if (validatedData.paymentTerms) newCustomer.paymentTerms = validatedData.paymentTerms;
    if (validatedData.discount !== undefined) newCustomer.discount = validatedData.discount;
    if (validatedData.creditLimit !== undefined) newCustomer.creditLimit = validatedData.creditLimit;
    if (validatedData.currency) newCustomer.currency = validatedData.currency;
    if (validatedData.language) newCustomer.language = validatedData.language;
    
    // Bankdaten
    if (validatedData.bankName) newCustomer.bankName = validatedData.bankName;
    if (validatedData.iban) newCustomer.iban = validatedData.iban;
    if (validatedData.bic) newCustomer.bic = validatedData.bic;
    if (validatedData.accountHolder) newCustomer.accountHolder = validatedData.accountHolder;
    
    // Zahlungsbedingungen
    if (validatedData.preferredPaymentMethod) newCustomer.preferredPaymentMethod = validatedData.preferredPaymentMethod;
    if (validatedData.defaultInvoiceDueDate !== undefined) newCustomer.defaultInvoiceDueDate = validatedData.defaultInvoiceDueDate;
    if (validatedData.earlyPaymentDiscount !== undefined) newCustomer.earlyPaymentDiscount = validatedData.earlyPaymentDiscount;
    if (validatedData.earlyPaymentDays !== undefined) newCustomer.earlyPaymentDays = validatedData.earlyPaymentDays;
    
    // E-Rechnung
    if (validatedData.eInvoiceEnabled !== undefined) newCustomer.eInvoiceEnabled = validatedData.eInvoiceEnabled;
    if (validatedData.customerReference) newCustomer.customerReference = validatedData.customerReference;
    if (validatedData.leitwegId) newCustomer.leitwegId = validatedData.leitwegId;

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
