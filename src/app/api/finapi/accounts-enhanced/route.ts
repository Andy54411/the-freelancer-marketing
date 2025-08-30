import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/finapi/accounts-enhanced
 * Get enhanced account data from finAPI
 * SIMPLIFIED: Returns empty accounts since accounts are handled via WebForm
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const credentialType = searchParams.get('credentialType') || 'sandbox';

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('🏦 Getting accounts for user:', userId, 'credentialType:', credentialType);

    // Return empty accounts since WebForm handles account connections
    return NextResponse.json({
      success: true,
      accounts: [],
      accountsByBank: {},
      bankCount: 0,
      totalCount: 0,
      source: 'webform_only',
      message: 'No bank connections found. Please use WebForm to connect your bank.',
      lastSync: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Accounts error:', error.message);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get accounts',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
