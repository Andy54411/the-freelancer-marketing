/**
 * Company Ticket Reply API Route
 * 
 * Firebase-basierte Ticket-Antworten fuer Kunden
 */

import { NextRequest, NextResponse } from 'next/server';
import { FirebaseTicketService } from '@/services/admin/FirebaseTicketService';

export async function POST(request: NextRequest) {
  try {
    const { ticketId, content, authorName, authorEmail } = await request.json();

    if (!ticketId || !content) {
      return NextResponse.json(
        { error: 'Ticket-ID und Nachricht sind erforderlich' },
        { status: 400 }
      );
    }

    // Ticket abrufen und pruefen
    const ticket = await FirebaseTicketService.getTicket(ticketId);

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket nicht gefunden' }, { status: 404 });
    }

    // Pruefen ob Kunde berechtigt ist
    if (authorEmail && ticket.customerEmail !== authorEmail) {
      return NextResponse.json(
        { error: 'Nicht berechtigt, auf dieses Ticket zu antworten' },
        { status: 403 }
      );
    }

    // Kommentar hinzufuegen
    const updatedTicket = await FirebaseTicketService.addComment(ticketId, {
      author: authorName || 'Kunde',
      authorType: 'customer',
      content,
      isInternal: false,
    });

    // Ticket wieder auf "open" setzen wenn es resolved war
    if (ticket.status === 'resolved' || ticket.status === 'closed') {
      await FirebaseTicketService.updateTicket(ticketId, { status: 'open' });
    }

    // Nur oeffentliche Kommentare zurueckgeben
    const publicComments = updatedTicket.comments.filter(c => !c.isInternal);

    return NextResponse.json({
      success: true,
      ticket: { ...updatedTicket, comments: publicComments },
      message: 'Antwort erfolgreich hinzugefuegt',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { error: 'Fehler beim Hinzufuegen der Antwort', details: errorMessage },
      { status: 500 }
    );
  }
}
