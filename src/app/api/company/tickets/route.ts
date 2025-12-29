/**
 * Company Tickets API Route
 * 
 * Firebase-basierte Ticket-Verwaltung für Kunden
 */

import { NextRequest, NextResponse } from 'next/server';
import { FirebaseTicketService } from '@/services/admin/FirebaseTicketService';

// GET - Tickets für Kunde abrufen
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');
    // Akzeptiere sowohl 'email' als auch 'customerEmail' als Parameter
    const customerEmail = searchParams.get('customerEmail') || searchParams.get('email');

    // Einzelnes Ticket abrufen
    if (ticketId) {
      const ticket = await FirebaseTicketService.getTicket(ticketId);

      if (!ticket) {
        return NextResponse.json({ error: 'Ticket nicht gefunden' }, { status: 404 });
      }

      // Nur öffentliche Kommentare zurückgeben
      const publicComments = ticket.comments.filter(c => !c.isInternal);

      return NextResponse.json({
        success: true,
        ticket: { ...ticket, comments: publicComments },
      });
    }

    // Alle Tickets für Kunde abrufen
    if (!customerEmail) {
      return NextResponse.json(
        { error: 'E-Mail-Adresse ist erforderlich' },
        { status: 400 }
      );
    }

    const tickets = await FirebaseTicketService.getTicketsByCustomer(customerEmail);

    // Nur oeffentliche Kommentare zurueckgeben
    const publicTickets = tickets.map(ticket => ({
      ...ticket,
      comments: ticket.comments.filter(c => !c.isInternal),
    }));

    return NextResponse.json({
      success: true,
      tickets: publicTickets,
      total: publicTickets.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { error: 'Fehler beim Laden der Tickets', details: errorMessage },
      { status: 500 }
    );
  }
}

// POST - Neues Ticket erstellen
export async function POST(request: NextRequest) {
  try {
    const { title, description, category, customerEmail, customerName } = await request.json();

    if (!title || !description || !customerEmail) {
      return NextResponse.json(
        { error: 'Titel, Beschreibung und E-Mail sind erforderlich' },
        { status: 400 }
      );
    }

    const ticket = await FirebaseTicketService.createTicket({
      title,
      description,
      category: category || 'support',
      priority: 'medium',
      status: 'open',
      customerEmail,
      customerName: customerName || 'Kunde',
      tags: [],
      comments: [],
    });

    return NextResponse.json({
      success: true,
      ticket,
      message: 'Ticket erfolgreich erstellt',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Tickets', details: errorMessage },
      { status: 500 }
    );
  }
}
