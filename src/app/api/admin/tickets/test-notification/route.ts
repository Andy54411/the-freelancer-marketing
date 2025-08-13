// Test Notification API für AWS SES
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { EnhancedTicketService } from '@/lib/aws-ticket-enhanced';
import { Ticket } from '@/types/ticket';

// Admin-Token Verifikation
async function verifyAdminToken(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return { success: false, error: 'Missing or invalid authorization header' };
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;

    if (decoded.role !== 'admin') {
      return { success: false, error: 'Insufficient permissions' };
    }

    return { success: true, userId: decoded.userId };
  } catch (error) {
    return { success: false, error: 'Invalid token' };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Admin-Token verifizieren
    const authResult = await verifyAdminToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, recipient } = await request.json();

    if (type === 'test') {
      // Test-Ticket erstellen für Notification
      const testTicket: Ticket = {
        id: `test-${Date.now()}`,
        title: 'Test Ticket für AWS SES Benachrichtigung',
        description: 'Dies ist ein Test-Ticket um die AWS SES E-Mail-Integration zu testen.',
        status: 'open',
        priority: 'medium',
        category: 'technical',
        reportedBy: 'andy.staudinger@taskilo.de',
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: ['test', 'aws', 'ses'],
        comments: [],
      };

      // Test-Benachrichtigung senden
      const success = await EnhancedTicketService.sendTicketNotification(
        testTicket,
        'created',
        undefined,
        [recipient]
      );

      if (success) {
        return NextResponse.json({
          success: true,
          message: 'Test-Benachrichtigung erfolgreich gesendet',
          recipient,
          ticketId: testTicket.id,
        });
      } else {
        return NextResponse.json(
          { error: 'Fehler beim Senden der Test-Benachrichtigung' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ error: 'Unbekannter Notification-Typ' }, { status: 400 });
  } catch (error) {
    console.error('Test Notification Fehler:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
