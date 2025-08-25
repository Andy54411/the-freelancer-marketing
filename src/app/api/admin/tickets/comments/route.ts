// Pure AWS Ticket Comments API - NO Firebase Dependencies
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { AWSTicketStorage } from '@/lib/aws-ticket-storage';
import { EnhancedTicketService } from '@/lib/aws-ticket-enhanced';

// JWT Secret für Admin-Tokens
const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || 'taskilo-admin-secret-key-2024'
);

// Admin-Authentifizierung prüfen
async function verifyAdminAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('taskilo-admin-token')?.value;

  if (!token) {
    throw new Error('Nicht autorisiert');
  }

  try {
    await jwtVerify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Ungültiger Token');
  }
}

// POST - Kommentar zu Ticket hinzufügen
export async function POST(request: NextRequest) {
  try {
    await verifyAdminAuth();

    const { ticketId, content, author, authorType, isInternal } = await request.json();

    if (!ticketId || !content || !author) {
      return NextResponse.json(
        { error: 'Ticket-ID, Inhalt und Autor sind erforderlich' },
        { status: 400 }
      );
    }

    // Add comment using AWS DynamoDB storage
    const updatedTicket = await AWSTicketStorage.addComment(ticketId, {
      author,
      authorType: authorType || 'admin',
      content,
      isInternal: isInternal || false,
    });

    // Log to CloudWatch
    await EnhancedTicketService.logToCloudWatch(
      'ticket-comments',
      {
        action: 'comment_added',
        ticketId,
        author,
        authorType: authorType || 'admin',
        isInternal: isInternal || false,
        contentLength: content.length,
      },
      'INFO'
    );

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
      message: 'Kommentar erfolgreich hinzugefügt',
      source: 'aws-dynamodb',
    });
  } catch (error) {

    await EnhancedTicketService.logToCloudWatch(
      'ticket-comments-errors',
      {
        action: 'comment_creation_failed',
        error: error.message,
      },
      'ERROR'
    );

    return NextResponse.json(
      {
        error: 'Fehler beim Hinzufügen des Kommentars',
        details: error.message,
        source: 'aws-dynamodb',
      },
      { status: 500 }
    );
  }
}

// GET - Kommentare für ein Ticket abrufen
export async function GET(request: NextRequest) {
  try {
    await verifyAdminAuth();

    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket-ID ist erforderlich' }, { status: 400 });
    }

    // Get ticket with comments from AWS DynamoDB
    const ticket = await AWSTicketStorage.getTicket(ticketId);

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      comments: ticket.comments,
      ticketId,
      source: 'aws-dynamodb',
    });
  } catch (error) {

    return NextResponse.json(
      {
        error: 'Fehler beim Laden der Kommentare',
        details: error.message,
        source: 'aws-dynamodb',
      },
      { status: 500 }
    );
  }
}
