import { NextRequest, NextResponse } from 'next/server';
import { generateDatevAuthUrl } from '@/lib/datev-config';
import { storePKCEData } from '@/lib/pkce-storage';

/**
 * DATEV OAuth URL Generation with PKCE
 * Generates DATEV OAuth authorization URLs server-side with proper PKCE implementation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Generate OAuth URL with PKCE server-side
    const authData = generateDatevAuthUrl(companyId);

    // Store PKCE data securely for retrieval during callback
    storePKCEData(authData.state, {
      codeVerifier: authData.codeVerifier,
      nonce: authData.nonce,
      timestamp: Date.now(),
      companyId,
    });

    return NextResponse.json({
      success: true,
      authUrl: authData.authUrl,
      state: authData.state,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate auth URL',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for simple auth URL generation
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required as query parameter' },
        { status: 400 }
      );
    }

    // Generate OAuth URL with PKCE
    const authData = generateDatevAuthUrl(companyId);

    // Store PKCE data securely for retrieval during callback
    storePKCEData(authData.state, {
      codeVerifier: authData.codeVerifier,
      nonce: authData.nonce,
      timestamp: Date.now(),
      companyId,
    });

    // Log for debugging

    return NextResponse.json({
      success: true,
      authUrl: authData.authUrl,
      state: authData.state,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate auth URL',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
