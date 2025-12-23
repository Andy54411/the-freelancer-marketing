// Firebase-basierte Ticket Comments API
import { NextRequest, NextResponse } from 'next/server';
import { FirebaseTicketService } from '@/services/admin/FirebaseTicketService';
import { AdminAuthService } from '@/services/admin/AdminAuthService';

// Admin-Authentifizierung prüfen
async function verifyAdminAuth(request: NextRequest) {
  const admin = await AdminAuthService.verifyFromRequest(request);
  if (!admin) {
    throw new Error('Nicht autorisiert');
  }
  return admin;
}

// POST - Kommentar zu Ticket hinzufügen
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdminAuth(request);

    const { ticketId, content, author, authorType, isInternal } = await request.json();

    if (!ticketId || !content) {
      return NextResponse.json(
        { error: 'Ticket-ID und Inhalt sind erforderlich' },
        { status: 400 }
      );
    }

    // Add comment using Firebase storage
    const updatedTicket = await FirebaseTicketService.addComment(ticketId, {
      author: author || admin.name,
      authorType: authorType || 'admin',
      content,
      isInternal: isInternal || false,
    });

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
      message: 'Kommentar erfolgreich hinzugefügt',
      source: 'firebase',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      {
        error: 'Fehler beim Hinzufügen des Kommentars',
        details: errorMessage,
        source: 'firebase',
      },
      { status: 500 }
    );
  }
}

// GET - Kommentare für ein Ticket abrufen
export async function GET(request: NextRequest) {
  try {
    await verifyAdminAuth(request);

    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket-ID ist erforderlich' }, { status: 400 });
    }

    // Get ticket with comments from Firebase
    const ticket = await FirebaseTicketService.getTicket(ticketId);

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      comments: ticket.comments,
      ticketId,
      source: 'firebase',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      {
        error: 'Fehler beim Laden der Kommentare',
        details: errorMessage,
        source: 'firebase',
      },
      { status: 500 }
    );
  }
}
