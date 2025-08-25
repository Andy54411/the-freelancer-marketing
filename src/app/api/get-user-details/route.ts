// src/app/api/get-user-details/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function POST(req: NextRequest) {
  try {
    const { userIds } = await req.json();

    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json({ error: 'userIds array required' }, { status: 400 });
    }

    const userDetails: {
      id: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      role?: string;
      company?: any;
      exists: boolean;
      error?: string;
    }[] = [];

    for (const userId of userIds) {
      try {
        const userDoc = await db.collection('users').doc(userId).get();

        if (userDoc.exists) {
          const userData = userDoc.data();
          userDetails.push({
            id: userId,
            firstName: userData?.firstName || 'Unknown',
            lastName: userData?.lastName || 'Unknown',
            email: userData?.email || 'Unknown',
            role: userData?.role || 'Unknown',
            company: userData?.company || null,
            exists: true,
          });
        } else {
          userDetails.push({
            id: userId,
            exists: false,
            error: 'User not found',
          });
        }
      } catch (error) {

        userDetails.push({
          id: userId,
          exists: false,
          error: 'Fetch error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      users: userDetails,
    });
  } catch (error: any) {

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
