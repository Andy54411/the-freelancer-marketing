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

    // Lade alle Projekte für das Unternehmen
    const projectsSnapshot = await db
      .collection('projects')
      .where('companyId', '==', companyId)
      .get();

    const projects: any[] = [];

    projectsSnapshot.forEach(doc => {
      const data = doc.data();
      projects.push({
        id: doc.id,
        ...data,
        startDate: data.startDate?.toDate?.()?.toISOString() || data.startDate,
        endDate: data.endDate?.toDate?.()?.toISOString() || data.endDate,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      });
    });

    return NextResponse.json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error) {
    console.error('Debug API Fehler:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects', details: error },
      { status: 500 }
    );
  }
}
