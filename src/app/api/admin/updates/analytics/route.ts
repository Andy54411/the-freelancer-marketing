// Admin User Update Status API - Analytics für Update-Benachrichtigungen
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { db } from '@/firebase/server';
import { collection, getDocs, doc, getDoc, query, where, orderBy } from 'firebase/firestore';

const dynamodb = new DynamoDBClient({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const JWT_SECRET =
  process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET || 'taskilo-admin-secret-key-2024';
const JWT_SECRET_BYTES = new TextEncoder().encode(JWT_SECRET);

// Admin-Berechtigung prüfen
async function verifyAdmin(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('taskilo-admin-token')?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, JWT_SECRET_BYTES);

    const command = new GetItemCommand({
      TableName: 'taskilo-admin-data',
      Key: marshall({ id: payload.email }),
    });

    const result = await dynamodb.send(command);

    if (!result.Item) {
      return null;
    }

    const user = unmarshall(result.Item);
    return {
      id: user.id,
      email: user.email || user.id,
      name: user.name || 'Admin',
      role: user.role || 'admin',
    };
  } catch (error) {
    console.error('Admin verification error:', error);
    return null;
  }
}

// GET - Update-Analytics abrufen
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const updateId = searchParams.get('updateId');

    if (updateId) {
      // Spezifische Update-Statistiken
      const statusRef = collection(db, 'userUpdateStatus');
      const statusQuery = query(statusRef, where('seenUpdates', 'array-contains', updateId));
      const statusSnapshot = await getDocs(statusQuery);

      const seenByUsers = statusSnapshot.docs.map(doc => ({
        userId: doc.id,
        ...doc.data(),
        lastChecked: doc.data().lastChecked?.toDate?.()?.toISOString() || doc.data().lastChecked,
      }));

      return NextResponse.json({
        updateId,
        seenCount: seenByUsers.length,
        seenByUsers,
      });
    } else {
      // Allgemeine Analytics
      const statusRef = collection(db, 'userUpdateStatus');
      const statusSnapshot = await getDocs(statusRef);

      const allStatus = statusSnapshot.docs.map(doc => ({
        userId: doc.id,
        ...doc.data(),
        lastChecked: doc.data().lastChecked?.toDate?.()?.toISOString() || doc.data().lastChecked,
      }));

      // Updates für Statistiken
      const updatesRef = collection(db, 'updates');
      const updatesQuery = query(updatesRef, orderBy('createdAt', 'desc'));
      const updatesSnapshot = await getDocs(updatesQuery);

      const updates = updatesSnapshot.docs.map(doc => {
        const updateData = doc.data();
        const seenCount = allStatus.filter(
          status => status.seenUpdates && status.seenUpdates.includes(doc.id)
        ).length;

        return {
          id: doc.id,
          version: updateData.version,
          title: updateData.title,
          category: updateData.category,
          createdAt: updateData.createdAt?.toDate?.()?.toISOString() || updateData.createdAt,
          seenCount,
          totalUsers: allStatus.length,
          seenPercentage:
            allStatus.length > 0 ? Math.round((seenCount / allStatus.length) * 100) : 0,
        };
      });

      return NextResponse.json({
        totalUsers: allStatus.length,
        totalUpdates: updates.length,
        updates,
        userStatus: allStatus,
      });
    }
  } catch (error) {
    console.error('Error fetching update analytics:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Analytics' }, { status: 500 });
  }
}
