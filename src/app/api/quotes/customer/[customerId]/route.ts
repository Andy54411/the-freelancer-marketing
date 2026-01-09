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
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Datenbank nicht verfügbar' },
        { status: 500 }
      );
    }

    const { customerId } = await params;

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID ist erforderlich' }, { status: 400 });
    }

    // Abrufen aller Projektanfragen für diesen Kunden aus project_requests
    const projectRequestsSnapshot = await db
      .collection('project_requests')
      .where('customerUid', '==', customerId)
      .get();

    const quotes = projectRequestsSnapshot.docs.map(doc => {
      const data = doc.data();

      return {
        id: doc.id,
        ...data,
      } as any; // Cast to any to avoid TypeScript issues
    });

    // Filter out quotes with withdrawn/declined proposals or inactive status
    const activeQuotes = quotes.filter((quote: any) => {
      // Skip quotes that are explicitly withdrawn or declined at quote level
      if (
        quote.status === 'declined' ||
        quote.status === 'withdrawn' ||
        quote.status === 'cancelled'
      ) {
        return false;
      }

      // If quote has proposals, check if at least one is still active
      if (quote.proposals && Array.isArray(quote.proposals)) {
        const activeProposals = quote.proposals.filter(
          proposal =>
            proposal.status !== 'declined' &&
            proposal.status !== 'withdrawn' &&
            proposal.status !== 'cancelled'
        );

        if (activeProposals.length === 0) {
          return false;
        }
      }

      return true;
    });

    // Use activeQuotes instead of quotes
    const finalQuotes = activeQuotes;

    // Sortiere die Ergebnisse in JavaScript statt in Firestore
    finalQuotes.sort((a: any, b: any) => {
      const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
      const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
      return bTime.getTime() - aTime.getTime();
    });

    return NextResponse.json({
      success: true,
      quotes: finalQuotes,
    });
  } catch {
    return NextResponse.json({ error: 'Fehler beim Abrufen der Angebote' }, { status: 500 });
  }
}
