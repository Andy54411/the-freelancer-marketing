/**
 * API Route zum Aktivieren eines Marketplace-Projekts nach erfolgreicher Zahlung
 * 
 * POST /api/marketplace/activate-project
 */

import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { verifyApiAuth } from '@/lib/apiAuth';
import { MarketplacePublishingFeeInvoiceService } from '@/services/payment/MarketplacePublishingFeeInvoiceService';

export async function POST(request: NextRequest) {
  try {
    // Auth prüfen
    const authResult = await verifyApiAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const { db } = await import('@/firebase/server');
    if (!db) {
      return NextResponse.json({ error: 'Firebase nicht verfügbar' }, { status: 500 });
    }

    const body = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId ist erforderlich' },
        { status: 400 }
      );
    }

    // Projekt laden
    const projectRef = db.collection('project_requests').doc(projectId);
    const projectSnap = await projectRef.get();

    if (!projectSnap.exists) {
      return NextResponse.json(
        { error: 'Projekt nicht gefunden' },
        { status: 404 }
      );
    }

    const projectData = projectSnap.data();
    
    // Prüfen ob User berechtigt ist
    if (projectData?.customerUid !== authResult.userId && projectData?.createdBy !== authResult.userId) {
      return NextResponse.json(
        { error: 'Keine Berechtigung für dieses Projekt' },
        { status: 403 }
      );
    }

    // Prüfen ob bereits aktiviert
    if (projectData?.isActive && projectData?.isPublic) {
      return NextResponse.json({
        success: true,
        message: 'Projekt ist bereits aktiv',
        projectId,
      });
    }

    // Projekt aktivieren
    await projectRef.update({
      status: 'active',
      isActive: true,
      isPublic: true,
      publishingFeePaid: true,
      publishedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Publishing-Fee Status aktualisieren
    if (projectData?.publishingFeeId) {
      await db.collection('marketplace_publishing_fees').doc(projectData.publishingFeeId).update({
        status: 'paid',
        paidAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    }

    // Rechnung erstellen und senden
    try {
      const invoiceResult = await MarketplacePublishingFeeInvoiceService.createAndSendInvoice({
        customerId: projectData.customerUid,
        customerName: projectData.customerName || 'Kunde',
        customerEmail: projectData.customerEmail || authResult.token.email || '',
        projectId: projectId,
        projectTitle: projectData.title,
        category: projectData.category || 'Sonstiges',
        subcategory: projectData.subcategory,
        publishingFeeId: projectData.publishingFeeId || '',
        revolutOrderId: projectData.revolutOrderId,
        paymentDate: new Date(),
      });

      if (!invoiceResult.success) {
        console.error('[ActivateProject] Fehler beim Erstellen der Rechnung:', invoiceResult.error);
      }
    } catch (invoiceError) {
      console.error('[ActivateProject] Fehler beim Rechnungsversand:', invoiceError);
      // Fortfahren auch wenn Rechnung fehlschlägt
    }

    return NextResponse.json({
      success: true,
      message: 'Projekt erfolgreich aktiviert',
      projectId,
    });

  } catch (error) {
    console.error('[ActivateProject] Error:', error);
    return NextResponse.json(
      {
        error: 'Interner Serverfehler',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
