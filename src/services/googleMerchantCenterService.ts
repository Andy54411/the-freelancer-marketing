import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export class GoogleMerchantCenterService {
  private auth: OAuth2Client;

  constructor() {
    this.auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      (process.env.NEXT_PUBLIC_BASE_URL || 'https://taskilo.de') + '/api/google-ads/callback'
    );
  }

  /**
   * Creates a new Merchant Center account and links it to the Google Ads account.
   */
  async createAndLinkAccount(
    refreshToken: string,
    adsCustomerId: string | undefined,
    data: { businessName: string; websiteUrl: string; country: string }
  ) {
    this.auth.setCredentials({ refresh_token: refreshToken });
    // Cast to any because 'accountlinks' might be missing in the type definition of some googleapis versions
    const content = google.content({ version: 'v2.1', auth: this.auth }) as any;

    try {
      // 1. Check for existing accounts or aggregator
      // We need to know if we can create a sub-account.
      // This requires the authenticated user to be an admin of an MCA.

      const authInfo = await content.accounts.authinfo();
      const accountIdentifiers = authInfo.data.accountIdentifiers;

      let aggregatorId: string | null | undefined = null;
      let existingMerchantId: string | null | undefined = null;

      if (accountIdentifiers) {
        const aggregator = accountIdentifiers.find(id => id.aggregatorId);
        if (aggregator) {
          aggregatorId = aggregator.aggregatorId;
        }

        const merchant = accountIdentifiers.find(id => id.merchantId);
        if (merchant) {
          existingMerchantId = merchant.merchantId;
        }
      }

      let newMerchantId: string;

      if (aggregatorId) {
        // Create a sub-account
        const newAccount = await content.accounts.insert({
          merchantId: aggregatorId,
          requestBody: {
            name: data.businessName,
            websiteUrl: data.websiteUrl,
            // users: [] // Add users if needed
          },
        });
        newMerchantId = newAccount.data.id!;
      } else {
        // If no aggregator, we check if the user already has a merchant account.
        // If they do, maybe we just link that one?
        // But the user asked to CREATE.

        // If we can't create a sub-account, we can't use the API to create a standalone account easily.
        // We will throw a specific error that the UI can handle (e.g. "Please create manually").

        // However, for the purpose of this task, if we can't create, we might just return the existing one if found?
        if (existingMerchantId) {
          console.log('Found existing Merchant Center account, using it:', existingMerchantId);
          newMerchantId = existingMerchantId;
        } else {
          throw new Error('NO_MCA_FOUND');
        }
      }

      // 2. Link to Google Ads
      if (newMerchantId && adsCustomerId) {
        // We need to link the Merchant Center account to the Google Ads account.
        // In Content API v2.1, this is done by updating the Account resource's adsLinks field.

        console.log(`Checking Ads links for Merchant Center account ${newMerchantId}...`);

        try {
          const accountResponse = await content.accounts.get({
            merchantId: newMerchantId,
            accountId: newMerchantId,
          });

          const account = accountResponse.data;
          const adsLinks = account.adsLinks || [];

          const isLinked = adsLinks.some(
            (link: any) => link.adsId === adsCustomerId && link.status === 'active'
          );

          if (!isLinked) {
            console.log('Linking Google Ads account to Merchant Center...');

            // Add the new link
            adsLinks.push({
              adsId: adsCustomerId,
              status: 'active',
            });

            // Update the account
            await content.accounts.update({
              merchantId: newMerchantId,
              accountId: newMerchantId,
              requestBody: {
                ...account,
                adsLinks: adsLinks,
              },
            });
            console.log('Successfully linked Google Ads account');
          } else {
            console.log('Google Ads account is already linked.');
          }
        } catch (linkError: any) {
          console.error('Error linking Google Ads account:', linkError);
          // Don't fail the whole process if linking fails, but log it.
          // Or maybe we should fail? The user expects it to be linked.
          // Let's throw to be safe, or at least return a warning.
          // For now, I'll log and rethrow because it's a critical part of the request.
          throw linkError;
        }
      }

      return {
        success: true,
        merchantId: newMerchantId,
        message: 'Merchant Center account created/found and linked.',
      };
    } catch (error: any) {
      console.error('Error in createAndLinkAccount:', error);
      throw error; // Re-throw to be handled by API route
    }
  }

  /**
   * Attempts to fetch the Google Ads Customer ID using the Google Ads API.
   * Requires GOOGLE_ADS_DEVELOPER_TOKEN to be set.
   */
  async getGoogleAdsCustomerId(refreshToken: string): Promise<string | null> {
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    if (!developerToken || developerToken === 'TEST_TOKEN') {
      console.warn('Cannot fetch Google Ads Customer ID: No valid Developer Token.');
      return null;
    }

    try {
      this.auth.setCredentials({ refresh_token: refreshToken });
      const accessTokenResponse = await this.auth.getAccessToken();
      const accessToken = accessTokenResponse.token;

      if (!accessToken) {
        console.warn('Cannot fetch Google Ads Customer ID: Could not get access token.');
        return null;
      }

      const response = await fetch(
        'https://googleads.googleapis.com/v16/customers:listAccessibleCustomers',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'developer-token': developerToken,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.warn('Failed to list accessible Google Ads customers:', errorText);
        return null;
      }

      const data = await response.json();
      if (data.resourceNames && data.resourceNames.length > 0) {
        // Return the first accessible customer ID
        // Format: customers/1234567890
        const customerId = data.resourceNames[0].replace('customers/', '');
        console.log('Fetched Google Ads Customer ID:', customerId);
        return customerId;
      }

      console.warn('No accessible Google Ads customers found.');
      return null;
    } catch (error) {
      console.error('Error fetching Google Ads Customer ID:', error);
      return null;
    }
  }
}

export const googleMerchantCenterService = new GoogleMerchantCenterService();
