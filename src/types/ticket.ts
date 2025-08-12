// Ticket-System Typen
export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  assignedTo?: string;
  reportedBy: string;
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  tags: string[];
  attachments?: TicketAttachment[];
  comments: TicketComment[];
}

export interface TicketComment {
  id: string;
  ticketId: string;
  userId: string;
  userDisplayName: string;
  userRole: 'admin' | 'user' | 'company';
  content: string;
  createdAt: Date;
  isInternal: boolean; // Nur für Admins sichtbar
}

export interface TicketAttachment {
  id: string;
  ticketId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: Date;
}

export type TicketStatus =
  | 'open' // Neu/Offen
  | 'in-progress' // In Bearbeitung
  | 'waiting' // Warten auf Antwort
  | 'resolved' // Gelöst
  | 'closed'; // Geschlossen

export type TicketPriority =
  | 'low' // Niedrig
  | 'medium' // Mittel
  | 'high' // Hoch
  | 'urgent'; // Dringend

export type TicketCategory =
  | 'bug' // Bug/Fehler
  | 'feature' // Feature-Request
  | 'support' // Support-Anfrage
  | 'billing' // Abrechnung
  | 'payment' // Zahlungsprobleme
  | 'account' // Account-Probleme
  | 'technical' // Technische Probleme
  | 'feedback' // Feedback
  | 'other'; // Sonstiges

// Ticket-Filter und Sortierung
export interface TicketFilters {
  status?: TicketStatus[];
  priority?: TicketPriority[];
  category?: TicketCategory[];
  assignedTo?: string[];
  reportedBy?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
  searchTerm?: string;
}

export interface TicketSortOptions {
  field: 'createdAt' | 'updatedAt' | 'priority' | 'status' | 'dueDate';
  direction: 'asc' | 'desc';
}

// Ticket-Statistiken für Dashboard
export interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  byPriority: Record<TicketPriority, number>;
  byCategory: Record<TicketCategory, number>;
  avgResolutionTime: number; // in Stunden
  ticketsCreatedToday: number;
  ticketsResolvedToday: number;
}

// Form-Daten für neues Ticket
export interface CreateTicketForm {
  title: string;
  description: string;
  priority: TicketPriority;
  category: TicketCategory;
  assignedTo?: string;
  dueDate?: Date;
  tags: string[];
}

// Form-Daten für Ticket-Update
export interface UpdateTicketForm extends Partial<CreateTicketForm> {
  status?: TicketStatus;
}
