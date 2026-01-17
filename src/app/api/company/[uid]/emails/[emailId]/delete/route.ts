import { NextRequest, NextResponse } from 'next/server';
import { db, withFirebase } from '@/firebase/server';
import { google } from 'googleapis';

// Gmail API Helper - Dauerhafte Löschung
async function deleteEmailInGmail(
  companyId: string,
  userId: string,
  gmailMessageId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Lade Gmail Credentials aus emailConfigs
    const tokensData = await withFirebase(async () => {
      const emailConfigsSnapshot = await db!
        .collection('companies')
        .doc(companyId)
        .collection('emailConfigs')
        .where('userId', '==', userId)
        .limit(1)
        .get();

      if (!emailConfigsSnapshot.empty) {
        const emailConfig = emailConfigsSnapshot.docs[0].data();
        if (emailConfig.tokens?.access_token && emailConfig.tokens?.refresh_token) {
          return {
            access_token: emailConfig.tokens.access_token as string,
            refresh_token: emailConfig.tokens.refresh_token as string,
            scope: emailConfig.tokens.scope as string | undefined,
          };
        }
      }
      return null;
    });

    if (!tokensData) {
      return { success: false, error: 'NO_TOKENS' };
    }

    // Prüfe ob mail.google.com Scope vorhanden ist (nötig für permanentes Löschen)
    const tokenScopes = tokensData.scope?.split(' ') || [];
    const hasFullMailAccess = tokenScopes.some(s => s === 'https://mail.google.com/');

    if (!hasFullMailAccess) {
      return { 
        success: false, 
        error: 'INSUFFICIENT_SCOPE',
      };
    }

    // OAuth2 Client erstellen
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials(tokensData);

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Dauerhafte Löschung in Gmail
    try {
      await gmail.users.messages.delete({
        userId: 'me',
        id: gmailMessageId,
      });
      
      return { success: true };
    } catch (deleteError: any) {
      // Scope-Fehler
      if (deleteError?.code === 403 && deleteError?.message?.includes('insufficient authentication scopes')) {
        return { success: false, error: 'SCOPE_ERROR' };
      }
      
      // E-Mail existiert nicht mehr in Gmail
      if (deleteError?.code === 404) {
        return { success: true };
      }
      
      throw deleteError;
    }
  } catch (error: any) {
    if (error?.code === 403 && error?.message?.includes('insufficient authentication scopes')) {
      return { success: false, error: 'SCOPE_ERROR' };
    }
    
    return { success: false, error: 'API_ERROR' };
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string; emailId: string }> }
) {
  try {
    const { uid, emailId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    let gmailMessageId: string | null = null;

    await withFirebase(async () => {
      const emailRef = db!.collection('companies').doc(uid).collection('emailCache').doc(emailId);
      const emailDoc = await emailRef.get();

      if (!emailDoc.exists) {
        throw new Error('Email not found');
      }

      const emailData = emailDoc.data();

      // Validiere, dass die E-Mail dem anfragenden Benutzer gehört
      if (emailData?.userId && emailData.userId !== userId) {
        throw new Error('Unauthorized: Email belongs to another user');
      }

      // Prüfe, ob E-Mail im Papierkorb ist (sollte für dauerhafte Löschung erforderlich sein)
      const labels = emailData?.labels || emailData?.labelIds || [];
      if (!labels.includes('TRASH')) {
        throw new Error('E-Mail muss sich im Papierkorb befinden, um dauerhaft gelöscht zu werden');
      }

      // Gmail Message ID extrahieren
      // Format: email@address_gmailMessageId -> wir brauchen nur den Teil nach dem Unterstrich
      let rawMessageId = emailData?.messageId || emailData?.gmailMessageId || emailId;
      
      // WICHTIG: Auch messageId kann das Format email@address_id haben!
      if (rawMessageId.includes('_')) {
        gmailMessageId = rawMessageId.split('_')[1];
      } else {
        gmailMessageId = rawMessageId;
      }
    });

    // WICHTIG: ERST Gmail löschen, DANN Firestore!
    // Sonst werden E-Mails beim nächsten Sync wieder heruntergeladen
    let gmailResult: { success: boolean; error?: string } = { success: false };
    if (gmailMessageId) {
      gmailResult = await deleteEmailInGmail(uid, userId, gmailMessageId);
      
      // KRITISCH: Wenn Scope fehlt, STOPPE die Löschung und gib klare Fehlermeldung
      if (!gmailResult.success && gmailResult.error === 'INSUFFICIENT_SCOPE') {
        return NextResponse.json({
          success: false,
          error: 'GMAIL_SCOPE_MISSING',
          message: 'Gmail-Berechtigung fehlt! Bitte gehe zu Einstellungen → E-Mail Integration und verbinde Gmail neu.',
          requiresReconnect: true,
        }, { status: 403 });
      }
      
    }

    // Jetzt Firestore löschen
    await withFirebase(async () => {
      const emailRef = db!.collection('companies').doc(uid).collection('emailCache').doc(emailId);
      await emailRef.delete();
    });

    return NextResponse.json({
      success: true,
      message: 'E-Mail dauerhaft gelöscht',
      gmailSynced: gmailResult.success,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
