import { NextResponse } from 'next/server';
import { auth } from '../../../firebase/server';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authorization header fehlt',
        },
        { status: 401 }
      );
    }

    const idToken = authHeader.replace('Bearer ', '');

    try {
      const decodedToken = await auth.verifyIdToken(idToken);

      return NextResponse.json({
        success: true,
        tokenUserId: decodedToken.uid,
        email: decodedToken.email,
        message: 'Token erfolgreich verifiziert',
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid token',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 401 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
