// Ticket Comments API
import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient, UpdateItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const dynamodb = new DynamoDBClient({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || 'taskilo-admin-secret-key-2024'
);

interface TicketComment {
  id: string;
  author: string;
  authorType: 'admin' | 'customer' | 'system';
  content: string;
  timestamp: string;
  isInternal: boolean;
}

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

    // Aktuelles Ticket laden
    const getCommand = new GetItemCommand({
      TableName: 'taskilo-admin-data',
      Key: marshall({ id: ticketId }),
    });

    const ticketResult = await dynamodb.send(getCommand);
    if (!ticketResult.Item) {
      return NextResponse.json({ error: 'Ticket nicht gefunden' }, { status: 404 });
    }

    const ticket = unmarshall(ticketResult.Item);
    const now = new Date().toISOString();

    const newComment: TicketComment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      author,
      authorType: authorType || 'admin',
      content,
      timestamp: now,
      isInternal: isInternal || false,
    };

    // Kommentar zu bestehenden Kommentaren hinzufügen
    const updatedComments = [...(ticket.comments || []), newComment];

    const updateCommand = new UpdateItemCommand({
      TableName: 'taskilo-admin-data',
      Key: marshall({ id: ticketId }),
      UpdateExpression: 'SET comments = :comments, updatedAt = :updatedAt',
      ExpressionAttributeValues: marshall({
        ':comments': updatedComments,
        ':updatedAt': now,
      }),
      ReturnValues: 'ALL_NEW',
    });

    const result = await dynamodb.send(updateCommand);
    const updatedTicket = result.Attributes ? unmarshall(result.Attributes) : null;

    return NextResponse.json({
      success: true,
      comment: newComment,
      ticket: updatedTicket,
      message: 'Kommentar erfolgreich hinzugefügt',
    });
  } catch (error) {

    return NextResponse.json(
      { error: 'Fehler beim Hinzufügen des Kommentars', details: error.message },
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

    const getCommand = new GetItemCommand({
      TableName: 'taskilo-admin-data',
      Key: marshall({ id: ticketId }),
    });

    const result = await dynamodb.send(getCommand);
    if (!result.Item) {
      return NextResponse.json({ error: 'Ticket nicht gefunden' }, { status: 404 });
    }

    const ticket = unmarshall(result.Item);
    const comments = ticket.comments || [];

    // Kommentare nach Zeitstempel sortieren
    comments.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return NextResponse.json({
      success: true,
      comments,
      total: comments.length,
    });
  } catch (error) {

    return NextResponse.json(
      { error: 'Fehler beim Laden der Kommentare', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Kommentar löschen
export async function DELETE(request: NextRequest) {
  try {
    await verifyAdminAuth();

    const { ticketId, commentId } = await request.json();

    if (!ticketId || !commentId) {
      return NextResponse.json(
        { error: 'Ticket-ID und Kommentar-ID sind erforderlich' },
        { status: 400 }
      );
    }

    // Aktuelles Ticket laden
    const getCommand = new GetItemCommand({
      TableName: 'taskilo-admin-data',
      Key: marshall({ id: ticketId }),
    });

    const ticketResult = await dynamodb.send(getCommand);
    if (!ticketResult.Item) {
      return NextResponse.json({ error: 'Ticket nicht gefunden' }, { status: 404 });
    }

    const ticket = unmarshall(ticketResult.Item);
    const updatedComments = (ticket.comments || []).filter(comment => comment.id !== commentId);

    const updateCommand = new UpdateItemCommand({
      TableName: 'taskilo-admin-data',
      Key: marshall({ id: ticketId }),
      UpdateExpression: 'SET comments = :comments, updatedAt = :updatedAt',
      ExpressionAttributeValues: marshall({
        ':comments': updatedComments,
        ':updatedAt': new Date().toISOString(),
      }),
      ReturnValues: 'ALL_NEW',
    });

    const result = await dynamodb.send(updateCommand);
    const updatedTicket = result.Attributes ? unmarshall(result.Attributes) : null;

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
      message: 'Kommentar erfolgreich gelöscht',
    });
  } catch (error) {

    return NextResponse.json(
      { error: 'Fehler beim Löschen des Kommentars', details: error.message },
      { status: 500 }
    );
  }
}
