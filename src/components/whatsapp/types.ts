// WhatsApp Types für alle Komponenten
// Diese Types sind mit dem WhatsAppService kompatibel

export interface WhatsAppConnection {
  phoneNumber: string;
  isConnected: boolean;
  connectedAt?: string;
  accessToken?: string;
  phoneNumberId?: string;
  tokenExpiresAt?: string;
  status?: string;
}

export interface ChatTag {
  id: string;
  name: string;
  color: string;
}

export interface ChatHistoryEntry {
  id: string;
  date: Date;
  action: 'opened' | 'closed' | 'handled' | 'assigned' | 'tagged';
  agent: string;
  tags: string[];
}

export interface ContactInfo {
  id?: string;
  customerId?: string;
  customerNumber?: string;
  name?: string;
  email?: string;
  phone: string;
  address?: string;
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  company?: string;
  website?: string;
  notes?: string;
  taxNumber?: string;
  vatId?: string;
  industry?: string;
  legalForm?: string;
  tags?: string[];
  totalInvoices?: number;
  totalAmount?: number;
  customerSince?: string | Date;
  lastActivity?: string | Date;
  totalChats?: number;
  customerLink?: string;
}

export type ChatStatus = 'open' | 'waiting_on_me' | 'waiting_on_user' | 'closed' | 'archived';

// WhatsAppMessage - Kompatibel mit WhatsAppService
export interface WhatsAppMessage {
  id?: string;
  companyId?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  waId?: string;
  direction: 'inbound' | 'outbound';
  status?: 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | string;
  body: string;
  messageId?: string;
  messageType?: string;
  mediaId?: string;
  mediaUrl?: string;
  templateName?: string;
  createdAt: Date | string | { seconds: number; nanoseconds: number };
  updatedAt?: Date | string | { seconds: number; nanoseconds: number };
  isRead?: boolean;
}

// WhatsAppChat - Kompatibel mit WhatsAppService.getChats()
export interface WhatsAppChat {
  phone: string;
  customerId?: string;
  customerName?: string;
  lastMessage: WhatsAppMessage;
  unreadCount: number;
  status?: ChatStatus;
  assignedTo?: string;
  lastInboundAt?: Date;
  lastOutboundAt?: Date;
}

export type ChatFilter = 'open' | 'waiting_on_me' | 'waiting_on_user';
