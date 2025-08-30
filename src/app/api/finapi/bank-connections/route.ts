import { NextRequest, NextResponse } from 'next/server';
import { finapiService } from '@/lib/finapi-sdk-service';
import { db } from '@/firebase/server';

/**
 * GET /api/finapi/bank-connections
 * Get bank connections for a user from finAPI
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

    try {
      // CRITICAL FIX: Get REAL company email (same as WebForm and accounts-enhanced)
      const companyDoc = await db.collection('companies').doc(userId).get();

      if (!companyDoc.exists) {
        return NextResponse.json({
          success: true,
          connections: [],
          source: 'no_company',
          message: 'Company not found.',
          timestamp: new Date().toISOString(),
        });
      }

      const companyData = companyDoc.data();
      const companyEmail = companyData?.email;

      if (!companyEmail) {
        console.log('ℹ️ No company email found, returning empty connections');
        return NextResponse.json({
          success: true,
          connections: [],
          source: 'no_email',
          message: 'Company email not found. Please complete your profile.',
          timestamp: new Date().toISOString(),
        });
      }

      console.log('✅ Using REAL company email for bank connections:', companyEmail);

      // Use the SAME email as WebForm and accounts-enhanced
      const bankData = await finapiService.syncUserBankData(companyEmail, userId);

      if (bankData.connections && bankData.connections.length > 0) {
        console.log('✅ Found finAPI bank connections:', bankData.connections.length);

        // Transform connections to our format
        const transformedConnections = bankData.connections.map((conn: any) => ({
          id: conn.id,
          bankName: conn.bankName || 'Unknown Bank',
          bankId: conn.bankId,
          accountIds: conn.accountIds || [],
          status: conn.bankConnectionState || 'READY',
          createdAt: conn.creationTime,
          lastUpdated: conn.lastUpdateTime,
          isActive: true,
        }));

        return NextResponse.json({
          success: true,
          connections: transformedConnections,
          source: 'finapi_live',
          timestamp: new Date().toISOString(),
        });
      } else {
        console.log('ℹ️ No finAPI bank connections found');
      }

      // Fallback: No bank connections found
      console.log('ℹ️ No bank connections found, returning empty connections');

      return NextResponse.json({
        success: true,
        connections: [],
        source: 'no_connections',
        message: 'No bank connections found. Please connect a bank first.',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('❌ Bank connections error:', error.message);

      return NextResponse.json({
        success: true,
        connections: [],
        source: 'error_fallback',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error: any) {
    console.error('❌ Bank connections API error:', error.message);

    return NextResponse.json(
      {
        error: 'Failed to fetch bank connections',
        details: error.message,
        source: 'finAPI Bank Connections API',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
