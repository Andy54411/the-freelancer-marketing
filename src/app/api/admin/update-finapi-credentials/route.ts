// src/app/api/admin/update-finapi-credentials/route.ts
import { NextRequest, NextResponse } from 'next/server';

/**
 * Update finAPI Credentials in Vercel Environment Variables
 *
 * This endpoint:
 * 1. Tests new finAPI credentials
 * 2. Automatically updates Vercel Environment Variables via API
 * 3. Provides manual fallback instructions
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
      FINAPI_ADMIN_DATA_DECRYPTION_KEY: 'd9b2781e40298973ee0d6a376e509b1c',
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

    // Automatic Vercel Environment Variable Updates
    const vercelToken = process.env.VERCEL_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID || 'tasko';

    const results = {
      success: true,
      credential_test: {
        status: 'SUCCESS',
        access_token_preview: testData.access_token
          ? `${testData.access_token.substring(0, 20)}...`
          : null,
        expires_in: testData.expires_in,
      },
      vercel_updates: [] as Array<{ name: string; status: string; error?: string }>,
      manual_fallback: {
        step_1: 'Go to https://vercel.com/andy54411s-projects/tasko',
        step_2: 'Navigate to Settings → Environment Variables',
        step_3: 'Update the finAPI credentials with the values provided',
        step_4: 'Redeploy the application',
      },
      environment_variables: NEW_CREDENTIALS,
    };

    if (vercelToken && projectId) {
      console.log('🚀 Updating Vercel Environment Variables automatically...');

      // Update each environment variable via Vercel API
      for (const [key, value] of Object.entries(NEW_CREDENTIALS)) {
        try {
          const updateResponse = await fetch(
            `https://api.vercel.com/v9/projects/${projectId}/env`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${vercelToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                key,
                value,
                type: 'encrypted',
                target: ['production', 'preview', 'development'],
              }),
            }
          );

          if (updateResponse.ok) {
            results.vercel_updates.push({
              name: key,
              status: 'SUCCESS',
            });
            console.log(`✅ Updated ${key}`);
          } else {
            const errorData = await updateResponse.json();
            results.vercel_updates.push({
              name: key,
              status: 'FAILED',
              error: errorData.error?.message || updateResponse.statusText,
            });
            console.log(`❌ Failed to update ${key}: ${errorData.error?.message}`);
          }
        } catch (error: any) {
          results.vercel_updates.push({
            name: key,
            status: 'ERROR',
            error: error.message,
          });
          console.log(`❌ Error updating ${key}: ${error.message}`);
        }
      }

      const successCount = results.vercel_updates.filter(u => u.status === 'SUCCESS').length;
      const totalCount = results.vercel_updates.length;

      if (successCount === totalCount) {
        console.log('🎉 All Vercel Environment Variables updated successfully!');
        results.summary = `✅ All ${totalCount} finAPI credentials updated in Vercel. Redeploy to activate.`;
      } else {
        console.log(`⚠️ ${successCount}/${totalCount} Vercel updates successful`);
        results.summary = `⚠️ ${successCount}/${totalCount} credentials updated. Check manual fallback for failed ones.`;
      }
    } else {
      console.log('⚠️ VERCEL_TOKEN or VERCEL_PROJECT_ID not found - providing manual instructions');
      results.summary =
        '⚠️ Automatic Vercel update not possible. Use manual fallback instructions.';
      results.missing_env_vars = {
        VERCEL_TOKEN: !vercelToken ? 'Required for Vercel API access' : 'Present',
        VERCEL_PROJECT_ID: !projectId ? 'Required for project identification' : 'Present',
      };
    }

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('❌ finAPI credential update failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update finAPI credentials',
        details: error.message,
        recommendation: 'Check the credentials manually in finAPI Developer Portal',
      },
      { status: 500 }
    );
  }
}
