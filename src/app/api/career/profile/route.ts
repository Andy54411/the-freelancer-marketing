import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { ApplicantProfileSchema } from '@/types/career';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    // Note: Zod schema validation could be stricter here
    
    const { userId } = body;
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

    // Save to Firestore
    // We store profiles in a top-level 'candidateProfiles' collection keyed by userId
    // This makes it easy to fetch by userId
    await db.collection('candidateProfiles').doc(userId).set(body, { merge: true });

    return NextResponse.json({ 
      success: true, 
      message: 'Profile saved successfully' 
    });

  } catch (error) {
    console.error('Error saving profile:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    if (!db) {
        return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

    try {
        const doc = await db.collection('candidateProfiles').doc(userId).get();
        if (!doc.exists) {
            return NextResponse.json({ exists: false });
        }
        return NextResponse.json({ exists: true, data: doc.data() });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
