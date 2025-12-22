import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * API Route zum Erstellen von Support-Tickets aus dem Chatbot
 * POST /api/support/create-ticket
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      customerEmail,
      customerName,
      title,
      description,
      category = 'support',
      priority = 'medium',
      source = 'chatbot',
    } = body;

    // Validierung
    if (!customerEmail) {
      return NextResponse.json(
        { success: false, error: 'E-Mail-Adresse ist erforderlich' },
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
    const ticketId = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const now = new Date().toISOString();

    // Ticket-Daten
    const ticketData = {
      id: ticketId,
      title: title || 'Support-Anfrage via Chat',
      description: description || 'Keine Beschreibung',
      status: 'open',
      priority: priority,
      category: category,
      customerEmail: customerEmail,
      customerName: customerName || 'Unbekannt',
      source: source,
      createdAt: now,
      updatedAt: now,
      tags: ['chatbot', 'auto-created'],
      comments: [
        {
          id: `comment_${Date.now()}`,
          author: 'System',
          authorType: 'system',
          content: `Ticket automatisch erstellt via ${source}. Kunde: ${customerName || 'Unbekannt'} (${customerEmail})`,
          timestamp: now,
          isInternal: true,
        },
      ],
      // SLA Tracking
      slaTarget: 24, // 24 Stunden Response-Zeit
      escalated: false,
    };

    // In Firestore speichern
    await db.collection('adminTickets').doc(ticketId).set({
      ...ticketData,
      createdAtTimestamp: FieldValue.serverTimestamp(),
      updatedAtTimestamp: FieldValue.serverTimestamp(),
    });

    // Benachrichtigung für Admin erstellen
    await db.collection('notifications').add({
      type: 'new_support_ticket',
      title: 'Neues Support-Ticket',
      message: `Neues Ticket von ${customerName || customerEmail}: ${title}`,
      ticketId: ticketId,
      customerEmail: customerEmail,
      createdAt: FieldValue.serverTimestamp(),
      read: false,
      recipientType: 'admin',
    });

    console.log(`[Support Ticket] Created ticket ${ticketId} for ${customerEmail}`);

    return NextResponse.json({
      success: true,
      ticketId: ticketId,
      message: 'Support-Ticket erfolgreich erstellt',
    });

  } catch (error) {
    console.error('[Support Ticket] Error creating ticket:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Ticket konnte nicht erstellt werden',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Ticket-Status abfragen
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');
    const email = searchParams.get('email');

    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Datenbank nicht verfügbar' },
        { status: 500 }
      );
    }

    // Ticket per ID abrufen
    if (ticketId) {
      const ticketDoc = await db.collection('adminTickets').doc(ticketId).get();
      
      if (!ticketDoc.exists) {
        return NextResponse.json(
          { success: false, error: 'Ticket nicht gefunden' },
          { status: 404 }
        );
      }

      const ticket = ticketDoc.data();
      
      // Nur nicht-interne Kommentare zurückgeben
      const publicComments = (ticket?.comments || []).filter(
        (c: { isInternal?: boolean }) => !c.isInternal
      );

      return NextResponse.json({
        success: true,
        ticket: {
          id: ticket?.id,
          title: ticket?.title,
          status: ticket?.status,
          priority: ticket?.priority,
          createdAt: ticket?.createdAt,
          updatedAt: ticket?.updatedAt,
          comments: publicComments,
        },
      });
    }

    // Tickets per E-Mail abrufen
    if (email) {
      const ticketsSnapshot = await db
        .collection('adminTickets')
        .where('customerEmail', '==', email)
        .get();

      const tickets = ticketsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: data.id,
          title: data.title,
          status: data.status,
          priority: data.priority,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      });

      return NextResponse.json({
        success: true,
        tickets: tickets,
        count: tickets.length,
      });
    }

    return NextResponse.json(
      { success: false, error: 'ticketId oder email Parameter erforderlich' },
      { status: 400 }
    );

  } catch (error) {
    console.error('[Support Ticket] Error fetching ticket:', error);
    
    return NextResponse.json(
      { success: false, error: 'Fehler beim Abrufen des Tickets' },
      { status: 500 }
    );
  }
}
