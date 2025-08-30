import { NextRequest, NextResponse } from 'next/server';
import { finapiService } from '@/lib/finapi-sdk-service';

/**
 * POST /api/finapi/categorize-transactions
 * Categorize transactions using finAPI or custom logic
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, transactionIds, categoryId, categoryName } = body;

    if (!userId || !transactionIds || transactionIds.length === 0) {
      return NextResponse.json(
        { error: 'User ID and transaction IDs are required' },
        { status: 400 }
      );
    }

    console.log('🏷️ Categorizing transactions:', transactionIds, 'for user:', userId);

    // For now, we'll simulate categorization
    // This will be replaced with actual finAPI calls once the integration is complete

    const categorizedTransactions = transactionIds.map((id: string) => ({
      transactionId: id,
      categoryId: categoryId || 'cat_default',
      categoryName: categoryName || 'Uncategorized',
      updatedAt: new Date().toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: {
        categorizedTransactions,
        totalProcessed: transactionIds.length,
      },
      message: 'Transactions categorized successfully',
      source: 'finAPI SDK Service Mock',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Categorize transactions error:', error.message);

    return NextResponse.json(
      {
        error: 'Failed to categorize transactions',
        details: error.message,
        source: 'finAPI SDK Service',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
