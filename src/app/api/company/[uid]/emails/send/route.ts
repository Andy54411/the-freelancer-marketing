import { NextRequest, NextResponse } from 'next/server';
import { NewGmailService } from '@/services/newGmailService';

export const runtime = 'nodejs';

/**
 * POST /api/company/[uid]/emails/send
 * Send email via Gmail API
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const { uid } = await params;
    const companyId = uid;
    const requestBody = await request.json();

    const {
      to,
      cc,
      bcc,
      subject,
      body: emailBody,
      htmlBody,
      attachments,
    }: {
      to: string | string[];
      cc?: string | string[];
      bcc?: string | string[];
      subject: string;
      body: string;
      htmlBody?: string;
      attachments?: File[];
    } = requestBody;

    // Validate required fields
    if (!to || (Array.isArray(to) && to.length === 0)) {
      return NextResponse.json(
        { success: false, error: 'Recipient (to) is required' },
        { status: 400 }
      );
    }

    if (!subject || !emailBody) {
      return NextResponse.json(
        { success: false, error: 'Subject and body are required' },
        { status: 400 }
      );
    }

    // Get Gmail configuration from emailConfigs subcollection
    const { db } = await import('@/firebase/server');

    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database not available' },
        { status: 500 }
      );
    }

    // Query emailConfigs subcollection for active Gmail config
    const emailConfigsRef = db.collection('companies').doc(companyId).collection('emailConfigs');
    const emailConfigsSnapshot = await emailConfigsRef
      .where('provider', '==', 'gmail')
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (emailConfigsSnapshot.empty) {
      return NextResponse.json(
        { success: false, error: 'Gmail not configured. Please connect Gmail first.' },
        { status: 400 }
      );
    }

    const emailConfigDoc = emailConfigsSnapshot.docs[0];
    const emailConfigData = emailConfigDoc.data();

    // Build Gmail config in format expected by NewGmailService
    const gmailConfig = {
      email: emailConfigData.email,
      provider: 'gmail' as const,
      tokens: emailConfigData.tokens,
    };

    // Initialize Gmail service
    const gmailService = new NewGmailService(gmailConfig, companyId);

    // Convert attachments from File to Gmail format
    const processedAttachments = attachments
      ? await Promise.all(
          attachments.map(async (file: any) => {
            // If file has content (base64 string or Buffer from JSON)
            if (file.content) {
              // Convert base64 string to Buffer if needed
              const contentBuffer =
                typeof file.content === 'string'
                  ? Buffer.from(file.content, 'base64')
                  : Buffer.from(file.content);

              return {
                filename: file.filename || file.name,
                content: contentBuffer,
                mimeType: file.mimeType || file.type || 'application/octet-stream',
              };
            }

            // If file is a File object, convert to Buffer
            if (file instanceof File) {
              const arrayBuffer = await file.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              return {
                filename: file.name,
                content: buffer,
                mimeType: file.type || 'application/octet-stream',
              };
            }

            return null;
          })
        ).then(results => results.filter(Boolean) as any[])
      : [];

    // Normalize to/cc/bcc to arrays
    const toArray = Array.isArray(to) ? to : [to];
    const ccArray = cc ? (Array.isArray(cc) ? cc : [cc]) : undefined;
    const bccArray = bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined;

    // Send email via Gmail
    const result = await gmailService.sendEmail({
      to: toArray,
      cc: ccArray,
      bcc: bccArray,
      subject,
      body: emailBody,
      htmlBody,
      attachments: processedAttachments,
    });

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: 'Email sent successfully via Gmail',
    });
  } catch (error: any) {
    console.error('Error sending email via Gmail:', error);

    // Check for Gmail auth errors
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json(
        {
          success: false,
          error: 'Gmail authentication expired. Please reconnect Gmail.',
          code: 'GMAIL_AUTH_ERROR',
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send email',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
