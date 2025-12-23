/**
 * Firebase Ticket Service
 * 
 * Ersetzt AWS DynamoDB-basiertes Ticket-System
 * Firestore Collection: adminTickets
 */

import { db } from '@/firebase/server';
import { FieldValue } from 'firebase-admin/firestore';

// Ticket Types
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
  comments: TicketComment[];
  
  // Performance Tracking
  firstResponseAt?: string;
  slaTarget?: number;
  escalated?: boolean;
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

const COLLECTION_PATH = 'adminTickets';

export class FirebaseTicketService {
  
  /**
   * Create new ticket
   */
  static async createTicket(
    ticketData: Omit<TicketData, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<TicketData> {
    if (!db) {
      throw new Error('Datenbank nicht verfügbar');
    }
    
    const id = `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const { comments: existingComments, tags: existingTags, ...restTicketData } = ticketData as unknown as {
      comments?: TicketComment[];
      tags?: string[];
      [key: string]: unknown;
    };

    const ticket: TicketData = {
      id,
      createdAt: now,
      updatedAt: now,
      comments: existingComments ?? [],
      tags: existingTags ?? [],
      ...restTicketData,
    } as TicketData;

    // Add system comment
    ticket.comments.push({
      id: `comment_${Date.now()}`,
      author: 'System',
      authorType: 'system',
      content: `Ticket erstellt - Status: ${ticket.status}, Priorität: ${ticket.priority}`,
      timestamp: now,
      isInternal: true,
    });

    await db.collection(COLLECTION_PATH).doc(id).set({
      ...ticket,
      createdAtTimestamp: FieldValue.serverTimestamp(),
      updatedAtTimestamp: FieldValue.serverTimestamp(),
    });

    return ticket;
  }

  /**
   * Get ticket by ID
   */
  static async getTicket(id: string): Promise<TicketData | null> {
    if (!db) {
      throw new Error('Datenbank nicht verfügbar');
    }
    
    const doc = await db.collection(COLLECTION_PATH).doc(id).get();
    
    if (!doc.exists) {
      return null;
    }

    return doc.data() as TicketData;
  }

  /**
   * Update ticket
   */
  static async updateTicket(id: string, updates: Partial<TicketData>): Promise<TicketData> {
    if (!db) {
      throw new Error('Datenbank nicht verfügbar');
    }
    
    const existing = await this.getTicket(id);
    if (!existing) {
      throw new Error('Ticket nicht gefunden');
    }

    const updatedTicket: TicketData = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Track resolution time
    if ((updates.status === 'resolved' || updates.status === 'closed') && !existing.resolvedAt) {
      updatedTicket.resolvedAt = new Date().toISOString();
    }

    await db.collection(COLLECTION_PATH).doc(id).update({
      ...updates,
      updatedAt: updatedTicket.updatedAt,
      resolvedAt: updatedTicket.resolvedAt,
      updatedAtTimestamp: FieldValue.serverTimestamp(),
    });

    return updatedTicket;
  }

  /**
   * Add comment to ticket
   */
  static async addComment(
    ticketId: string,
    comment: Omit<TicketComment, 'id' | 'timestamp'>
  ): Promise<TicketData> {
    if (!db) {
      throw new Error('Datenbank nicht verfügbar');
    }
    
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

    return await this.updateTicket(ticketId, {
      comments: ticket.comments,
      firstResponseAt: ticket.firstResponseAt,
    });
  }

  /**
   * Get all tickets with optional filters
   */
  static async getTickets(filters?: {
    status?: string;
    priority?: string;
    category?: string;
    assignedTo?: string;
    customerEmail?: string;
    limit?: number;
  }): Promise<TicketData[]> {
    if (!db) {
      return [];
    }
    
    let query: FirebaseFirestore.Query = db.collection(COLLECTION_PATH);

    // Apply filters
    if (filters?.status) {
      query = query.where('status', '==', filters.status);
    }
    if (filters?.priority) {
      query = query.where('priority', '==', filters.priority);
    }
    if (filters?.category) {
      query = query.where('category', '==', filters.category);
    }
    if (filters?.assignedTo) {
      query = query.where('assignedTo', '==', filters.assignedTo);
    }
    if (filters?.customerEmail) {
      query = query.where('customerEmail', '==', filters.customerEmail);
    }

    // Limit results
    if (filters?.limit) {
      query = query.limit(filters.limit);
    } else {
      query = query.limit(100);
    }

    const snapshot = await query.get();
    
    return snapshot.docs.map(doc => doc.data() as TicketData);
  }

  /**
   * Delete ticket (soft delete)
   */
  static async deleteTicket(id: string): Promise<void> {
    if (!db) {
      throw new Error('Datenbank nicht verfügbar');
    }
    
    await db.collection(COLLECTION_PATH).doc(id).update({
      status: 'closed',
      deletedAt: new Date().toISOString(),
      updatedAtTimestamp: FieldValue.serverTimestamp(),
    });
  }

  /**
   * Get ticket statistics
   */
  static async getStats(): Promise<{
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    byPriority: Record<string, number>;
    byCategory: Record<string, number>;
  }> {
    if (!db) {
      return {
        total: 0,
        open: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0,
        byPriority: {},
        byCategory: {},
      };
    }
    
    const snapshot = await db.collection(COLLECTION_PATH).get();
    const tickets = snapshot.docs.map(doc => doc.data() as TicketData);

    const stats = {
      total: tickets.length,
      open: tickets.filter(t => t.status === 'open').length,
      inProgress: tickets.filter(t => t.status === 'in-progress').length,
      resolved: tickets.filter(t => t.status === 'resolved').length,
      closed: tickets.filter(t => t.status === 'closed').length,
      byPriority: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
    };

    // Count by priority
    for (const ticket of tickets) {
      stats.byPriority[ticket.priority] = (stats.byPriority[ticket.priority] || 0) + 1;
      stats.byCategory[ticket.category] = (stats.byCategory[ticket.category] || 0) + 1;
    }

    return stats;
  }

  /**
   * Search tickets
   */
  static async searchTickets(searchTerm: string): Promise<TicketData[]> {
    if (!db) {
      return [];
    }
    
    // Firestore does not support full-text search
    // Get all tickets and filter client-side
    const allTickets = await this.getTickets({ limit: 500 });
    const lowerSearch = searchTerm.toLowerCase();

    return allTickets.filter(ticket =>
      ticket.title.toLowerCase().includes(lowerSearch) ||
      ticket.description.toLowerCase().includes(lowerSearch) ||
      ticket.customerEmail?.toLowerCase().includes(lowerSearch) ||
      ticket.customerName?.toLowerCase().includes(lowerSearch)
    );
  }

  /**
   * Get tickets by customer email
   */
  static async getTicketsByCustomer(customerEmail: string): Promise<TicketData[]> {
    return this.getTickets({ customerEmail });
  }

  /**
   * Assign ticket to admin
   */
  static async assignTicket(ticketId: string, adminId: string, adminName: string): Promise<TicketData> {
    const ticket = await this.getTicket(ticketId);
    if (!ticket) {
      throw new Error('Ticket nicht gefunden');
    }

    // Add assignment comment
    await this.addComment(ticketId, {
      author: 'System',
      authorType: 'system',
      content: `Ticket zugewiesen an: ${adminName}`,
      isInternal: true,
    });

    return await this.updateTicket(ticketId, {
      assignedTo: adminId,
      status: ticket.status === 'open' ? 'in-progress' : ticket.status,
    });
  }

  /**
   * Escalate ticket
   */
  static async escalateTicket(ticketId: string, reason: string): Promise<TicketData> {
    await this.addComment(ticketId, {
      author: 'System',
      authorType: 'system',
      content: `Ticket eskaliert: ${reason}`,
      isInternal: true,
    });

    return await this.updateTicket(ticketId, {
      escalated: true,
      priority: 'urgent',
    });
  }
}

// Export alias for backward compatibility
export { FirebaseTicketService as TicketService };
