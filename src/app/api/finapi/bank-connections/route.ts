import { NextRequest, NextResponse } from 'next/server';
import { createFinAPIService, createFinAPIAdminService } from '@/lib/finapi-sdk-service';

// GET /api/finapi/bank-connections - Get bank connections for user through finAPI SDK Service
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId'); // Firebase user ID
    const credentialType = (searchParams.get('credentialType') as 'sandbox' | 'admin') || 'sandbox';

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    console.log(
      'Getting bank connections for user:',
      userId,
      'with credential type:',
      credentialType
    );

    // Get finAPI SDK Service instance
    const finapiService =
      credentialType === 'admin'
        ? createFinAPIAdminService('sandbox')
        : createFinAPIService('sandbox');

    // TODO: Replace with actual user token when user authentication is implemented
    const userToken = null; // User token system not implemented yet

    // For now, return empty array until user authentication is implemented
    const emptyResponse = {
      success: true,
      data: [],
      bankConnections: [],
      totalCount: 0,
    };

    console.log(
      'Bank connections query for user:',
      userId,
      '- returning empty results (user auth not implemented)'
    );
    return NextResponse.json(emptyResponse);
  } catch (error: any) {
    console.error('finAPI bank connections error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get bank connections',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// POST /api/finapi/bank-connections - Manage bank connections through finAPI SDK Service
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, credentialType = 'sandbox' } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    console.log('Processing bank connection action:', action, 'for user:', userId);

    // Get finAPI SDK Service instance
    const finapiService =
      credentialType === 'admin'
        ? createFinAPIAdminService('sandbox')
        : createFinAPIAdminService('sandbox');

    // TODO: Replace with actual user token when user authentication is implemented
    const userToken = null; // User token system not implemented yet

    if (action === 'import') {
      // Import bank connection
      const { bankId, loginCredentials } = body;

      return NextResponse.json(
        {
          success: false,
          error: 'Bank connection import not implemented',
          message: 'User authentication required for bank connection import',
          needsImplementation: {
            userToken: 'Requires getUserToken method for user authentication',
            importBankConnection: 'Requires importBankConnection method in SDK service',
            webFormIntegration: 'Requires WebForm 2.0 integration',
          },
        },
        { status: 501 }
      );
    }

    if (action === 'delete') {
      // Delete bank connection
      const { bankConnectionId } = body;

      return NextResponse.json(
        {
          success: false,
          error: 'Bank connection deletion not implemented',
          message: 'User authentication required for bank connection deletion',
        },
        { status: 501 }
      );
    }

    if (action === 'edit') {
      // Edit bank connection
      const { bankConnectionId, name } = body;

      return NextResponse.json(
        {
          success: false,
          error: 'Bank connection editing not implemented',
          message: 'User authentication required for bank connection editing',
        },
        { status: 501 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action specified' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('finAPI bank connections POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process bank connection request',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
