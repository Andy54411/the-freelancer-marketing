import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';
import { AdminContactNotificationService } from '@/services/admin/AdminContactNotificationService';

/**
 * POST /api/admin/contact-company
 * 
 * Erstellt ein Support-Ticket und sendet Benachrichtigungen an die Firma
 * über alle verfügbaren Kanäle:
 * - Dashboard-Benachrichtigung
 * - E-Mail via Hetzner Webmailer
 * - WhatsApp via Twilio
 * - SMS via Twilio
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      companyId,
      companyName,
      companyEmail,
      companyPhone,
      taskiloEmail,
      title,
      message,
      priority = 'medium',
      category = 'admin-kontakt',
    } = body;

    // Validierung
    if (!companyId || !title || !message) {
      return NextResponse.json(
        { success: false, error: 'companyId, title und message sind erforderlich' },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Datenbank nicht verfügbar' },
        { status: 500 }
      );
    }

    // Ticket-ID generieren
    const ticketId = `ADM-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const now = new Date().toISOString();

    // Ticket in Firestore speichern
    const ticketData = {
      id: ticketId,
      title: title,
      description: message,
      status: 'open',
      priority: priority,
      category: category,
      customerEmail: companyEmail,
      customerName: companyName,
      companyId: companyId,
      source: 'admin-outbound',
      direction: 'outbound', // Admin → Company
      createdAt: now,
      updatedAt: now,
      tags: ['admin-kontakt', 'outbound'],
      comments: [
        {
          id: `comment_${Date.now()}`,
          author: 'Taskilo Admin',
          authorType: 'admin',
          content: message,
          timestamp: now,
          isInternal: false,
        },
      ],
      // SLA Tracking
      slaTarget: 24,
      escalated: false,
    };

    await db.collection('adminTickets').doc(ticketId).set({
      ...ticketData,
      createdAtTimestamp: FieldValue.serverTimestamp(),
      updatedAtTimestamp: FieldValue.serverTimestamp(),
    });

    // Multi-Channel Benachrichtigungen senden
    const notificationResult = await AdminContactNotificationService.notifyCompany({
      companyId,
      companyName: companyName || 'Unbekannt',
      companyEmail: companyEmail || '',
      companyPhone: companyPhone,
      taskiloEmail: taskiloEmail,
      title,
      message,
      ticketId,
      priority,
      category,
      link: `/dashboard/company/${companyId}/support`,
    });

    // Zusammenfassung der Ergebnisse
    const successChannels: string[] = [];
    const failedChannels: string[] = [];

    if (notificationResult.dashboard.success) successChannels.push('Dashboard');
    else failedChannels.push(`Dashboard: ${notificationResult.dashboard.error}`);

    if (notificationResult.email.success) successChannels.push('E-Mail');
    else if (companyEmail) failedChannels.push(`E-Mail: ${notificationResult.email.error}`);

    if (notificationResult.taskiloEmail.success && taskiloEmail) successChannels.push('Taskilo E-Mail');
    else if (taskiloEmail && !notificationResult.taskiloEmail.success) {
      failedChannels.push(`Taskilo E-Mail: ${notificationResult.taskiloEmail.error}`);
    }

    if (notificationResult.whatsapp.success) successChannels.push('WhatsApp');
    else if (companyPhone) failedChannels.push(`WhatsApp: ${notificationResult.whatsapp.error}`);

    if (notificationResult.sms.success) successChannels.push('SMS');
    else if (companyPhone) failedChannels.push(`SMS: ${notificationResult.sms.error}`);

    return NextResponse.json({
      success: true,
      ticketId,
      notificationResult,
      summary: {
        successChannels,
        failedChannels,
        message: successChannels.length > 0 
          ? `Benachrichtigung gesendet über: ${successChannels.join(', ')}`
          : 'Ticket erstellt, aber keine Benachrichtigungen gesendet',
      },
    });

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Fehler beim Kontaktieren der Firma',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
