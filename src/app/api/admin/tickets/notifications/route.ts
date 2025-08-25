// Ticket Email Notifications mit AWS SES
import { NextRequest, NextResponse } from 'next/server';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

const ses = new SESClient({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const dynamodb = new DynamoDBClient({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

interface TicketNotification {
  type: 'created' | 'updated' | 'comment' | 'resolved' | 'assigned';
  ticket: {
    id: string;
    title: string;
    status: string;
    priority: string;
    customerEmail?: string;
    customerName?: string;
    assignedTo?: string;
  };
  comment?: string;
  updatedBy?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { type, ticket, comment, updatedBy }: TicketNotification = await request.json();

    const notifications = [];

    // Kunden-Benachrichtigung
    if (ticket.customerEmail && ['created', 'updated', 'resolved'].includes(type)) {
      notifications.push(sendCustomerNotification(type, ticket, comment));
    }

    // Admin-Benachrichtigung
    if (ticket.assignedTo) {
      notifications.push(sendAdminNotification(type, ticket, comment, updatedBy));
    }

    // Team-Benachrichtigung bei hoher Priorität
    if (ticket.priority === 'urgent' || ticket.priority === 'high') {
      notifications.push(sendTeamNotification(type, ticket, comment));
    }

    await Promise.all(notifications);

    // Notification in DynamoDB speichern
    await logNotification(type, ticket, comment, updatedBy);

    return NextResponse.json({ success: true, message: 'Benachrichtigungen versendet' });
  } catch (error) {

    return NextResponse.json(
      { error: 'Fehler beim Versenden der Benachrichtigungen' },
      { status: 500 }
    );
  }
}

async function sendCustomerNotification(type: string, ticket: any, comment?: string) {
  const subject = getCustomerSubject(type, ticket);
  const body = getCustomerEmailBody(type, ticket, comment);

  const command = new SendEmailCommand({
    Source: 'support@taskilo.de',
    Destination: {
      ToAddresses: [ticket.customerEmail],
    },
    Message: {
      Subject: { Data: subject, Charset: 'UTF-8' },
      Body: {
        Html: {
          Data: body,
          Charset: 'UTF-8',
        },
      },
    },
  });

  return ses.send(command);
}

async function sendAdminNotification(
  type: string,
  ticket: any,
  comment?: string,
  updatedBy?: string
) {
  const subject = getAdminSubject(type, ticket);
  const body = getAdminEmailBody(type, ticket, comment, updatedBy);

  const adminEmail = `${ticket.assignedTo.toLowerCase().replace(' ', '.')}@taskilo.de`;

  const command = new SendEmailCommand({
    Source: 'admin@taskilo.de',
    Destination: {
      ToAddresses: [adminEmail],
    },
    Message: {
      Subject: { Data: subject, Charset: 'UTF-8' },
      Body: {
        Html: {
          Data: body,
          Charset: 'UTF-8',
        },
      },
    },
  });

  return ses.send(command);
}

async function sendTeamNotification(type: string, ticket: any, comment?: string) {
  const subject = `🚨 DRINGEND: ${getAdminSubject(type, ticket)}`;
  const body = getUrgentEmailBody(type, ticket, comment);

  const command = new SendEmailCommand({
    Source: 'alerts@taskilo.de',
    Destination: {
      ToAddresses: ['andy.staudinger@taskilo.de', 'admin@taskilo.de'],
    },
    Message: {
      Subject: { Data: subject, Charset: 'UTF-8' },
      Body: {
        Html: {
          Data: body,
          Charset: 'UTF-8',
        },
      },
    },
  });

  return ses.send(command);
}

async function logNotification(type: string, ticket: any, comment?: string, updatedBy?: string) {
  const notification = {
    id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'notification',
    notificationType: type,
    ticketId: ticket.id,
    timestamp: new Date().toISOString(),
    recipients: [
      ticket.customerEmail,
      ticket.assignedTo ? `${ticket.assignedTo.toLowerCase().replace(' ', '.')}@taskilo.de` : null,
    ].filter(Boolean),
    priority: ticket.priority,
    updatedBy: updatedBy || 'system',
    comment: comment || null,
  };

  const command = new PutItemCommand({
    TableName: 'taskilo-admin-data',
    Item: marshall(notification),
  });

  return dynamodb.send(command);
}

function getCustomerSubject(type: string, ticket: any): string {
  switch (type) {
    case 'created':
      return `Ihr Support-Ticket wurde erstellt - #${ticket.id.slice(-8)}`;
    case 'updated':
      return `Update zu Ihrem Support-Ticket - #${ticket.id.slice(-8)}`;
    case 'resolved':
      return `Ihr Support-Ticket wurde gelöst - #${ticket.id.slice(-8)}`;
    default:
      return `Taskilo Support - Ticket #${ticket.id.slice(-8)}`;
  }
}

function getAdminSubject(type: string, ticket: any): string {
  switch (type) {
    case 'created':
      return `Neues Ticket: ${ticket.title} [${ticket.priority.toUpperCase()}]`;
    case 'updated':
      return `Ticket Update: ${ticket.title}`;
    case 'comment':
      return `Neuer Kommentar: ${ticket.title}`;
    case 'assigned':
      return `Ticket zugewiesen: ${ticket.title}`;
    default:
      return `Ticket: ${ticket.title}`;
  }
}

function getCustomerEmailBody(type: string, ticket: any, comment?: string): string {
  const baseUrl = 'https://taskilo.de';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #14ad9f; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .ticket-info { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .status-badge { display: inline-block; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; }
        .status-open { background: #fee; color: #c53030; }
        .status-resolved { background: #f0fff4; color: #38a169; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .btn { display: inline-block; padding: 10px 20px; background: #14ad9f; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Taskilo Support</h1>
          <p>Ihr zuverlässiger Partner für alle Services</p>
        </div>
        <div class="content">
          <h2>${getCustomerSubject(type, ticket)}</h2>

          ${
            type === 'created'
              ? `
            <p>Hallo ${ticket.customerName || 'lieber Kunde'},</p>
            <p>vielen Dank für Ihre Anfrage. Wir haben Ihr Support-Ticket erfolgreich erhalten und werden uns schnellstmöglich darum kümmern.</p>
          `
              : type === 'resolved'
                ? `
            <p>Hallo ${ticket.customerName || 'lieber Kunde'},</p>
            <p>gute Nachrichten! Ihr Support-Ticket wurde erfolgreich gelöst.</p>
          `
                : `
            <p>Hallo ${ticket.customerName || 'lieber Kunde'},</p>
            <p>es gibt ein Update zu Ihrem Support-Ticket.</p>
          `
          }

          <div class="ticket-info">
            <h3>Ticket-Details:</h3>
            <p><strong>Ticket-ID:</strong> #${ticket.id.slice(-8)}</p>
            <p><strong>Titel:</strong> ${ticket.title}</p>
            <p><strong>Status:</strong> <span class="status-badge status-${ticket.status}">${ticket.status.toUpperCase()}</span></p>
            <p><strong>Priorität:</strong> ${ticket.priority.toUpperCase()}</p>
            ${comment ? `<p><strong>Letztes Update:</strong> ${comment}</p>` : ''}
          </div>

          ${
            type === 'resolved'
              ? `
            <p>Falls Sie weitere Fragen haben oder mit der Lösung nicht zufrieden sind, können Sie gerne antworten oder ein neues Ticket erstellen.</p>
          `
              : `
            <p>Sie können den aktuellen Status Ihres Tickets jederzeit in Ihrem Taskilo-Dashboard einsehen.</p>
          `
          }

          <a href="${baseUrl}/dashboard/user/tickets" class="btn">Ticket anzeigen</a>
        </div>
        <div class="footer">
          <p>© 2025 Taskilo - Ihr Service-Marktplatz</p>
          <p>Bei Fragen antworten Sie einfach auf diese E-Mail.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getAdminEmailBody(
  type: string,
  ticket: any,
  comment?: string,
  updatedBy?: string
): string {
  const dashboardUrl = 'https://taskilo.de/dashboard/admin/tickets';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #2d3748; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .ticket-info { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #14ad9f; }
        .priority-urgent { border-left-color: #e53e3e; }
        .priority-high { border-left-color: #dd6b20; }
        .btn { display: inline-block; padding: 10px 20px; background: #14ad9f; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        .urgent { background: #fed7d7; border: 1px solid #e53e3e; padding: 10px; border-radius: 5px; color: #c53030; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎫 Taskilo Admin - Ticket System</h1>
        </div>
        <div class="content">
          <h2>${getAdminSubject(type, ticket)}</h2>

          ${ticket.priority === 'urgent' ? '<div class="urgent">🚨 DRINGENDE PRIORITÄT - Sofortige Bearbeitung erforderlich!</div>' : ''}

          <div class="ticket-info ${ticket.priority === 'urgent' || ticket.priority === 'high' ? 'priority-' + ticket.priority : ''}">
            <h3>Ticket-Informationen:</h3>
            <p><strong>ID:</strong> ${ticket.id}</p>
            <p><strong>Titel:</strong> ${ticket.title}</p>
            <p><strong>Status:</strong> ${ticket.status}</p>
            <p><strong>Priorität:</strong> ${ticket.priority.toUpperCase()}</p>
            <p><strong>Kunde:</strong> ${ticket.customerName || 'Unbekannt'} (${ticket.customerEmail || 'Keine E-Mail'})</p>
            <p><strong>Zugewiesen an:</strong> ${ticket.assignedTo || 'Nicht zugewiesen'}</p>
            ${updatedBy ? `<p><strong>Aktualisiert von:</strong> ${updatedBy}</p>` : ''}
            ${comment ? `<p><strong>Kommentar:</strong> ${comment}</p>` : ''}
          </div>

          <a href="${dashboardUrl}" class="btn">Im Admin-Dashboard öffnen</a>

          <p><small>Diese E-Mail wurde automatisch vom Taskilo Ticket-System generiert.</small></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getUrgentEmailBody(type: string, ticket: any, comment?: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #fed7d7; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border: 3px solid #e53e3e; }
        .header { background: #e53e3e; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .urgent-info { background: #fed7d7; padding: 15px; border-radius: 5px; margin: 15px 0; border: 2px solid #e53e3e; }
        .btn { display: inline-block; padding: 15px 25px; background: #e53e3e; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚨 DRINGENDER ALARM - TASKILO</h1>
          <p>Sofortige Aufmerksamkeit erforderlich!</p>
        </div>
        <div class="content">
          <div class="urgent-info">
            <h2>🔥 DRINGENDES TICKET: ${ticket.title}</h2>
            <p><strong>Priorität:</strong> ${ticket.priority.toUpperCase()}</p>
            <p><strong>Kunde:</strong> ${ticket.customerName || 'Unbekannt'}</p>
            <p><strong>Status:</strong> ${ticket.status}</p>
            <p><strong>Zeit:</strong> ${new Date().toLocaleString('de-DE')}</p>
            ${comment ? `<p><strong>Details:</strong> ${comment}</p>` : ''}
          </div>

          <p><strong>Dieses Ticket erfordert sofortige Bearbeitung!</strong></p>

          <a href="https://taskilo.de/dashboard/admin/tickets" class="btn">SOFORT BEARBEITEN</a>
        </div>
      </div>
    </body>
    </html>
  `;
}
