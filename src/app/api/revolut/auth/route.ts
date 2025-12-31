import { NextRequest, NextResponse } from 'next/server';
import { revolutOpenBankingService } from '@/lib/revolut-openbanking-service';
import { db } from '@/firebase/server';

/**
 * GET /api/revolut/auth
 * Test Revolut Open Banking API connection
 * Uses Client Credentials + mTLS authentication
 */
export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Datenbank nicht verfügbar' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const companyEmail = searchParams.get('companyEmail');

    if (!userId || !companyEmail) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: userId and companyEmail',
        },
        { status: 400 }
      );
    }

    // Test Open Banking connection
    const connectionResult = await revolutOpenBankingService.testConnection();

    // Store connection in Firebase
    const connectionData = {
      provider: 'revolut',
      status: 'connected',
      userId,
      companyEmail,
      accounts: connectionResult.accounts,
      totalAccounts: connectionResult.totalAccounts,
      connectedAt: new Date().toISOString(),
      environment: connectionResult.environment,
      apiType: 'open-banking',
    };

    // Save to companies collection
    await db
      .collection('companies')
      .doc(userId)
      .collection('banking_connections')
      .doc('revolut')
      .set(connectionData);

    return NextResponse.json({
      success: true,
      message: 'Revolut Open Banking connection successful!',
      data: {
        provider: 'revolut',
        accounts: connectionResult.accounts,
        totalAccounts: connectionResult.totalAccounts,
        environment: connectionResult.environment,
        apiType: 'open-banking',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        provider: 'revolut',
        apiType: 'open-banking',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/revolut/auth
 * Same functionality as GET for compatibility
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
