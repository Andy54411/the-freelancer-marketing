import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

/**
 * API Route zum Abrufen aller Angebotsanfragen für einen Kunden
 * GET /api/quotes/customer/[customerId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const { customerId } = await params;

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID ist erforderlich' }, { status: 400 });
    }

    // Abrufen aller Angebotsanfragen für diesen Kunden
    const quotesSnapshot = await db
      .collection('quotes')
      .where('customerUid', '==', customerId)
      .orderBy('createdAt', 'desc')
      .get();

    const quotes = quotesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      quotes,
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Kundenangebote:', error);
    return NextResponse.json({ error: 'Fehler beim Abrufen der Angebote' }, { status: 500 });
  }
}
