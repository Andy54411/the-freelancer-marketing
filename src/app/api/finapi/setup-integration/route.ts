// src/app/api/finapi/setup-integration/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createFinAPIService, createFinAPIAdminService } from '@/lib/finapi-sdk-service';
import { admin } from '@/firebase/server';

export async function POST(req: NextRequest) {
  try {
    const { userId, credentialType = 'sandbox' } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Benutzer-ID fehlt.' }, { status: 400 });
    }

    console.log(
      'Setting up finAPI integration for user:',
      userId,
      'with credential type:',
      credentialType
    );

    // Get finAPI SDK Service instance
    const finapiService =
      credentialType === 'admin'
        ? createFinAPIAdminService('sandbox')
        : createFinAPIService('sandbox');

    // 1. Check if finAPI connection already exists for this user
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(userId).get();

    if (userDoc.exists) {
      const userData = userDoc.data();
      if (userData?.finapi?.finapiUserId) {
        return NextResponse.json({
          success: true,
          message: 'Für diesen Benutzer existiert bereits eine finAPI-Verbindung.',
          finapiUserId: userData.finapi.finapiUserId,
        });
      }
    }

    // 2. Test credentials first to ensure they work
    const credentialTest = await finapiService.testCredentials();
    if (!credentialTest.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'finAPI credentials test failed',
          details: credentialTest.error,
        },
        { status: 500 }
      );
    }

    // 3. For now, return setup not implemented due to user authentication requirements
    // TODO: Implement full user creation when user authentication system is ready
    return NextResponse.json(
      {
        success: false,
        error: 'finAPI user setup not implemented',
        message: 'User authentication system required for finAPI user creation',
        needsImplementation: {
          userCreation: 'Requires getOrCreateUser method implementation',
          tokenManagement: 'Requires user token storage and management',
          credentialStorage: 'Requires secure finAPI credential storage in Firestore',
        },
      },
      { status: 501 }
    );
  } catch (error) {
    console.error('Fehler bei der finAPI-Setup-Integration:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten.';
    return NextResponse.json(
      { error: 'Fehler bei der finAPI-Integration.', details: errorMessage },
      { status: 500 }
    );
  }
}
