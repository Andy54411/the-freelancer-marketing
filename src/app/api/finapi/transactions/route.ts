import { NextRequest, NextResponse } from 'next/server';
import { createFinAPIService, createFinAPIAdminService } from '@/lib/finapi-sdk-service';

// GET /api/finapi/transactions - Get transactions for user through finAPI SDK Service
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '50');
    const userId = searchParams.get('userId'); // Firebase user ID
    const credentialType = (searchParams.get('credentialType') as 'sandbox' | 'admin') || 'sandbox';

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    console.log('Getting transactions for user:', userId, 'with credential type:', credentialType);

    // Get finAPI SDK Service instance
    const finapiService =
      credentialType === 'admin'
        ? createFinAPIAdminService('sandbox')
        : createFinAPIService('sandbox');

    // TODO: Replace with actual user token when user authentication is implemented
    const userToken = null; // User token system not implemented yet

    // For now, return empty array until user authentication is implemented
    // This matches the pattern used in the accounts API
    const emptyResponse = {
      success: true,
      data: [],
      paging: {
        page,
        perPage,
        pageCount: 0,
        totalCount: 0,
      },
      transactions: [],
      totalCount: 0,
    };

    console.log(
      'Transactions query for user:',
      userId,
      '- returning empty results (user auth not implemented)'
    );
    return NextResponse.json(emptyResponse);
  } catch (error: any) {
    console.error('finAPI transactions error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get transactions',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// POST /api/finapi/transactions - Update or categorize transactions through finAPI SDK Service
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, credentialType = 'sandbox' } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    console.log('Processing transaction action:', action, 'for user:', userId);

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
        error: 'Transaction updates not implemented',
        message: 'User authentication required for transaction modifications',
      },
      { status: 501 }
    );
  } catch (error: any) {
    console.error('finAPI transactions POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process transaction request',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
