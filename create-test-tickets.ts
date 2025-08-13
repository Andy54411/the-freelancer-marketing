#!/usr/bin/env npx ts-node

/**
 * Test-Script: Erstellt Test-Tickets direkt in AWS DynamoDB
 */

import { AWSTicketStorage } from './src/lib/aws-ticket-storage';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

async function createTestTickets() {
  console.log('🎯 Erstelle Test-Tickets für AWS DynamoDB...');

  const testTickets = [
    {
      title: 'Website Performance Issue',
      description:
        'The website is running slowly during peak hours. Users are experiencing long load times and timeouts.',
      customerEmail: 'admin@taskilo.de',
      customerName: 'Admin User',
      priority: 'high' as const,
      category: 'technical' as const,
      status: 'open' as const,
      tags: ['performance', 'urgent'],
      comments: [],
    },
    {
      title: 'Payment Gateway Error',
      description: 'Users are unable to complete payments. Stripe webhook is returning 500 errors.',
      customerEmail: 'support@taskilo.de',
      customerName: 'Support Team',
      priority: 'urgent' as const,
      category: 'billing' as const,
      status: 'open' as const,
      tags: ['payment', 'critical'],
      comments: [],
    },
    {
      title: 'Feature Request: Dark Mode',
      description: 'Multiple users have requested a dark mode option for the dashboard interface.',
      customerEmail: 'feature@taskilo.de',
      customerName: 'Product Team',
      priority: 'low' as const,
      category: 'feature' as const,
      status: 'open' as const,
      tags: ['ui', 'enhancement'],
      comments: [],
    },
    {
      title: 'Database Connection Timeout',
      description: 'Intermittent database connection timeouts are affecting the admin dashboard.',
      customerEmail: 'tech@taskilo.de',
      customerName: 'Tech Team',
      priority: 'high' as const,
      category: 'technical' as const,
      status: 'open' as const,
      tags: ['database', 'infrastructure'],
      comments: [],
    },
    {
      title: 'User Registration Bug',
      description:
        'New users are unable to complete the registration process. Email verification is failing.',
      customerEmail: 'bugs@taskilo.de',
      customerName: 'QA Team',
      priority: 'medium' as const,
      category: 'bug' as const,
      status: 'open' as const,
      tags: ['registration', 'email'],
      comments: [],
    },
    {
      title: 'Mobile App Crash',
      description: 'The mobile app crashes when users try to upload images in the chat feature.',
      customerEmail: 'mobile@taskilo.de',
      customerName: 'Mobile Team',
      priority: 'high' as const,
      category: 'technical' as const,
      status: 'open' as const,
      tags: ['mobile', 'crash'],
      comments: [],
    },
    {
      title: 'Invoice Generation Failed',
      description:
        'Automatic invoice generation is failing for completed orders. Manual intervention required.',
      customerEmail: 'billing@taskilo.de',
      customerName: 'Billing Team',
      priority: 'medium' as const,
      category: 'billing' as const,
      status: 'open' as const,
      tags: ['invoice', 'automation'],
      comments: [],
    },
    {
      title: 'Spam Messages in Chat',
      description:
        'Multiple reports of spam messages in the chat system. Need improved moderation.',
      customerEmail: 'moderation@taskilo.de',
      customerName: 'Community Team',
      priority: 'medium' as const,
      category: 'other' as const,
      status: 'open' as const,
      tags: ['spam', 'moderation'],
      comments: [],
    },
  ];

  try {
    let created = 0;

    for (const ticketData of testTickets) {
      console.log(`📝 Erstelle Ticket: ${ticketData.title}`);

      const ticket = await AWSTicketStorage.createTicket(ticketData);

      if (ticket) {
        created++;
        console.log(`✅ Ticket erstellt: ${ticket.id}`);

        // Füge einen Test-Kommentar hinzu
        await AWSTicketStorage.addComment(ticket.id, {
          content: 'Automatischer Test-Kommentar vom System',
          author: 'System',
          authorType: 'system',
          isInternal: false,
        });

        // Simuliere verschiedene Status für bessere Analytics
        if (created % 3 === 0) {
          await AWSTicketStorage.updateTicket(ticket.id, {
            status: 'in-progress',
            assignedTo: 'Support Team',
          });
        } else if (created % 4 === 0) {
          await AWSTicketStorage.updateTicket(ticket.id, {
            status: 'resolved',
            resolvedAt: new Date().toISOString(),
            assignedTo: 'Admin',
          });
        }
      }

      // Kurze Pause zwischen Tickets
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`🎉 Erfolgreich ${created} Test-Tickets erstellt!`);
    console.log('📊 Analytics Dashboard sollte jetzt Daten anzeigen...');

    // Test Analytics abrufen
    console.log('\n🔍 Teste Analytics...');
    const tickets = await AWSTicketStorage.getTickets({ limit: 100 });
    console.log(`📈 Gefundene Tickets in DynamoDB: ${tickets.length}`);

    const analytics = await AWSTicketStorage.getTicketAnalytics(30);
    console.log('📊 Analytics Zusammenfassung:');
    console.log(`- Total Tickets: ${analytics.totalTickets}`);
    console.log(`- Offene Tickets: ${analytics.openTickets}`);
    console.log(`- Geschlossene Tickets: ${analytics.closedTickets}`);
    console.log(`- Kategorien: ${Object.keys(analytics.ticketsByCategory).join(', ')}`);
  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Test-Tickets:', error);
  }
}

// Script ausführen
if (require.main === module) {
  createTestTickets().catch(console.error);
}
