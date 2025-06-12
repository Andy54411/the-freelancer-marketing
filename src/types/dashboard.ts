// src/types/dashboard.ts

export interface SavedPaymentMethod {
    id: string;
    brand?: string;
    last4?: string;
    exp_month?: number;
    exp_year?: number;
    type: string;
}

export interface SavedAddress {
    id: string;
    name: string;
    line1: string;
    line2?: string;
    city: string;
    postal_code: string;
    country: string;
    isDefault?: boolean;
    type?: 'billing' | 'shipping' | 'other';
}

export interface UserProfileData {
    firstname: string;
    stripeCustomerId?: string;
    savedPaymentMethods?: SavedPaymentMethod[];
    savedAddresses?: SavedAddress[];
    [key: string]: unknown;
}

export interface OrderListItem {
    id: string;
    selectedSubcategory: string;
    status: string;
    totalPriceInCents: number;
    jobDateFrom?: string;
    jobTimePreference?: string;
}