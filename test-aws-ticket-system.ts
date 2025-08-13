// Test AWS DynamoDB Ticket System
import { AWSTicketStorage } from '@/lib/aws-ticket-storage';
import { EnhancedTicketService } from '@/lib/aws-ticket-enhanced';

async function testAWSTicketSystem() {
  try {
    console.log('🚀 Testing Pure AWS Ticket System...');

    // 1. Create test ticket
    console.log('📝 Creating test ticket...');
    const testTicket = await AWSTicketStorage.createTicket({
      title: 'AWS Test Ticket - Keine Firebase Dependencies',
      description:
        'Dies ist ein Test-Ticket um zu zeigen, dass das AWS-System ohne Firebase funktioniert. Es nutzt nur DynamoDB, SES, CloudWatch und Comprehend.',
      priority: 'high',
      category: 'technical',
      status: 'open',
      customerEmail: 'test@taskilo.de',
      customerName: 'AWS Test User',
      tags: ['aws', 'test', 'no-firebase'],
      comments: [],
    });

    console.log('✅ Ticket created:', {
      id: testTicket.id,
      title: testTicket.title,
      priority: testTicket.priority,
      category: testTicket.category,
      aiClassified: testTicket.aiClassified,
      aiSentiment: testTicket.aiSentiment,
      source: 'aws-dynamodb',
    });

    // 2. Add comment
    console.log('💬 Adding comment...');
    const updatedTicket = await AWSTicketStorage.addComment(testTicket.id, {
      author: 'AWS Admin',
      authorType: 'admin',
      content: 'Test-Kommentar für das AWS-System. Alle Daten werden in DynamoDB gespeichert.',
      isInternal: false,
    });

    console.log('✅ Comment added. Total comments:', updatedTicket.comments.length);

    // 3. Update ticket
    console.log('🔄 Updating ticket status...');
    const resolvedTicket = await AWSTicketStorage.updateTicket(testTicket.id, {
      status: 'resolved',
      assignedTo: 'aws-admin@taskilo.de',
    });

    console.log('✅ Ticket updated:', {
      status: resolvedTicket.status,
      assignedTo: resolvedTicket.assignedTo,
      resolvedAt: resolvedTicket.resolvedAt,
    });

    // 4. Get all tickets
    console.log('📋 Getting all tickets...');
    const allTickets = await AWSTicketStorage.getTickets({ limit: 10 });

    console.log('✅ Found tickets:', allTickets.length);
    console.log(
      'Recent tickets:',
      allTickets.slice(0, 3).map(t => ({
        id: t.id,
        title: t.title.substring(0, 50) + '...',
        status: t.status,
        created: t.createdAt,
      }))
    );

    // 5. Get analytics
    console.log('📊 Getting analytics...');
    const analytics = await AWSTicketStorage.getTicketAnalytics(30);

    console.log('✅ Analytics:', {
      totalTickets: analytics.totalTickets,
      openTickets: analytics.openTickets,
      closedTickets: analytics.closedTickets,
      resolutionRate: analytics.resolutionRate.toFixed(1) + '%',
      categories: Object.keys(analytics.categoryDistribution),
      priorities: Object.keys(analytics.priorityDistribution),
    });

    console.log('🎉 AWS Ticket System Test erfolgreich abgeschlossen!');
    console.log('✨ Alle Features funktionieren ohne Firebase Dependencies');

    return {
      success: true,
      testTicketId: testTicket.id,
      analytics,
      message: 'AWS Ticket System vollständig funktional',
    };
  } catch (error) {
    console.error('❌ AWS Ticket System Test failed:', error);
    return {
      success: false,
      error: error.message,
      message: 'AWS Ticket System Test fehlgeschlagen',
    };
  }
}

// Export für API-Tests
export { testAWSTicketSystem };

// Test direkt ausführen wenn Skript direkt aufgerufen wird
if (require.main === module) {
  testAWSTicketSystem().then(result => {
    console.log('\n🔍 Final Result:', result);
    process.exit(result.success ? 0 : 1);
  });
}
