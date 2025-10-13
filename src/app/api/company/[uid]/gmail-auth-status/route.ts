import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;
    
    // Check Gmail configuration in company document
    const companyDoc = await db.collection('companies').doc(uid).get();

    if (!companyDoc.exists) {
      return NextResponse.json({
        hasConfig: false,
        error: 'Company not found'
      });
    }

    const gmailConfig = companyDoc.data()?.gmailConfig;

    if (!gmailConfig) {
      return NextResponse.json({
        hasConfig: false,
        error: 'No Gmail configuration found'
      });
    }
    
    // Check token validity
    const hasValidTokens = gmailConfig.tokens?.refresh_token && 
                          gmailConfig.tokens.refresh_token !== 'invalid' &&
                          gmailConfig.tokens.access_token &&
                          gmailConfig.tokens.access_token !== 'invalid';
    
    const isExpired = !hasValidTokens || gmailConfig.status === 'authentication_required';
    
    return NextResponse.json({
      hasConfig: true,
      email: gmailConfig.email,
      provider: gmailConfig.provider || 'gmail',
      hasTokens: hasValidTokens,
      tokenExpired: isExpired,
      status: gmailConfig.status || (hasValidTokens ? 'connected' : 'authentication_required'),
      lastError: gmailConfig.lastError,
      needsReauth: isExpired,
      reauthorizeUrl: `/api/company/${uid}/gmail-connect`
    });
    
  } catch (error) {
    console.error('Error checking Gmail auth status:', error);
    return NextResponse.json({ error: 'Failed to check auth status' }, { status: 500 });
  }
}