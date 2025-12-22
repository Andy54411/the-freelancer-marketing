// Admin User Update Status API - Analytics für Update-Benachrichtigungen
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { AdminAuthService } from '@/services/admin/AdminAuthService';

// GET - Update-Analytics abrufen
export async function GET(request: NextRequest) {
  try {
    const adminUser = await AdminAuthService.verifyFromRequest(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Firebase nicht verfügbar' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const updateId = searchParams.get('updateId');

    if (updateId) {
      // Spezifische Update-Statistiken
      const statusSnapshot = await db
        .collection('userUpdateStatus')
        .where('seenUpdates', 'array-contains', updateId)
        .get();

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
      const statusSnapshot = await db.collection('userUpdateStatus').get();

      const allStatus = statusSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          userId: doc.id,
          seenUpdates: data.seenUpdates || [],
          lastChecked: data.lastChecked?.toDate?.()?.toISOString() || data.lastChecked,
          ...data,
        };
      });

      // Updates für Statistiken
      const updatesSnapshot = await db.collection('updates').orderBy('createdAt', 'desc').get();

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
