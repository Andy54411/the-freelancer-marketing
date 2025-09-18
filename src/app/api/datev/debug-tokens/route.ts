import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

/**
 * Debug DATEV Token Storage
 * Check if tokens are properly stored in Firestore
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
    }

    // Check if tokens exist in Firestore
    const tokenDoc = await db
      .collection('users')
      .doc(companyId)
      .collection('datev')
      .doc('tokens')
      .get();

    if (!tokenDoc.exists) {
      return NextResponse.json({
        success: false,
        message: 'No DATEV tokens found',
        companyId,
        tokenPath: `companies/${companyId}/datev/tokens`,
        recommendation: 'Try completing the OAuth flow again',
      });
    }

    const tokenData = tokenDoc.data();
    const now = new Date();
    const expiresAt = tokenData?.expires_at?.toDate?.() || new Date(0);
    const isExpired = now > expiresAt;

    // Check company connection status
    const companyDoc = await db!.collection('users').doc(companyId).get();
    const companyData = companyDoc.data();
    const datevStatus = companyData?.datev || {};

    return NextResponse.json({
      success: true,
      message: 'DATEV token analysis complete',
      companyId,
      tokens: {
        exists: true,
        hasAccessToken: !!tokenData?.access_token,
        hasRefreshToken: !!tokenData?.refresh_token,
        tokenType: tokenData?.token_type,
        scope: tokenData?.scope,
        expiresAt: expiresAt.toISOString(),
        isExpired,
        isActive: tokenData?.is_active,
        connectedAt: tokenData?.connected_at?.toDate?.()?.toISOString(),
        lastUpdated: tokenData?.last_updated?.toDate?.()?.toISOString(),
      },
      company: {
        datevConnected: datevStatus.connected,
        datevStatus: datevStatus.status,
        datevConnectedAt: datevStatus.connected_at?.toDate?.()?.toISOString(),
      },
      recommendations: isExpired
        ? ['Token is expired - refresh needed', 'Try re-authenticating with DATEV']
        : ['Token appears valid', 'Try using the token for API calls'],
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Token debug failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
