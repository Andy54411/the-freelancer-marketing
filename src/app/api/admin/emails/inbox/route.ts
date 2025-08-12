import { NextRequest, NextResponse } from 'next/server';
import { AdminEmailsService } from '@/lib/aws-dynamodb';

const adminEmailsService = new AdminEmailsService();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';
    const limitCount = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';

    console.log('Loading admin emails from DynamoDB...');

    // Alle E-Mails aus DynamoDB laden
    const allEmailsData = await adminEmailsService.getAllEmails();
    let emails = allEmailsData || [];

    // Filter anwenden
    if (filter === 'unread') {
      emails = emails.filter(email => !email.read);
    } else if (filter === 'starred') {
      emails = emails.filter(email => email.labels?.includes('starred'));
    } else if (filter === 'spam') {
      emails = emails.filter(email => email.labels?.includes('spam'));
    }

    // Nach Timestamp sortieren (neueste zuerst)
    emails.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    // Limit anwenden
    emails = emails.slice(0, limitCount);

    // Client-seitige Suche wenn nötig
    if (search) {
      const searchLower = search.toLowerCase();
      emails = emails.filter(
        (email: any) =>
          email.subject?.toLowerCase().includes(searchLower) ||
          email.from?.toLowerCase().includes(searchLower) ||
          email.textContent?.toLowerCase().includes(searchLower)
      );
    }

    // E-Mails für die Antwort formatieren
    const formattedEmails = emails.map(email => ({
      id: email.emailId,
      messageId: email.messageId || email.emailId,
      from: email.from || 'unknown',
      to: email.to || 'admin@taskilo.de',
      subject: email.subject || 'No Subject',
      htmlContent: email.htmlContent || '',
      textContent: email.textContent || '',
      timestamp: email.timestamp,
      receivedAt: email.timestamp ? new Date(email.timestamp) : new Date(),
      isRead: email.read || false,
      read: email.read || false,
      isStarred: email.labels?.includes('starred') || false,
      isArchived: email.labels?.includes('archived') || false,
      labels: email.labels || [],
      source: email.source || 'AWS SES',
      type: email.type || 'received',
      preview: email.textContent ? email.textContent.substring(0, 150) + '...' : email.subject,
    }));

    // Statistiken berechnen
    const stats = {
      total: allEmailsData.length,
      unread: allEmailsData.filter(email => !email.read).length,
      spam: allEmailsData.filter(email => email.labels?.includes('spam')).length,
      starred: allEmailsData.filter(email => email.labels?.includes('starred')).length,
    };

    console.log(`Loaded ${formattedEmails.length} admin emails from DynamoDB, stats:`, stats);

    return NextResponse.json({
      emails: formattedEmails,
      stats,
      success: true,
    });
  } catch (error) {
    console.error('Fehler beim Laden der Posteingangs-E-Mails:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der E-Mails', success: false },
      { status: 500 }
    );
  }
}
