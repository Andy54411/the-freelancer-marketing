import { NextRequest, NextResponse } from 'next/server';
import { finapiUserAuthServer } from '@/lib/finapi-user-auth-service-server';
import { auth as adminAuth } from '@/firebase/server';

export async function POST(request: NextRequest) {
  try {
    // Authentifizierung über Firebase Admin
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    if (!decodedToken.uid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { action, email } = body;

    switch (action) {
      case 'create-user': {
        if (!email) {
          return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const finapiUser = await finapiUserAuthServer.getOrCreateFinAPIUser(
          decodedToken.uid,
          email
        );

        if (finapiUser) {
          return NextResponse.json({
            success: true,
            user: {
              id: finapiUser.id,
              email: finapiUser.email,
              status: 'active',
            },
          });
        } else {
          return NextResponse.json({ error: 'Failed to create finAPI user' }, { status: 500 });
        }
      }

      case 'get-token': {
        const accessToken = await finapiUserAuthServer.getUserAccessToken(decodedToken.uid);

        if (accessToken) {
          return NextResponse.json({
            success: true,
            accessToken: `${accessToken.substring(0, 20)}...`,
            tokenLength: accessToken.length,
          });
        } else {
          return NextResponse.json({ error: 'Failed to get access token' }, { status: 500 });
        }
      }

      case 'get-status': {
        const status = await finapiUserAuthServer.getUserStatus(decodedToken.uid);

        return NextResponse.json({
          success: true,
          status: status
            ? {
                finapiUserId: status.finapiUserId,
                hasToken: !!status.accessToken,
                tokenExpired: status.tokenExpiresAt ? Date.now() > status.tokenExpiresAt : true,
                status: status.status,
                createdAt: new Date(status.createdAt as any).toISOString(),
                updatedAt: new Date(status.updatedAt as any).toISOString(),
              }
            : null,
        });
      }

      case 'deactivate': {
        const success = await finapiUserAuthServer.deactivateFinAPIUser(decodedToken.uid);

        return NextResponse.json({
          success,
          message: success ? 'finAPI user deactivated' : 'Failed to deactivate finAPI user',
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('❌ finAPI User Auth API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Für Debug-Zwecke - zeige verfügbare Aktionen
    return NextResponse.json({
      available_actions: ['create-user', 'get-token', 'get-status', 'deactivate'],
      description: 'finAPI User Authentication Service',
      version: '1.0.0',
      usage: {
        method: 'POST',
        headers: {
          Authorization: 'Bearer <firebase-id-token>',
          'Content-Type': 'application/json',
        },
        body: {
          action: 'create-user | get-token | get-status | deactivate',
          email: 'user@example.com (required for create-user)',
        },
      },
    });
  } catch (error: any) {
    console.error('❌ finAPI User Auth API GET error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
