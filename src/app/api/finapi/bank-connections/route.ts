import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/finapi/bank-connections
 * Get bank connections for a user from finAPI
 * SIMPLIFIED: Returns empty connections since bank connections are handled via WebForm
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const credentialType = searchParams.get('credentialType') || 'sandbox';

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('🔗 Getting bank connections for user:', userId, 'credentialType:', credentialType);

    // Return empty connections since WebForm handles bank connections
    return NextResponse.json({
      success: true,
      connections: [],
      source: 'webform_only',
      message: 'No bank connections found. Please use WebForm to connect your bank.',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Bank connections error:', error.message);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get bank connections',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
