// Test Notification API für AWS SES
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { EnhancedTicketService } from '@/lib/aws-ticket-enhanced';
import { Ticket } from '@/types/ticket';

// JWT Secret für Admin-Tokens
const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || 'taskilo-admin-secret-key-2024'
);

// Admin-Token Verifikation - unterstützt Bearer Token und Cookies
async function verifyAdminToken(request: NextRequest) {
  try {
    // Prüfe Authorization Header (Bearer Token)
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const decoded = payload as any;

      if (decoded.role === 'admin') {
        return { success: true, userId: decoded.userId || decoded.email };
      }
    }

    // Prüfe Admin Cookie (aus Login-System)
    const cookieHeader = request.headers.get('cookie');
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
        const { payload } = await jwtVerify(adminToken, JWT_SECRET);
        const decoded = payload as any;

        if (decoded.role === 'admin') {
          return { success: true, userId: decoded.email || decoded.userId };
        }
      }
    }

    return { success: false, error: 'No valid authentication found' };
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
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
