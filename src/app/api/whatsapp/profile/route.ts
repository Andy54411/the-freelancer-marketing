import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

/**
 * GET /api/whatsapp/profile
 *
 * Lädt das WhatsApp Business Profil von Meta
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

    if (!connectionDoc.exists) {
      return NextResponse.json({ 
        success: false,
        error: 'Keine WhatsApp-Verbindung' 
      }, { status: 404 });
    }

    const connection = connectionDoc.data();

    if (!connection?.accessToken || !connection?.phoneNumberId) {
      return NextResponse.json({ 
        success: false,
        error: 'WhatsApp-Verbindung unvollständig' 
      }, { status: 400 });
    }

    // Lade Business Profil von Meta
    const metaResponse = await fetch(
      `https://graph.facebook.com/v18.0/${connection.phoneNumberId}/whatsapp_business_profile?` +
      `fields=about,address,description,email,profile_picture_url,websites,vertical`,
      {
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
        },
      }
    );

    if (!metaResponse.ok) {
      const errorData = await metaResponse.json();
      return NextResponse.json({
        success: false,
        error: 'Fehler beim Laden des Profils von Meta',
        details: errorData.error?.message || 'Unbekannter Fehler',
      }, { status: 500 });
    }

    const metaData = await metaResponse.json();
    const profileData = metaData.data?.[0] || {};

    // Lade Firmendaten aus Firestore für Vorschläge
    const companyDoc = await db.collection('companies').doc(companyId).get();
    const companyData = companyDoc.exists ? companyDoc.data() : null;

    // Erstelle Adresse aus Firmendaten
    let suggestedAddress = '';
    if (companyData) {
      const parts = [
        companyData.street || companyData.address,
        companyData.zip && companyData.city ? `${companyData.zip} ${companyData.city}` : (companyData.city || ''),
        companyData.country,
      ].filter(Boolean);
      suggestedAddress = parts.join(', ');
    }

    return NextResponse.json({
      success: true,
      profile: {
        about: profileData.about || '',
        address: profileData.address || '',
        description: profileData.description || '',
        email: profileData.email || '',
        profile_picture_url: profileData.profile_picture_url || '',
        websites: profileData.websites || [],
        vertical: profileData.vertical || 'UNDEFINED',
      },
      // Vorschläge aus Firestore-Firmendaten
      suggestions: companyData ? {
        name: companyData.companyName || companyData.name || '',
        email: companyData.email || '',
        address: suggestedAddress,
        website: companyData.website || '',
        description: companyData.description || companyData.about || '',
        phone: companyData.phone || companyData.phoneNumber || '',
      } : null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Laden des Profils',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/whatsapp/profile
 *
 * Aktualisiert das WhatsApp Business Profil bei Meta
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, about, address, description, email, websites, vertical } = body;

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

    if (!connectionDoc.exists) {
      return NextResponse.json({ 
        success: false,
        error: 'Keine WhatsApp-Verbindung' 
      }, { status: 404 });
    }

    const connection = connectionDoc.data();

    if (!connection?.accessToken || !connection?.phoneNumberId) {
      return NextResponse.json({ 
        success: false,
        error: 'WhatsApp-Verbindung unvollständig' 
      }, { status: 400 });
    }

    // Validierung
    if (about && about.length > 139) {
      return NextResponse.json({ error: 'About darf maximal 139 Zeichen haben' }, { status: 400 });
    }
    if (address && address.length > 256) {
      return NextResponse.json({ error: 'Adresse darf maximal 256 Zeichen haben' }, { status: 400 });
    }
    if (description && description.length > 512) {
      return NextResponse.json({ error: 'Beschreibung darf maximal 512 Zeichen haben' }, { status: 400 });
    }
    if (email && email.length > 128) {
      return NextResponse.json({ error: 'E-Mail darf maximal 128 Zeichen haben' }, { status: 400 });
    }
    if (websites && websites.length > 2) {
      return NextResponse.json({ error: 'Maximal 2 Webseiten erlaubt' }, { status: 400 });
    }

    // Erstelle Update-Payload
    const updatePayload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
    };

    if (about !== undefined) updatePayload.about = about;
    if (address !== undefined) updatePayload.address = address;
    if (description !== undefined) updatePayload.description = description;
    if (email !== undefined) updatePayload.email = email;
    if (websites !== undefined) updatePayload.websites = websites.filter((w: string) => w.trim() !== '');
    if (vertical !== undefined) updatePayload.vertical = vertical;

    // Aktualisiere Profil bei Meta
    const metaResponse = await fetch(
      `https://graph.facebook.com/v18.0/${connection.phoneNumberId}/whatsapp_business_profile`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      }
    );

    const metaData = await metaResponse.json();

    if (!metaResponse.ok) {
      return NextResponse.json({
        success: false,
        error: 'Fehler beim Aktualisieren des Profils bei Meta',
        details: metaData.error?.message || 'Unbekannter Fehler',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Profil erfolgreich aktualisiert',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Aktualisieren des Profils',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
