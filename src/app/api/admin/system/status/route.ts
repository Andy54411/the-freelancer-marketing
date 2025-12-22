/**
 * Admin System Status API Route
 * 
 * Firebase-basierter System-Status
 */

import { NextRequest, NextResponse } from 'next/server';
import { FirebaseAdminStatsService } from '@/services/admin/FirebaseAdminStatsService';

export async function GET(_request: NextRequest) {
  try {
    const status = await FirebaseAdminStatsService.getSystemStatus();

    return NextResponse.json({
      success: true,
      status,
      timestamp: new Date().toISOString(),
      services: {
        firebase: status.firebase,
        storage: status.storage,
        api: status.api,
      },
      overall: status.overall,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { 
        error: 'Failed to fetch system status', 
        details: errorMessage,
        status: {
          firebase: 'error',
          storage: 'unknown',
          api: 'healthy',
          overall: 'error',
        },
      },
      { status: 500 }
    );
  }
}
