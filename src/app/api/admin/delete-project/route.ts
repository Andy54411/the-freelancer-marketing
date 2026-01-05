import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title');
    
    if (!title) {
      return NextResponse.json({ error: 'Title parameter required' }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }
    
    const deletedIds: string[] = [];
    
    // Suche in project_requests
    const projectsSnapshot = await db
      .collection('project_requests')
      .where('title', '==', title)
      .get();
    
    for (const doc of projectsSnapshot.docs) {
      await doc.ref.delete();
      deletedIds.push(`project_requests/${doc.id}`);
    }
    
    // Suche in quotes
    const quotesSnapshot = await db
      .collection('quotes')
      .where('title', '==', title)
      .get();
    
    for (const doc of quotesSnapshot.docs) {
      await doc.ref.delete();
      deletedIds.push(`quotes/${doc.id}`);
    }
    
    if (deletedIds.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: `Kein Projekt mit Titel "${title}" gefunden` 
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      deleted: deletedIds,
      message: `${deletedIds.length} Projekt(e) gelöscht` 
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
