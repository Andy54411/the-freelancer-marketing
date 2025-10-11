/**
 * API Route: Sync Emails from IMAP
 * POST /api/email/sync
 */

import { NextRequest, NextResponse } from 'next/server';
import * as imaps from 'imap-simple';
import { simpleParser } from 'mailparser';
import {
  getEmailConfig,
  decryptPassword,
  updateLastSync,
} from '@/services/emailIntegrationService.server';
import { db } from '@/firebase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, limit = 50 } = body;

    if (!companyId) {
      return NextResponse.json(
        {
          success: false,
          message: 'CompanyId fehlt',
        },
        { status: 400 }
      );
    }

    // Get email configuration
    const emailConfig = await getEmailConfig(companyId);

    if (!emailConfig || !emailConfig.settings.enabled || !emailConfig.imap.enabled) {
      return NextResponse.json(
        {
          success: false,
          message: 'IMAP nicht konfiguriert oder deaktiviert',
        },
        { status: 400 }
      );
    }

    // Decrypt password
    const imapPassword = decryptPassword(emailConfig.imap.password);

    // Connect to IMAP
    const config = {
      imap: {
        user: emailConfig.imap.username,
        password: imapPassword,
        host: emailConfig.imap.host,
        port: emailConfig.imap.port,
        tls: emailConfig.imap.secure,
        tlsOptions: {
          rejectUnauthorized: false,
        },
      },
    };

    const connection = await imaps.connect(config);

    // Open INBOX
    await connection.openBox('INBOX');

    // Search for recent emails
    const searchCriteria = ['ALL'];
    const fetchOptions = {
      bodies: ['HEADER', 'TEXT'],
      markSeen: false,
      struct: true,
    };

    const messages = await connection.search(searchCriteria, fetchOptions);

    // Limit results
    const limitedMessages = messages.slice(0, limit);

    // Parse emails
    const emails = [];
    for (const message of limitedMessages) {
      const all = message.parts.find((part: any) => part.which === '');
      const id = message.attributes.uid;
      const idHeader = 'Imap-Id: ' + id + '\r\n';

      const parsed = await simpleParser(idHeader + all.body);

      emails.push({
        id: id.toString(),
        from: parsed.from?.text || '',
        to: parsed.to?.text || '',
        subject: parsed.subject || '',
        date: parsed.date || new Date(),
        text: parsed.text || '',
        html: parsed.html || '',
        attachments:
          parsed.attachments?.map((att: any) => ({
            filename: att.filename,
            contentType: att.contentType,
            size: att.size,
          })) || [],
      });
    }

    // Close connection
    connection.end();

    // Update last sync timestamp
    await updateLastSync(companyId);

    // Save emails to Firestore
    const emailsRef = db.collection('companies').doc(companyId).collection('emails');

    for (const email of emails) {
      await emailsRef.doc(email.id).set(
        {
          ...email,
          syncedAt: new Date(),
          read: false,
        },
        { merge: true }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${emails.length} E-Mails synchronisiert`,
      count: emails.length,
      emails: emails.map(e => ({
        id: e.id,
        from: e.from,
        subject: e.subject,
        date: e.date,
      })),
    });
  } catch (error: any) {
    console.error('Sync emails error:', error);
    return NextResponse.json(
      {
        success: false,
        message: `E-Mail-Synchronisation fehlgeschlagen: ${error.message}`,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
