import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';
import { 
  getOrderReviewEmailHtml, 
  getOrderReviewEmailText,
  getCompanyReviewEmailHtml,
  getCompanyReviewEmailText 
} from '@/lib/reviewEmailTemplates';

// SMTP-Konfiguration für Hetzner Mailserver
const SMTP_HOST = process.env.SMTP_HOST || 'mail.taskilo.de';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || 'support@taskilo.de';
const SMTP_PASSWORD = process.env.WORKMAIL_SMTP_PASSWORD || process.env.SMTP_PASSWORD || '';
const SMTP_FROM = 'support@taskilo.de';

interface EmailResult {
  type: string;
  success: boolean;
  messageId?: string;
  error?: string;
  reviewLink: string;
}

/**
 * POST: Sendet Test-E-Mails für das Bewertungssystem
 */
export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Firebase nicht verfügbar' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { testEmail, type } = body;
    
    if (!testEmail) {
      return NextResponse.json(
        { success: false, error: 'testEmail ist erforderlich' },
        { status: 400 }
      );
    }
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://taskilo.de';
    
    // Test-Daten
    const testData = {
      customerName: 'Andy Staudinger',
      providerName: 'Mietkoch Andy',
      orderTitle: 'Privates Dinner für 8 Personen',
      orderId: `test-order-${Date.now()}`,
      providerId: 'LSeyPKLSCXTnyQd48Vuc6JLx7nH2',
    };
    
    // Erstelle ReviewRequest direkt mit Admin SDK
    const now = new Date();
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const orderReviewToken = uuidv4();
    const companyReviewToken = uuidv4();
    
    const reviewRequestRef = db.collection('reviewRequests').doc();
    await reviewRequestRef.set({
      orderId: testData.orderId,
      customerId: 'test-customer-id',
      customerEmail: testEmail,
      customerName: testData.customerName,
      orderTitle: testData.orderTitle,
      providerId: testData.providerId,
      providerName: testData.providerName,
      orderReviewToken,
      orderReviewSentAt: null,
      orderReviewExpiresAt: expiresAt,
      orderReviewCompletedAt: null,
      orderReviewId: null,
      companyReviewToken,
      companyReviewSentAt: null,
      companyReviewExpiresAt: null,
      companyReviewCompletedAt: null,
      companyReviewId: null,
      status: 'pending_order',
      createdAt: now,
      updatedAt: now,
    });
    
    const reviewRequestId = reviewRequestRef.id;
    
    const results: EmailResult[] = [];
    
    // E-Mail 1: Auftragsbewertung
    if (type === 'order' || type === 'both') {
      const orderReviewLink = `${baseUrl}/review/order/${orderReviewToken}`;
      
      const orderEmailHtml = getOrderReviewEmailHtml({
        customerName: testData.customerName,
        providerName: testData.providerName,
        orderTitle: testData.orderTitle,
        reviewLink: orderReviewLink,
      });
      
      const orderEmailText = getOrderReviewEmailText({
        customerName: testData.customerName,
        providerName: testData.providerName,
        orderTitle: testData.orderTitle,
        reviewLink: orderReviewLink,
      });
      
      const orderResult = await sendEmail({
        to: testEmail,
        subject: `Wie war Ihr Auftrag bei ${testData.providerName}?`,
        html: orderEmailHtml,
        text: orderEmailText,
      });
      
      results.push({ 
        type: 'order', 
        success: orderResult.success,
        messageId: orderResult.messageId,
        error: orderResult.error,
        reviewLink: orderReviewLink 
      });
      
      // Markiere als gesendet
      await reviewRequestRef.update({
        orderReviewSentAt: new Date(),
        updatedAt: new Date(),
      });
    }
    
    // E-Mail 2: Firmenbewertung
    if (type === 'company' || type === 'both') {
      const companyReviewLink = `${baseUrl}/review/company/${companyReviewToken}`;
      
      const companyEmailHtml = getCompanyReviewEmailHtml({
        customerName: testData.customerName,
        providerName: testData.providerName,
        reviewLink: companyReviewLink,
      });
      
      const companyEmailText = getCompanyReviewEmailText({
        customerName: testData.customerName,
        providerName: testData.providerName,
        reviewLink: companyReviewLink,
      });
      
      const companyResult = await sendEmail({
        to: testEmail,
        subject: `Wie war Ihre Erfahrung mit ${testData.providerName}?`,
        html: companyEmailHtml,
        text: companyEmailText,
      });
      
      results.push({ 
        type: 'company', 
        success: companyResult.success,
        messageId: companyResult.messageId,
        error: companyResult.error,
        reviewLink: companyReviewLink 
      });
      
      // Markiere als gesendet
      await reviewRequestRef.update({
        companyReviewSentAt: new Date(),
        updatedAt: new Date(),
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Test-E-Mails gesendet',
      reviewRequestId,
      results,
    });
    
  } catch (error) {
    console.error('Error sending test review emails:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      { status: 500 }
    );
  }
}

/**
 * Sendet E-Mail über Hetzner SMTP (nodemailer)
 */
async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!SMTP_PASSWORD) {
      return { 
        success: false, 
        error: 'SMTP nicht konfiguriert - SMTP_PASSWORD oder WORKMAIL_SMTP_PASSWORD fehlt' 
      };
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      },
    });

    const result = await transporter.sendMail({
      from: `Taskilo Bewertungen <${SMTP_FROM}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: SMTP_FROM,
    });
    
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'E-Mail konnte nicht gesendet werden' 
    };
  }
}
