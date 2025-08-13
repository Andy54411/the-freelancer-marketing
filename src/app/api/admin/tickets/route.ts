// Admin Ticket Management API mit AWS Enhanced Features
import { NextRequest, NextResponse } from 'next/server';
import {
  DynamoDBClient,
  PutItemCommand,
  ScanCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { EnhancedTicketService } from '@/lib/aws-ticket-enhanced';
import { Ticket as TicketType, TicketCategory } from '@/types/ticket';

const dynamodb = new DynamoDBClient({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// JWT Secret für Admin-Tokens
const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || 'taskilo-admin-secret-key-2024'
);

// Lokaler Ticket Type für API (simplified)
interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'bug' | 'feature' | 'support' | 'question' | 'other';
  assignedTo?: string;
  customerEmail?: string;
  customerName?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  comments: TicketComment[];
}

interface TicketComment {
  id: string;
  author: string;
  authorType: 'admin' | 'customer' | 'system';
  content: string;
  timestamp: string;
  isInternal: boolean;
}

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

// GET - Alle Tickets abrufen
export async function GET(request: NextRequest) {
  try {
    await verifyAdminAuth();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');

    const scanCommand = new ScanCommand({
      TableName: 'taskilo-admin-data',
      FilterExpression: '#type = :type',
      ExpressionAttributeNames: {
        '#type': 'type',
      },
      ExpressionAttributeValues: marshall({
        ':type': 'ticket',
      }),
      Limit: limit,
    });

    const result = await dynamodb.send(scanCommand);
    let tickets = result.Items?.map(item => unmarshall(item)) || [];

    // Filter anwenden
    if (status) {
      tickets = tickets.filter(ticket => ticket.status === status);
    }
    if (priority) {
      tickets = tickets.filter(ticket => ticket.priority === priority);
    }
    if (category) {
      tickets = tickets.filter(ticket => ticket.category === category);
    }

    // Nach Datum sortieren (neueste zuerst)
    tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      tickets,
      total: tickets.length,
    });
  } catch (error) {
    console.error('Ticket fetch error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Tickets', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Neues Ticket erstellen
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

    const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const ticket: Ticket = {
      id: ticketId,
      title,
      description,
      status: 'open',
      priority: priority || 'medium',
      category: category || 'other',
      assignedTo: assignedTo || '',
      customerEmail: customerEmail || '',
      customerName: customerName || '',
      createdAt: now,
      updatedAt: now,
      tags: tags || [],
      comments: [
        {
          id: `comment_${Date.now()}`,
          author: 'System',
          authorType: 'system',
          content: 'Ticket wurde erstellt',
          timestamp: now,
          isInternal: true,
        },
      ],
    };

    // AWS Enhanced Features
    // 1. AI Auto-Classification
    if (!priority || priority === 'medium') {
      try {
        const classification = await EnhancedTicketService.autoClassifyTicket(title, description);
        ticket.priority = classification.priority;

        // Map category to valid type
        const validCategories = ['bug', 'feature', 'support', 'technical', 'other'];
        const categoryMapping: Record<string, string> = {
          question: 'support',
          billing: 'billing',
          payment: 'payment',
          account: 'account',
          technical: 'technical',
          feedback: 'feedback',
        };

        const mappedCategory =
          categoryMapping[classification.category] ||
          (validCategories.includes(classification.category) ? classification.category : 'other');
        ticket.category = mappedCategory as any;

        // Füge AI-Klassifizierungs-Kommentar hinzu
        ticket.comments.push({
          id: `comment_ai_${Date.now()}`,
          author: 'AI Assistant',
          authorType: 'system',
          content: `Automatische Klassifizierung: Priorität ${classification.priority}, Kategorie ${classification.category}, Sentiment: ${classification.sentiment} (Confidence: ${(classification.confidence * 100).toFixed(1)}%)`,
          timestamp: now,
          isInternal: true,
        });
      } catch (error) {
        console.error('AI Classification failed:', error);
      }
    }

    const putCommand = new PutItemCommand({
      TableName: 'taskilo-admin-data',
      Item: marshall({
        ...ticket,
        type: 'ticket',
      }),
    });

    await dynamodb.send(putCommand);

    // 2. Send AWS SES Notification
    try {
      // Convert to TicketType for notification
      // Map category to valid TicketCategory
      const validCategory = ticket.category === 'question' ? 'support' : ticket.category;

      const notificationTicket: TicketType = {
        ...ticket,
        category: validCategory as any,
        reportedBy: customerEmail || 'admin@taskilo.de',
        createdAt: new Date(ticket.createdAt),
        updatedAt: new Date(ticket.updatedAt),
        comments: ticket.comments.map(c => ({
          id: c.id,
          ticketId: ticket.id,
          userId: c.author,
          userDisplayName: c.author,
          userRole: c.authorType === 'admin' ? 'admin' : 'user',
          content: c.content,
          createdAt: new Date(c.timestamp),
          isInternal: c.isInternal,
        })),
      };

      await EnhancedTicketService.sendTicketNotification(notificationTicket, 'created');
    } catch (error) {
      console.error('Email notification failed:', error);
    }

    return NextResponse.json({
      success: true,
      ticket,
      message: 'Ticket erfolgreich erstellt',
    });
  } catch (error) {
    console.error('Ticket creation error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Tickets', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Ticket aktualisieren
export async function PUT(request: NextRequest) {
  try {
    await verifyAdminAuth();

    const { id, title, description, status, priority, category, assignedTo, tags } =
      await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Ticket-ID ist erforderlich' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Nur die geänderten Felder aktualisieren
    const updateExpression = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};

    if (title) {
      updateExpression.push('#title = :title');
      expressionAttributeNames['#title'] = 'title';
      expressionAttributeValues[':title'] = title;
    }
    if (description) {
      updateExpression.push('description = :description');
      expressionAttributeValues[':description'] = description;
    }
    if (status) {
      updateExpression.push('#status = :status');
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':status'] = status;
    }
    if (priority) {
      updateExpression.push('priority = :priority');
      expressionAttributeValues[':priority'] = priority;
    }
    if (category) {
      updateExpression.push('category = :category');
      expressionAttributeValues[':category'] = category;
    }
    if (assignedTo !== undefined) {
      updateExpression.push('assignedTo = :assignedTo');
      expressionAttributeValues[':assignedTo'] = assignedTo;
    }
    if (tags) {
      updateExpression.push('tags = :tags');
      expressionAttributeValues[':tags'] = tags;
    }

    updateExpression.push('updatedAt = :updatedAt');
    expressionAttributeValues[':updatedAt'] = now;

    const updateCommand = new UpdateItemCommand({
      TableName: 'taskilo-admin-data',
      Key: marshall({ id }),
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeValues: marshall(expressionAttributeValues),
      ExpressionAttributeNames:
        Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
      ReturnValues: 'ALL_NEW',
    });

    const result = await dynamodb.send(updateCommand);
    const updatedTicket = result.Attributes ? unmarshall(result.Attributes) : null;

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
      message: 'Ticket erfolgreich aktualisiert',
    });
  } catch (error) {
    console.error('Ticket update error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren des Tickets', details: error.message },
      { status: 500 }
    );
  }
}
