import { NextRequest, NextResponse } from 'next/server';
import { generateDatevAuthUrl } from '@/lib/datev-config';

/**
 * DATEV OAuth URL Generation
 * Generates DATEV OAuth authorization URLs server-side to avoid environment variable issues
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, state } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Generate state with company context if not provided
    const authState = state || `company:${companyId}:${Date.now()}`;

    // Generate OAuth URL server-side where environment variables are available
    const authUrl = generateDatevAuthUrl(authState);

    return NextResponse.json({
      success: true,
      authUrl,
      state: authState,
      timestamp: new Date().toISOString(),
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
    const state = searchParams.get('state');

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required as query parameter' },
        { status: 400 }
      );
    }

    // Generate state with company context if not provided
    const authState = state || `company:${companyId}:${Date.now()}`;

    // Generate OAuth URL server-side
    const authUrl = generateDatevAuthUrl(authState);

    return NextResponse.json({
      success: true,
      authUrl,
      state: authState,
      timestamp: new Date().toISOString(),
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
