import { NextRequest, NextResponse } from 'next/server';
import { db, isFirebaseAvailable } from '@/firebase/server';
import { createIndexErrorResponse, parseFirestoreIndexError } from '@/lib/firestore-index-handler';

/**
 * GET /api/whatsapp/chat/contact
 * Lädt Kontakt-Informationen für einen Chat aus der Kunden-Datenbank
 */
export async function GET(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json(
        { success: false, error: 'Datenbank nicht verfügbar' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const phone = searchParams.get('phone');

    if (!companyId || !phone) {
      return NextResponse.json(
        { success: false, error: 'companyId und phone erforderlich' },
        { status: 400 }
      );
    }

    // Normalisiere Telefonnummer für Suche
    const normalizedPhone = phone.replace(/\D/g, '');
    
    // Erstelle verschiedene Suchformate für die Telefonnummer
    const phoneVariants = [
      phone,
      `+${normalizedPhone}`,
      normalizedPhone,
      `+49${normalizedPhone.slice(-10)}`,
      `0${normalizedPhone.slice(-10)}`,
      normalizedPhone.slice(-10),
      normalizedPhone.slice(-11),
    ];

    // Suche in customers Collection mit verschiedenen Formaten
    let customerDoc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData> | null = null;
    let customerId: string | null = null;
    
    for (const phoneVariant of phoneVariants) {
      const customersSnapshot = await db
        .collection('companies')
        .doc(companyId)
        .collection('customers')
        .where('phone', '==', phoneVariant)
        .limit(1)
        .get();

      if (!customersSnapshot.empty) {
        customerDoc = customersSnapshot.docs[0];
        customerId = customerDoc.id;
        break;
      }
    }

    if (customerDoc) {
      const customer = customerDoc.data();
      
      // Baue vollständige Adresse zusammen
      let fullAddress = customer.address || '';
      if (customer.street || customer.city || customer.postalCode) {
        const addressParts: string[] = [];
        if (customer.street) addressParts.push(customer.street);
        if (customer.postalCode || customer.city) {
          addressParts.push(`${customer.postalCode || ''} ${customer.city || ''}`.trim());
        }
        if (customer.country && customer.country !== 'Deutschland') {
          addressParts.push(customer.country);
        }
        fullAddress = addressParts.join(', ');
      }

      // Konvertiere Timestamps
      const parseDate = (val: unknown): string | null => {
        if (!val) return null;
        if (typeof val === 'object' && val !== null && 'toDate' in val) {
          return (val as { toDate: () => Date }).toDate().toISOString();
        }
        if (val instanceof Date) return val.toISOString();
        if (typeof val === 'string') return val;
        return null;
      };

      return NextResponse.json({
        success: true,
        contact: {
          id: customerId,
          customerId: customerId,
          customerNumber: customer.customerNumber || customer.kundenNummer || null,
          name: customer.name || null,
          email: customer.email || null,
          phone: customer.phone || phone,
          address: fullAddress || null,
          street: customer.street || null,
          city: customer.city || null,
          postalCode: customer.postalCode || null,
          country: customer.country || 'Deutschland',
          company: customer.companyName || null,
          website: customer.website || null,
          notes: customer.notes || null,
          taxNumber: customer.taxNumber || null,
          vatId: customer.vatId || null,
          industry: customer.industry || null,
          legalForm: customer.legalForm || null,
          tags: customer.tags || [],
          contactPersons: customer.contactPersons || [],
          // Statistiken
          totalInvoices: customer.totalInvoices || 0,
          totalAmount: customer.totalAmount || 0,
          // Zeitstempel
          customerSince: parseDate(customer.createdAt),
          lastActivity: parseDate(customer.updatedAt) || parseDate(customer.createdAt),
          // Link zur Kundenseite
          customerLink: `/dashboard/company/${companyId}/finance/contacts/${customerId}`,
        },
      });
    }

    // Fallback: Versuche aus whatsappContacts zu laden
    const contactDoc = await db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappContacts')
      .doc(normalizedPhone)
      .get();

    if (contactDoc.exists) {
      const data = contactDoc.data();
      return NextResponse.json({
        success: true,
        contact: {
          id: null,
          customerId: null,
          name: data?.name || null,
          phone: data?.phone || phone,
          customerSince: data?.createdAt?.toDate?.()?.toISOString() || null,
          lastActivity: data?.lastMessageAt?.toDate?.()?.toISOString() || null,
          totalChats: data?.totalChats || 1,
        },
      });
    }

    // Hole Info aus Nachrichten als letzter Fallback
    const messagesSnapshot = await db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappMessages')
      .where('customerPhone', '>=', normalizedPhone.slice(-10))
      .limit(1)
      .get();

    if (!messagesSnapshot.empty) {
      const msg = messagesSnapshot.docs[0].data();
      return NextResponse.json({
        success: true,
        contact: {
          id: null,
          customerId: null,
          name: msg.customerName || null,
          phone: msg.customerPhone || phone,
          customerSince: msg.createdAt?.toDate?.()?.toISOString() || null,
          lastActivity: msg.createdAt?.toDate?.()?.toISOString() || null,
          totalChats: 1,
        },
      });
    }

    // Kein Kontakt gefunden
    return NextResponse.json({
      success: true,
      contact: null,
    });
  } catch (error) {
    // Prüfe auf Index-Fehler
    const indexError = parseFirestoreIndexError(error);
    if (indexError.isIndexError) {
      return NextResponse.json(createIndexErrorResponse(error), { status: 400 });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Laden des Kontakts',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
