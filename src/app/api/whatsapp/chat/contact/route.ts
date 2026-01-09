import { NextRequest, NextResponse } from 'next/server';
import { db, isFirebaseAvailable } from '@/firebase/server';
import { createIndexErrorResponse, parseFirestoreIndexError } from '@/lib/firestore-index-handler';

/**
 * GET /api/whatsapp/chat/contact
 * Lädt Kontakt-Informationen für einen Chat aus der Kunden-Datenbank
 * 
 * Unterstützte Parameter:
 * - phone: Telefonnummer des Kontakts
 * - contactId: ID des Kontakts (wird als Telefonnummer behandelt)
 * - query: Suchbegriff für Kontaktsuche (Name, E-Mail oder Telefonnummer)
 * - limit: Maximale Anzahl der Ergebnisse bei Suche (Standard: 10)
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
    const phone = searchParams.get('phone') || searchParams.get('contactId');
    const query = searchParams.get('query');
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'companyId erforderlich' },
        { status: 400 }
      );
    }

    // Wenn query übergeben wurde, führe eine Suche durch
    if (query) {
      return handleContactSearch(companyId, query, limit);
    }

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'phone, contactId oder query erforderlich' },
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

/**
 * Hilfsfunktion für Kontaktsuche
 */
async function handleContactSearch(companyId: string, query: string, limit: number) {
  if (!db) {
    return NextResponse.json(
      { success: false, error: 'Datenbank nicht verfügbar' },
      { status: 503 }
    );
  }

  try {
    const searchTerm = query.toLowerCase().trim();
    const results: Array<{
      id: string;
      name: string | null;
      email: string | null;
      phone: string | null;
      company: string | null;
    }> = [];

    // Suche in customers Collection
    const customersRef = db
      .collection('companies')
      .doc(companyId)
      .collection('customers');

    const customersSnapshot = await customersRef.limit(200).get();

    customersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const name = (data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim()).toLowerCase();
      const email = (data.email || '').toLowerCase();
      const phone = (data.phone || data.mobile || '').replace(/\D/g, '');
      const company = (data.companyName || data.company || '').toLowerCase();

      // Prüfe ob der Suchbegriff in einem der Felder vorkommt
      const searchNormalized = searchTerm.replace(/\D/g, '');
      const matchesName = name.includes(searchTerm);
      const matchesEmail = email.includes(searchTerm);
      const matchesPhone = phone.includes(searchNormalized) || searchNormalized.includes(phone.slice(-6));
      const matchesCompany = company.includes(searchTerm);

      if (matchesName || matchesEmail || matchesPhone || matchesCompany) {
        results.push({
          id: doc.id,
          name: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || null,
          email: data.email || null,
          phone: data.phone || data.mobile || null,
          company: data.companyName || data.company || null,
        });
      }
    });

    // Auch in whatsappContacts suchen
    const contactsRef = db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappContacts');

    const contactsSnapshot = await contactsRef.limit(100).get();

    contactsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const name = (data.name || '').toLowerCase();
      const phone = (data.phone || doc.id).replace(/\D/g, '');

      const searchNormalized = searchTerm.replace(/\D/g, '');
      const matchesName = name.includes(searchTerm);
      const matchesPhone = phone.includes(searchNormalized);

      if (matchesName || matchesPhone) {
        // Prüfe ob nicht schon in results
        const exists = results.some(r => r.phone?.replace(/\D/g, '') === phone);
        if (!exists) {
          results.push({
            id: doc.id,
            name: data.name || null,
            email: null,
            phone: data.phone || doc.id,
            company: null,
          });
        }
      }
    });

    // Sortiere nach Relevanz (exakte Übereinstimmungen zuerst)
    results.sort((a, b) => {
      const aExact = a.name?.toLowerCase() === searchTerm || a.email?.toLowerCase() === searchTerm;
      const bExact = b.name?.toLowerCase() === searchTerm || b.email?.toLowerCase() === searchTerm;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return (a.name || '').localeCompare(b.name || '', 'de');
    });

    return NextResponse.json({
      success: true,
      contacts: results.slice(0, limit),
      total: results.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler bei der Kontaktsuche',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/whatsapp/chat/contact
 * Erstellt oder aktualisiert einen WhatsApp-Kontakt
 */
export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json(
        { success: false, error: 'Datenbank nicht verfügbar' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { companyId, contactId, name, email, notes, customerId, action: _action } = body;
    // Akzeptiere sowohl 'phone' als auch 'contactId' als Telefonnummer
    const phone = body.phone || contactId;

    if (!companyId || !phone) {
      return NextResponse.json(
        { success: false, error: 'companyId und phone/contactId erforderlich' },
        { status: 400 }
      );
    }

    const normalizedPhone = phone.replace(/\D/g, '');
    const contactRef = db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappContacts')
      .doc(normalizedPhone);

    // Wenn customerId übergeben wurde, verknüpfe mit Kunde
    if (customerId) {
      await contactRef.set(
        {
          phone,
          customerId,
          linkedAt: new Date(),
          updatedAt: new Date(),
        },
        { merge: true }
      );

      return NextResponse.json({
        success: true,
        message: 'Kontakt mit Kunde verknüpft',
      });
    }

    // Kontakt erstellen/aktualisieren
    await contactRef.set(
      {
        phone,
        name: name || null,
        email: email || null,
        notes: notes || null,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Kontakt gespeichert',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Speichern des Kontakts',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/whatsapp/chat/contact
 * Entfernt die Verknüpfung eines WhatsApp-Kontakts mit einem Kunden
 */
export async function DELETE(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json(
        { success: false, error: 'Datenbank nicht verfügbar' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const contactId = searchParams.get('contactId');

    if (!companyId || !contactId) {
      return NextResponse.json(
        { success: false, error: 'companyId und contactId erforderlich' },
        { status: 400 }
      );
    }

    const normalizedPhone = contactId.replace(/\D/g, '');
    const contactRef = db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappContacts')
      .doc(normalizedPhone);

    // Entferne nur die Kundenverknüpfung, nicht den ganzen Kontakt
    await contactRef.set(
      {
        customerId: null,
        linkedAt: null,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Verknüpfung entfernt',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Entfernen der Verknüpfung',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
