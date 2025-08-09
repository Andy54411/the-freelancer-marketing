// ✅ PHASE 1: Google Ads Connection Status & Validation
// Prüft Verbindungsstatus und Account-Zugriff mit Client Library

import { NextRequest, NextResponse } from 'next/server';
import { googleAdsClientService } from '@/services/googleAdsClientService';
import { db } from '@/firebase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Try to get Google Ads configuration using Admin SDK
    try {
      let googleAdsDocRef = db
        .collection('companies')
        .doc(companyId)
        .collection('integrations')
        .doc('googleAds');
      let googleAdsSnap = await googleAdsDocRef.get();
      let actualCompanyId = companyId;

      console.log('🔍 Debug Google Ads Status Check:', {
        companyId,
        docExists: googleAdsSnap.exists,
        docPath: `companies/${companyId}/integrations/googleAds`,
        timestamp: new Date().toISOString(),
      });

      // If not found with provided companyId, search all companies for Google Ads config
      if (!googleAdsSnap.exists) {
        console.log(`🔍 Google Ads config not found for ${companyId}, searching all companies...`);

        const companiesRef = db.collection('companies');
        const companiesSnap = await companiesRef.get();

        for (const companyDoc of companiesSnap.docs) {
          const testGoogleAdsDocRef = companyDoc.ref.collection('integrations').doc('googleAds');
          const testGoogleAdsSnap = await testGoogleAdsDocRef.get();

          if (testGoogleAdsSnap.exists) {
            console.log(`✅ Found Google Ads config for company: ${companyDoc.id}`);
            googleAdsDocRef = testGoogleAdsDocRef;
            googleAdsSnap = testGoogleAdsSnap;
            actualCompanyId = companyDoc.id;
            break;
          }
        }
      }

      if (!googleAdsSnap.exists) {
        // Debug: Check if company document exists
        const companyDoc = await db.collection('companies').doc(companyId).get();
        console.log('🔍 Company document exists:', companyDoc.exists);

        // Debug: List all companies to see available IDs
        const companiesSnapshot = await db.collection('companies').limit(5).get();
        const availableCompanyIds = companiesSnapshot.docs.map(doc => doc.id);
        console.log('🔍 Available company IDs:', availableCompanyIds);

        return NextResponse.json({
          success: true,
          status: 'SETUP_REQUIRED',
          connected: false,
          message: 'Google Ads integration not configured',
          debug: {
            companyExists: companyDoc.exists,
            availableCompanyIds,
            searchedCompanyId: companyId,
          },
        });
      }

      const googleAdsData = googleAdsSnap.data();
      const config = googleAdsData?.accountConfig;

      if (!config || !config.refreshToken) {
        return NextResponse.json({
          success: true,
          status: 'SETUP_REQUIRED',
          connected: false,
          message: 'No refresh token found - reconnection required',
          actualCompanyId,
        });
      }

      // 🔄 AUTOMATISCHES TOKEN REFRESH wenn abgelaufen
      let currentConfig = config;

      // Prüfe ob Token abgelaufen ist
      const now = new Date();
      const tokenExpiry = config.tokenExpiry ? new Date(config.tokenExpiry) : new Date(0);
      const isExpired = now >= tokenExpiry;

      console.log('🔍 Token Status:', {
        now: now.toISOString(),
        tokenExpiry: tokenExpiry.toISOString(),
        isExpired,
        hasRefreshToken: !!config.refreshToken,
      });

      if (isExpired && config.refreshToken) {
        console.log('🔄 Token ist abgelaufen - refreshing automatisch...');

        const refreshResult = await googleAdsClientService.refreshAccessToken(config.refreshToken);

        if (refreshResult.success && refreshResult.data) {
          console.log('✅ Token erfolgreich refreshed');

          // Aktualisiere Config mit neuen Token
          currentConfig = {
            ...config,
            accessToken: refreshResult.data.access_token,
            tokenExpiry: new Date(Date.now() + refreshResult.data.expires_in * 1000),
          };

          // Speichere neue Token in Firestore
          await googleAdsDocRef.update({
            'accountConfig.accessToken': currentConfig.accessToken,
            'accountConfig.tokenExpiry': currentConfig.tokenExpiry,
            lastSync: new Date(),
            updatedAt: new Date(),
          });

          console.log('✅ Neue Token in Firestore gespeichert');
        } else {
          console.error('❌ Token refresh fehlgeschlagen:', refreshResult.error);
          return NextResponse.json({
            success: true,
            status: 'RECONNECTION_REQUIRED',
            connected: false,
            message: 'Token refresh failed - reconnection required',
            error: refreshResult.error?.message,
            actualCompanyId,
          });
        }
      }

      // Check connection status with Client Library (mit aktuellen Token)
      const connectionStatus = await googleAdsClientService.checkConnectionStatus(currentConfig);

      // Get basic account info if connected
      let accountsInfo = [];
      if (
        connectionStatus.success &&
        connectionStatus.data?.connected &&
        googleAdsData.linkedAccounts
      ) {
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
        status: connectionStatus.data?.connected ? 'CONNECTED' : 'DISCONNECTED',
        connected: connectionStatus.data?.connected,
        accountsConnected: connectionStatus.data?.hasCustomerAccess,
        accounts: accountsInfo,
        lastSync: googleAdsData.lastSync?.toDate(),
        lastChecked: connectionStatus.data?.lastChecked,
        error: connectionStatus.data?.error,
        actualCompanyId, // Include the actual company ID that was found
        searchedCompanyId: companyId, // Include the original search ID
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

    const googleAdsDocRef = db
      .collection('companies')
      .doc(companyId)
      .collection('integrations')
      .doc('googleAds');
    const googleAdsSnap = await googleAdsDocRef.get();

    if (!googleAdsSnap.exists) {
      return NextResponse.json({ error: 'Google Ads integration not found' }, { status: 404 });
    }

    const googleAdsData = googleAdsSnap.data();

    if (!googleAdsData) {
      return NextResponse.json({ error: 'Google Ads configuration is empty' }, { status: 404 });
    }

    const config = googleAdsData.accountConfig;

    switch (action) {
      case 'test_connection':
        const connectionStatus = await googleAdsClientService.checkConnectionStatus(config);
        return NextResponse.json({
          success: true,
          connectionStatus: connectionStatus.data,
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

        const testResponse = await googleAdsClientService.getCustomerInfo(
          config.refreshToken,
          config.customerId || ''
        );

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
