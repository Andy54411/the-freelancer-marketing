export interface EmailConfig {
  id: string;
  name: string;
  email: string;
  provider: 'gmail' | 'outlook' | 'custom' | 'aws-workmail';
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
  };
  imap: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
  };
  isActive: boolean;
  status: 'connected' | 'error' | 'testing' | 'disconnected';
  lastTested: string;
  createdAt: string;
  updatedAt?: string;
  tokens?: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  };
  userInfo?: {
    id: string;
    email: string;
    name: string;
    picture?: string;
  };
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: 'invoice' | 'quote' | 'reminder' | 'custom';
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmailSettings {
  defaultFrom: string;
  signature: string;
  autoReply: boolean;
  autoReplyMessage: string;
  trackOpens: boolean;
  trackClicks: boolean;
}