// Revolut Business API TypeScript Interfaces
// Based on: https://developer.revolut.com/docs/business/business-api

export interface RevolutAccount {
  id: string;
  name: string;
  balance: number;
  currency: string;
  state: 'active' | 'inactive';
  public: boolean;
  created_at: string;
  updated_at: string;
}

export interface RevolutCounterparty {
  id: string;
  name: string;
  profile_type: 'business' | 'personal';
  country: string;
  created_at: string;
  updated_at: string;
  accounts: RevolutCounterpartyAccount[];
}

export interface RevolutCounterpartyAccount {
  id: string;
  name?: string;
  bank_country: string;
  currency: string;
  type: 'revolut' | 'external';
  account_no?: string;
  iban?: string;
  sort_code?: string;
  routing_number?: string;
  bic?: string;
  recipient_charges?: 'no' | 'expected';
}

export interface RevolutTransaction {
  id: string;
  type:
    | 'atm'
    | 'card_payment'
    | 'card_refund'
    | 'card_chargeback'
    | 'card_credit'
    | 'exchange'
    | 'transfer'
    | 'loan'
    | 'fee'
    | 'refund'
    | 'topup'
    | 'topup_return'
    | 'tax'
    | 'tax_refund';
  request_id?: string;
  state: 'pending' | 'completed' | 'declined' | 'failed' | 'reverted';
  reason_code?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  scheduled_for?: string;
  related_transaction_id?: string;
  reference?: string;
  legs: RevolutTransactionLeg[];
  card?: RevolutCard;
  merchant?: RevolutMerchant;
}

export interface RevolutTransactionLeg {
  leg_id: string;
  account_id: string;
  counterparty?: RevolutCounterparty;
  amount: number;
  currency: string;
  bill_amount?: number;
  bill_currency?: string;
  description?: string;
  balance?: number;
  fee?: number;
  exchange_rate?: number;
}

export interface RevolutCard {
  card_id: string;
  last_digits: string;
  cardholder_name: string;
}

export interface RevolutMerchant {
  name: string;
  city: string;
  category_code: string;
  country: string;
}

export interface RevolutPayment {
  id: string;
  state: 'pending' | 'completed' | 'declined' | 'failed';
  created_at: string;
  completed_at?: string;
  reference?: string;
  reason_code?: string;
  amount: number;
  currency: string;
  account_id: string;
  counterparty: RevolutCounterparty;
  charge_bearer?: 'debtor' | 'creditor' | 'shared';
  schedule_for?: string;
}

export interface RevolutWebhook {
  url: string;
  events: RevolutWebhookEvent[];
}

export type RevolutWebhookEvent =
  | 'TransactionCreated'
  | 'TransactionStateChanged'
  | 'PaymentCreated'
  | 'PaymentStateChanged'
  | 'PayoutLinkCreated'
  | 'PayoutLinkStateChanged';

// Revolut OAuth & Authentication
export interface RevolutOAuthToken {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

export interface RevolutAuthUser {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt: Date;
  scopes: string[];
  createdAt: Date;
  lastRefresh: Date;
}

// Revolut Business Profile
export interface RevolutBusinessProfile {
  id: string;
  name: string;
  website?: string;
  phone?: string;
  address?: {
    street_line_1: string;
    street_line_2?: string;
    region?: string;
    city: string;
    country: string;
    postcode: string;
  };
  registration_number?: string;
  created_at: string;
  updated_at: string;
}

// API Request/Response Types
export interface RevolutApiResponse<T = any> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    total_count?: number;
    page?: number;
    per_page?: number;
  };
}

export interface RevolutCreatePaymentRequest {
  request_id: string;
  account_id: string;
  counterparty_id?: string;
  counterparty?: {
    account_id?: string;
    name?: string;
    phone?: string;
    email?: string;
    profile_type?: 'business' | 'personal';
    country?: string;
  };
  amount: number;
  currency: string;
  reference?: string;
  charge_bearer?: 'debtor' | 'creditor' | 'shared';
  schedule_for?: string;
}

export interface RevolutCreateCounterpartyRequest {
  name: string;
  profile_type: 'business' | 'personal';
  phone?: string;
  email?: string;
  country: string;
  individual_name?: {
    first_name: string;
    last_name: string;
  };
  company_name?: string;
}

// Taskilo-specific extensions
export interface RevolutConnectionConfig {
  companyId: string;
  companyEmail: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt: Date;
  connectedAccounts: string[];
  webhookUrl?: string;
  isActive: boolean;
  lastSync: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredRevolutConnection {
  revolutConnectionId: string;
  companyId: string;
  companyEmail: string;
  businessProfile?: RevolutBusinessProfile;
  connectionStatus: 'active' | 'inactive' | 'pending' | 'error';
  accountsCount: number;
  lastSync: Date;
  createdAt: Date;
  updatedAt: Date;
  authConfig: RevolutAuthUser;
  webhookId?: string;
}

export interface StoredRevolutAccount {
  revolutAccountId: string;
  accountName: string;
  balance: number;
  currency: string;
  accountState: 'active' | 'inactive';
  isPublic: boolean;
  connectionId: string;
  companyId: string;
  lastUpdated: Date;
  isDefault: boolean;
}
