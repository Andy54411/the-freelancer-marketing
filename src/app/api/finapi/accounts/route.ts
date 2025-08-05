import { NextRequest, NextResponse } from 'next/server';
import { createFinAPIService, createFinAPIAdminService } from '@/lib/finapi-sdk-service';

// Helper function to map finAPI account types to Taskilo types
function mapFinAPIAccountType(accountType: string): string {
  const typeMapping: Record<string, string> = {
    CHECKING: 'checking',
    SAVINGS: 'savings',
    CREDIT_CARD: 'credit_card',
    LOAN: 'loan',
    INVESTMENT: 'investment',
    OTHER: 'other',
  };

  return typeMapping[accountType] || 'other';
}

// GET /api/finapi/accounts - Get accounts for user through finAPI SDK Service
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId'); // Firebase user ID
    const credentialType = (searchParams.get('credentialType') as 'sandbox' | 'admin') || 'sandbox';

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    console.log('Getting accounts for user:', userId, 'with credential type:', credentialType);

    // Get finAPI SDK Service instance
    const finapiService =
      credentialType === 'admin'
        ? createFinAPIAdminService('sandbox')
        : createFinAPIService('sandbox');

    // TODO: Replace with actual user token when user authentication is implemented
    const userToken = null; // User token system not implemented yet

    // For now, return empty array until user authentication is implemented
    // This maintains API compatibility while we work on user auth system
    const emptyResponse = {
      success: true,
      data: [],
      accounts: [],
      totalCount: 0,
    };

    console.log(
      'Accounts query for user:',
      userId,
      '- returning empty results (user auth not implemented)'
    );
    return NextResponse.json(emptyResponse);
  } catch (error: any) {
    console.error('finAPI accounts error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get accounts',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// POST /api/finapi/accounts - Account operations through finAPI SDK Service
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, credentialType = 'sandbox' } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    console.log('Processing account action:', action, 'for user:', userId);

    // Get finAPI SDK Service instance
    const finapiService =
      credentialType === 'admin'
        ? createFinAPIAdminService('sandbox')
        : createFinAPIService('sandbox');

    // TODO: Replace with actual user token when user authentication is implemented
    const userToken = null; // User token system not implemented yet

    // Return not implemented for now - requires user authentication
    return NextResponse.json(
      {
        success: false,
        error: 'Account operations not implemented',
        message: 'User authentication required for account operations',
      },
      { status: 501 }
    );
  } catch (error: any) {
    console.error('finAPI accounts POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process account request',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
