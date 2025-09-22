import { FieldValue } from 'firebase/firestore';

// Basis-Interface für gemeinsame Eigenschaften
export interface BaseItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  sellingPrice: number;
  status: 'active' | 'inactive' | 'discontinued';
  createdAt: Date | FieldValue;
  updatedAt: Date | FieldValue;
  companyId?: string;
}

// Service-spezifisches Interface
export interface ServiceItem extends BaseItem {
  price: number;  // Alias für sellingPrice
  currentStock?: never;
  reservedStock?: never;
  availableStock?: never;
}

// Erweiterte Category-Definition
export interface InventoryCategoryExtended {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  companyId: string;
  itemCount: number;
  totalValue: number;
  lastUpdate: Date | null;
}