/**
 * Admin Dashboard Stats API Route
 * 
 * Firebase-basierte Dashboard-Statistiken
 */

import { NextRequest, NextResponse } from 'next/server';
import { FirebaseAdminStatsService } from '@/services/admin/FirebaseAdminStatsService';

export async function GET(_request: NextRequest) {
  try {
    const stats = await FirebaseAdminStatsService.getDashboardStats();

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats', details: errorMessage },
      { status: 500 }
    );
  }
}
