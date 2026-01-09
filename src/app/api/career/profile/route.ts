import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

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
    // 1. User Subcollection (New Architecture)
    await db
      .collection('users')
      .doc(userId)
      .collection('candidate_profile')
      .doc('main')
      .set(body, { merge: true });

    // Sync to users collection if personal data is present
    // This ensures /dashboard/user/[uid]/settings reflects the changes made in career profile
    const userUpdate: any = {};
    const profileUpdate: any = {};
    let hasUserUpdate = false;
    let hasProfileUpdate = false;

    // Map flat body fields to user root fields and profile map fields
    if (body.firstName !== undefined) {
      profileUpdate.firstName = body.firstName;
      hasProfileUpdate = true;
    }
    if (body.lastName !== undefined) {
      profileUpdate.lastName = body.lastName;
      hasProfileUpdate = true;
    }
    // Update displayName if both names are available
    if (body.firstName && body.lastName) {
      userUpdate.displayName = `${body.firstName} ${body.lastName}`;
      hasUserUpdate = true;
    }

    if (body.email !== undefined) {
      userUpdate.email = body.email;
      profileUpdate.email = body.email;
      hasUserUpdate = true;
      hasProfileUpdate = true;
    }

    if (body.phone !== undefined) {
      profileUpdate.phoneNumber = body.phone;
      hasProfileUpdate = true;
    }

    if (body.profilePictureUrl !== undefined) {
      userUpdate.photoURL = body.profilePictureUrl;
      hasUserUpdate = true;
    }

    if (body.street !== undefined) {
      profileUpdate.street = body.street;
      hasProfileUpdate = true;
    }
    if (body.zip !== undefined) {
      profileUpdate.postalCode = body.zip;
      hasProfileUpdate = true;
    }
    if (body.city !== undefined) {
      profileUpdate.city = body.city;
      hasProfileUpdate = true;
    }
    if (body.country !== undefined) {
      profileUpdate.country = body.country;
      hasProfileUpdate = true;
    }

    if (body.birthDate !== undefined) {
      if (body.birthDate) {
        const date = new Date(body.birthDate);
        if (!isNaN(date.getTime())) {
          // Firestore Admin SDK handles Date objects as Timestamps
          profileUpdate.dateOfBirth = date;
        } else {
          profileUpdate.dateOfBirth = body.birthDate;
        }
      } else {
        profileUpdate.dateOfBirth = null;
      }
      hasProfileUpdate = true;
    }

    if (hasProfileUpdate) {
      userUpdate.profile = profileUpdate;
      hasUserUpdate = true;
    }

    if (hasUserUpdate) {
      await db.collection('users').doc(userId).set(userUpdate, { merge: true });
    }

    return NextResponse.json({
      success: true,
      message: 'Profile saved successfully',
    });
  } catch (error) {
    console.error('Error saving profile:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
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
    const doc = await db
      .collection('users')
      .doc(userId)
      .collection('candidate_profile')
      .doc('main')
      .get();
    if (!doc.exists) {
      return NextResponse.json({ exists: false });
    }
    return NextResponse.json({ exists: true, data: doc.data() });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
