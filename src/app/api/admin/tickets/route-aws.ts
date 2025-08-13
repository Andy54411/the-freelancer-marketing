// Pure AWS Ticket Management API - NO Firebase Dependencies
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { AWSTicketStorage, TicketData } from '@/lib/aws-ticket-storage';
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

// GET - Alle Tickets aus AWS DynamoDB abrufen
export async function GET(request: NextRequest) {
  try {
    await verifyAdminAuth();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const priority = searchParams.get('priority') || undefined;
    const category = searchParams.get('category') || undefined;
    const assignedTo = searchParams.get('assignedTo') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');

    console.log('Fetching tickets from AWS DynamoDB with filters:', {
      status,
      priority,
      category,
      assignedTo,
      limit,
    });

    const tickets = await AWSTicketStorage.getTickets({
      status,
      priority,
      category,
      assignedTo,
      limit,
    });

    console.log(`Found ${tickets.length} tickets from DynamoDB`);

    return NextResponse.json({
      success: true,
      tickets,
      total: tickets.length,
      source: 'aws-dynamodb',
    });
  } catch (error) {
    console.error('AWS Ticket fetch error:', error);
    return NextResponse.json(
      {
        error: 'Fehler beim Laden der Tickets aus AWS',
        details: error.message,
        source: 'aws-dynamodb',
      },
      { status: 500 }
    );
  }
}

// POST - Neues Ticket in AWS DynamoDB erstellen
export async function POST(request: NextRequest) {
  try {
    await verifyAdminAuth();

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

    console.log('Creating new ticket in AWS DynamoDB:', {
      title: title.substring(0, 50) + '...',
      category: category || 'other',
      priority: priority || 'medium',
    });

    // Create ticket using AWS DynamoDB
    const ticket = await AWSTicketStorage.createTicket({
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

    console.log(`Ticket created successfully in DynamoDB: ${ticket.id}`);

    // Log creation to CloudWatch
    await EnhancedTicketService.logToCloudWatch(
      'ticket-creation',
      {
        action: 'ticket_created',
        ticketId: ticket.id,
        category: ticket.category,
        priority: ticket.priority,
        aiClassified: ticket.aiClassified,
        hasAI: !!ticket.aiSentiment,
      },
      'INFO'
    );

    return NextResponse.json({
      success: true,
      ticket,
      message: 'Ticket erfolgreich in AWS DynamoDB erstellt',
      source: 'aws-dynamodb',
    });
  } catch (error) {
    console.error('AWS Ticket creation error:', error);

    await EnhancedTicketService.logToCloudWatch(
      'ticket-creation-errors',
      {
        action: 'ticket_creation_failed',
        error: error.message,
        stack: error.stack,
      },
      'ERROR'
    );

    return NextResponse.json(
      {
        error: 'Fehler beim Erstellen des Tickets in AWS',
        details: error.message,
        source: 'aws-dynamodb',
      },
      { status: 500 }
    );
  }
}

// PUT - Ticket in AWS DynamoDB aktualisieren
export async function PUT(request: NextRequest) {
  try {
    await verifyAdminAuth();

    const { id, ...updates } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Ticket-ID ist erforderlich' }, { status: 400 });
    }

    console.log(`Updating ticket ${id} in AWS DynamoDB:`, Object.keys(updates));

    // Update ticket using AWS DynamoDB
    const updatedTicket = await AWSTicketStorage.updateTicket(id, updates);

    console.log(`Ticket ${id} updated successfully in DynamoDB`);

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
      message: 'Ticket erfolgreich in AWS DynamoDB aktualisiert',
      source: 'aws-dynamodb',
    });
  } catch (error) {
    console.error('AWS Ticket update error:', error);

    await EnhancedTicketService.logToCloudWatch(
      'ticket-update-errors',
      {
        action: 'ticket_update_failed',
        error: error.message,
      },
      'ERROR'
    );

    return NextResponse.json(
      {
        error: 'Fehler beim Aktualisieren des Tickets in AWS',
        details: error.message,
        source: 'aws-dynamodb',
      },
      { status: 500 }
    );
  }
}

// DELETE - Ticket in AWS DynamoDB löschen (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    await verifyAdminAuth();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Ticket-ID ist erforderlich' }, { status: 400 });
    }

    console.log(`Deleting ticket ${id} from AWS DynamoDB`);

    const success = await AWSTicketStorage.deleteTicket(id);

    if (success) {
      console.log(`Ticket ${id} deleted successfully from DynamoDB`);
      return NextResponse.json({
        success: true,
        message: 'Ticket erfolgreich aus AWS DynamoDB gelöscht',
        source: 'aws-dynamodb',
      });
    } else {
      return NextResponse.json(
        { error: 'Ticket konnte nicht gelöscht werden', source: 'aws-dynamodb' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('AWS Ticket deletion error:', error);
    return NextResponse.json(
      {
        error: 'Fehler beim Löschen des Tickets aus AWS',
        details: error.message,
        source: 'aws-dynamodb',
      },
      { status: 500 }
    );
  }
}
