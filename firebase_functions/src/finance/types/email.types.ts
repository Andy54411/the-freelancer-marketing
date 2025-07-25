// firebase_functions/src/finance/types/email.types.ts

import { Timestamp } from 'firebase-admin/firestore';

export type EmailType = 
  | 'INVOICE'           // Rechnung
  | 'REMINDER'          // Mahnung
  | 'PAYMENT_RECEIVED'  // Zahlungseingang
  | 'OVERDUE_NOTICE'    // Überfälligkeitshinweis
  | 'RECURRING_NOTICE'  // Ankündigung wiederkehrender Rechnung
  | 'STATEMENT';        // Kontoauszug

export type EmailStatus = 
  | 'DRAFT'             // Entwurf
  | 'QUEUED'            // In Warteschlange
  | 'SENDING'           // Wird gesendet
  | 'SENT'              // Gesendet
  | 'DELIVERED'         // Zugestellt
  | 'OPENED'            // Geöffnet
  | 'CLICKED'           // Link geklickt
  | 'BOUNCED'           // Zustellung fehlgeschlagen
  | 'COMPLAINED'        // Als Spam markiert
  | 'FAILED';           // Fehler beim Senden

export interface EmailTemplate {
  id: string;
  companyId: string;
  
  // Template-Details
  type: EmailType;
  name: string;
  description?: string;
  
  // E-Mail-Inhalt
  subject: string;
  htmlBody: string;
  textBody?: string;
  
  // Anhänge
  attachments: {
    name: string;
    type: 'PDF' | 'DOCUMENT' | 'IMAGE';
    required: boolean;
  }[];
  
  // Placeholder-Variablen
  variables: {
    key: string;
    description: string;
    required: boolean;
    defaultValue?: string;
  }[];
  
  // Standard-Template?
  isDefault: boolean;
  isActive: boolean;
  
  // Sprache
  language: 'de' | 'en' | 'fr' | 'es';
  
  // Metadaten
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

export interface EmailCampaign {
  id: string;
  companyId: string;
  
  // Campaign-Details
  name: string;
  description?: string;
  type: EmailType;
  templateId: string;
  
  // Empfänger
  recipients: {
    customerId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    variables?: Record<string, string>;
  }[];
  
  // Zeitplanung
  scheduledAt?: Timestamp;
  sendImmediately: boolean;
  
  // Status
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  
  // Statistiken
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  complaintsCount: number;
  
  // Fehlerbehandlung
  failedRecipients: {
    email: string;
    error: string;
    retryCount: number;
  }[];
  
  // Metadaten
  createdAt: Timestamp;
  updatedAt: Timestamp;
  sentAt?: Timestamp;
  completedAt?: Timestamp;
  createdBy: string;
}

export interface EmailDelivery {
  id: string;
  companyId: string;
  
  // Zuordnung
  campaignId?: string;
  invoiceId?: string;
  customerId?: string;
  
  // E-Mail-Details
  type: EmailType;
  templateId?: string;
  
  // Empfänger
  recipientEmail: string;
  recipientName?: string;
  
  // Inhalt
  subject: string;
  htmlBody: string;
  textBody?: string;
  
  // Anhänge
  attachments: {
    name: string;
    url: string;
    size: number;
    mimeType: string;
  }[];
  
  // Delivery-Status
  status: EmailStatus;
  
  // Provider-Details
  provider: 'RESEND' | 'SENDGRID' | 'MAILGUN' | 'SES' | 'OTHER';
  providerMessageId?: string;
  providerResponse?: Record<string, any>;
  
  // Tracking
  sentAt?: Timestamp;
  deliveredAt?: Timestamp;
  openedAt?: Timestamp;
  clickedAt?: Timestamp;
  bouncedAt?: Timestamp;
  
  // Retry-Logik
  attempts: number;
  maxAttempts: number;
  nextRetryAt?: Timestamp;
  
  // Fehlerbehandlung
  errorCode?: string;
  errorMessage?: string;
  bounceReason?: string;
  
  // Metadaten
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface EmailSettings {
  companyId: string;
  
  // SMTP-Konfiguration
  smtp: {
    enabled: boolean;
    host?: string;
    port?: number;
    secure?: boolean;
    username?: string;
    password?: string;  // Verschlüsselt
  };
  
  // Provider-Konfiguration
  providers: {
    resend?: {
      enabled: boolean;
      apiKey?: string;  // Verschlüsselt
    };
    sendgrid?: {
      enabled: boolean;
      apiKey?: string;  // Verschlüsselt
    };
    mailgun?: {
      enabled: boolean;
      apiKey?: string;  // Verschlüsselt
      domain?: string;
    };
  };
  
  // Standard-Einstellungen
  defaultProvider: 'RESEND' | 'SENDGRID' | 'MAILGUN' | 'SES' | 'SMTP';
  fromEmail: string;
  fromName: string;
  replyToEmail?: string;
  
  // Bounce & Complaint Handling
  bounceHandling: {
    enabled: boolean;
    maxBounces: number;
    autoDisable: boolean;
  };
  
  // Tracking
  tracking: {
    opens: boolean;
    clicks: boolean;
    unsubscribes: boolean;
  };
  
  // Rate Limiting
  rateLimits: {
    perHour: number;
    perDay: number;
    burstLimit: number;
  };
  
  // Metadaten
  updatedAt: Timestamp;
  updatedBy: string;
}

// Request/Response Types

export interface CreateEmailTemplateRequest {
  type: EmailType;
  name: string;
  description?: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  language?: 'de' | 'en' | 'fr' | 'es';
  isDefault?: boolean;
  
  // Anhänge
  attachments?: {
    name: string;
    type: 'PDF' | 'DOCUMENT' | 'IMAGE';
    required: boolean;
  }[];
  
  // Variablen
  variables?: {
    key: string;
    description: string;
    required: boolean;
    defaultValue?: string;
  }[];
}

export interface UpdateEmailTemplateRequest {
  name?: string;
  description?: string;
  subject?: string;
  htmlBody?: string;
  textBody?: string;
  isActive?: boolean;
  isDefault?: boolean;
  
  attachments?: {
    name: string;
    type: 'PDF' | 'DOCUMENT' | 'IMAGE';
    required: boolean;
  }[];
  
  variables?: {
    key: string;
    description: string;
    required: boolean;
    defaultValue?: string;
  }[];
}

export interface SendEmailRequest {
  templateId?: string;
  type: EmailType;
  
  // Empfänger
  recipientEmail: string;
  recipientName?: string;
  
  // Zuordnung
  invoiceId?: string;
  customerId?: string;
  
  // Template-Variablen
  variables?: Record<string, string>;
  
  // Custom Content (wenn kein Template)
  subject?: string;
  htmlBody?: string;
  textBody?: string;
  
  // Anhänge
  attachments?: {
    name: string;
    content: Buffer | string;
    mimeType: string;
  }[];
  
  // Optionen
  scheduledAt?: Timestamp;
  priority?: 'LOW' | 'NORMAL' | 'HIGH';
}

export interface CreateEmailCampaignRequest {
  name: string;
  description?: string;
  type: EmailType;
  templateId: string;
  
  // Empfänger
  recipients: {
    customerId?: string;
    email: string;
    firstName?: string;
    lastName?: string;
    variables?: Record<string, string>;
  }[];
  
  // Zeitplanung
  scheduledAt?: Timestamp;
  sendImmediately?: boolean;
}

export interface EmailSearchFilters {
  type?: EmailType[];
  status?: EmailStatus[];
  dateFrom?: Timestamp;
  dateTo?: Timestamp;
  customerId?: string;
  invoiceId?: string;
  searchTerm?: string;
}

export interface EmailStatistics {
  total: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complaints: number;
  
  rates: {
    deliveryRate: number;      // %
    openRate: number;          // %
    clickRate: number;         // %
    bounceRate: number;        // %
    complaintRate: number;     // %
  };
  
  byType: {
    type: EmailType;
    count: number;
    delivered: number;
    opened: number;
  }[];
  
  thisMonth: {
    sent: number;
    delivered: number;
    opened: number;
  };
}
