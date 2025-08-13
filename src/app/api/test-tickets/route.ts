// Test API für AWS Ticket System
import { NextRequest, NextResponse } from 'next/server';
import { AWSTicketStorage } from '@/lib/aws-ticket-storage';

export async function POST(request: NextRequest) {
  try {
    console.log('🎯 Test-Tickets API aufgerufen...');

    const testTickets = [
      {
        title: 'Website Performance Issue',
        description:
          'The website is running slowly during peak hours. Users are experiencing long load times and timeouts.',
        customerEmail: 'admin@taskilo.de',
        customerName: 'Admin User',
        priority: 'high' as const,
        category: 'technical' as const,
        status: 'open' as const,
        tags: ['performance', 'urgent'],
        comments: [],
      },
      {
        title: 'Payment Gateway Error',
        description:
          'Users are unable to complete payments. Stripe webhook is returning 500 errors.',
        customerEmail: 'support@taskilo.de',
        customerName: 'Support Team',
        priority: 'urgent' as const,
        category: 'billing' as const,
        status: 'open' as const,
        tags: ['payment', 'critical'],
        comments: [],
      },
      {
        title: 'Feature Request: Dark Mode',
        description:
          'Multiple users have requested a dark mode option for the dashboard interface.',
        customerEmail: 'feature@taskilo.de',
        customerName: 'Product Team',
        priority: 'low' as const,
        category: 'feature' as const,
        status: 'open' as const,
        tags: ['ui', 'enhancement'],
        comments: [],
      },
    ];

    const createdTickets = [];

    for (const ticketData of testTickets) {
      console.log(`📝 Erstelle Ticket: ${ticketData.title}`);

      try {
        const ticket = await AWSTicketStorage.createTicket(ticketData);
        createdTickets.push(ticket);
        console.log(`✅ Ticket erstellt: ${ticket.id}`);
      } catch (error) {
        console.error(`❌ Fehler bei Ticket "${ticketData.title}":`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${createdTickets.length} Test-Tickets erstellt`,
      tickets: createdTickets,
    });
  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Test-Tickets:', error);
    return NextResponse.json(
      {
        error: 'Fehler beim Erstellen der Test-Tickets',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    console.log('📊 Teste AWS Analytics...');

    // Test Analytics abrufen
    const tickets = await AWSTicketStorage.getTickets({ limit: 100 });
    console.log(`📈 Gefundene Tickets: ${tickets.length}`);

    return NextResponse.json({
      success: true,
      totalTickets: tickets.length,
      tickets: tickets.slice(0, 5), // Nur die ersten 5 für Preview
      message: 'AWS Ticket System funktioniert!',
    });
  } catch (error) {
    console.error('❌ Fehler beim Testen:', error);
    return NextResponse.json(
      {
        error: 'Fehler beim Testen der AWS-Verbindung',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
