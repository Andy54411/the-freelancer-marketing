import { NextRequest, NextResponse } from 'next/server';
import { admin, db } from '@/firebase/server';

/**
 * 🔄 Google Ads OAuth Callback
 * GET /api/multi-platform-advertising/auth/google-ads/callback
 *
 * Verarbeitet die Antwort von Google OAuth und erstellt echte Google Ads Verbindung
 */
export async function GET(request: NextRequest) {
  if (!db) {
    console.error('❌ Firebase DB not initialized');
    return NextResponse.json(
      { success: false, error: 'Database connection failed' },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // companyId
    const error = searchParams.get('error');

    const baseUrl =
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : process.env.NEXT_PUBLIC_BASE_URL ||
          process.env.NEXT_PUBLIC_APP_URL ||
          'https://taskilo.de';

    if (error) {
      console.error('❌ Google OAuth Error:', error);
      return NextResponse.redirect(
        `${baseUrl}/dashboard/company/${state}/taskilo-advertising?error=oauth_failed&platform=google-ads&message=${encodeURIComponent(error)}`
      );
    }

    if (!code || !state) {
      console.error('❌ Missing OAuth code or state');
      return NextResponse.redirect(
        `${baseUrl}/dashboard/company/${state}/taskilo-advertising?error=missing_params&platform=google-ads`
      );
    }

    console.log('✅ Google OAuth callback received:', {
      code: code.substring(0, 20) + '...',
      companyId: state,
      redirectUri: `${baseUrl}/api/multi-platform-advertising/auth/google-ads/callback`,
    });

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id:
          process.env.GOOGLE_CLIENT_ID ||
          '1022290879475-tr7pp4pr7ildsd0s3sj4tnjir1apn8ch.apps.googleusercontent.com',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || 'GOCSPX-dummy',
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${baseUrl}/api/multi-platform-advertising/auth/google-ads/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text();
      console.error('❌ Token exchange failed:', tokenError);
      return NextResponse.redirect(
        `${baseUrl}/dashboard/company/${state}/taskilo-advertising?error=token_exchange_failed&platform=google-ads`
      );
    }

    const tokens = await tokenResponse.json();
    console.log('🎯 OAuth tokens received:', {
      access_token: tokens.access_token ? 'present' : 'missing',
      refresh_token: tokens.refresh_token ? 'present' : 'missing',
    });

    // Hole Google Ads Account-Informationen mit der installierten google-ads-api
    let accountInfo: {
      customerId: string;
      accountName: string;
      currency: string;
      accountStatus: string;
    } | null = null;

    const availableAccounts: any[] = [];

    try {
      // WICHTIG: Google Ads API braucht speziellen Developer Token
      const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

      if (!developerToken || developerToken === 'TEST_TOKEN') {
        console.warn('⚠️ No valid Google Ads Developer Token found. Using OAuth data only.');
        // Fallback: Nur OAuth-Informationen verwenden
        accountInfo = {
          customerId: 'oauth-connected',
          accountName: 'Google Ads Account (OAuth Connected)',
          currency: 'EUR',
          accountStatus: 'oauth_only',
        };
      } else {
        // Verwende die installierte google-ads-api für bessere Integration
        const { GoogleAdsApi } = await import('google-ads-api');

        const client = new GoogleAdsApi({
          client_id:
            process.env.GOOGLE_CLIENT_ID ||
            '1022290879475-tr7pp4pr7ildsd0s3sj4tnjir1apn8ch.apps.googleusercontent.com',
          client_secret: process.env.GOOGLE_CLIENT_SECRET || 'GOCSPX-dummy',
          developer_token: developerToken,
        });

        // Authentifiziere mit OAuth Token
        const _customer = client.Customer({
          customer_id: 'dummy', // Wird durch listAccessibleCustomers überschrieben
          refresh_token: tokens.refresh_token,
        });

        try {
          // IMMER als OAuth-verbunden markieren, auch ohne Developer Token
          // Das ist eine ECHTE OAuth-Verbindung mit Google Account Zugriff
          if (!developerToken || developerToken === 'TEST_TOKEN') {
            // OAuth ohne Google Ads API - aber ECHTE Verbindung!
            accountInfo = {
              customerId: `oauth-${Date.now()}`, // Eindeutige ID generieren
              accountName: 'Google Account (OAuth Connected)',
              currency: 'EUR',
              accountStatus: 'oauth_ready',
            };
            console.log('📊 OAuth-only connection created:', accountInfo);
          } else {
            // Mit Developer Token - versuche Google Ads API
            const accessibleCustomersResponse = await fetch(
              'https://googleads.googleapis.com/v18/customers:listAccessibleCustomers',
              {
                headers: {
                  Authorization: `Bearer ${tokens.access_token}`,
                  'developer-token': developerToken,
                  'Content-Type': 'application/json',
                },
              }
            );

            if (accessibleCustomersResponse.ok) {
              const accessibleData = await accessibleCustomersResponse.json();
              console.log('📊 Accessible customers:', accessibleData);

              if (accessibleData.resourceNames && accessibleData.resourceNames.length > 0) {
                // Fetch details for ALL accessible accounts
                for (const resourceName of accessibleData.resourceNames) {
                  const customerId = resourceName.replace('customers/', '');
                  try {
                    const accountResponse = await fetch(
                      `https://googleads.googleapis.com/v18/customers/${customerId}`,
                      {
                        headers: {
                          Authorization: `Bearer ${tokens.access_token}`,
                          'developer-token': developerToken,
                          'Content-Type': 'application/json',
                        },
                      }
                    );

                    if (accountResponse.ok) {
                      const accountData = await accountResponse.json();
                      availableAccounts.push({
                        customerId: customerId,
                        accountName:
                          accountData.descriptiveName || `Google Ads Account ${customerId}`,
                        currency: accountData.currencyCode || 'EUR',
                        accountStatus: accountData.status || 'ENABLED',
                        isManager: accountData.manager || false,
                      });
                    }
                  } catch (e) {
                    console.warn(`Failed to fetch details for customer ${customerId}`, e);
                  }
                }

                if (availableAccounts.length > 1) {
                  // Multiple accounts found - require selection
                  accountInfo = {
                    customerId: 'pending_selection',
                    accountName: 'Multiple Accounts Found',
                    currency: 'EUR',
                    accountStatus: 'requires_selection',
                  };
                } else if (availableAccounts.length === 1) {
                  // Only one account - auto select
                  accountInfo = availableAccounts[0];
                } else {
                  // No details fetched? Fallback to first ID
                  const customerId = accessibleData.resourceNames[0].replace('customers/', '');
                  accountInfo = {
                    customerId: customerId,
                    accountName: `Google Ads Account ${customerId}`,
                    currency: 'EUR',
                    accountStatus: 'api_connected',
                  };
                }
              } else {
                // Fallback: OAuth ohne verfügbare Customer Accounts
                accountInfo = {
                  customerId: `oauth-${Date.now()}`,
                  accountName: 'Google Account (OAuth Connected)',
                  currency: 'EUR',
                  accountStatus: 'oauth_no_ads_accounts',
                };
              }
            } else {
              console.warn(
                '⚠️ Failed to list accessible customers:',
                await accessibleCustomersResponse.text()
              );
              throw new Error('API call failed');
            }
          }
        } catch (apiError) {
          console.warn('⚠️ Google Ads API call failed, using OAuth fallback:', apiError);
          accountInfo = {
            customerId: 'oauth-connected',
            accountName: 'Google Ads Account (OAuth Connected)',
            currency: 'EUR',
            accountStatus: 'oauth_fallback',
          };
        }
      }
    } catch (accountError) {
      console.warn('⚠️ Could not initialize Google Ads API:', accountError);
      // Fallback: OAuth-only Modus
      accountInfo = {
        customerId: 'oauth-connected',
        accountName: 'Google Ads Account (OAuth Connected)',
        currency: 'EUR',
        accountStatus: 'oauth_fallback',
      };
    }

    // Speichere echte OAuth-Verbindung in Firestore mit Admin SDK (umgeht Firestore Rules)
    const connectionData: any = {
      platform: 'google-ads',
      status:
        accountInfo?.accountStatus === 'requires_selection' ? 'requires_selection' : 'connected',
      customerId: accountInfo?.customerId || 'unknown',
      accountName: accountInfo?.accountName || 'Google Ads Account',
      currency: accountInfo?.currency || 'EUR',
      accountStatus: accountInfo?.accountStatus || 'oauth_connected',
      connectedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSync: admin.firestore.FieldValue.serverTimestamp(),
      oauth: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        scope: tokens.scope,
        token_type: tokens.token_type,
      },
      // WICHTIG: Echte OAuth-Verbindung
      isRealConnection: true,
      authMethod: 'oauth',
      managerApproved: false, // MUSS später manuell bestätigt werden
      managerLinkStatus: 'PENDING', // Wartet auf Manager-Verknüpfung
      requiresManagerLink: true,
      apiAccess: accountInfo?.accountStatus === 'oauth_only' ? false : true,
      developerTokenConfigured: process.env.GOOGLE_ADS_DEVELOPER_TOKEN ? true : false,
    };

    if (availableAccounts.length > 0) {
      connectionData.availableAccounts = availableAccounts;
    }

    // Verwende Firebase Admin SDK für server-side write (umgeht Firestore Security Rules)
    // const db = admin.firestore(); // Already imported and checked
    await db
      .collection('companies')
      .doc(state)
      .collection('advertising_connections')
      .doc('google-ads')
      .set(connectionData);

    console.log('✅ Google Ads OAuth connection saved for company:', state);
    console.log('📍 Saved to path: companies/' + state + '/advertising_connections/google-ads');

    // Erfolgreiche Weiterleitung zurück zur App (zur Haupt-Advertising-Seite)
    const redirectUrl = new URL(
      `${baseUrl}/dashboard/company/${state}/taskilo-advertising`
    );
    redirectUrl.searchParams.set('success', 'connected');
    redirectUrl.searchParams.set('platform', 'google-ads');
    redirectUrl.searchParams.set('account', accountInfo?.customerId || 'unknown');

    if (accountInfo?.accountStatus === 'requires_selection') {
      redirectUrl.searchParams.set('selection_required', 'true');
    }

    return NextResponse.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('❌ Google Ads OAuth callback failed:', error);
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');
    const baseUrl =
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : process.env.NEXT_PUBLIC_BASE_URL ||
          process.env.NEXT_PUBLIC_APP_URL ||
          'https://taskilo.de';

    // Spezifische Error-Behandlung für häufige Probleme
    const errorType =
      error instanceof Error && error.message.includes('PERMISSION_DENIED')
        ? 'firestore_permission'
        : 'callback_failed';

    const errorMessage =
      error instanceof Error && error.message.includes('PERMISSION_DENIED')
        ? 'Company access denied - check Firestore permissions'
        : 'OAuth callback processing failed';

    console.error(`❌ Error details: ${errorType} - ${errorMessage}`);

    return NextResponse.redirect(
      `${baseUrl}/dashboard/company/${state || 'unknown'}/taskilo-advertising?error=${errorType}&platform=google-ads&message=${encodeURIComponent(errorMessage)}`
    );
  }
}
