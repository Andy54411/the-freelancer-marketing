import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || uid;
    
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }
    
    // Suche nach Gmail-Config für diesen User
    let emailConfigsSnapshot = await db.collection('companies').doc(uid).collection('emailConfigs')
      .where('userId', '==', userId)
      .where('provider', '==', 'gmail')
      .limit(1)
      .get();

    // Fallback: Wenn nicht gefunden, suche nach irgendeiner Gmail-Config
    if (emailConfigsSnapshot.empty) {
      emailConfigsSnapshot = await db.collection('companies').doc(uid).collection('emailConfigs')
        .where('provider', '==', 'gmail')
        .limit(1)
        .get();
    }

    if (emailConfigsSnapshot.empty) {
      return NextResponse.json({
        success: false,
        error: 'Keine Gmail-Konfiguration gefunden',
        signatures: []
      });
    }

    const emailConfigDoc = emailConfigsSnapshot.docs[0];
    const gmailConfig = emailConfigDoc.data();
    
    // Prüfe ob Access Token vorhanden ist
    const accessToken = gmailConfig.tokens?.access_token;
    if (!accessToken || accessToken === 'invalid') {
      return NextResponse.json({
        success: false,
        error: 'Gmail-Authentifizierung erforderlich',
        signatures: []
      });
    }

    // Gmail sendAs API aufrufen um Signaturen zu bekommen
    const gmailEmail = gmailConfig.email;
    const sendAsResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!sendAsResponse.ok) {
      const errorText = await sendAsResponse.text();
      console.error('Gmail sendAs API Fehler:', errorText);
      
      // Bei 401 Token abgelaufen
      if (sendAsResponse.status === 401) {
        return NextResponse.json({
          success: false,
          error: 'Gmail-Token abgelaufen. Bitte Gmail erneut verbinden.',
          needsReauth: true,
          signatures: []
        });
      }
      
      return NextResponse.json({
        success: false,
        error: 'Fehler beim Abrufen der Gmail-Signaturen',
        signatures: []
      });
    }

    const sendAsData = await sendAsResponse.json();
    const sendAsAddresses = sendAsData.sendAs || [];

    // Konvertiere Gmail-Signaturen in unser Format
    const signatures = sendAsAddresses
      .filter((addr: { signature?: string }) => addr.signature && addr.signature.trim())
      .map((addr: { sendAsEmail: string; displayName?: string; signature: string; isDefault?: boolean }, index: number) => ({
        id: `gmail-${index}-${addr.sendAsEmail}`,
        name: addr.displayName || addr.sendAsEmail,
        content: addr.signature,
        isDefault: addr.isDefault || false,
        email: addr.sendAsEmail,
        provider: 'gmail' as const
      }));

    // Finde die primäre Signatur
    const primaryAddr = sendAsAddresses.find((addr: { isDefault?: boolean }) => addr.isDefault);
    const defaultSignatureId = primaryAddr && primaryAddr.signature 
      ? `gmail-${sendAsAddresses.indexOf(primaryAddr)}-${primaryAddr.sendAsEmail}`
      : signatures[0]?.id;

    return NextResponse.json({
      success: true,
      email: gmailEmail,
      signatures,
      defaultSignatureNewEmail: defaultSignatureId,
      defaultSignatureReply: defaultSignatureId,
      count: signatures.length
    });

  } catch (error) {
    console.error('Fehler beim Abrufen der Gmail-Signaturen:', error);
    return NextResponse.json({
      success: false,
      error: 'Interner Serverfehler',
      signatures: []
    }, { status: 500 });
  }
}
