// Shared types and interfaces for delivery note templates
export type DeliveryNoteTemplate = 'german-standard' | 'german-multipage';

export interface DeliveryNoteData {
  id: string;
  deliveryNoteNumber: string;
  sequentialNumber?: number;
  date: string;
  deliveryDate: string;
  customerName: string;
  customerAddress: string;
  customerEmail?: string;
  customerId?: string;
  companyId?: string;
  orderNumber?: string;
  customerOrderNumber?: string;
  
  // Company Info (aus Firestore User-Daten)
  companyName: string;
  companyAddress: string;
  companyEmail: string;
  companyPhone: string;
  companyWebsite?: string;
  companyLogo?: string;
  profilePictureURL?: string;
  companyLogoUrl?: string;
  companyVatId?: string;
  companyTaxNumber?: string;
  companyRegister?: string;
  districtCourt?: string;
  legalForm?: string;
  iban?: string;
  accountHolder?: string;
  
  items: DeliveryNoteItemData[];
  
  // Optional pricing
  showPrices?: boolean;
  subtotal?: number;
  tax?: number;
  total?: number;
  vatRate?: number;
  isSmallBusiness?: boolean;
  
  status: 'draft' | 'sent' | 'delivered' | 'cancelled' | 'invoiced';
  notes?: string;
  specialInstructions?: string;
  shippingMethod?: string;
  trackingNumber?: string;
  
  // Template-specific fields
  deliveryTerms?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface DeliveryNoteItemData {
  id: string;
  productId?: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  total?: number;
  stockReduced?: boolean;
  warehouseLocation?: string;
  serialNumbers?: string[];
  notes?: string;
}

export interface DeliveryNoteTemplateProps {
  data: DeliveryNoteData;
  preview?: boolean;
}

// Template Metadata
export interface DeliveryNoteTemplateMetadata {
  id: string;
  name: string;
  description: string;
  component: React.ComponentType<DeliveryNoteTemplateProps>;
  features: string[];
  preview: string;
}
