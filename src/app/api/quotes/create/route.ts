import { NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/firebase/server';
import { QuoteNotificationService } from '@/lib/quote-notifications';
import { Timestamp } from 'firebase-admin/firestore';

// Escrow-Gebühr Berechnung: 5% vom Angebotspreis (min 5€, max 50€)
const ESCROW_FEE_PERCENT = 0.05;
const ESCROW_FEE_MIN_CENTS = 500; // 5€
const ESCROW_FEE_MAX_CENTS = 5000; // 50€

export async function POST(request: NextRequest) {
  try {
    // Get auth token to identify the customer
    const authHeader = request.headers.get('authorization');
    let customerUid: string | null = null;
    let customerType = 'user'; // Default to B2C
    let isB2B = false;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        customerUid = decodedToken.uid;

        // Check if this user is a company (B2B) by checking companies collection
        if (customerUid) {
          const companyDoc = await db!.collection('companies').doc(customerUid).get();
          if (companyDoc.exists) {
            isB2B = true;
            customerType = 'company';
          }
        }
      } catch (authError) {
        // Auth-Fehler ignorieren - Quote kann auch ohne Auth erstellt werden
      }
    }

    const { providerId, quoteData } = await request.json();

    if (!providerId || !quoteData) {
      return NextResponse.json(
        { error: 'Provider ID und Quote-Daten sind erforderlich' },
        { status: 400 }
      );
    }

    // Provider-Daten laden für Namen und Kategorie
    let providerName = 'Anbieter';
    let providerCategory = '';
    let providerSubcategory = '';
    try {
      // Zuerst companies, dann users
      let providerDoc = await db!.collection('companies').doc(providerId).get();
      if (!providerDoc.exists) {
        providerDoc = await db!.collection('users').doc(providerId).get();
      }
      if (providerDoc.exists) {
        const providerData = providerDoc.data();
        providerName = providerData?.companyName || providerData?.displayName || 'Anbieter';
        providerCategory = providerData?.selectedCategory || providerData?.category || '';
        providerSubcategory = providerData?.selectedSubcategory || providerData?.subcategory || '';
      }
    } catch (error) {
      // Fehler ignorieren
    }

    // UNIFIED: Speichere in project_requests mit requestType: 'direct'
    const projectRequest = {
      // Basis-Felder
      title: quoteData.projectTitle,
      description: quoteData.projectDescription,
      
      // Kategorien - von Provider übernehmen wenn nicht angegeben
      category: quoteData.projectCategory || providerCategory || 'Sonstiges',
      subcategory: quoteData.projectSubcategory || providerSubcategory || 'Sonstiges',
      serviceCategory: quoteData.projectCategory || providerCategory || 'Sonstiges',
      serviceSubcategory: quoteData.projectSubcategory || providerSubcategory || 'Sonstiges',
      
      // Budget
      budgetType: quoteData.budgetRange?.min || quoteData.budgetRange?.max ? 'range' : 'negotiable',
      budgetAmount: quoteData.budgetRange?.min || null,
      maxBudget: quoteData.budgetRange?.max || null,
      budgetRange: quoteData.budgetRange || null,
      
      // Zeitrahmen und Ort
      timeline: quoteData.estimatedDuration || '',
      preferredDate: quoteData.preferredStartDate || null,
      location: quoteData.location || '',
      postalCode: quoteData.postalCode || '',
      isRemote: quoteData.isRemote || false,
      
      // Kundendaten
      customerUid: customerUid,
      customerEmail: quoteData.customerEmail || '',
      customerName: quoteData.customerName || '',
      customerPhone: quoteData.customerPhone || '',
      customerType: customerType,
      isB2B: isB2B,
      createdBy: customerUid,
      
      // UNIFIED REQUEST TYPE - Das ist der Schlüssel!
      requestType: 'direct', // 'direct' = Direkt-Anfrage, 'marketplace' = Öffentlich
      isPublic: false, // Direkt-Anfragen sind NICHT öffentlich
      targetProviderId: providerId, // NUR dieser Provider sieht die Anfrage
      targetProviderName: providerName,
      
      // Escrow ist IMMER erforderlich
      escrowRequired: true,
      escrowFeePercent: ESCROW_FEE_PERCENT,
      escrowFeeMinCents: ESCROW_FEE_MIN_CENTS,
      escrowFeeMaxCents: ESCROW_FEE_MAX_CENTS,
      
      // Status und Metadaten
      status: 'open',
      urgency: quoteData.urgency || 'medium',
      proposals: [],
      proposalCount: 0,
      viewCount: 0,
      isActive: true,
      
      // Zusätzliche Notizen
      additionalNotes: quoteData.additionalNotes || '',
      
      // Timestamps
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      
      // Quelle
      source: 'direct_request',
      platform: 'taskilo',
    };

    // In project_requests Collection speichern (UNIFIED!)
    const projectRef = await db!.collection('project_requests').add(projectRequest);
    const projectId = projectRef.id;

    // Benachrichtigung an den Ziel-Provider senden
    try {
      await db!.collection('notifications').add({
        userId: providerId,
        type: 'direct_project_request',
        title: 'Neue Direktanfrage',
        message: `${quoteData.customerName || 'Ein Kunde'} hat eine Anfrage für "${quoteData.projectTitle}" an Sie gesendet.`,
        data: {
          projectId: projectId,
          customerName: quoteData.customerName,
          projectTitle: quoteData.projectTitle,
          action: 'view_project_request',
        },
        read: false,
        createdAt: Timestamp.now(),
      });
    } catch (notificationError) {
      // Notification-Fehler ignorieren
    }

    // Bell-Notifications für beide Seiten
    if (customerUid) {
      try {
        await QuoteNotificationService.createNewQuoteRequestNotifications(
          projectId,
          customerUid,
          providerId,
          {
            customerName: quoteData.customerName,
            providerName: providerName,
            subcategory: quoteData.projectSubcategory || providerSubcategory || quoteData.projectTitle,
            budget: quoteData.budgetRange || { min: 0, max: 0, currency: 'EUR' },
            urgency: quoteData.urgency,
            description: quoteData.projectDescription,
          }
        );
      } catch (notificationError) {
        // Notifications-Fehler sollten die Erstellung nicht blockieren
      }
    }

    return NextResponse.json({
      success: true,
      projectId, // Jetzt projectId statt quoteId
      quoteId: projectId, // Backward compatibility
      message: 'Angebots-Anfrage erfolgreich gesendet',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Interner Serverfehler beim Erstellen der Angebots-Anfrage' },
      { status: 500 }
    );
  }
}
