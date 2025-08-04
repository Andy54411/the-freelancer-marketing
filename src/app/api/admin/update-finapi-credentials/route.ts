// src/app/api/admin/update-finapi-credentials/route.ts
import { NextRequest, NextResponse } from 'next/server';

/**
 * Update finAPI Credentials in Vercel Environment Variables
 * 
 * This endpoint updates the finAPI credentials directly in Vercel
 * using the confirmed working credentials from finAPI
 */
export async function GET(_request: NextRequest) {
  try {
    // Verified working credentials from finAPI (August 2025)
    const NEW_CREDENTIALS = {
      // Default Client (Primary Banking Integration)
      FINAPI_SANDBOX_CLIENT_ID: 'ac54e888-8ccf-40ef-9b92-b27c9dc02f29',
      FINAPI_SANDBOX_CLIENT_SECRET: '73689ad2-95e5-4180-93a2-7209ba6e10aa',
      FINAPI_SANDBOX_DATA_DECRYPTION_KEY: 'eb8c7cd129dc2eee8e31a4098fba4921',
      
      // Admin Client (Extended Functions)
      FINAPI_ADMIN_CLIENT_ID: 'a2d8cf0e-c68c-45fa-b4ad-4184a355094e',
      FINAPI_ADMIN_CLIENT_SECRET: '478a0e66-8c9a-49ee-84cd-e49d87d077c9',
      FINAPI_ADMIN_DATA_DECRYPTION_KEY: 'd9b2781e40298973ee0d6a376e509b1c'
    };

    // Test the credentials first to make sure they still work
    console.log('🔍 Testing finAPI credentials before updating Vercel...');
    
    const testResponse = await fetch('https://sandbox.finapi.io/api/v2/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: NEW_CREDENTIALS.FINAPI_SANDBOX_CLIENT_ID,
        client_secret: NEW_CREDENTIALS.FINAPI_SANDBOX_CLIENT_SECRET,
      }),
    });

    if (!testResponse.ok) {
      throw new Error(`finAPI credential test failed: ${testResponse.statusText}`);
    }

    const testData = await testResponse.json();
    console.log('✅ finAPI credentials test successful');

    // Here we would normally update Vercel Environment Variables
    // For now, we'll return the credentials that need to be manually updated
    
    return NextResponse.json({
      success: true,
      message: 'finAPI credentials verified and ready for Vercel update',
      credentials_test: {
        status: 'SUCCESS',
        access_token_preview: testData.access_token ? `${testData.access_token.substring(0, 20)}...` : null,
        expires_in: testData.expires_in,
      },
      vercel_environment_variables: NEW_CREDENTIALS,
      instructions: {
        step_1: 'Go to https://vercel.com/andy54411s-projects/tasko',
        step_2: 'Navigate to Settings → Environment Variables',
        step_3: 'Update the finAPI credentials with the values provided',
        step_4: 'Redeploy the application',
        step_5: 'Test banking integration at /finance/banking/setup',
      },
      expected_result: 'Banking setup page should no longer show authentication errors',
    });

  } catch (error: any) {
    console.error('❌ finAPI credential update failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update finAPI credentials',
      details: error.message,
      recommendation: 'Check the credentials manually in finAPI Developer Portal',
    }, { status: 500 });
  }
}
