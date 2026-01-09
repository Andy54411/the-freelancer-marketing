import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

/**
 * GET ACCOUNT ID: Direkt aus users collection
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const firebaseUserId = searchParams.get('uid');

    if (!firebaseUserId) {
      return NextResponse.json({ error: 'uid Parameter ist erforderlich.' }, { status: 400 });
    }

    // Direkt aus users collection
    const userDoc = await db!.collection('users').doc(firebaseUserId).get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User nicht gefunden in users collection.' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const stripeAccountId = userData?.stripeAccountId;

    if (!stripeAccountId) {
      return NextResponse.json(
        { error: 'Keine stripeAccountId im User-Dokument gefunden.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      firebaseUserId,
      stripeAccountId,
      userData: {
        email: userData?.email,
        firstName: userData?.firstName,
        lastName: userData?.lastName,
        step1: userData?.step1,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Fehler beim Laden der Account-Informationen.' },
      { status: 500 }
    );
  }
}
