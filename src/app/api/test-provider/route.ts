import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/clients';
import { doc, getDoc } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('id');

    if (!providerId) {
      return NextResponse.json(
        { error: 'Provider ID parameter is required. Use ?id=PROVIDER_ID' },
        { status: 400 }
      );
    }

    console.log('🔍 Testing Provider ID:', providerId);

    // Test beide Collections
    const [firmaDoc, userDoc] = await Promise.all([
      getDoc(doc(db, 'firma', providerId)),
      getDoc(doc(db, 'users', providerId)),
    ]);

    const result = {
      providerId,
      timestamp: new Date().toISOString(),
      tests: {
        firma: {
          exists: firmaDoc.exists(),
          data: firmaDoc.exists()
            ? {
                companyName: firmaDoc.data()?.companyName,
                stripeAccountId: firmaDoc.data()?.stripeAccountId,
                email: firmaDoc.data()?.email,
              }
            : null,
        },
        users: {
          exists: userDoc.exists(),
          data: userDoc.exists()
            ? {
                userName: userDoc.data()?.userName,
                displayName: userDoc.data()?.displayName,
                stripeAccountId: userDoc.data()?.stripeAccountId,
                email: userDoc.data()?.email,
              }
            : null,
        },
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Test Provider API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
