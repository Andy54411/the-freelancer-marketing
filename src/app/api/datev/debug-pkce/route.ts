import { NextRequest, NextResponse } from 'next/server';
import { getPKCEStorageStats } from '@/lib/pkce-storage';

/**
 * Debug endpoint for PKCE storage inspection
 */
export async function GET(request: NextRequest) {
  try {
    const stats = getPKCEStorageStats();

    return NextResponse.json({
      success: true,
      storage: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get storage stats',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
