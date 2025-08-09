// ✅ PHASE 1: Google Ads OAuth2 Callback Endpoint
// Verarbeitet den OAuth-Callback und speichert Tokens

import { NextRequest, NextResponse } from 'next/server';
import { googleAdsService } from '@/services/googleAdsService';
import { db } from '@/firebase/server';
import { GoogleAdsOAuthConfig } from '@/types/googleAds';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // Contains companyId
    const error = searchParams.get('error');

    console.log('🔍 Google Ads Callback:', { code: !!code, state, error });

    if (error) {
      const errorMessage = searchParams.get('error_description') || 'Authorization failed';
      console.error('❌ OAuth error:', error, errorMessage);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/company/${state}/google-ads?error=${encodeURIComponent(errorMessage)}`
      );
    }

    if (!code || !state) {
      console.error('❌ Missing parameters:', { code: !!code, state: !!state });
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/company/${state || 'unknown'}/google-ads?error=missing_parameters`
      );
    }

    const companyId = state;
    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/google-ads/callback`;

    // Validate companyId format (Firebase document ID validation)
    if (!companyId || companyId.length < 1 || companyId.includes('/')) {
      console.error('❌ Invalid companyId:', companyId);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/company/unknown/google-ads?error=invalid_company_id`
      );
    }

    console.log('🔄 Exchanging code for tokens...');
    // Exchange authorization code for tokens
    const tokenResponse = await googleAdsService.exchangeCodeForTokens(code, redirectUri);

    if (!tokenResponse.success || !tokenResponse.data) {
      console.error('❌ Token exchange failed:', tokenResponse.error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/company/${companyId}/google-ads?error=token_exchange_failed`
      );
    }

    const tokens = tokenResponse.data;
    console.log('✅ Token exchange successful');

    // Prepare OAuth config
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN!;

    if (!developerToken) {
      console.error('❌ Missing Google Ads Developer Token');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/company/${companyId}/google-ads?error=missing_developer_token`
      );
    }

    const oauthConfig: GoogleAdsOAuthConfig = {
      clientId: process.env.GOOGLE_ADS_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token,
      tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
      developerToken,
    };

    // Get accessible customers
    const customersResponse = await googleAdsService.getCustomers(oauthConfig);

    if (!customersResponse.success) {
      console.error('Failed to fetch customers:', customersResponse.error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/company/${companyId}/google-ads?error=fetch_customers_failed`
      );
    }

    // Save Google Ads configuration to Firestore (using Admin SDK)
    const googleAdsDocRef = db
      .collection('companies')
      .doc(companyId)
      .collection('integrations')
      .doc('googleAds');

    try {
      const existingDoc = await googleAdsDocRef.get();

      // Prepare data for Firestore (only store non-sensitive data)
      const googleAdsData = {
        companyId,
        accountConfig: {
          clientId: oauthConfig.clientId,
          // Don't store clientSecret in Firestore for security
          refreshToken: oauthConfig.refreshToken,
          accessToken: oauthConfig.accessToken,
          tokenExpiry: oauthConfig.tokenExpiry,
          developerToken: oauthConfig.developerToken,
          connected: true,
          connectedAt: new Date(),
        },
        linkedAccounts: customersResponse.data?.customers || [],
        lastSync: new Date(),
        syncFrequency: 'DAILY' as const,
        billingIntegration: {
          stripeEnabled: false,
          datevEnabled: false,
          autoInvoicing: false,
          costCenterMapping: {},
        },
        status: 'CONNECTED' as const,
        updatedAt: new Date(),
      };

      if (existingDoc.exists) {
        await googleAdsDocRef.update(googleAdsData);
        console.log('✅ Google Ads config updated for company:', companyId);
      } else {
        await googleAdsDocRef.set({
          ...googleAdsData,
          createdAt: new Date(),
        });
        console.log('✅ Google Ads config created for company:', companyId);
      }

      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/company/${companyId}/google-ads?success=connected&accounts=${customersResponse.data?.customers.length || 0}`
      );
    } catch (firestoreError) {
      console.error('❌ Firestore save error:', firestoreError);
      console.error('Error details:', {
        companyId,
        errorMessage: firestoreError.message,
        errorCode: firestoreError.code,
      });
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/company/${companyId}/google-ads?error=save_failed&details=${encodeURIComponent(firestoreError.message)}`
      );
    }
  } catch (error) {
    console.error('Google Ads Callback Error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/company/unknown/google-ads?error=callback_failed`
    );
  }
}
