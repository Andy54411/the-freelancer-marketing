/**
 * API Route: Test Email Connection (SMTP + IMAP)
 * POST /api/email/test-connection
 */

import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import * as imaps from 'imap-simple';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { smtp, imap, testType } = body;

    // Test SMTP
    if (testType === 'smtp' || testType === 'both') {
      try {
        const transporter = nodemailer.createTransport({
          host: smtp.host,
          port: smtp.port,
          secure: smtp.secure,
          auth: {
            user: smtp.username,
            pass: smtp.password, // Already decrypted on client
          },
          tls: {
            rejectUnauthorized: false, // For self-signed certificates
          },
        });

        // Verify connection
        await transporter.verify();

        return NextResponse.json({
          success: true,
          message: 'SMTP-Verbindung erfolgreich getestet',
          smtp: true,
        });
      } catch (error: any) {
        return NextResponse.json(
          {
            success: false,
            message: `SMTP-Fehler: ${error.message}`,
            smtp: false,
            error: error.message,
          },
          { status: 400 }
        );
      }
    }

    // Test IMAP
    if (testType === 'imap' || testType === 'both') {
      try {
        const config = {
          imap: {
            user: imap.username,
            password: imap.password, // Already decrypted on client
            host: imap.host,
            port: imap.port,
            tls: imap.secure,
            tlsOptions: {
              rejectUnauthorized: false,
            },
          },
        };

        const connection = await imaps.connect(config);

        // Try to open INBOX
        await connection.openBox('INBOX');

        // Close connection
        connection.end();

        return NextResponse.json({
          success: true,
          message: 'IMAP-Verbindung erfolgreich getestet',
          imap: true,
        });
      } catch (error: any) {
        return NextResponse.json(
          {
            success: false,
            message: `IMAP-Fehler: ${error.message}`,
            imap: false,
            error: error.message,
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Ungültiger Testtyp',
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Test connection error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Verbindungstest fehlgeschlagen',
        error: error.message,
      },
      { status: 500 }
    );
  }
}
