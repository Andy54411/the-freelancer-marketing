import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

// JWT Secret für Admin-Tokens
const JWT_SECRET =
  process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET || 'taskilo-admin-secret-key-2024';
const JWT_SECRET_BYTES = new TextEncoder().encode(JWT_SECRET);

// AWS Lambda Client
const lambdaClient = new LambdaClient({
  region: 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// GET - Gespeicherte E-Mails aus Cache abrufen
export async function GET(request: NextRequest) {
  try {
    console.log('🗄️ [Email Cache API] Starting request...');

    // URL-Parameter
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder') || 'sent';
    const limit = parseInt(searchParams.get('limit') || '50');

    // JWT Token Verification
    const cookies = request.headers.get('cookie');
    const tokenCookie = cookies?.split(';').find(c => c.trim().startsWith('taskilo-admin-token='));

    if (!tokenCookie) {
      console.error('❌ [Email Cache API] Missing admin token cookie');
      return NextResponse.json({ error: 'Unauthorized - Missing admin token' }, { status: 401 });
    }

    const token = tokenCookie.split('=')[1];

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET_BYTES);
      const adminEmail = payload.email as string;

      console.log('✅ [Email Cache API] JWT verified for admin:', adminEmail);

      // Lambda-Funktion aufrufen
      const lambdaPayload = {
        action: 'getEmails',
        folder: folder,
        limit: limit,
        adminEmail: adminEmail,
      };

      console.log('🚀 [Email Cache API] Calling Lambda with payload:', lambdaPayload);

      const command = new InvokeCommand({
        FunctionName: 'TaskiloEmailOperations',
        Payload: JSON.stringify(lambdaPayload),
      });

      const response = await lambdaClient.send(command);
      const result = JSON.parse(new TextDecoder().decode(response.Payload));

      console.log('📊 [Email Cache API] Lambda response:', result);

      if (result.statusCode === 200) {
        const data = JSON.parse(result.body);
        return NextResponse.json({
          success: true,
          data: {
            emails: data.emails || [],
            totalCount: data.totalCount || 0,
            source: 'dynamodb_cache',
            folder: folder,
            lastSync: data.lastSync || new Date().toISOString(),
          },
          metadata: {
            adminEmail: adminEmail,
            requestTime: new Date().toISOString(),
            cached: true,
          },
        });
      } else {
        throw new Error(`Lambda error: ${result.body}`);
      }
    } catch (jwtError) {
      console.error('❌ [Email Cache API] JWT verification failed:', jwtError);
      return NextResponse.json({ error: 'Invalid JWT token' }, { status: 401 });
    }
  } catch (error) {
    console.error('❌ [Email Cache API] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// POST - E-Mails in Cache synchronisieren
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [Email Cache Sync] Starting sync request...');

    const body = await request.json();
    const { emails, folder = 'sent', forceSync = false } = body;

    // JWT Token Verification
    const cookies = request.headers.get('cookie');
    const tokenCookie = cookies?.split(';').find(c => c.trim().startsWith('taskilo-admin-token='));

    if (!tokenCookie) {
      console.error('❌ [Email Cache Sync] Missing admin token cookie');
      return NextResponse.json({ error: 'Unauthorized - Missing admin token' }, { status: 401 });
    }

    const token = tokenCookie.split('=')[1];

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET_BYTES);
      const adminEmail = payload.email as string;

      console.log('✅ [Email Cache Sync] JWT verified for admin:', adminEmail);

      // Lambda-Funktion aufrufen
      const lambdaPayload = {
        action: 'syncEmails',
        emails: emails,
        folder: folder,
        adminEmail: adminEmail,
        forceSync: forceSync,
      };

      console.log('🚀 [Email Cache Sync] Calling Lambda with payload:', {
        action: lambdaPayload.action,
        emailCount: emails?.length || 0,
        folder: lambdaPayload.folder,
        adminEmail: lambdaPayload.adminEmail,
      });

      const command = new InvokeCommand({
        FunctionName: 'TaskiloEmailOperations',
        Payload: JSON.stringify(lambdaPayload),
      });

      const response = await lambdaClient.send(command);
      const result = JSON.parse(new TextDecoder().decode(response.Payload));

      console.log('📊 [Email Cache Sync] Lambda response:', result);

      if (result.statusCode === 200) {
        const data = JSON.parse(result.body);
        return NextResponse.json({
          success: true,
          data: {
            synced: data.synced || 0,
            total: emails?.length || 0,
            folder: folder,
            syncTime: new Date().toISOString(),
          },
          metadata: {
            adminEmail: adminEmail,
            requestTime: new Date().toISOString(),
          },
        });
      } else {
        throw new Error(`Lambda error: ${result.body}`);
      }
    } catch (jwtError) {
      console.error('❌ [Email Cache Sync] JWT verification failed:', jwtError);
      return NextResponse.json({ error: 'Invalid JWT token' }, { status: 401 });
    }
  } catch (error) {
    console.error('❌ [Email Cache Sync] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// DELETE - E-Mails endgültig aus Cache löschen
export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ [Email Cache Delete] Starting delete request...');

    const { searchParams } = new URL(request.url);
    const emailId = searchParams.get('emailId');
    const folder = searchParams.get('folder') || 'sent';

    if (!emailId) {
      return NextResponse.json({ error: 'Email ID is required' }, { status: 400 });
    }

    // JWT Token Verification
    const cookies = request.headers.get('cookie');
    const tokenCookie = cookies?.split(';').find(c => c.trim().startsWith('taskilo-admin-token='));

    if (!tokenCookie) {
      console.error('❌ [Email Cache Delete] Missing admin token cookie');
      return NextResponse.json({ error: 'Unauthorized - Missing admin token' }, { status: 401 });
    }

    const token = tokenCookie.split('=')[1];

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET_BYTES);
      const adminEmail = payload.email as string;

      console.log('✅ [Email Cache Delete] JWT verified for admin:', adminEmail);

      // Lambda-Funktion aufrufen
      const lambdaPayload = {
        action: 'deleteEmail',
        emailId: emailId,
        folder: folder,
        adminEmail: adminEmail,
      };

      console.log('🚀 [Email Cache Delete] Calling Lambda with payload:', lambdaPayload);

      const command = new InvokeCommand({
        FunctionName: 'TaskiloEmailOperations',
        Payload: JSON.stringify(lambdaPayload),
      });

      const response = await lambdaClient.send(command);
      const result = JSON.parse(new TextDecoder().decode(response.Payload));

      console.log('📊 [Email Cache Delete] Lambda response:', result);

      if (result.statusCode === 200) {
        return NextResponse.json({
          success: true,
          message: 'Email successfully deleted from cache',
          emailId: emailId,
          folder: folder,
          deletedAt: new Date().toISOString(),
        });
      } else {
        throw new Error(`Lambda error: ${result.body}`);
      }
    } catch (jwtError) {
      console.error('❌ [Email Cache Delete] JWT verification failed:', jwtError);
      return NextResponse.json({ error: 'Invalid JWT token' }, { status: 401 });
    }
  } catch (error) {
    console.error('❌ [Email Cache Delete] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
