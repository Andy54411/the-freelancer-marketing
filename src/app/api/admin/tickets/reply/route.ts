// Ticket Reply API - Speziell für Antworten auf Support-Tickets
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { AWSTicketStorage } from '@/lib/aws-ticket-storage';
import { EnhancedTicketService } from '@/lib/aws-ticket-enhanced';
import { db } from '@/firebase/server';

// JWT Secret für Admin-Tokens
const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || 'taskilo-admin-secret-key-2024'
);

// Authentifizierung prüfen (Admin oder User)
async function verifyAuth(request: NextRequest) {
  const cookieHeader = request.headers.get('cookie');
  const authHeader = request.headers.get('authorization');

  // Prüfe Admin-Cookie
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce(
      (acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      },
      {} as Record<string, string>
    );

    const adminToken = cookies['taskilo-admin-token'];
    if (adminToken) {
      try {
        const { payload } = await jwtVerify(adminToken, JWT_SECRET);
        const decoded = payload as any;
        if (decoded.role === 'admin') {
          return {
            success: true,
            userType: 'admin',
            userId: decoded.email,
            userName: decoded.name || 'Admin',
          };
        }
      } catch (error) {
        // Admin-Token ungültig, versuche User-Auth
      }
    }
  }

  // Prüfe Bearer Token (für API-Aufrufe)
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const decoded = payload as any;
      return {
        success: true,
        userType: decoded.role || 'user',
        userId: decoded.email || decoded.userId,
        userName: decoded.name || decoded.firstName || 'User',
      };
    } catch (error) {
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
    const authorType = authResult.userType === 'admin' ? 'admin' : 'customer';
    const isInternalReply = isInternal && authResult.userType === 'admin'; // Nur Admins können interne Antworten schreiben

    // Antwort hinzufügen
    const updatedTicket = await AWSTicketStorage.addComment(ticketId, {
      author: authResult.userName,
      authorType,
      content: message.trim(),
      isInternal: isInternalReply,
    });

    if (!updatedTicket) {
      return NextResponse.json({ error: 'Ticket nicht gefunden' }, { status: 404 });
    }

    // Automatische Ticket-Status-Aktualisierung bei Admin-Antworten
    if (authResult.userType === 'admin' && updatedTicket.status === 'open') {
      await AWSTicketStorage.updateTicket(ticketId, {
        status: 'in-progress',
        assignedTo: authResult.userId,
      });
    }

    // E-Mail-Benachrichtigung senden (wenn nicht intern)
    if (!isInternalReply) {
      try {
        // Konvertiere TicketData zu Ticket-Format für E-Mail-Benachrichtigung
        const ticketForEmail = {
          ...updatedTicket,
          reportedBy: updatedTicket.customerEmail || 'Unbekannt',
          comments: updatedTicket.comments || [],
          createdAt: new Date(updatedTicket.createdAt),
          updatedAt: new Date(updatedTicket.updatedAt),
        } as any; // Type assertion da verschiedene TicketComment-Typen existieren

        if (authResult.userType === 'admin') {
          // Admin antwortet -> Benachrichtige Customer
          await EnhancedTicketService.sendTicketNotification(
            ticketForEmail,
            'commented',
            {
              id: `reply_${Date.now()}`,
              ticketId: ticketId,
              userId: authResult.userId,
              userDisplayName: authResult.userName,
              userRole: 'admin',
              content: message.trim(),
              createdAt: new Date(),
              isInternal: false,
            },
            [updatedTicket.customerEmail || '']
          );
        } else {
          // Customer antwortet -> Benachrichtige Admin
          await EnhancedTicketService.sendTicketNotification(
            ticketForEmail,
            'commented',
            {
              id: `reply_${Date.now()}`,
              ticketId: ticketId,
              userId: authResult.userId,
              userDisplayName: authResult.userName,
              userRole: 'company',
              content: message.trim(),
              createdAt: new Date(),
              isInternal: false,
            },
            [process.env.ADMIN_EMAIL || 'admin@taskilo.de']
          );
        }
      } catch (emailError) {

        // Fehler bei E-Mail nicht weiterleiten, da die Antwort erfolgreich gespeichert wurde
      }

      // Firebase Bell-Notification erstellen (nur für Admin -> Customer)
      if (authResult.userType === 'admin' && updatedTicket.customerEmail) {
        try {
          // Extrahiere UID aus customerEmail (falls verfügbar)
          const uidToEmailMap: Record<string, string> = {
            '0Rj5vGkBjeXrzZKBr4cFfV0jRuw1': 'a.staudinger32@icloud.com',
          };

          // Finde UID für diese E-Mail
          const customerUid = Object.keys(uidToEmailMap).find(
            uid => uidToEmailMap[uid] === updatedTicket.customerEmail
          );

          if (customerUid) {
            // Erstelle Notification mit Admin SDK
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

          } else {

          }
        } catch (notificationError) {

          // Nicht weiterleiten, da dies optional ist
        }
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
    const ticket = await AWSTicketStorage.getTicket(ticketId);

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket nicht gefunden' }, { status: 404 });
    }

    // Prüfe Berechtigung: Admin sieht alles, User nur eigene Tickets
    if (authResult.userType !== 'admin' && ticket.customerEmail !== authResult.userId) {
      return NextResponse.json({ error: 'Keine Berechtigung für dieses Ticket' }, { status: 403 });
    }

    // Filter interne Kommentare für normale User
    const visibleComments =
      authResult.userType === 'admin'
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
