import { NextRequest, NextResponse } from 'next/server';
import { db, isFirebaseAvailable } from '@/firebase/server';

/**
 * GET /api/company/[uid]/check-webmail-account
 * Prüft ob der Benutzer/das Unternehmen ein Taskilo Webmail Konto hat
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid: companyId } = await params;

    if (!isFirebaseAvailable() || !db) {
      return NextResponse.json(
        { error: 'Firebase nicht verfügbar' },
        { status: 503 }
      );
    }

    // Hole Unternehmensdaten
    const companyDoc = await db.collection('companies').doc(companyId).get();
    
    if (!companyDoc.exists) {
      return NextResponse.json({
        hasAccount: false,
        email: null
      });
    }

    const companyData = companyDoc.data();
    const companyEmail = companyData?.email || companyData?.kontaktEmail;

    // Prüfe ob bereits eine Webmail-Verbindung besteht
    if (companyData?.webmailConfig?.status === 'connected') {
      return NextResponse.json({
        hasAccount: true,
        email: companyData.webmailConfig.email,
        isConnected: true
      });
    }

    // Suche nach einer aktiven Webmail-Subscription für diese E-Mail
    if (companyEmail) {
      const subscriptionQuery = await db.collection('webmailSubscriptions')
        .where('customerEmail', '==', companyEmail)
        .where('status', '==', 'active')
        .limit(1)
        .get();

      if (!subscriptionQuery.empty) {
        const subscriptionData = subscriptionQuery.docs[0].data();
        return NextResponse.json({
          hasAccount: true,
          email: subscriptionData.mailboxEmail || subscriptionData.customerEmail,
          subscriptionPlan: subscriptionData.type || 'free',
          isConnected: false
        });
      }
    }

    // Prüfe auch über die userId (Unternehmen könnte mit User-ID verknüpft sein)
    const subscriptionByUserQuery = await db.collection('webmailSubscriptions')
      .where('userId', '==', companyId)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (!subscriptionByUserQuery.empty) {
      const subscriptionData = subscriptionByUserQuery.docs[0].data();
      return NextResponse.json({
        hasAccount: true,
        email: subscriptionData.mailboxEmail || subscriptionData.customerEmail,
        subscriptionPlan: subscriptionData.type || 'free',
        isConnected: false
      });
    }

    // Prüfe auch über companyId-Feld in Subscription
    const subscriptionByCompanyQuery = await db.collection('webmailSubscriptions')
      .where('companyId', '==', companyId)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (!subscriptionByCompanyQuery.empty) {
      const subscriptionData = subscriptionByCompanyQuery.docs[0].data();
      return NextResponse.json({
        hasAccount: true,
        email: subscriptionData.mailboxEmail || subscriptionData.customerEmail,
        subscriptionPlan: subscriptionData.type || 'free',
        isConnected: false
      });
    }

    // Kein Webmail-Account gefunden
    return NextResponse.json({
      hasAccount: false,
      email: null,
      suggestedEmail: companyEmail // Vorgeschlagene E-Mail für Registrierung
    });

  } catch {
    return NextResponse.json(
      { error: 'Fehler beim Prüfen des Webmail-Kontos' },
      { status: 500 }
    );
  }
}
