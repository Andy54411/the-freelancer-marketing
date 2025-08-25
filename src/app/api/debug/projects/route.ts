import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server'; // Use centralized Firebase setup

// Use centralized Firebase setup instead of separate initialization

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

    return NextResponse.json(
      { error: 'Failed to fetch projects', details: error },
      { status: 500 }
    );
  }
}
