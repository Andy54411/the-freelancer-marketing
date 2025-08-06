import { NextRequest, NextResponse } from 'next/server';
import { createFinAPIService, createFinAPIAdminService } from '@/lib/finapi-sdk-service';
import { FinAPIUserAuthService } from '@/lib/finapi-user-auth-service';

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

    // Test finAPI credentials first
    const credentialTest = await finapiService.testCredentials();
    
    if (!credentialTest.success) {
      console.warn('⚠️ FinAPI credentials not working, returning mock bank connections');
      
      // Return mock bank connections for development
      const mockConnections = [
        {
          id: 1,
          name: 'Mock Deutsche Bank',
          bankId: 280700240,
          accountIds: [1, 2],
          updateStatus: 'READY',
          lastManualUpdate: { timestamp: new Date().toISOString() }
        },
        {
          id: 2,
          name: 'Mock Sparkasse',
          bankId: 370500000,
          accountIds: [3],
          updateStatus: 'READY',
          lastManualUpdate: { timestamp: new Date().toISOString() }
        }
      ];

      const response = {
        success: true,
        data: mockConnections,
        bankConnections: mockConnections,
        totalCount: mockConnections.length,
        mode: 'mock',
        user: {
          finapiUserId: `mock_${userId}`,
          email: `${userId}@taskilo.de`,
        },
      };

      console.log('🎭 Mock bank connections returned:', mockConnections.length);
      return NextResponse.json(response);
    }

    // Get or create finAPI user using the auth service (only if credentials work)
    const authService = FinAPIUserAuthService.getInstance();
    const finApiUser = await authService.getOrCreateFinAPIUser(userId, `${userId}@taskilo.de`);

    if (!finApiUser) {
      return NextResponse.json(
        { error: 'Failed to authenticate with finAPI' },
        { status: 401 }
      );
    }

    console.log('✅ finAPI user authenticated:', finApiUser.id);

    // Get user token for API calls
    const userToken = await finapiService.getUserToken(finApiUser.id, finApiUser.password);
    
    // Get bank connections for authenticated user
    const bankConnections = await finapiService.getBankConnections(userToken);

    const response = {
      success: true,
      data: bankConnections,
      bankConnections,
      totalCount: bankConnections.length,
      mode: 'live',
      user: {
        finapiUserId: finApiUser.id,
        email: finApiUser.email,
      },
    };

    console.log(
      'Bank connections retrieved for user:',
      userId,
      'Count:',
      bankConnections.length
    );
    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('finAPI bank connections error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get bank connections',
        details: error instanceof Error ? error.message : 'Unknown error',
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

    // Get or create finAPI user using the auth service
    const authService = FinAPIUserAuthService.getInstance();
    const finApiUser = await authService.getOrCreateFinAPIUser(userId, `${userId}@taskilo.de`);

    if (!finApiUser) {
      return NextResponse.json(
        { error: 'Failed to authenticate with finAPI' },
        { status: 401 }
      );
    }

    // Get user token for API calls
    const userToken = await finapiService.getUserToken(finApiUser.id, finApiUser.password);

    if (action === 'import') {
      // Create WebForm 2.0 for bank connection import
      const { bankId, successCallback, errorCallback } = body;
      
      const webForm = await finapiService.createBankImportWebForm(userToken, {
        bankId: bankId ? parseInt(bankId) : undefined,
        callbacks: {
          successCallback: successCallback || `${process.env.NEXT_PUBLIC_APP_URL}/api/finapi/webform/success`,
          errorCallback: errorCallback || `${process.env.NEXT_PUBLIC_APP_URL}/api/finapi/webform/error`,
        },
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/company/${userId}/finance/banking/import`
      });

      return NextResponse.json({
        success: true,
        action: 'import',
        webForm,
        message: 'WebForm 2.0 created successfully',
      });
    }

    if (action === 'delete') {
      // Delete bank connection
      const { bankConnectionId } = body;

      if (!bankConnectionId) {
        return NextResponse.json(
          { error: 'Bank connection ID required for deletion' },
          { status: 400 }
        );
      }

      // Use raw fetch for deletion as SDK might not expose this method
      const baseUrl = process.env.FINAPI_BASE_URL_SANDBOX || 'https://sandbox.finapi.io';
      const response = await fetch(`${baseUrl}/api/v1/bankConnections/${bankConnectionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Bank connection deletion failed: ${errorText}`);
      }

      return NextResponse.json({
        success: true,
        action: 'delete',
        message: `Bank connection ${bankConnectionId} deleted successfully`,
      });
    }

    if (action === 'edit') {
      // Edit bank connection (name update)
      const { bankConnectionId, name } = body;

      if (!bankConnectionId) {
        return NextResponse.json(
          { error: 'Bank connection ID required for editing' },
          { status: 400 }
        );
      }

      // Use raw fetch for editing as SDK might not expose this method
      const baseUrl = process.env.FINAPI_BASE_URL_SANDBOX || 'https://sandbox.finapi.io';
      const response = await fetch(`${baseUrl}/api/v1/bankConnections/${bankConnectionId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Bank connection edit failed: ${errorText}`);
      }

      const updatedConnection = await response.json();

      return NextResponse.json({
        success: true,
        action: 'edit',
        data: updatedConnection,
        message: `Bank connection ${bankConnectionId} updated successfully`,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action specified' },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error('finAPI bank connections POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process bank connection request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
