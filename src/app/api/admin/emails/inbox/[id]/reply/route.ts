import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/clients';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { cookies } from 'next/headers';

// Helper function to get authenticated user from AWS session
async function getAuthenticatedUserEmail(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('taskilo_admin_aws_session');

    if (!sessionCookie) {
      console.log('🔍 No AWS session cookie found, checking mock session...');

      // Fallback to mock authentication
      const mockSessionCookie = cookieStore.get('taskilo_admin_session');
      if (mockSessionCookie) {
        try {
          const mockSessionData = JSON.parse(mockSessionCookie.value);
          console.log('✅ Mock session found, extracting user email...');
          console.log('Mock session data:', mockSessionData);

          // Extract email from mock session data
          const mockUserEmail = mockSessionData.user?.email || mockSessionData.email;

          if (mockUserEmail) {
            console.log(`✅ Using mock session email: ${mockUserEmail}`);

            // Map problematic emails to valid SES emails
            const emailMappings = {
              'a.staudinger32@icloud.com': 'andy.staudinger@taskilo.de',
              'noreply@taskilo.de': 'andy.staudinger@taskilo.de', // Default mapping
              'admin@taskilo.de': 'andy.staudinger@taskilo.de', // Default mapping
            };

            const mappedEmail = emailMappings[mockUserEmail] || mockUserEmail;

            if (mappedEmail !== mockUserEmail) {
              console.log(`🔄 Email mapped: ${mockUserEmail} → ${mappedEmail}`);
            }

            return mappedEmail;
          } else {
            console.warn('⚠️ No email found in mock session, using default');
            return 'andy.staudinger@taskilo.de';
          }
        } catch (parseError) {
          console.error('❌ Error parsing mock session:', parseError);
          return 'andy.staudinger@taskilo.de'; // Fallback
        }
      }

      return null;
    }

    const sessionData = JSON.parse(sessionCookie.value);

    // Check if session is expired
    if (Date.now() > sessionData.expiresAt) {
      console.log('❌ AWS Session expired');
      return null;
    }

    console.log(`✅ Found authenticated user email: ${sessionData.email}`);
    return sessionData.email;
  } catch (error) {
    console.error('❌ Error getting authenticated user:', error);
    return null;
  }
}
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { to, cc, bcc, subject, htmlContent } = await request.json();

    // Validierung
    if (!to || !subject || !htmlContent) {
      return NextResponse.json(
        { error: 'Empfänger, Betreff und Inhalt sind erforderlich', success: false },
        { status: 400 }
      );
    }

    // 🔐 GET AUTHENTICATED USER EMAIL FROM SESSION
    const authenticatedUserEmail = await getAuthenticatedUserEmail();

    if (!authenticatedUserEmail) {
      console.error('❌ No authenticated user found for email reply');
      return NextResponse.json(
        {
          error: 'Authentication required',
          details: 'No valid AWS session found. Please log in again.',
          success: false,
        },
        { status: 401 }
      );
    }

    console.log(`🔐 Using authenticated user email as sender for reply: ${authenticatedUserEmail}`);

    // 🔐 Validiere, dass die authentifizierte Email in AWS SES verifiziert ist
    const allowedSenderEmails = [
      'andy.staudinger@taskilo.de',
      'info@taskilo.de',
      'noreply@taskilo.de',
      'admin@taskilo.de',
      'marketing@taskilo.de',
      'support@taskilo.de',
      'hello@taskilo.de',
    ];

    if (!allowedSenderEmails.includes(authenticatedUserEmail)) {
      console.error(
        `❌ Reply Email: Email-Adresse nicht verifiziert in AWS SES: ${authenticatedUserEmail}`
      );

      return NextResponse.json(
        {
          error: 'E-Mail-Adresse nicht verifiziert in AWS SES',
          details: `Die E-Mail-Adresse "${authenticatedUserEmail}" ist nicht in AWS SES verifiziert.`,
          authenticatedEmail: authenticatedUserEmail,
          allowedEmails: allowedSenderEmails,
          success: false,
        },
        { status: 400 }
      );
    }

    // E-Mail über AWS SES senden (anstatt Resend)
    const awsSesResponse = await fetch('/api/admin/emails/send-aws', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward the session cookie for authentication
        Cookie: request.headers.get('cookie') || '',
      },
      body: JSON.stringify({
        // from: wird automatisch aus AWS Session bezogen
        to: Array.isArray(to) ? to : [to],
        cc: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
        bcc: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined,
        subject,
        htmlContent,
      }),
    });

    if (!awsSesResponse.ok) {
      const errorData = await awsSesResponse.json();
      throw new Error(`AWS SES API Fehler: ${errorData.error || 'Unbekannter Fehler'}`);
    }

    const awsSesData = await awsSesResponse.json();

    // E-Mail in der Datenbank speichern
    await addDoc(collection(db, 'sent_emails'), {
      messageId: awsSesData.messageId,
      from: authenticatedUserEmail, // ✅ Use authenticated user email
      to: Array.isArray(to) ? to : [to],
      cc: cc ? (Array.isArray(cc) ? cc : [cc]) : [],
      bcc: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : [],
      subject,
      htmlContent,
      textContent: htmlContent.replace(/<[^>]*>/g, ''), // HTML zu Text
      status: 'sent',
      sentAt: serverTimestamp(),
      isReply: true,
      originalEmailId: id,
      type: 'reply',
      provider: 'AWS SES', // ✅ Updated provider
    });

    // Original-E-Mail als beantwortet markieren
    await updateDoc(doc(db, 'inbox_emails', id), {
      isReplied: true,
      repliedAt: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      messageId: awsSesData.messageId,
      message: 'Antwort erfolgreich über AWS SES gesendet',
      provider: 'AWS SES',
      authenticatedSender: authenticatedUserEmail,
    });
  } catch (error) {
    console.error('Fehler beim Senden der Antwort:', error);
    return NextResponse.json(
      { error: 'Fehler beim Senden der Antwort', success: false },
      { status: 500 }
    );
  }
}
