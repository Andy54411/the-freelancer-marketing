/**
 * Admin Tickets API Route
 * 
 * Firebase-basierte Ticket-Verwaltung
 */

import { NextRequest, NextResponse } from 'next/server';
import { FirebaseTicketService } from '@/services/admin/FirebaseTicketService';
import { AdminAuthService } from '@/services/admin/AdminAuthService';
import { cookies } from 'next/headers';

// Admin-Authentifizierung prüfen
async function verifyAdminAuth(): Promise<{ valid: boolean; error?: string }> {
  // Bypass für Development
  if (process.env.NODE_ENV === 'development' && process.env.BYPASS_ADMIN_AUTH === 'true') {
    return { valid: true };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get('taskilo-admin-token')?.value;

  if (!token) {
    return { valid: false, error: 'Nicht autorisiert' };
  }

  return AdminAuthService.verifyToken(token);
}

// GET - Alle Tickets abrufen
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('id');

    // Einzelnes Ticket abrufen
    if (ticketId) {
      const ticket = await FirebaseTicketService.getTicket(ticketId);

      if (!ticket) {
        return NextResponse.json(
          { error: 'Ticket nicht gefunden' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        ticket,
      });
    }

    // Alle Tickets mit Filtern abrufen
    const status = searchParams.get('status') || undefined;
    const priority = searchParams.get('priority') || undefined;
    const category = searchParams.get('category') || undefined;
    const assignedTo = searchParams.get('assignedTo') || undefined;
    const customerEmail = searchParams.get('customerEmail') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');

    const tickets = await FirebaseTicketService.getTickets({
      status,
      priority,
      category,
      assignedTo,
      customerEmail,
      limit,
    });

    return NextResponse.json({
      success: true,
      tickets,
      total: tickets.length,
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
    const authResult = await verifyAdminAuth();
    if (!authResult.valid) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const {
      title,
      description,
      priority,
      category,
      customerEmail,
      customerName,
      assignedTo,
      tags,
    } = await request.json();

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Titel und Beschreibung sind erforderlich' },
        { status: 400 }
      );
    }

    const ticket = await FirebaseTicketService.createTicket({
      title,
      description,
      priority: priority || 'medium',
      category: category || 'other',
      assignedTo: assignedTo || undefined,
      customerEmail: customerEmail || undefined,
      customerName: customerName || undefined,
      tags: tags || [],
      status: 'open',
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

// PUT - Ticket aktualisieren
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth();
    if (!authResult.valid) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id, ...updates } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Ticket-ID ist erforderlich' }, { status: 400 });
    }

    const updatedTicket = await FirebaseTicketService.updateTicket(id, updates);

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
      message: 'Ticket erfolgreich aktualisiert',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren des Tickets', details: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE - Ticket löschen (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth();
    if (!authResult.valid) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Ticket-ID ist erforderlich' }, { status: 400 });
    }

    await FirebaseTicketService.deleteTicket(id);

    return NextResponse.json({
      success: true,
      message: 'Ticket erfolgreich geschlossen',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json(
      { error: 'Fehler beim Löschen des Tickets', details: errorMessage },
      { status: 500 }
    );
  }
}
