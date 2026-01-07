import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

/**
 * GET /api/whatsapp/templates
 *
 * Lädt alle WhatsApp Templates von Meta und synct mit Firestore
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID erforderlich' }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Hole WhatsApp Connection
    const connectionDoc = await db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappConnection')
      .doc('current')
      .get();

    let metaTemplates: unknown[] = [];

    if (connectionDoc.exists) {
      const connection = connectionDoc.data();
      
      if (connection?.accessToken && connection?.wabaId) {
        // Lade Templates direkt von Meta
        const metaResponse = await fetch(
          `https://graph.facebook.com/v18.0/${connection.wabaId}/message_templates?` +
          `fields=id,name,status,category,language,components&` +
          `access_token=${connection.accessToken}`
        );

        if (metaResponse.ok) {
          const metaData = await metaResponse.json();
          metaTemplates = metaData.data || [];
        }
      }
    }

    // Lade auch lokale Templates aus Firestore (falls Meta nicht erreichbar)
    const templatesRef = db.collection('companies').doc(companyId).collection('whatsappTemplates');
    const snapshot = await templatesRef.get();
    const firestoreTemplates = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      source: 'firestore',
    }));

    // Merge: Meta-Templates haben Vorrang
    const templates = metaTemplates.length > 0 
      ? metaTemplates.map(t => ({ ...(t as object), source: 'meta' }))
      : firestoreTemplates;

    return NextResponse.json({
      success: true,
      templates,
      source: metaTemplates.length > 0 ? 'meta' : 'firestore',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Laden der Templates',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
