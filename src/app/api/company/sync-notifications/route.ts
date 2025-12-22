/**
 * Company Sync Notifications API Route
 * 
 * Firebase-basierte Benachrichtigungen fuer Kunden
 */

import { NextRequest, NextResponse } from 'next/server';
import { FirebaseTicketService } from '@/services/admin/FirebaseTicketService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerEmail = searchParams.get('email');

    if (!customerEmail) {
      return NextResponse.json(
        { error: 'E-Mail-Adresse ist erforderlich' },
        { status: 400 }
      );
    }

    // Offene Tickets fuer Kunde abrufen
    const tickets = await FirebaseTicketService.getTicketsByCustomer(customerEmail);
    
    // Nur offene/in-progress Tickets
    const activeTickets = tickets.filter(t => 
      t.status === 'open' || t.status === 'in-progress'
    );

    // Ungelesene Antworten zaehlen
    const unreadCount = activeTickets.reduce((count, ticket) => {
      // Zaehle Kommentare die nach dem letzten Kunden-Kommentar kamen
      const customerComments = ticket.comments.filter(c => c.authorType === 'customer');
      const lastCustomerComment = customerComments[customerComments.length - 1];
      
      if (!lastCustomerComment) return count;
      
      const newAdminReplies = ticket.comments.filter(c => 
        c.authorType === 'admin' && 
        !c.isInternal && 
        new Date(c.timestamp) > new Date(lastCustomerComment.timestamp)
      );
      
      return count + newAdminReplies.length;
    }, 0);

    return NextResponse.json({
      success: true,
      notifications: {
        activeTickets: activeTickets.length,
        unreadReplies: unreadCount,
        tickets: activeTickets.map(t => ({
          id: t.id,
          title: t.title,
          status: t.status,
          lastUpdate: t.updatedAt,
        })),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { error: 'Fehler beim Laden der Benachrichtigungen', details: errorMessage },
      { status: 500 }
    );
  }
}
