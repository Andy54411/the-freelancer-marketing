// Single Ticket API - Get, Update, Delete specific ticket
import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient, GetItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
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

// GET - Einzelnes Ticket abrufen
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await verifyAdminAuth();

    const ticketId = params.id;
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

    // Nur Tickets zurückgeben, keine anderen Admin-Daten
    if (ticket.type !== 'ticket') {
      return NextResponse.json({ error: 'Ticket nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      ticket,
    });
  } catch (error) {

    return NextResponse.json(
      { error: 'Fehler beim Laden des Tickets', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Ticket löschen
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await verifyAdminAuth();

    const ticketId = params.id;
    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket-ID ist erforderlich' }, { status: 400 });
    }

    // Erst prüfen ob Ticket existiert
    const getCommand = new GetItemCommand({
      TableName: 'taskilo-admin-data',
      Key: marshall({ id: ticketId }),
    });

    const ticketResult = await dynamodb.send(getCommand);
    if (!ticketResult.Item) {
      return NextResponse.json({ error: 'Ticket nicht gefunden' }, { status: 404 });
    }

    const ticket = unmarshall(ticketResult.Item);
    if (ticket.type !== 'ticket') {
      return NextResponse.json({ error: 'Ticket nicht gefunden' }, { status: 404 });
    }

    // Ticket löschen
    const deleteCommand = new DeleteItemCommand({
      TableName: 'taskilo-admin-data',
      Key: marshall({ id: ticketId }),
    });

    await dynamodb.send(deleteCommand);

    return NextResponse.json({
      success: true,
      message: 'Ticket erfolgreich gelöscht',
    });
  } catch (error) {

    return NextResponse.json(
      { error: 'Fehler beim Löschen des Tickets', details: error.message },
      { status: 500 }
    );
  }
}
