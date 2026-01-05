import { NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const docId = searchParams.get('id') || 'quote_1767539031867_4y2ziy4iu';
  
  if (!db) {
    return NextResponse.json({ error: 'Firebase not available' }, { status: 500 });
  }
  
  try {
    // Check in quotes collection
    let docRef = db.collection('quotes').doc(docId);
    let docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      // Check in project_requests collection
      docRef = db.collection('project_requests').doc(docId);
      docSnap = await docRef.get();
    }
    
    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Document not found in either collection' }, { status: 404 });
    }
    
    const data = docSnap.data();
    const collection = docRef.parent.id;
    
    // If not public, set it to public
    if (!data?.isPublic) {
      await docRef.update({ isPublic: true });
      return NextResponse.json({
        message: 'Document found and isPublic set to true',
        collection,
        id: docId,
        wasPublic: false,
        nowPublic: true,
        title: data?.title,
        status: data?.status
      });
    }
    
    return NextResponse.json({
      message: 'Document is already public',
      collection,
      id: docId,
      isPublic: data?.isPublic,
      title: data?.title,
      status: data?.status
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Error accessing document',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
