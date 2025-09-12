import { NextRequest, NextResponse } from 'next/server';
import { createFinAPIService } from '@/lib/finapi-sdk-service';
import { db } from '@/firebase/server';

/**
 * POST /api/finapi/webform
 * Creates a finAPI WebForm for bank connection
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bankId, userId, credentialType, bankName, companyId } = body;

    if (!bankId || !userId) {
      return NextResponse.json(
        { error: 'Bank-ID und Benutzer-ID sind erforderlich' },
        { status: 400 }
      );
    }

    // Für Testing: Verwende userId direkt als Email wenn es eine Email ist
    let companyEmail = userId;
    const actualCompanyId = companyId || userId;

    // Versuche Company-Daten aus der Datenbank zu holen (optional für Production)
    if (userId && !userId.includes('@')) {
      try {
        const companyDoc = await db.collection('companies').doc(userId).get();
        if (companyDoc.exists) {
          const companyData = companyDoc.data();
          companyEmail = companyData?.email || userId;
        }
      } catch (error) {}
    }

    if (!companyEmail) {
      return NextResponse.json(
        { error: 'Company-E-Mail nicht gefunden. Bitte vervollständigen Sie Ihr Profil.' },
        { status: 400 }
      );
    }

    // Verwende echte finAPI WebForm - für Live-Umstellung erforderlich
    try {
      // Erstelle finAPI Service-Instanz mit automatischer Umgebungsdetection
      const finapiService = createFinAPIService();

      // WICHTIG: Erstelle und speichere zuerst den finAPI User

      const consistentPassword = `Taskilo_${actualCompanyId}_2024!`;
      const finapiUser = await finapiService.getOrCreateUser(
        companyEmail,
        consistentPassword,
        actualCompanyId,
        true // forceCreate: true für eindeutige User
      );

      // Verwende die neue, offizielle finAPI WebForm 2.0 API
      const webFormUrl = await finapiService.createWebForm(companyEmail, actualCompanyId, bankId);

      if (!webFormUrl) {
        throw new Error('finAPI WebForm creation failed');
      }

      return NextResponse.json({
        success: true,
        webFormUrl: webFormUrl,
        webFormId: `webform_${Date.now()}`, // Generate a temporary ID
        bankName: bankName || 'Unknown Bank',
        message: 'finAPI WebForm erfolgreich erstellt',
        method: 'finapi_official_api',
        isFinAPIFlow: true,
        instructions: {
          title: 'Bank-Verbindung herstellen',
          steps: [
            '1. Sie werden zur finAPI WebForm weitergeleitet',
            '2. Wählen Sie Ihre Bank aus oder bestätigen Sie die Auswahl',
            '3. Geben Sie Ihre echten Online-Banking-Zugangsdaten ein',
            '4. Folgen Sie dem Anmeldeprozess (TAN, App-Freigabe, etc.)',
            '5. Nach erfolgreicher Verbindung werden Sie zurückgeleitet',
          ],
        },
        bankInfo: {
          bankId: parseInt(bankId.toString()),
          bankName: bankName || 'Unknown Bank',
          userEmail: companyEmail,
          connectionMethod: 'finapi_webform',
        },
      });
    } catch (webFormError: any) {
      // Fallback: Return error instead of Taskilo flow for live deployment
      return NextResponse.json(
        {
          error: 'finAPI WebForm-Erstellung fehlgeschlagen',
          details: webFormError.message,
          suggestion: 'Bitte versuchen Sie es später erneut oder kontaktieren Sie den Support',
          bankId: parseInt(bankId.toString()),
          bankName: bankName || 'Unknown Bank',
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Fehler beim Erstellen der WebForm',
        details: error.message,
        suggestion: 'Bitte versuchen Sie es später erneut oder kontaktieren Sie den Support',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/finapi/webform
 * Returns WebForm status or information
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const webFormId = searchParams.get('webFormId');

    if (!webFormId) {
      return NextResponse.json({ error: 'WebForm-ID ist erforderlich' }, { status: 400 });
    }

    // In a real implementation, you would fetch WebForm status from finAPI
    // For now, return a basic status response
    return NextResponse.json({
      success: true,
      webFormId,
      status: 'active',
      message: 'WebForm-Status abgerufen',
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Fehler beim Abrufen des WebForm-Status',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
