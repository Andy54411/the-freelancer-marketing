import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Firebase Admin SDK initialisieren
if (!admin.apps.length) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const serviceAccount = require('@/../firebase_functions/service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    });
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

const db = admin.firestore();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    // Lade alle Zeiteinträge für das Unternehmen
    const timeEntriesSnapshot = await db
      .collection('timeEntries')
      .where('companyId', '==', companyId)
      .get();

    const timeEntries: any[] = [];

    timeEntriesSnapshot.forEach(doc => {
      const data = doc.data();
      timeEntries.push({
        id: doc.id,
        ...data,
        startTime: data.startTime?.toDate?.()?.toISOString() || data.startTime,
        endTime: data.endTime?.toDate?.()?.toISOString() || data.endTime,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      });
    });

    return NextResponse.json({
      success: true,
      count: timeEntries.length,
      timeEntries,
      projectBreakdown: timeEntries.reduce((acc, entry) => {
        const projectId = entry.projectId || 'no-project';
        const projectName = entry.projectName || 'Kein Projekt';
        if (!acc[projectId]) {
          acc[projectId] = {
            projectName,
            totalEntries: 0,
            totalDuration: 0,
            entries: [],
          };
        }
        acc[projectId].totalEntries++;
        acc[projectId].totalDuration += entry.duration || 0;
        acc[projectId].entries.push({
          id: entry.id,
          description: entry.description,
          duration: entry.duration,
          startTime: entry.startTime,
          endTime: entry.endTime,
        });
        return acc;
      }, {} as any),
    });
  } catch (error) {
    console.error('Debug API Fehler:', error);
    return NextResponse.json(
      { error: 'Failed to fetch time entries', details: error },
      { status: 500 }
    );
  }
}
