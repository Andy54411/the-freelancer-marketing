// Pure AWS DynamoDB Ticket Storage - Keine Firebase Dependencies
import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  ScanCommand,
  QueryCommand,
  BatchWriteItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { EnhancedTicketService } from './aws-ticket-enhanced';

const dynamodb = new DynamoDBClient({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const TABLE_NAME = 'taskilo-tickets';

export interface TicketData {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'bug' | 'feature' | 'support' | 'technical' | 'billing' | 'account' | 'other';
  assignedTo?: string;
  reportedBy?: string;
  customerEmail?: string;
  customerName?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  tags: string[];

  // AI Enhanced Fields
  aiClassified?: boolean;
  aiSentiment?: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED';
  aiConfidence?: number;
  aiUrgencyScore?: number;
  aiKeyPhrases?: string[];

  // Performance Tracking
  firstResponseAt?: string;
  slaTarget?: number; // in hours
  escalated?: boolean;

  // Comments als JSON array
  comments: TicketComment[];
}

export interface TicketComment {
  id: string;
  author: string;
  authorType: 'admin' | 'customer' | 'system' | 'ai';
  content: string;
  timestamp: string;
  isInternal: boolean;
  attachments?: string[];
}

export class AWSTicketStorage {
  // Create new ticket
  static async createTicket(
    ticketData: Omit<TicketData, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<TicketData> {
    const id = `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const ticket: TicketData = {
      id,
      createdAt: now,
      updatedAt: now,
      comments: [],
      tags: [],
      ...ticketData,
    };

    // Add system comment
    ticket.comments.push({
      id: `comment_${Date.now()}`,
      author: 'System',
      authorType: 'system',
      content: `Ticket erstellt - Status: ${ticket.status}, Priorität: ${ticket.priority}`,
      timestamp: now,
      isInternal: true,
    });

    try {
      // Auto-classify with AI if enabled
      if (ticketData.title && ticketData.description) {
        const classification = await EnhancedTicketService.autoClassifyTicket(
          ticketData.title,
          ticketData.description
        );

        ticket.aiClassified = true;
        ticket.aiSentiment = classification.sentiment;
        ticket.aiConfidence = classification.confidence;
        ticket.aiUrgencyScore = this.calculateUrgencyScore(classification);
        ticket.aiKeyPhrases = classification.keyPhrases;

        // Update priority if AI suggests higher priority
        if (classification.priority !== 'medium' && classification.confidence > 0.7) {
          ticket.priority = classification.priority;
        }

        // Add AI classification comment
        ticket.comments.push({
          id: `comment_ai_${Date.now()}`,
          author: 'AI Classifier',
          authorType: 'ai',
          content: `KI-Klassifizierung: ${classification.category} | Sentiment: ${classification.sentiment} | Konfidenz: ${Math.round(classification.confidence * 100)}%`,
          timestamp: now,
          isInternal: true,
        });
      }

      // Store in DynamoDB
      const command = new PutItemCommand({
        TableName: TABLE_NAME,
        Item: marshall({
          ...ticket,
          type: 'ticket', // For GSI filtering
          sk: `ticket#${id}`, // Sort key for range queries
        }),
      });

      await dynamodb.send(command);

      // Log to CloudWatch
      await EnhancedTicketService.logToCloudWatch(
        'tickets',
        {
          action: 'ticket_created',
          ticketId: ticket.id,
          category: ticket.category,
          priority: ticket.priority,
          aiClassified: ticket.aiClassified,
          sentiment: ticket.aiSentiment,
        },
        'INFO'
      );

      // Send notification
      await EnhancedTicketService.sendTicketNotification(ticket as any, 'created');

      return ticket;
    } catch (error) {
      console.error('Error creating ticket:', error);
      await EnhancedTicketService.logToCloudWatch(
        'tickets-errors',
        {
          action: 'ticket_create_failed',
          error: error.message,
          ticketData: { title: ticketData.title, category: ticketData.category },
        },
        'ERROR'
      );
      throw error;
    }
  }

  // Get ticket by ID
  static async getTicket(id: string): Promise<TicketData | null> {
    try {
      const command = new GetItemCommand({
        TableName: TABLE_NAME,
        Key: marshall({ id }),
      });

      const result = await dynamodb.send(command);

      if (!result.Item) {
        return null;
      }

      return unmarshall(result.Item) as TicketData;
    } catch (error) {
      console.error('Error getting ticket:', error);
      throw error;
    }
  }

  // Update ticket
  static async updateTicket(id: string, updates: Partial<TicketData>): Promise<TicketData> {
    try {
      const existing = await this.getTicket(id);
      if (!existing) {
        throw new Error('Ticket nicht gefunden');
      }

      const updatedTicket = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      // Track resolution time
      if (updates.status === 'resolved' || updates.status === 'closed') {
        if (!existing.resolvedAt) {
          updatedTicket.resolvedAt = new Date().toISOString();
        }
      }

      const command = new PutItemCommand({
        TableName: TABLE_NAME,
        Item: marshall({
          ...updatedTicket,
          type: 'ticket',
          sk: `ticket#${id}`,
        }),
      });

      await dynamodb.send(command);

      // Log to CloudWatch
      await EnhancedTicketService.logToCloudWatch(
        'tickets',
        {
          action: 'ticket_updated',
          ticketId: id,
          updates: Object.keys(updates),
          newStatus: updatedTicket.status,
          duration: existing.resolvedAt
            ? new Date(updatedTicket.resolvedAt!).getTime() - new Date(existing.createdAt).getTime()
            : 0,
        },
        'INFO'
      );

      // Send notification for important updates
      if (updates.status || updates.assignedTo) {
        await EnhancedTicketService.sendTicketNotification(updatedTicket as any, 'updated');
      }

      return updatedTicket;
    } catch (error) {
      console.error('Error updating ticket:', error);
      await EnhancedTicketService.logToCloudWatch(
        'tickets-errors',
        {
          action: 'ticket_update_failed',
          ticketId: id,
          error: error.message,
        },
        'ERROR'
      );
      throw error;
    }
  }

  // Add comment to ticket
  static async addComment(
    ticketId: string,
    comment: Omit<TicketComment, 'id' | 'timestamp'>
  ): Promise<TicketData> {
    try {
      const ticket = await this.getTicket(ticketId);
      if (!ticket) {
        throw new Error('Ticket nicht gefunden');
      }

      const newComment: TicketComment = {
        id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        ...comment,
      };

      ticket.comments.push(newComment);

      // Update first response time if this is the first admin response
      if (comment.authorType === 'admin' && !ticket.firstResponseAt) {
        ticket.firstResponseAt = newComment.timestamp;
      }

      const updatedTicket = await this.updateTicket(ticketId, {
        comments: ticket.comments,
        firstResponseAt: ticket.firstResponseAt,
      });

      // Send notification for non-internal comments
      if (!comment.isInternal) {
        await EnhancedTicketService.sendTicketNotification(
          updatedTicket as any,
          'commented',
          newComment as any
        );
      }

      return updatedTicket;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  // Get all tickets with filters
  static async getTickets(filters?: {
    status?: string;
    priority?: string;
    category?: string;
    assignedTo?: string;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<TicketData[]> {
    try {
      let filterExpression = '#type = :type';
      const expressionAttributeNames = { '#type': 'type' };
      const expressionAttributeValues = { ':type': 'ticket' };

      // Add filters
      if (filters?.status) {
        filterExpression += ' AND #status = :status';
        expressionAttributeNames['#status'] = 'status';
        expressionAttributeValues[':status'] = filters.status;
      }

      if (filters?.priority) {
        filterExpression += ' AND priority = :priority';
        expressionAttributeValues[':priority'] = filters.priority;
      }

      if (filters?.category) {
        filterExpression += ' AND category = :category';
        expressionAttributeValues[':category'] = filters.category;
      }

      if (filters?.assignedTo) {
        filterExpression += ' AND assignedTo = :assignedTo';
        expressionAttributeValues[':assignedTo'] = filters.assignedTo;
      }

      if (filters?.startDate) {
        filterExpression += ' AND createdAt >= :startDate';
        expressionAttributeValues[':startDate'] = filters.startDate;
      }

      if (filters?.endDate) {
        filterExpression += ' AND createdAt <= :endDate';
        expressionAttributeValues[':endDate'] = filters.endDate;
      }

      const command = new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: filterExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: marshall(expressionAttributeValues),
        Limit: filters?.limit || 50,
      });

      const result = await dynamodb.send(command);
      const tickets = (result.Items?.map(item => unmarshall(item)) as TicketData[]) || [];

      // Sort by creation date (newest first)
      tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return tickets;
    } catch (error) {
      console.error('Error getting tickets:', error);
      throw error;
    }
  }

  // Delete ticket (soft delete - mark as deleted)
  static async deleteTicket(id: string): Promise<boolean> {
    try {
      await this.updateTicket(id, {
        status: 'closed',
        updatedAt: new Date().toISOString(),
        tags: ['deleted'], // Mark as deleted
      });

      await EnhancedTicketService.logToCloudWatch(
        'tickets',
        {
          action: 'ticket_deleted',
          ticketId: id,
        },
        'INFO'
      );

      return true;
    } catch (error) {
      console.error('Error deleting ticket:', error);
      return false;
    }
  }

  // Analytics helper
  static async getTicketAnalytics(days: number = 30): Promise<any> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const tickets = await this.getTickets({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      limit: 1000,
    });

    return this.calculateAnalytics(tickets);
  }

  // Calculate urgency score from AI classification
  private static calculateUrgencyScore(classification: any): number {
    let score = 50; // Base score

    // Priority impact
    if (classification.priority === 'urgent') score += 30;
    else if (classification.priority === 'high') score += 15;
    else if (classification.priority === 'low') score -= 15;

    // Sentiment impact
    if (classification.sentiment === 'NEGATIVE') score += 20;
    else if (classification.sentiment === 'POSITIVE') score -= 10;

    // Confidence impact
    score += (classification.confidence - 0.5) * 20;

    return Math.max(0, Math.min(100, score));
  }

  // Calculate analytics from ticket data
  private static calculateAnalytics(tickets: TicketData[]): any {
    const total = tickets.length;
    const open = tickets.filter(t => t.status === 'open' || t.status === 'in-progress').length;
    const closed = tickets.filter(t => t.status === 'closed' || t.status === 'resolved').length;

    const priorityDist = tickets.reduce(
      (acc, t) => {
        acc[t.priority] = (acc[t.priority] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const categoryDist = tickets.reduce(
      (acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const sentimentDist = tickets.reduce(
      (acc, t) => {
        const sentiment = t.aiSentiment || 'NEUTRAL';
        acc[sentiment] = (acc[sentiment] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalTickets: total,
      openTickets: open,
      closedTickets: closed,
      resolutionRate: total > 0 ? (closed / total) * 100 : 0,
      priorityDistribution: priorityDist,
      categoryDistribution: categoryDist,
      sentimentDistribution: sentimentDist,
    };
  }
}
