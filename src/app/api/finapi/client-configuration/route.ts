// src/app/api/finapi/client-configuration/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { finapiService } from '@/lib/finapi-sdk-service';

/**
 * finAPI Client Configuration API
 * 
 * GET: Get client configuration
 * PATCH: Edit client configuration
 * 
 * Parameters for client configuration:
 * - userNotificationCallbackUrl: Callback URL for notifications
 * - userSynchronizationCallbackUrl: Callback URL for synchronization
 * - refreshTokensValidityPeriod: Token validity in seconds
 * - userAccessTokensValidityPeriod: User token validity in seconds
 * - clientAccessTokensValidityPeriod: Client token validity in seconds
 * - finTSProductRegistrationNumber: FinTS product registration
 * - betaBanksEnabled: Enable beta banks
 * - preferredConsentType: RECURRING or ONE_OFF
 * - userAutoVerificationEnabled: Auto-verify users
 * - businessBanksEnabled: Enable business bank connections
 */

export async function GET(req: NextRequest) {
  try {
    console.log('🔧 Fetching finAPI client configuration...');

    // Test credentials first
    const credentialTest = await finapiService.testCredentials();
    if (!credentialTest.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'finAPI credentials invalid',
          details: credentialTest.error,
        },
        { status: 401 }
      );
    }

    // Get client configuration using direct API call
    const response = await fetch(`https://sandbox.finapi.io/api/v2/clientConfiguration`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${await finapiService.getClientToken()}`,
        'Content-Type': 'application/json',
        'X-Request-Id': `taskilo-client-config-${Date.now()}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get client configuration: ${error}`);
    }

    const configData = await response.json();
    
    console.log('✅ finAPI client configuration retrieved');

    return NextResponse.json({
      success: true,
      message: 'Client configuration retrieved successfully',
      configuration: configData,
      capabilities: {
        pfmServicesEnabled: configData.pfmServicesEnabled || false,
        isAutomaticBatchUpdateEnabled: configData.isAutomaticBatchUpdateEnabled || false,
        isDevelopmentModeEnabled: configData.isDevelopmentModeEnabled || false,
        preferredConsentType: configData.preferredConsentType || 'RECURRING',
        betaBanksEnabled: configData.betaBanksEnabled || false,
        businessBanksEnabled: configData.businessBanksEnabled || false,
        userAutoVerificationEnabled: configData.isUserAutoVerificationEnabled || false,
      },
      productInfo: {
        availableBankGroups: configData.availableBankGroups || [],
        products: configData.products || [],
        enabledProducts: configData.enabledProducts || {},
      },
    });
  } catch (error) {
    console.error('❌ Error fetching client configuration:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch client configuration',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const configUpdates = await req.json();
    
    console.log('🔧 Updating finAPI client configuration with:', configUpdates);

    // Validate configuration parameters
    const allowedUpdates = [
      'userNotificationCallbackUrl',
      'userSynchronizationCallbackUrl',
      'refreshTokensValidityPeriod',
      'userAccessTokensValidityPeriod',
      'clientAccessTokensValidityPeriod',
      'finTSProductRegistrationNumber',
      'betaBanksEnabled',
      'preferredConsentType',
      'userAutoVerificationEnabled',
      'businessBanksEnabled',
    ];

    // Filter only allowed updates
    const filteredUpdates = Object.keys(configUpdates)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = configUpdates[key];
        return obj;
      }, {} as Record<string, any>);

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No valid configuration parameters provided',
          allowedParameters: allowedUpdates,
        },
        { status: 400 }
      );
    }

    // Test credentials first
    const credentialTest = await finapiService.testCredentials();
    if (!credentialTest.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'finAPI credentials invalid',
          details: credentialTest.error,
        },
        { status: 401 }
      );
    }

    // Update client configuration using direct API call
    const response = await fetch(`https://sandbox.finapi.io/api/v2/clientConfiguration`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${await finapiService.getClientToken()}`,
        'Content-Type': 'application/json',
        'X-Request-Id': `taskilo-config-update-${Date.now()}`,
      },
      body: JSON.stringify(filteredUpdates),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update client configuration: ${error}`);
    }

    const updatedConfig = await response.json();
    
    console.log('✅ finAPI client configuration updated successfully');

    return NextResponse.json({
      success: true,
      message: 'Client configuration updated successfully',
      updatedConfiguration: updatedConfig,
      appliedUpdates: filteredUpdates,
      updateInfo: {
        timestamp: new Date().toISOString(),
        updatedFields: Object.keys(filteredUpdates),
      },
    });
  } catch (error) {
    console.error('❌ Error updating client configuration:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update client configuration',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
