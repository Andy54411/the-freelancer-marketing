/**
 * API Route für die Marktplatz-Veröffentlichungsgebühr (3,75 EUR)
 * 
 * Flow:
 * 1. Kunde zahlt 3,75 EUR per Revolut Checkout
 * 2. Projekt wird im Marktplatz veröffentlicht (isActive: true, isPublic: true)
 * 3. Unternehmen können Angebote abgeben
 * 4. Kunde nimmt Angebot an → zahlt per Escrow (Kreditkarte/SEPA)
 * 5. Auftrag wird erstellt, Kontaktdaten werden ausgetauscht
 * 
 * POST /api/marketplace/publishing-fee - Checkout-Session erstellen
 * GET /api/marketplace/publishing-fee - Status prüfen
 */

import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { verifyApiAuth } from '@/lib/apiAuth';
import { RevolutCheckoutService } from '@/services/payment/RevolutCheckoutService';

// Veröffentlichungsgebühr in Cent (3,75 EUR = 375 Cent)
const PUBLISHING_FEE_CENTS = 375;

export async function POST(request: NextRequest) {
  try {
    // Auth prüfen
    const authResult = await verifyApiAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }
    const userId = authResult.userId;

    const { db } = await import('@/firebase/server');
    if (!db) {
      return NextResponse.json({ error: 'Firebase nicht verfügbar' }, { status: 500 });
    }

    const body = await request.json();
    const { 
      projectTitle, 
      projectDescription, 
      budget,
      budgetType,
      timeline, 
      location, 
      category,
      subcategory, 
      customerId,
      // Neue Felder
      projectScope,
      isRemote,
      urgency,
      workingHours,
      siteVisitPossible,
      contactPreference,
      requiredQualifications,
    } = body;

    if (!projectTitle || !projectDescription) {
      return NextResponse.json(
        { error: 'projectTitle und projectDescription sind erforderlich' },
        { status: 400 }
      );
    }

    // User-Daten für Name laden
    let customerName = 'Unbekannt';
    let customerEmail = authResult.token.email || '';
    try {
      const userDoc = await db.collection('users').doc(customerId || userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        customerName = `${userData?.firstname || ''} ${userData?.lastname || ''}`.trim() || userData?.displayName || 'Unbekannt';
        customerEmail = userData?.email || customerEmail;
      }
    } catch {
      // Fehler ignorieren
    }

    // Projekt-Entwurf erstellen (status: 'draft' bis Zahlung erfolgt)
    const projectRef = await db.collection('project_requests').add({
      title: projectTitle,
      description: projectDescription,
      category: category || 'Sonstiges',
      subcategory: subcategory || category || 'Sonstiges',
      serviceCategory: category || 'Sonstiges',
      serviceSubcategory: subcategory || category || 'Sonstiges',
      budgetType: budgetType || (budget?.min || budget?.max ? 'fixed' : 'negotiable'),
      budgetAmount: budget?.min || null,
      maxBudget: budget?.max || null,
      timeline: timeline || '',
      location: location || '',
      isRemote: isRemote || false,
      requiredSkills: [],
      requiredQualifications: requiredQualifications || [],
      urgency: urgency || 'normal',
      projectScope: projectScope || 'einmalig',
      workingHours: workingHours || 'flexibel',
      siteVisitPossible: siteVisitPossible || false,
      contactPreference: contactPreference || 'email',
      customerUid: customerId || userId,
      customerEmail: customerEmail,
      customerName: customerName,
      createdBy: userId,
      status: 'draft', // Wird nach Zahlung zu 'active'
      proposals: [],
      proposalCount: 0,
      viewCount: 0,
      isActive: false, // Wird nach Zahlung zu true
      isPublic: false, // Wird nach Zahlung zu true
      isMarketplaceRequest: true,
      publishingFeePaid: false,
      publishingFeeAmount: PUBLISHING_FEE_CENTS,
      selectedProviders: [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Zahlungs-Datensatz erstellen
    const publishingFeeDoc = await db.collection('marketplace_publishing_fees').add({
      projectId: projectRef.id,
      customerId: customerId || userId,
      customerEmail: authResult.token.email,
      amount: PUBLISHING_FEE_CENTS,
      currency: 'EUR',
      status: 'pending',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Revolut Checkout erstellen für 3,75 EUR Veröffentlichungsgebühr
    const checkoutResult = await RevolutCheckoutService.createOrder({
      amount: PUBLISHING_FEE_CENTS,
      currency: 'EUR',
      orderId: `pub_${projectRef.id}`,
      description: `Marktplatz-Veröffentlichungsgebühr - ${projectTitle}`,
      customerEmail: customerEmail,
    });

    if (!checkoutResult.success || !checkoutResult.checkoutUrl) {
      // Projekt-Entwurf löschen wenn Checkout fehlschlägt
      await projectRef.delete();
      await publishingFeeDoc.delete();
      throw new Error(checkoutResult.error || 'Fehler beim Erstellen der Zahlungssession');
    }

    // Revolut Order ID im Projekt speichern für Webhook-Verarbeitung
    await projectRef.update({
      revolutOrderId: checkoutResult.order?.id,
      publishingFeeId: publishingFeeDoc.id,
    });

    // Auch im Publishing-Fee Dokument speichern
    await publishingFeeDoc.update({
      revolutOrderId: checkoutResult.order?.id,
      revolutPublicId: checkoutResult.order?.public_id,
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutResult.checkoutUrl,
      projectId: projectRef.id,
      publishingFeeId: publishingFeeDoc.id,
      amount: PUBLISHING_FEE_CENTS,
    });

  } catch (error) {
    return NextResponse.json(
      {
        error: 'Interner Serverfehler',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/marketplace/publishing-fee?projectId=xxx
 * Prüft den Status der Publishing-Fee für ein Projekt
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyApiAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }
    const userId = authResult.userId;

    const { db } = await import('@/firebase/server');
    if (!db) {
      return NextResponse.json({ error: 'Firebase nicht verfügbar' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId ist erforderlich' },
        { status: 400 }
      );
    }

    // Projekt laden und prüfen
    const projectDoc = await db.collection('project_requests').doc(projectId).get();
    if (!projectDoc.exists) {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 });
    }

    const projectData = projectDoc.data();
    
    // Berechtigung prüfen
    if (projectData?.customerUid !== userId && projectData?.createdBy !== userId) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    // Publishing-Fee Status prüfen
    const feeQuery = await db.collection('marketplace_publishing_fees')
      .where('projectId', '==', projectId)
      .where('status', '==', 'paid')
      .get();

    return NextResponse.json({
      projectId,
      isPaid: !feeQuery.empty || projectData?.publishingFeePaid === true,
      projectStatus: projectData?.status,
      paidAt: feeQuery.empty ? null : feeQuery.docs[0].data()?.paidAt?.toDate?.(),
    });

  } catch (error) {
    return NextResponse.json(
      {
        error: 'Interner Serverfehler',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
