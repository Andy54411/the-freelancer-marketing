// ✅ PHASE 1: Google Ads OAuth2 Callback Endpoint
// Verarbeitet den OAuth-Callback und speichert Tokens

import { NextRequest, NextResponse } from 'next/server';
import { googleAdsService } from '@/services/googleAdsService';
import { db } from '@/firebase/clients';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { GoogleAdsOAuthConfig } from '@/types/googleAds';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // Contains companyId
    const error = searchParams.get('error');

    if (error) {
      const errorMessage = searchParams.get('error_description') || 'Authorization failed';
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/company/${state}/google-ads?error=${encodeURIComponent(errorMessage)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/company/${state}/google-ads?error=missing_parameters`
      );
    }

    const companyId = state;
    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/google-ads/callback`;

    // Exchange authorization code for tokens
    const tokenResponse = await googleAdsService.exchangeCodeForTokens(code, redirectUri);

    if (!tokenResponse.success || !tokenResponse.data) {
      console.error('Token exchange failed:', tokenResponse.error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/company/${companyId}/google-ads?error=token_exchange_failed`
      );
    }

    const tokens = tokenResponse.data;

    // Prepare OAuth config
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN!;

    if (!developerToken) {
      console.error('Missing Google Ads Developer Token');
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

    // Save Google Ads configuration to Firestore
    const googleAdsDoc = doc(db, 'companies', companyId, 'integrations', 'googleAds');

    try {
      const existingDoc = await getDoc(googleAdsDoc);

      const googleAdsData = {
        companyId,
        accountConfig: oauthConfig,
        linkedAccounts: customersResponse.data?.customers || [],
        lastSync: new Date(),
        syncFrequency: 'DAILY' as const,
        billingIntegration: {
          stripeEnabled: false,
          datevEnabled: false,
          autoInvoicing: false,
          costCenterMapping: {},
        },
        updatedAt: new Date(),
      };

      if (existingDoc.exists()) {
        await updateDoc(googleAdsDoc, googleAdsData);
      } else {
        await setDoc(googleAdsDoc, {
          ...googleAdsData,
          createdAt: new Date(),
        });
      }

      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/company/${companyId}/google-ads?success=connected&accounts=${customersResponse.data?.customers.length || 0}`
      );
    } catch (firestoreError) {
      console.error('Firestore save error:', firestoreError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/company/${companyId}/google-ads?error=save_failed`
      );
    }
  } catch (error) {
    console.error('Google Ads Callback Error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/company/unknown/google-ads?error=callback_failed`
    );
  }
}
