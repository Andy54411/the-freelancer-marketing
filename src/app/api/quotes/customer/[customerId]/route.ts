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
    console.log('📋 [Quotes API] Fetching quotes for customer:', customerId);

    if (!customerId) {
      console.error('❌ [Quotes API] Customer ID ist leer oder undefined');
      return NextResponse.json({ error: 'Customer ID ist erforderlich' }, { status: 400 });
    }

    console.log('🔍 [Quotes API] Querying Firestore collection "project_requests"...');

    // Abrufen aller Projektanfragen für diesen Kunden aus project_requests
    const projectRequestsSnapshot = await db
      .collection('project_requests')
      .where('customerUid', '==', customerId)
      .get();

    console.log('📊 [Quotes API] Query executed, found documents:', projectRequestsSnapshot.size);

    const quotes = projectRequestsSnapshot.docs.map(doc => {
      const data = doc.data();
      console.log('📄 [Quotes API] Document data:', { id: doc.id, data });
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
        console.log(`🚫 [Quotes API] Filtering out quote ${quote.id} with status: ${quote.status}`);
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
          console.log(
            `🚫 [Quotes API] Filtering out quote ${quote.id} - all proposals are inactive`
          );
          return false;
        }
      }

      return true;
    });

    console.log(
      `✅ [Quotes API] Filtered quotes: ${quotes.length} -> ${activeQuotes.length} active quotes`
    );

    // Use activeQuotes instead of quotes
    const finalQuotes = activeQuotes;

    // Sortiere die Ergebnisse in JavaScript statt in Firestore
    finalQuotes.sort((a: any, b: any) => {
      const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
      const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
      return bTime.getTime() - aTime.getTime();
    });

    console.log('✅ [Quotes API] Successfully returning', finalQuotes.length, 'quotes');

    return NextResponse.json({
      success: true,
      quotes: finalQuotes,
    });
  } catch (error) {
    console.error('💥 [Quotes API] Detailed error information:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error: error,
    });
    return NextResponse.json({ error: 'Fehler beim Abrufen der Angebote' }, { status: 500 });
  }
}
