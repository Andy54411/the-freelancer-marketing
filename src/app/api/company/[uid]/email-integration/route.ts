import { NextRequest, NextResponse } from 'next/server';
import { db, auth, isFirebaseAvailable } from '@/firebase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid: companyId } = await params;

    // Firebase verfügbar prüfen
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json(
        { error: 'Firebase nicht verfügbar' },
        { status: 503 }
      );
    }

    // E-Mail-Konfigurationen für das Unternehmen laden (neue gmailConfig Struktur)
    const companyDoc = await db.collection('companies').doc(companyId).get();
    
    const configs: any[] = [];
    
    if (companyDoc.exists) {
      const companyData = companyDoc.data();
      const gmailConfig = companyData?.gmailConfig;
      
      if (gmailConfig) {
        // Gmail-Konfiguration aus dem Hauptdokument hinzufügen
        configs.push({
          id: gmailConfig.id || 'gmail-main',
          provider: 'gmail',
          email: gmailConfig.email,
          status: gmailConfig.status || 'unknown',
          isActive: gmailConfig.status === 'connected',
          hasValidTokens: gmailConfig.tokens?.refresh_token && 
                         gmailConfig.tokens.refresh_token !== 'invalid',
          createdAt: gmailConfig.createdAt,
          updatedAt: gmailConfig.updatedAt,
          userInfo: gmailConfig.userInfo
        });
      }
    }

    return NextResponse.json({
      success: true,
      configurations: configs,
      totalCount: configs.length,
      gmailCount: configs.filter(c => c.provider === 'gmail').length,
      activeCount: configs.filter(c => c.status === 'connected' && c.isActive).length
    });

  } catch (error) {
    console.error('Fehler beim Laden der E-Mail-Konfigurationen:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der E-Mail-Konfigurationen' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid: companyId } = await params;
    const body = await request.json();

    // Firebase verfügbar prüfen
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json(
        { error: 'Firebase nicht verfügbar' },
        { status: 503 }
      );
    }

    // Authentifizierung prüfen
    const authHeader = request.headers.get('authorization');
    const sessionCookie = request.cookies.get('session')?.value;
    
    if (!authHeader && !sessionCookie) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      );
    }

    // Neue E-Mail-Konfiguration erstellen
    const configId = Date.now().toString();
    const configData = {
      ...body,
      id: configId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.collection('companies').doc(companyId).collection('emailConfigs').doc(configId).set(configData);

    return NextResponse.json({
      success: true,
      configId: configId,
      message: 'E-Mail-Konfiguration erstellt'
    });

  } catch (error) {
    console.error('Fehler beim Erstellen der E-Mail-Konfiguration:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen der E-Mail-Konfiguration' },
      { status: 500 }
    );
  }
}