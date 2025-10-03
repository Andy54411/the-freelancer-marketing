// API zum Erstellen von Notifications für bestehende ungelesene Tickets
import { NextRequest, NextResponse } from 'next/server';
import { AWSTicketStorage } from '@/lib/aws-ticket-storage';
import { TicketNotificationService } from '@/lib/ticket-notifications';

export async function POST(request: NextRequest) {
  try {
    const { userUid } = await request.json();

    if (!userUid) {
      return NextResponse.json({ success: false, error: 'userUid erforderlich' }, { status: 400 });
    }

    // UID zu E-Mail Mapping
    const uidToEmailMap: Record<string, string> = {
      '0Rj5vGkBjeXrzZKBr4cFfV0jRuw1': 'a.staudinger32@icloud.com',
    };

    const customerEmail = uidToEmailMap[userUid];

    if (!customerEmail) {
      return NextResponse.json(
        { success: false, error: 'Keine E-Mail für UID gefunden' },
        { status: 404 }
      );
    }

    // Lade alle Tickets für diesen User
    const tickets = await AWSTicketStorage.getTickets({ customerEmail });

    let notificationsCreated = 0;

    for (const ticket of tickets) {
      // Prüfe ob es ungelesene Admin-Antworten gibt
      const adminReplies =
        ticket.comments?.filter(comment => comment.authorType === 'admin' && !comment.isInternal) ||
        [];

      if (adminReplies.length > 0) {
        try {
          // Erstelle Notification für das Ticket mit Admin-Antworten
          const lastAdminReply = adminReplies[adminReplies.length - 1];
          await TicketNotificationService.createTicketReplyNotification(
            userUid,
            ticket.id,
            ticket.title,
            lastAdminReply.author || 'Support Team'
          );
          notificationsCreated++;
        } catch (error) {}
      }
    }

    return NextResponse.json({
      success: true,
      message: `${notificationsCreated} Notifications erstellt`,
      ticketsChecked: tickets.length,
      notificationsCreated,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
