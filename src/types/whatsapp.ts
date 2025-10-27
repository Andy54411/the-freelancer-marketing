/**
 * WhatsApp Template Types
 */

export interface WhatsAppTemplate {
  id: string;
  companyId: string;
  wabaId?: string;
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  metaTemplateId?: string;
  components: TemplateComponent[];
  variables: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  example?: {
    header_text?: string[];
    body_text?: string[][];
  };
  buttons?: Array<{
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
    text: string;
    url?: string;
    phone_number?: string;
  }>;
}

/**
 * WhatsApp Connection Types
 */

export interface WhatsAppConnection {
  wabaId: string;
  phoneNumberId: string;
  phoneNumber: string;
  displayName: string;
  accessToken: string;
  status: 'active' | 'pending_customer' | 'disconnected';
  assignedCustomerId?: string;
  defaultCountryCode: string;
  connectedAt: string;
  isConnected: boolean;
}
