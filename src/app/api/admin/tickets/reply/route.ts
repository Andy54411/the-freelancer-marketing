// Firebase-basierte Ticket Reply API
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { FirebaseTicketService } from '@/services/admin/FirebaseTicketService';
import { AdminAuthService } from '@/services/admin/AdminAuthService';
import { db } from '@/firebase/server';

// JWT Secret für Admin-Tokens
const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || 'taskilo-admin-secret-key-2024'
);

// Authentifizierung prüfen (Admin oder User)
async function verifyAuth(request: NextRequest) {
  // Prüfe Admin-Auth zuerst
  const admin = await AdminAuthService.verifyFromRequest(request);
  if (admin) {
    return {
      success: true,
      user_type: 'admin',
      userId: admin.email,
      userName: admin.name,
    };
  }

  // Prüfe Bearer Token (für API-Aufrufe)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const decoded = payload as Record<string, unknown>;
      return {
        success: true,
        user_type: (decoded.role as string) || 'user',
        userId: (decoded.email as string) || (decoded.userId as string),
        userName: (decoded.name as string) || (decoded.firstName as string) || 'User',
      };
    } catch {
      // Bearer-Token ungültig
    }
  }

  return { success: false, error: 'Nicht autorisiert' };
}

// POST - Antwort auf Ticket senden
export async function POST(request: NextRequest) {
  try {
    // Authentifizierung prüfen
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { ticketId, message, isInternal } = await request.json();

    if (!ticketId || !message?.trim()) {
      return NextResponse.json(
        { error: 'Ticket-ID und Nachricht sind erforderlich' },
        { status: 400 }
      );
    }

    // Bestimme Autor-Typ basierend auf Authentifizierung
    const authorType = authResult.user_type === 'admin' ? 'admin' : 'customer';
    const isInternalReply = isInternal && authResult.user_type === 'admin';

    // Antwort hinzufügen
    const updatedTicket = await FirebaseTicketService.addComment(ticketId, {
      author: authResult.userName || 'Unbekannt',
      authorType,
      content: message.trim(),
      isInternal: isInternalReply,
    });

    if (!updatedTicket) {
      return NextResponse.json({ error: 'Ticket nicht gefunden' }, { status: 404 });
    }

    // Automatische Ticket-Status-Aktualisierung bei Admin-Antworten
    if (authResult.user_type === 'admin' && updatedTicket.status === 'open') {
      await FirebaseTicketService.updateTicket(ticketId, {
        status: 'in-progress',
        assignedTo: authResult.userId,
      });
    }

    // Firebase Bell-Notification erstellen (nur für Admin -> Customer)
    if (!isInternalReply && authResult.user_type === 'admin' && updatedTicket.customerEmail && db) {
      try {
        // Finde User mit dieser E-Mail
        const usersSnapshot = await db
          .collection('users')
          .where('email', '==', updatedTicket.customerEmail)
          .limit(1)
          .get();

        if (!usersSnapshot.empty) {
          const customerUid = usersSnapshot.docs[0].id;

          const notification = {
            userId: customerUid,
            type: 'support',
            title: 'Neue Antwort auf Ihr Support-Ticket',
            message: `${authResult.userName} hat auf Ihr Ticket "${updatedTicket.title}" geantwortet`,
            ticketId: ticketId,
            ticketTitle: updatedTicket.title,
            link: `/dashboard/company/${customerUid}/support`,
            isRead: false,
            createdAt: new Date(),
          };

          await db.collection('notifications').add(notification);
        }
      } catch {
        // Nicht weiterleiten, da dies optional ist
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Antwort erfolgreich gesendet',
      ticket: {
        id: updatedTicket.id,
        status: updatedTicket.status,
        commentCount: updatedTicket.comments?.length || 0,
        lastReply: new Date().toISOString(),
      },
      source: 'firebase',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Fehler beim Senden der Antwort',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}

// GET - Antworten für ein Ticket abrufen
export async function GET(request: NextRequest) {
  try {
    // Authentifizierung prüfen
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket-ID ist erforderlich' }, { status: 400 });
    }

    // Ticket mit Kommentaren abrufen
    const ticket = await FirebaseTicketService.getTicket(ticketId);

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket nicht gefunden' }, { status: 404 });
    }

    // Prüfe Berechtigung: Admin sieht alles, User nur eigene Tickets
    if (authResult.user_type !== 'admin' && ticket.customerEmail !== authResult.userId) {
      return NextResponse.json({ error: 'Keine Berechtigung für dieses Ticket' }, { status: 403 });
    }

    // Filter interne Kommentare für normale User
    const visibleComments =
      authResult.user_type === 'admin'
        ? ticket.comments || []
        : (ticket.comments || []).filter(comment => !comment.isInternal);

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        title: ticket.title,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      },
      replies: visibleComments.map(comment => ({
        id: comment.id,
        author: comment.author,
        authorType: comment.authorType,
        content: comment.content,
        timestamp: comment.timestamp,
        isInternal: comment.isInternal,
      })),
      source: 'firebase',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Fehler beim Laden der Antworten',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}
