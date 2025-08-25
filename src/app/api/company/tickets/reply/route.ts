import { NextRequest, NextResponse } from 'next/server';
import { AWSTicketStorage } from '@/lib/aws-ticket-storage';

// Company Ticket Replies API
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');

    if (!ticketId) {
      return NextResponse.json(
        { success: false, error: 'Ticket-ID erforderlich' },
        { status: 400 }
      );
    }

    const ticket = await AWSTicketStorage.getTicket(ticketId);

    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Ticket nicht gefunden' }, { status: 404 });
    }

    // Filter non-internal comments (visible to customers)
    const replies = ticket.comments.filter(comment => !comment.isInternal);

    return NextResponse.json({
      success: true,
      replies,
    });
  } catch (error) {

    return NextResponse.json(
      { success: false, error: 'Fehler beim Laden der Antworten' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticketId, message, senderName, senderEmail } = body;

    if (!ticketId || !message) {
      return NextResponse.json(
        { success: false, error: 'Ticket-ID und Nachricht sind erforderlich' },
        { status: 400 }
      );
    }

    const updatedTicket = await AWSTicketStorage.addComment(ticketId, {
      author: senderName || 'Kunde',
      authorType: 'customer',
      content: message,
      isInternal: false,
    });

    return NextResponse.json({
      success: true,
      reply: updatedTicket.comments[updatedTicket.comments.length - 1],
    });
  } catch (error) {

    return NextResponse.json(
      { success: false, error: 'Fehler beim Senden der Antwort' },
      { status: 500 }
    );
  }
}
