// ✅ PHASE 1: Google Ads Connection Status & Validation
// Prüft Verbindungsstatus und Account-Zugriff

import { NextRequest, NextResponse } from 'next/server';
import { googleAdsService } from '@/services/googleAdsService';
import { db } from '@/firebase/clients';
import { doc, getDoc } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Try to get Google Ads configuration
    try {
      const googleAdsDoc = doc(db, 'companies', companyId, 'integrations', 'googleAds');
      const googleAdsSnap = await getDoc(googleAdsDoc);

      if (!googleAdsSnap.exists()) {
        return NextResponse.json({
          success: true,
          status: 'SETUP_REQUIRED',
          connected: false,
          message: 'Google Ads integration not configured',
        });
      }

      const googleAdsData = googleAdsSnap.data();
      const config = googleAdsData?.accountConfig;

      if (!config || !config.accessToken) {
        return NextResponse.json({
          success: true,
          status: 'SETUP_REQUIRED',
          connected: false,
          message: 'No access token found',
        });
      }

      // Check connection status
      const connectionStatus = await googleAdsService.checkConnectionStatus(config);

      // Get basic account info if connected
      let accountsInfo = [];
      if (connectionStatus.status === 'CONNECTED' && googleAdsData.linkedAccounts) {
        accountsInfo = googleAdsData.linkedAccounts.map((account: any) => ({
          id: account.id,
          name: account.name,
          currency: account.currency,
          status: account.status,
          linked: account.linked,
          linkedAt: account.linkedAt,
        }));
      }

      return NextResponse.json({
        success: true,
        status: connectionStatus.status,
        connected: connectionStatus.status === 'CONNECTED',
        accountsConnected: connectionStatus.accountsConnected,
        accounts: accountsInfo,
        lastSync: googleAdsData.lastSync?.toDate(),
        quotaUsage: connectionStatus.quotaUsage,
        error: connectionStatus.error,
        integrationConfig: {
          syncFrequency: googleAdsData.syncFrequency,
          billingIntegration: googleAdsData.billingIntegration,
        },
      });
    } catch (dbError) {
      console.error('Firebase/Database Error:', dbError);
      // Return setup required on database errors
      return NextResponse.json({
        success: true,
        status: 'SETUP_REQUIRED',
        connected: false,
        message: 'Database connection error - please try connecting your Google Ads account',
      });
    }
  } catch (error) {
    console.error('Google Ads Status Check Error:', error);
    return NextResponse.json({
      success: false,
      status: 'ERROR',
      connected: false,
      error: 'Failed to check connection status',
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, action } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    const googleAdsDoc = doc(db, 'companies', companyId, 'integrations', 'googleAds');
    const googleAdsSnap = await getDoc(googleAdsDoc);

    if (!googleAdsSnap.exists()) {
      return NextResponse.json({ error: 'Google Ads integration not found' }, { status: 404 });
    }

    const googleAdsData = googleAdsSnap.data();
    const config = googleAdsData.accountConfig;

    switch (action) {
      case 'test_connection':
        const connectionStatus = await googleAdsService.checkConnectionStatus(config);
        return NextResponse.json({
          success: true,
          connectionStatus,
          timestamp: new Date().toISOString(),
        });

      case 'validate_tokens':
        if (!config || !config.accessToken) {
          return NextResponse.json({
            success: true,
            valid: false,
            reason: 'No access token',
          });
        }

        const testResponse = await googleAdsService.getCustomers(config);

        return NextResponse.json({
          success: true,
          valid: testResponse.success,
          reason: testResponse.success ? 'Tokens are valid' : testResponse.error?.message,
          error: testResponse.error,
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Google Ads Status Action Error:', error);
    return NextResponse.json({ error: 'Action failed' }, { status: 500 });
  }
}
