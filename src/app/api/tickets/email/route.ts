import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import type { Ticket, TicketComment } from '@/types/ticket';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface TicketEmailData {
  type: 'created' | 'updated' | 'commented' | 'resolved' | 'reopened' | 'assigned';
  ticket: Ticket;
  comment?: TicketComment;
  assignedTo?: string;
  assignedBy?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { type, ticket, comment, assignedTo, assignedBy }: TicketEmailData = await request.json();

    // Validierung
    if (!type || !ticket) {
      return NextResponse.json({ 
        error: 'Type und Ticket sind erforderlich' 
      }, { status: 400 });
    }

    console.log(`📧 Sende Ticket-E-Mail: ${type} für Ticket ${ticket.id}`);

    let emailData;
    let recipients: string[] = [];

    // E-Mail-Empfänger bestimmen
    recipients.push('andy.staudinger@taskilo.de'); // Admin immer benachrichtigen
    
    if (ticket.assignedTo) {
      recipients.push(ticket.assignedTo);
    }
    
    if (ticket.reportedBy && !recipients.includes(ticket.reportedBy)) {
      recipients.push(ticket.reportedBy);
    }

    // E-Mail-Content basierend auf Typ generieren
    switch (type) {
      case 'created':
        emailData = generateTicketCreatedEmail(ticket);
        break;
      case 'updated':
        emailData = generateTicketUpdatedEmail(ticket);
        break;
      case 'commented':
        emailData = generateTicketCommentedEmail(ticket, comment!);
        break;
      case 'resolved':
        emailData = generateTicketResolvedEmail(ticket);
        break;
      case 'reopened':
        emailData = generateTicketReopenedEmail(ticket);
        break;
      case 'assigned':
        emailData = generateTicketAssignedEmail(ticket, assignedTo!, assignedBy!);
        // Bei Zuweisung nur an den Zugewiesenen und Admin
        recipients = ['andy.staudinger@taskilo.de'];
        if (assignedTo) recipients.push(assignedTo);
        break;
      default:
        return NextResponse.json({ 
          error: 'Unbekannter E-Mail-Typ' 
        }, { status: 400 });
    }

    // E-Mail senden
    const emailResponse = await resend.emails.send({
      from: 'Taskilo Support System <support@taskilo.de>',
      to: recipients,
      subject: emailData.subject,
      html: emailData.html,
      replyTo: 'support@taskilo.de'
    });

    if (emailResponse.error) {
      console.error('❌ Resend Fehler:', emailResponse.error);
      return NextResponse.json(
        {
          error: 'E-Mail konnte nicht gesendet werden',
          details: emailResponse.error.message
        },
        { status: 500 }
      );
    }

    console.log('✅ Ticket-E-Mail erfolgreich gesendet:', emailResponse.data?.id);

    return NextResponse.json({
      success: true,
      message: `${type} E-Mail erfolgreich gesendet`,
      emailId: emailResponse.data?.id,
      recipients: recipients
    });

  } catch (error) {
    console.error('❌ Fehler beim Senden der Ticket-E-Mail:', error);
    return NextResponse.json(
      { 
        error: 'Interner Serverfehler',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    );
  }
}

// E-Mail-Template-Funktionen
function generateTicketCreatedEmail(ticket: Ticket) {
  const priorityEmoji = {
    low: '🟢',
    medium: '🟡', 
    high: '🟠',
    urgent: '🔴'
  };

  const categoryEmoji = {
    bug: '🐛',
    feature: '✨',
    support: '🤝',
    billing: '💰',
    payment: '💳',
    account: '👤',
    technical: '⚙️',
    feedback: '💬',
    other: '📋'
  };

  return {
    subject: `🎫 Neues Ticket: ${ticket.title} (#${ticket.id})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa;">
        <div style="background: linear-gradient(135deg, #14ad9f 0%, #0891b2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🎫 Neues Support-Ticket</h1>
        </div>
        
        <div style="background: white; padding: 30px; margin: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #14ad9f; margin-top: 0; border-bottom: 2px solid #14ad9f; padding-bottom: 10px;">
            ${ticket.title}
          </h2>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <strong>Ticket-ID:</strong> #${ticket.id}
              </div>
              <div>
                <strong>Status:</strong> <span style="background: #e3f2fd; padding: 4px 8px; border-radius: 4px;">${ticket.status}</span>
              </div>
              <div>
                <strong>Priorität:</strong> ${priorityEmoji[ticket.priority]} ${ticket.priority}
              </div>
              <div>
                <strong>Kategorie:</strong> ${categoryEmoji[ticket.category]} ${ticket.category}
              </div>
              <div>
                <strong>Erstellt von:</strong> ${ticket.reportedBy}
              </div>
              <div>
                <strong>Zugewiesen an:</strong> ${ticket.assignedTo || 'Nicht zugewiesen'}
              </div>
            </div>
          </div>
          
          <div style="background: white; border: 1px solid #e9ecef; border-radius: 6px; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Beschreibung:</h3>
            <p style="line-height: 1.6; white-space: pre-wrap;">${ticket.description}</p>
          </div>
          
          ${ticket.tags && ticket.tags.length > 0 ? `
            <div style="margin: 20px 0;">
              <strong>Tags:</strong>
              ${ticket.tags.map(tag => `<span style="background: #14ad9f; color: white; padding: 4px 8px; border-radius: 4px; margin-right: 8px; font-size: 12px;">${tag}</span>`).join('')}
            </div>
          ` : ''}
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="https://taskilo.de/dashboard/admin/tickets" 
               style="background: #14ad9f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Ticket bearbeiten
            </a>
          </div>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
          <p>Diese E-Mail wurde automatisch vom Taskilo Support-System gesendet.</p>
          <p>Zeitstempel: ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}</p>
        </div>
      </div>
    `
  };
}

function generateTicketUpdatedEmail(ticket: Ticket) {
  return {
    subject: `📝 Ticket aktualisiert: ${ticket.title} (#${ticket.id})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #14ad9f 0%, #0891b2 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">📝 Ticket aktualisiert</h1>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e9ecef;">
          <h2 style="color: #14ad9f;">${ticket.title}</h2>
          <p><strong>Ticket-ID:</strong> #${ticket.id}</p>
          <p><strong>Status:</strong> ${ticket.status}</p>
          <p><strong>Zuletzt aktualisiert:</strong> ${ticket.updatedAt.toLocaleString('de-DE')}</p>
          
          <div style="text-align: center; margin-top: 20px;">
            <a href="https://taskilo.de/dashboard/admin/tickets" 
               style="background: #14ad9f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
              Ticket ansehen
            </a>
          </div>
        </div>
      </div>
    `
  };
}

function generateTicketCommentedEmail(ticket: Ticket, comment: TicketComment) {
  return {
    subject: `💬 Neue Antwort: ${ticket.title} (#${ticket.id})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #14ad9f 0%, #0891b2 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">💬 Neue Antwort</h1>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e9ecef;">
          <h2 style="color: #14ad9f;">${ticket.title}</h2>
          
          <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #14ad9f; margin: 20px 0;">
            <p><strong>${comment.userDisplayName}</strong> hat geantwortet:</p>
            <p style="margin: 10px 0; line-height: 1.6;">${comment.content}</p>
            <p style="font-size: 12px; color: #666; margin: 0;">
              ${comment.createdAt.toLocaleString('de-DE')}
            </p>
          </div>
          
          <div style="text-align: center;">
            <a href="https://taskilo.de/dashboard/admin/tickets" 
               style="background: #14ad9f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
              Antworten
            </a>
          </div>
        </div>
      </div>
    `
  };
}

function generateTicketResolvedEmail(ticket: Ticket) {
  return {
    subject: `✅ Ticket gelöst: ${ticket.title} (#${ticket.id})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">✅ Ticket gelöst</h1>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e9ecef;">
          <h2 style="color: #10b981;">${ticket.title}</h2>
          <p>Ihr Ticket wurde erfolgreich gelöst!</p>
          <p><strong>Ticket-ID:</strong> #${ticket.id}</p>
          <p><strong>Gelöst am:</strong> ${ticket.updatedAt.toLocaleString('de-DE')}</p>
          
          <div style="background: #f0fdf4; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; color: #166534;">
              Vielen Dank für Ihre Geduld. Falls Sie weitere Fragen haben, können Sie gerne ein neues Ticket erstellen.
            </p>
          </div>
        </div>
      </div>
    `
  };
}

function generateTicketReopenedEmail(ticket: Ticket) {
  return {
    subject: `🔄 Ticket wiedereröffnet: ${ticket.title} (#${ticket.id})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">🔄 Ticket wiedereröffnet</h1>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e9ecef;">
          <h2 style="color: #f59e0b;">${ticket.title}</h2>
          <p>Das Ticket wurde wiedereröffnet und benötigt weitere Bearbeitung.</p>
          <p><strong>Ticket-ID:</strong> #${ticket.id}</p>
          
          <div style="text-align: center; margin-top: 20px;">
            <a href="https://taskilo.de/dashboard/admin/tickets" 
               style="background: #f59e0b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
              Ticket bearbeiten
            </a>
          </div>
        </div>
      </div>
    `
  };
}

function generateTicketAssignedEmail(ticket: Ticket, assignedTo: string, assignedBy: string) {
  return {
    subject: `👤 Ticket zugewiesen: ${ticket.title} (#${ticket.id})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">👤 Ticket zugewiesen</h1>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e9ecef;">
          <h2 style="color: #6366f1;">${ticket.title}</h2>
          <p>Ihnen wurde ein neues Ticket zugewiesen.</p>
          
          <div style="background: #f1f5f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p><strong>Zugewiesen von:</strong> ${assignedBy}</p>
            <p><strong>Zugewiesen an:</strong> ${assignedTo}</p>
            <p><strong>Priorität:</strong> ${ticket.priority}</p>
          </div>
          
          <p><strong>Beschreibung:</strong></p>
          <p style="background: #f8f9fa; padding: 15px; border-radius: 4px; line-height: 1.6;">
            ${ticket.description}
          </p>
          
          <div style="text-align: center; margin-top: 20px;">
            <a href="https://taskilo.de/dashboard/admin/tickets" 
               style="background: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
              Ticket bearbeiten
            </a>
          </div>
        </div>
      </div>
    `
  };
}
