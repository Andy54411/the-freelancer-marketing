import { NextRequest, NextResponse } from 'next/server';
import { generateDatevAuthUrl } from '@/lib/datev-config';

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

    // TODO: Store codeVerifier, state, and nonce securely
    // These need to be retrieved during the callback
    console.log('Generated DATEV auth data:', {
      state: authData.state,
      codeVerifier: authData.codeVerifier.substring(0, 10) + '...',
      nonce: authData.nonce.substring(0, 10) + '...',
      authUrl: authData.authUrl.substring(0, 100) + '...',
    });

    // WARNING: In production, store these securely (Redis, Database, etc.)
    // For now, we'll need to implement proper storage
    // Temporary solution: Return state and expect client to handle storage

    return NextResponse.json({
      success: true,
      authUrl: authData.authUrl,
      state: authData.state,
      // DO NOT return codeVerifier and nonce to client in production!
      // This is temporary for development
      metadata: {
        codeVerifier: authData.codeVerifier,
        nonce: authData.nonce,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('DATEV auth URL generation failed:', error);

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

    // Log for debugging
    console.log('Generated DATEV auth data (GET):', {
      state: authData.state,
      codeVerifier: authData.codeVerifier.substring(0, 10) + '...',
      nonce: authData.nonce.substring(0, 10) + '...',
    });

    return NextResponse.json({
      success: true,
      authUrl: authData.authUrl,
      state: authData.state,
      // Development only - implement secure storage in production
      metadata: {
        codeVerifier: authData.codeVerifier,
        nonce: authData.nonce,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('DATEV auth URL generation failed:', error);

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
