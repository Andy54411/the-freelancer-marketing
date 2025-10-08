import { NextRequest, NextResponse } from 'next/server';
import { ReceiptLinkingService, OCRReceiptData } from '@/services/ReceiptLinkingService';

export async function POST(request: NextRequest) {
  try {
    const { companyId, userId, ocrData, pdfUrl } = await request.json();

    console.log('📄 OCR Receipt API aufgerufen:', { companyId, userId, hasOcrData: !!ocrData });

    if (!companyId || !userId || !ocrData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: companyId, userId, ocrData',
        },
        { status: 400 }
      );
    }

    // Erstelle Beleg mit automatischer Verknüpfung
    const result = await ReceiptLinkingService.createReceiptFromOCR(
      companyId,
      userId,
      ocrData as OCRReceiptData,
      pdfUrl
    );

    if (result.success) {
      console.log('✅ OCR Receipt erfolgreich verarbeitet:', result.receiptId);

      return NextResponse.json({
        success: true,
        receiptId: result.receiptId,
        linkedTransactionId: result.linkedTransactionId,
        message: result.linkedTransactionId
          ? `Beleg ${result.receiptId} erstellt und automatisch mit Transaktion ${result.linkedTransactionId} verknüpft`
          : `Beleg ${result.receiptId} erstellt (keine passende Transaktion gefunden)`,
      });
    } else {
      console.error('❌ Fehler bei OCR Receipt Verarbeitung:', result.error);

      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ Unerwarteter Fehler in OCR Receipt API:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Server-Fehler',
      },
      { status: 500 }
    );
  }
}

// GET endpoint um bestehende Receipt-Links abzurufen
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing companyId parameter',
        },
        { status: 400 }
      );
    }

    // Lade Transaction Links aus Firestore
    const { collection, getDocs } = await import('firebase/firestore');
    const { db } = await import('@/firebase/clients');

    const transactionLinksRef = collection(db, 'companies', companyId, 'transaction_links');
    const snapshot = await getDocs(transactionLinksRef);

    const links = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(`📊 ${links.length} Transaction Links für Company ${companyId} gefunden`);

    return NextResponse.json({
      success: true,
      links,
      count: links.length,
    });
  } catch (error) {
    console.error('❌ Fehler beim Laden der Transaction Links:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Server-Fehler',
      },
      { status: 500 }
    );
  }
}
