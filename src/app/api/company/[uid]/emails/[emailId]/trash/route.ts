import { NextRequest, NextResponse } from 'next/server';
import { db, withFirebase } from '@/firebase/server';
import { google } from 'googleapis';

// Gmail API Helper
async function trashEmailInGmail(
  companyId: string,
  userId: string,
  gmailMessageId: string,
  trash: boolean
): Promise<boolean> {
  try {
    // Lade Gmail Credentials aus emailConfigs
    let tokens: { access_token: string; refresh_token: string } | null = null;

    await withFirebase(async () => {
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
          tokens = {
            access_token: emailConfig.tokens.access_token,
            refresh_token: emailConfig.tokens.refresh_token,
          };
        }
      }
    });

    if (!tokens) {
      console.log('⚠️ Keine Gmail Tokens gefunden - nur lokale Aktion');
      return false;
    }

    // OAuth2 Client erstellen
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials(tokens);

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    if (trash) {
      // In Gmail Papierkorb verschieben
      await gmail.users.messages.trash({
        userId: 'me',
        id: gmailMessageId,
      });
      console.log(`✅ Gmail: E-Mail ${gmailMessageId} in Papierkorb verschoben`);
    } else {
      // Aus Gmail Papierkorb wiederherstellen
      await gmail.users.messages.untrash({
        userId: 'me',
        id: gmailMessageId,
      });
      console.log(`✅ Gmail: E-Mail ${gmailMessageId} aus Papierkorb wiederhergestellt`);
    }

    return true;
  } catch (error) {
    console.error('⚠️ Gmail API Fehler (nicht kritisch):', error);
    // Nicht kritisch - lokale Aktion wurde durchgeführt
    return false;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string; emailId: string }> }
) {
  try {
    const { uid, emailId } = await params;
    const body = await request.json();
    const { trash, userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    console.log(`🗑️ Toggle trash for email ${emailId}, trash: ${trash}, userId: ${userId}`);

    let result: any;
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

      // Gmail Message ID extrahieren
      // Format: email@address_gmailMessageId -> wir brauchen nur den Teil nach dem Unterstrich
      let rawMessageId = emailData?.messageId || emailData?.gmailMessageId || emailId;
      
      // WICHTIG: Auch messageId kann das Format email@address_id haben!
      if (rawMessageId.includes('_')) {
        gmailMessageId = rawMessageId.split('_')[1];
      } else {
        gmailMessageId = rawMessageId;
      }

      const labels = emailData?.labels || emailData?.labelIds || [];

      let updatedLabels: string[];

      if (trash) {
        // Move to trash: remove INBOX/SPAM, add TRASH
        updatedLabels = labels.filter((l: string) => l !== 'INBOX' && l !== 'SPAM');
        if (!updatedLabels.includes('TRASH')) {
          updatedLabels.push('TRASH');
        }
      } else {
        // Remove from trash: remove TRASH, add INBOX
        updatedLabels = labels.filter((l: string) => l !== 'TRASH');
        if (!updatedLabels.includes('INBOX')) {
          updatedLabels.push('INBOX');
        }
      }

      // Markiere als lokal geändert, damit Gmail Sync diese nicht überschreibt
      await emailRef.update({
        labels: updatedLabels,
        labelIds: updatedLabels,
        locallyModified: true,
        updatedAt: new Date(),
      });

      result = {
        success: true,
        trash,
        message: trash ? 'In Papierkorb verschoben' : 'Aus Papierkorb wiederhergestellt',
      };
    });

    // Synchronisiere mit Gmail (async, nicht blockierend)
    if (gmailMessageId) {
      trashEmailInGmail(uid, userId, gmailMessageId, trash).then(synced => {
        if (synced) {
          console.log(`✅ Gmail Sync erfolgreich für ${emailId}`);
        }
      });
    }

    console.log(`✅ Email ${emailId} trash status updated to ${trash}`);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('❌ Error toggling trash:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
