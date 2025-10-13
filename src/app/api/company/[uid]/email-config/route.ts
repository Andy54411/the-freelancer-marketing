import { NextRequest, NextResponse } from 'next/server';
import { db, withFirebase } from '@/firebase/server';

// GET - E-Mail-Konfiguration abrufen
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;
    
    // Prüfe Gmail-Konfiguration in emailConfigs Subcollection
    const emailConfigsSnapshot = await withFirebase(async () =>
      db!.collection('companies').doc(uid).collection('emailConfigs').get()
    );

    if (emailConfigsSnapshot.empty) {
      return NextResponse.json({ 
        hasConfig: false, 
        message: 'Keine Gmail-Konfiguration gefunden' 
      }, { status: 404 });
    }

    // Nehme die erste (und normalerweise einzige) Gmail-Konfiguration
    const emailConfigDoc = emailConfigsSnapshot.docs[0];
    const gmailConfig = emailConfigDoc.data();

    // Prüfe Token-Status
    const hasValidTokens = gmailConfig.tokens?.refresh_token && 
                          gmailConfig.tokens.refresh_token !== 'invalid' &&
                          gmailConfig.tokens.access_token &&
                          gmailConfig.tokens.access_token !== 'invalid';

    const status = gmailConfig.isActive && hasValidTokens ? 'connected' : 'authentication_required';

    return NextResponse.json({
      id: emailConfigDoc.id,
      hasConfig: true,
      hasTokens: hasValidTokens,
      email: gmailConfig.email,
      provider: gmailConfig.provider || 'gmail',
      status: status,
      userInfo: gmailConfig.userInfo,
      gmailProfile: gmailConfig.gmailProfile,
      isActive: gmailConfig.isActive,
      createdAt: gmailConfig.createdAt,
      updatedAt: gmailConfig.updatedAt,
      requiresReauth: !hasValidTokens
    });
    
  } catch (error) {
    console.error('Fehler beim Abrufen der E-Mail-Konfiguration:', error);
    return NextResponse.json(
      { message: 'Fehler beim Abrufen der E-Mail-Konfiguration' },
      { status: 500 }
    );
  }
}