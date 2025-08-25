import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import type { Ticket } from '@/types/ticket';

// Webhook für eingehende E-Mails von Resend
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('resend-signature');

    // TODO: Webhook-Signatur validieren (für Produktionsumgebung)

    const webhookData = JSON.parse(body);

    // E-Mail-Typ bestimmen
    if (webhookData.type === 'email.received') {
      return await handleIncomingEmail(webhookData.data);
    }

    return NextResponse.json({ message: 'Webhook verarbeitet' });

  } catch (error) {

    return NextResponse.json(
      { error: 'Webhook-Verarbeitung fehlgeschlagen' },
      { status: 500 }
    );
  }
}

async function handleIncomingEmail(emailData: any) {
  try {
    const { from, to, subject, text, html } = emailData;

    // Prüfen ob es eine Antwort auf ein bestehendes Ticket ist
    const ticketIdMatch = subject.match(/#(ticket-\w+)/);

    if (ticketIdMatch) {
      // Antwort auf bestehendes Ticket
      const ticketId = ticketIdMatch[1];
      return await addCommentToTicket(ticketId, from, text || html);
    } else {
      // Neues Ticket aus E-Mail erstellen
      return await createTicketFromEmail(from, subject, text || html);
    }

  } catch (error) {

    return NextResponse.json(
      { error: 'E-Mail-Verarbeitung fehlgeschlagen' },
      { status: 500 }
    );
  }
}

async function addCommentToTicket(ticketId: string, from: string, content: string) {
  try {
    // TODO: Hier würde die Datenbank-Integration stehen
    // Für jetzt nur Logging

    // Ticket aus Datenbank laden (Mock)
    const ticket: Ticket = {
      id: ticketId,
      title: 'Beispiel Ticket',
      description: 'Ticket Beschreibung',
      status: 'open',
      priority: 'medium',
      category: 'support',
      reportedBy: from,
      assignedTo: 'andy.staudinger@taskilo.de',
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
      comments: []
    };

    // Neuen Kommentar hinzufügen
    const newComment = {
      id: `comment-${Date.now()}`,
      ticketId: ticketId,
      userId: 'user-external',
      userDisplayName: from,
      userRole: 'user' as const,
      content: content,
      createdAt: new Date(),
      isInternal: false
    };

    // TODO: Kommentar in Datenbank speichern

    // E-Mail-Benachrichtigung an Team senden
    // await TicketEmailService.sendTicketCommentEmail(ticket, newComment);

    return NextResponse.json({
      message: 'Kommentar hinzugefügt',
      ticketId,
      commentId: newComment.id
    });

  } catch (error) {

    throw error;
  }
}

async function createTicketFromEmail(from: string, subject: string, content: string) {
  try {

    // Kategorie basierend auf Subject bestimmen
    const category = determineCategory(subject, content);

    // Priorität basierend auf Keywords bestimmen
    const priority = determinePriority(subject, content);

    const newTicket: Ticket = {
      id: `ticket-email-${Date.now()}`,
      title: subject.replace(/^(Re:|RE:|Fwd:|FWD:)/i, '').trim(),
      description: `E-Mail von: ${from}\n\n${content}`,
      status: 'open',
      priority: priority,
      category: category,
      reportedBy: from,
      assignedTo: 'andy.staudinger@taskilo.de',
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['email-created'],
      comments: []
    };

    // TODO: Ticket in Datenbank speichern

    // E-Mail-Bestätigung an Absender senden
    await sendTicketConfirmationEmail(from, newTicket);

    return NextResponse.json({
      message: 'Ticket aus E-Mail erstellt',
      ticketId: newTicket.id
    });

  } catch (error) {

    throw error;
  }
}

function determineCategory(subject: string, content: string): Ticket['category'] {
  const text = `${subject} ${content}`.toLowerCase();

  if (text.includes('bug') || text.includes('fehler') || text.includes('problem')) {
    return 'bug';
  }
  if (text.includes('rechnung') || text.includes('zahlung') || text.includes('payment')) {
    return 'billing';
  }
  if (text.includes('feature') || text.includes('wunsch') || text.includes('verbesserung')) {
    return 'feature';
  }
  if (text.includes('account') || text.includes('konto') || text.includes('login')) {
    return 'account';
  }

  return 'support'; // Standard
}

function determinePriority(subject: string, content: string): Ticket['priority'] {
  const text = `${subject} ${content}`.toLowerCase();

  if (text.includes('urgent') || text.includes('dringend') || text.includes('sofort')) {
    return 'urgent';
  }
  if (text.includes('wichtig') || text.includes('high') || text.includes('hoch')) {
    return 'high';
  }
  if (text.includes('niedrig') || text.includes('low')) {
    return 'low';
  }

  return 'medium'; // Standard
}

async function sendTicketConfirmationEmail(to: string, ticket: Ticket) {
  try {
    // E-Mail-Bestätigung über die Ticket-E-Mail-API senden
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/tickets/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'created',
        ticket
      })
    });

    if (response.ok) {

    } else {

    }
  } catch (error) {

  }
}
