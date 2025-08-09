// Google Ads System Diagnose API
// Prüft alle Komponenten und gibt detaillierte Diagnose-Information zurück

import { NextRequest, NextResponse } from 'next/server';
import { GoogleAdsSystemChecker } from '@/utils/googleAdsSystemChecker';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';

    // Führe System-Diagnose durch
    const systemStatus = await GoogleAdsSystemChecker.checkSystemStatus();

    const response = {
      success: true,
      status: systemStatus.overall,
      description: GoogleAdsSystemChecker.getStatusDescription(systemStatus),
      actionItems: GoogleAdsSystemChecker.getActionItems(systemStatus),
      timestamp: new Date().toISOString(),
    };

    // Detaillierte Informationen nur wenn angefordert
    if (detailed) {
      (response as any).details = {
        environment: systemStatus.environment,
        service: systemStatus.service,
        api: systemStatus.api,
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Google Ads System Diagnose Error:', error);
    return NextResponse.json(
      {
        success: false,
        status: 'ERROR',
        description: 'System-Diagnose fehlgeschlagen',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'validate_config') {
      // Konfiguration erneut validieren
      const systemStatus = await GoogleAdsSystemChecker.checkSystemStatus();

      return NextResponse.json({
        success: true,
        status: systemStatus.overall,
        validation: systemStatus.environment,
        recommendations: GoogleAdsSystemChecker.getActionItems(systemStatus),
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Google Ads System Action Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
