import { NextRequest, NextResponse } from 'next/server';
import { AWSTicketStorage } from '@/lib/aws-ticket-storage';
import { TicketNotificationService } from '@/lib/ticket-notifications';

// Company Tickets API - für Company Dashboard
// Nutzt die gleiche AWS DynamoDB-Infrastruktur wie Admin, aber ohne Admin-Auth

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerEmail = searchParams.get('customerEmail');
    const ticketId = searchParams.get('id');

    if (ticketId) {
      // Einzelnes Ticket laden
      const ticket = await AWSTicketStorage.getTicket(ticketId);

      if (!ticket) {
        return NextResponse.json(
          { success: false, error: 'Ticket nicht gefunden' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        ticket,
      });
    } else if (customerEmail) {
      // Tickets für Customer E-Mail laden
      const tickets = await AWSTicketStorage.getTickets({ customerEmail });

      return NextResponse.json({
        success: true,
        tickets: tickets || [],
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Parameter fehlt: customerEmail oder id erforderlich' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Fehler beim Laden der Company Tickets:', error);
    return NextResponse.json({ success: false, error: 'Interner Server-Fehler' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, priority, category, customerEmail, customerName } = body;

    // Validation
    if (!title || !description || !customerEmail) {
      return NextResponse.json(
        { success: false, error: 'Titel, Beschreibung und Kunden-E-Mail sind erforderlich' },
        { status: 400 }
      );
    }

    const ticket = await AWSTicketStorage.createTicket({
      title,
      description,
      priority: priority || 'medium',
      category: category || 'support',
      customerEmail,
      customerName: customerName || 'Kunde',
      status: 'open',
      tags: [],
      comments: [],
    });

    // Test-Notification erstellen um zu sehen, ob das System funktioniert
    try {
      // Extrahiere UID aus dem Request (falls verfügbar) oder verwende E-Mail-Mapping
      const uidToEmailMap: Record<string, string> = {
        '0Rj5vGkBjeXrzZKBr4cFfV0jRuw1': 'a.staudinger32@icloud.com',
      };

      const customerUid = Object.keys(uidToEmailMap).find(
        uid => uidToEmailMap[uid] === customerEmail
      );

      if (customerUid) {
        // Erstelle eine "Ticket erstellt" Notification für den User
        await TicketNotificationService.createTicketReplyNotification(
          customerUid,
          ticket.id,
          `Ticket "${title}" erstellt`,
          'System'
        );
        console.log(`Test-Notification erstellt für User ${customerUid} - neues Ticket`);
      }
    } catch (notificationError) {
      console.error('Fehler beim Erstellen der Test-Notification:', notificationError);
      // Nicht weiterleiten, da Ticket-Erstellung erfolgreich war
    }

    return NextResponse.json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Company Tickets:', error);
    return NextResponse.json(
      { success: false, error: 'Fehler beim Erstellen des Tickets' },
      { status: 500 }
    );
  }
}
