import { NextRequest, NextResponse } from 'next/server';
import { db, withFirebase } from '@/firebase/server';
import { verifyCompanyAccess, authErrorResponse } from '@/lib/apiAuth';

// GET - E-Mail-Konfiguration abrufen
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;
    
    // 🔐 AUTHENTIFIZIERUNG: Prüfe ob User auf diese Company zugreifen darf
    const authResult = await verifyCompanyAccess(request, uid);
    if (!authResult.success) {
      return authErrorResponse(authResult);
    }
    
    // userId aus Query-Parameter holen (für benutzer-spezifische Config)
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || uid;
    
    // Prüfe Gmail-Konfiguration in emailConfigs Subcollection
    // Filter nach userId, um benutzer-spezifische Configs zu finden
    const emailConfigsSnapshot = await withFirebase(async () =>
      db!.collection('companies').doc(uid).collection('emailConfigs')
        .where('userId', '==', userId)
        .get()
    );

    if (emailConfigsSnapshot.empty) {
      return NextResponse.json({ 
        hasConfig: false, 
        message: 'Keine Gmail-Konfiguration gefunden' 
      }, { status: 404 });
    }

    // Nehme die erste passende Gmail-Konfiguration
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
      userId: gmailConfig.userId,
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