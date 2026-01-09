/**
 * WhatsApp Media API
 * 
 * POST - Media hochladen
 * GET - Media-URL abrufen
 * DELETE - Media löschen
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, isFirebaseAvailable } from '@/firebase/server';

const uploadSchema = z.object({
  companyId: z.string().min(1, 'Company ID erforderlich'),
  file: z.string().min(1, 'Base64-Datei erforderlich'),
  fileName: z.string().min(1, 'Dateiname erforderlich'),
  mimeType: z.string().min(1, 'MIME-Type erforderlich'),
});

// POST - Media hochladen
export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json({ success: false, error: 'Firebase nicht verfügbar' }, { status: 503 });
    }

    const body = await request.json();
    const validated = uploadSchema.parse(body);

    // Hole WhatsApp Connection
    const connectionDoc = await db
      .collection('companies')
      .doc(validated.companyId)
      .collection('whatsappConnection')
      .doc('current')
      .get();

    if (!connectionDoc.exists) {
      return NextResponse.json({ success: false, error: 'WhatsApp nicht verbunden' }, { status: 400 });
    }

    const connection = connectionDoc.data();
    const { accessToken, phoneNumberId } = connection || {};

    if (!accessToken || !phoneNumberId) {
      return NextResponse.json({ success: false, error: 'WhatsApp API nicht konfiguriert' }, { status: 400 });
    }

    // Konvertiere Base64 zu Buffer
    const base64Data = validated.file.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Erstelle FormData für Meta API
    const formData = new FormData();
    const blob = new Blob([buffer], { type: validated.mimeType });
    formData.append('file', blob, validated.fileName);
    formData.append('messaging_product', 'whatsapp');
    formData.append('type', validated.mimeType);

    // Upload zu Meta
    const uploadResponse = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/media`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
      }
    );

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      return NextResponse.json({
        success: false,
        error: 'Upload fehlgeschlagen',
        details: errorData.error?.message,
      }, { status: 400 });
    }

    const uploadData = await uploadResponse.json();

    // Speichere Media-Referenz in Firestore
    await db
      .collection('companies')
      .doc(validated.companyId)
      .collection('whatsappMedia')
      .doc(uploadData.id)
      .set({
        mediaId: uploadData.id,
        fileName: validated.fileName,
        mimeType: validated.mimeType,
        size: buffer.length,
        uploadedAt: new Date(),
      });

    return NextResponse.json({
      success: true,
      mediaId: uploadData.id,
      message: 'Media erfolgreich hochgeladen',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validierungsfehler', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({
      success: false,
      error: 'Fehler beim Hochladen',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}

// GET - Media-URL abrufen
export async function GET(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json({ success: false, error: 'Firebase nicht verfügbar' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const mediaId = searchParams.get('mediaId');

    if (!companyId || !mediaId) {
      return NextResponse.json({ success: false, error: 'companyId und mediaId erforderlich' }, { status: 400 });
    }

    // Hole WhatsApp Connection
    const connectionDoc = await db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappConnection')
      .doc('current')
      .get();

    if (!connectionDoc.exists) {
      return NextResponse.json({ success: false, error: 'WhatsApp nicht verbunden' }, { status: 400 });
    }

    const connection = connectionDoc.data();
    const { accessToken } = connection || {};

    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'Access Token fehlt' }, { status: 400 });
    }

    // Hole Media-URL von Meta
    const mediaResponse = await fetch(
      `https://graph.facebook.com/v18.0/${mediaId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!mediaResponse.ok) {
      const errorData = await mediaResponse.json();
      return NextResponse.json({
        success: false,
        error: 'Media nicht gefunden',
        details: errorData.error?.message,
      }, { status: 404 });
    }

    const mediaData = await mediaResponse.json();

    return NextResponse.json({
      success: true,
      url: mediaData.url,
      mimeType: mediaData.mime_type,
      fileSize: mediaData.file_size,
      sha256: mediaData.sha256,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Fehler beim Abrufen',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}

// DELETE - Media löschen
export async function DELETE(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json({ success: false, error: 'Firebase nicht verfügbar' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const mediaId = searchParams.get('mediaId');

    if (!companyId || !mediaId) {
      return NextResponse.json({ success: false, error: 'companyId und mediaId erforderlich' }, { status: 400 });
    }

    // Hole WhatsApp Connection
    const connectionDoc = await db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappConnection')
      .doc('current')
      .get();

    if (!connectionDoc.exists) {
      return NextResponse.json({ success: false, error: 'WhatsApp nicht verbunden' }, { status: 400 });
    }

    const connection = connectionDoc.data();
    const { accessToken } = connection || {};

    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'Access Token fehlt' }, { status: 400 });
    }

    // Lösche bei Meta
    const deleteResponse = await fetch(
      `https://graph.facebook.com/v18.0/${mediaId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!deleteResponse.ok) {
      const errorData = await deleteResponse.json();
      return NextResponse.json({
        success: false,
        error: 'Löschen fehlgeschlagen',
        details: errorData.error?.message,
      }, { status: 400 });
    }

    // Lösche auch aus Firestore
    await db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappMedia')
      .doc(mediaId)
      .delete();

    return NextResponse.json({
      success: true,
      message: 'Media erfolgreich gelöscht',
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Fehler beim Löschen',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}
