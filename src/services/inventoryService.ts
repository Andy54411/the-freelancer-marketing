'use client';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  writeBatch,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/firebase/clients';

// Gewichts- und Volumeneinheiten für Inventur
export type WeightVolumeUnit = 'kg' | 'g' | 'mg' | 'L' | 'ml' | 'cl' | 'm' | 'cm' | 'mm' | 'Stück';

// Verkaufs-/Lagereinheiten
export type SalesUnit = 'Stück' | 'Flasche' | 'Dose' | 'Packung' | 'Karton' | 'Kiste' | 'Palette' | 'Beutel' | 'Sack' | 'Rolle' | 'Meter' | 'Liter' | 'kg';

// Verpackungshierarchie für Gebinde (z.B. 0,33L Flaschen in 24er Kasten)
export interface PackagingUnit {
  name: string; // z.B. "6er-Pack", "24er-Kasten", "Palette"
  quantity: number; // Anzahl der Basiseinheiten pro Verpackung
  barcode?: string; // EAN für diese Verpackungseinheit
  weight?: number; // Gewicht der Verpackungseinheit inkl. Verpackung
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'mm' | 'm';
  };
}

export interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  sku: string; // Artikelnummer/SKU
  category: string;
  unit: string; // Basiseinheit (Stück, Flasche, Dose, etc.)
  currentStock: number; // Bestand in Basiseinheiten
  reservedStock: number; // Reserviert für offene Angebote
  availableStock: number; // currentStock - reservedStock
  minStock: number; // Mindestbestand
  maxStock?: number; // Maximalbestand
  purchasePrice: number; // Einkaufspreis pro Basiseinheit
  sellingPrice: number; // Verkaufspreis pro Basiseinheit
  supplierName?: string;
  supplierId?: string; // Referenz zum Lieferanten in customers Collection
  supplierEmail?: string; // E-Mail für Nachbestellungen
  supplierContact?: string;
  location?: string; // Lagerort
  barcode?: string; // EAN/Barcode der Basiseinheit
  image?: string;
  images?: string[]; // Array für mehrere Artikelbilder
  status: 'active' | 'inactive' | 'discontinued';
  createdAt: Date;
  updatedAt: Date;
  companyId: string;

  // === INHALT PRO EINHEIT (für Flaschen, Dosen, etc.) ===
  contentAmount?: number; // Inhaltsmenge pro Basiseinheit (z.B. 0.33, 0.5, 1)
  contentUnit?: WeightVolumeUnit; // Einheit des Inhalts (L, ml, kg, g, etc.)
  totalContent?: number; // Gesamtinhalt (berechnet: contentAmount * currentStock)
  
  // === VERPACKUNGSHIERARCHIE ===
  packagingUnits?: PackagingUnit[]; // z.B. [{name: "6er-Pack", quantity: 6}, {name: "Kasten", quantity: 24}]
  
  // === GEWICHT/VOLUMEN DER VERPACKUNG ===
  unitWeight?: number; // Gewicht pro Basiseinheit inkl. Verpackung (z.B. Flasche mit Inhalt)
  weightUnit?: WeightVolumeUnit; // Einheit für Gewicht (kg, g)
  totalWeight?: number; // Gesamtgewicht (berechnet: unitWeight * currentStock)
  
  // === INVENTUR-FELDER ===
  batchNumber?: string; // Chargennummer / Lot
  expiryDate?: Date; // Mindesthaltbarkeitsdatum (MHD)
  productionDate?: Date; // Herstellungsdatum
  serialNumbers?: string[]; // Seriennummern für einzelne Einheiten
  
  // === ABMESSUNGEN ===
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'mm' | 'm';
  };
  
  // === ZUSÄTZLICHE FELDER ===
  notes?: string;
  taxRate?: number; // Steuersatz (7% oder 19%)
  origin?: string; // Herkunftsland
  manufacturer?: string; // Hersteller

  // Automatisch berechnete Felder
  stockValue: number; // currentStock * purchasePrice
  isLowStock: boolean; // currentStock <= minStock
  isOutOfStock: boolean; // currentStock === 0
}

export interface InventoryStats {
  totalItems: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalCategories: number;
  averageValue: number;
  lastUpdate: Date;
}

export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  type: 'in' | 'out' | 'adjustment' | 'transfer';
  quantity: number;
  previousStock: number;
  newStock: number;
  unit: string;
  reason?: string;
  reference?: string; // Referenz zu Bestellung, Rechnung, etc.
  createdAt: Date;
  createdBy: string;
  companyId: string;
}

export interface InventoryCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  companyId: string;
  itemCount: number;
}

// Konstante für erlaubte Gewichts-/Volumeneinheiten (für Inhalt und Gewicht)
export const WEIGHT_VOLUME_UNITS: { value: WeightVolumeUnit; label: string; type: 'weight' | 'volume' | 'length' | 'count' }[] = [
  { value: 'kg', label: 'Kilogramm (kg)', type: 'weight' },
  { value: 'g', label: 'Gramm (g)', type: 'weight' },
  { value: 'mg', label: 'Milligramm (mg)', type: 'weight' },
  { value: 'L', label: 'Liter (L)', type: 'volume' },
  { value: 'ml', label: 'Milliliter (ml)', type: 'volume' },
  { value: 'cl', label: 'Zentiliter (cl)', type: 'volume' },
  { value: 'm', label: 'Meter (m)', type: 'length' },
  { value: 'cm', label: 'Zentimeter (cm)', type: 'length' },
  { value: 'mm', label: 'Millimeter (mm)', type: 'length' },
  { value: 'Stück', label: 'Stück', type: 'count' },
];

// Konstante für Basiseinheiten (Verkaufs-/Lagereinheit)
export const SALES_UNITS: { value: SalesUnit; label: string }[] = [
  { value: 'Stück', label: 'Stück' },
  { value: 'Flasche', label: 'Flasche' },
  { value: 'Dose', label: 'Dose' },
  { value: 'Packung', label: 'Packung' },
  { value: 'Karton', label: 'Karton' },
  { value: 'Kiste', label: 'Kiste/Kasten' },
  { value: 'Palette', label: 'Palette' },
  { value: 'Beutel', label: 'Beutel' },
  { value: 'Sack', label: 'Sack' },
  { value: 'Rolle', label: 'Rolle' },
  { value: 'Meter', label: 'Meter' },
  { value: 'Liter', label: 'Liter' },
  { value: 'kg', label: 'Kilogramm' },
];

// Vordefinierte Verpackungsgrößen für Getränke
export const COMMON_CONTENT_SIZES = [
  { amount: 0.2, unit: 'L', label: '0,2 L (200 ml)' },
  { amount: 0.25, unit: 'L', label: '0,25 L (250 ml)' },
  { amount: 0.33, unit: 'L', label: '0,33 L (330 ml)' },
  { amount: 0.5, unit: 'L', label: '0,5 L (500 ml)' },
  { amount: 0.7, unit: 'L', label: '0,7 L (700 ml)' },
  { amount: 0.75, unit: 'L', label: '0,75 L (750 ml)' },
  { amount: 1, unit: 'L', label: '1 L (1000 ml)' },
  { amount: 1.5, unit: 'L', label: '1,5 L (1500 ml)' },
  { amount: 2, unit: 'L', label: '2 L (2000 ml)' },
];

// Vordefinierte Gebindegrößen
export const COMMON_PACKAGING_SIZES = [
  { name: '6er-Pack', quantity: 6 },
  { name: '12er-Pack', quantity: 12 },
  { name: '20er-Kasten', quantity: 20 },
  { name: '24er-Kasten', quantity: 24 },
  { name: 'Palette (kleine)', quantity: 480 },
  { name: 'Europalette', quantity: 960 },
];

export class InventoryService {
  /**
   * Bild für Inventarartikel hochladen
   */
  static async uploadItemImage(
    companyId: string,
    itemId: string,
    file: File,
    imageIndex: number
  ): Promise<string> {
    try {
      // Validiere Dateityp
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Ungültiger Dateityp. Erlaubt: JPEG, PNG, WebP, GIF');
      }

      // Validiere Dateigröße (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('Datei zu groß. Maximale Größe: 5 MB');
      }

      // Generiere eindeutigen Dateinamen
      const extension = file.name.split('.').pop() || 'jpg';
      const fileName = `${itemId}_${imageIndex}_${Date.now()}.${extension}`;
      const storagePath = `inventory/${companyId}/${itemId}/${fileName}`;

      // Upload zu Firebase Storage
      const storageRef = ref(storage, storagePath);
      const metadata = {
        contentType: file.type,
        customMetadata: {
          companyId,
          itemId,
          imageIndex: String(imageIndex),
          uploadedAt: new Date().toISOString(),
        },
      };

      await uploadBytes(storageRef, file, metadata);
      const downloadUrl = await getDownloadURL(storageRef);

      return downloadUrl;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Bild für Inventarartikel löschen
   */
  static async deleteItemImage(imageUrl: string): Promise<void> {
    try {
      // Extrahiere den Storage-Pfad aus der URL
      const storageRef = ref(storage, imageUrl);
      await deleteObject(storageRef);
    } catch (error) {
      // Wenn das Bild nicht existiert, ignorieren wir den Fehler
      if ((error as any)?.code !== 'storage/object-not-found') {
        throw error;
      }
    }
  }

  /**
   * Berechne Gesamtgewicht/-volumen basierend auf Einzelgewicht und Bestand
   */
  static calculateTotalWeight(unitWeight: number | undefined, currentStock: number): number {
    if (!unitWeight || unitWeight <= 0) return 0;
    return Math.round((unitWeight * currentStock) * 1000) / 1000; // 3 Nachkommastellen
  }

  /**
   * Berechne Gesamtinhalt basierend auf Inhalt pro Einheit und Bestand
   * z.B. 100 Flaschen à 0,33L = 33L Gesamtinhalt
   */
  static calculateTotalContent(contentAmount: number | undefined, currentStock: number): number {
    if (!contentAmount || contentAmount <= 0) return 0;
    return Math.round((contentAmount * currentStock) * 1000) / 1000; // 3 Nachkommastellen
  }

  /**
   * Konvertiere Bestand zwischen Einheiten
   * z.B. 2 Kästen à 24 Flaschen = 48 Flaschen
   */
  static convertToBaseUnits(quantity: number, packagingQuantity: number): number {
    return quantity * packagingQuantity;
  }

  /**
   * Konvertiere Basiseinheiten zu Verpackungseinheiten
   * z.B. 48 Flaschen ÷ 24 = 2 Kästen
   */
  static convertToPackagingUnits(baseQuantity: number, packagingQuantity: number): { full: number; remainder: number } {
    const full = Math.floor(baseQuantity / packagingQuantity);
    const remainder = baseQuantity % packagingQuantity;
    return { full, remainder };
  }

  /**
   * Alle Inventar-Artikel einer Firma abrufen
   */
  static async getInventoryItems(companyId: string): Promise<InventoryItem[]> {
    try {
      // NEUE SUBCOLLECTION STRUKTUR - KEINE orderBy (Projektregeln)
      const itemsQuery = query(
        collection(db, 'companies', companyId, 'inventory')
      );

      const querySnapshot = await getDocs(itemsQuery);
      const items: InventoryItem[] = [];

      querySnapshot.forEach(doc => {
        const data = doc.data();
        const currentStock = data.currentStock || 0;
        const reservedStock = data.reservedStock || 0;
        const availableStock = currentStock - reservedStock;
        const unitWeight = data.unitWeight || 0;
        const contentAmount = data.contentAmount || 0;

        const item: InventoryItem = {
          id: doc.id,
          name: data.name || '',
          description: data.description,
          sku: data.sku || '',
          category: data.category || 'Allgemein',
          unit: data.unit || 'Stück',
          currentStock,
          reservedStock,
          availableStock,
          minStock: data.minStock || 0,
          maxStock: data.maxStock,
          purchasePrice: data.purchasePrice || 0,
          sellingPrice: data.sellingPrice || 0,
          supplierName: data.supplierName,
          supplierId: data.supplierId,
          supplierEmail: data.supplierEmail,
          supplierContact: data.supplierContact,
          location: data.location,
          barcode: data.barcode,
          image: data.image,
          images: data.images || [],
          status: data.status || 'active',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          companyId: data.companyId || companyId,
          // Inhalt pro Einheit (für Flaschen etc.)
          contentAmount: contentAmount,
          contentUnit: data.contentUnit || 'L',
          totalContent: this.calculateTotalContent(contentAmount, currentStock),
          // Verpackungshierarchie
          packagingUnits: data.packagingUnits || [],
          // Gewicht
          unitWeight: unitWeight,
          weightUnit: data.weightUnit || 'kg',
          totalWeight: this.calculateTotalWeight(unitWeight, currentStock),
          // Inventur-Felder
          batchNumber: data.batchNumber,
          expiryDate: data.expiryDate?.toDate(),
          productionDate: data.productionDate?.toDate(),
          serialNumbers: data.serialNumbers,
          dimensions: data.dimensions,
          notes: data.notes,
          // Zusätzliche Felder
          taxRate: data.taxRate,
          origin: data.origin,
          manufacturer: data.manufacturer,
          // Berechnete Felder
          stockValue: currentStock * (data.purchasePrice || 0),
          isLowStock: availableStock <= (data.minStock || 0),
          isOutOfStock: availableStock <= 0,
        };

        items.push(item);
      });

      // Client-seitige Sortierung (keine orderBy in Firestore gemäß Projektregeln)
      items.sort((a, b) => a.name.localeCompare(b.name, 'de'));

      return items;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Einzelnen Inventar-Artikel laden (korrigierte Version mit Subcollection)
   */
  static async getInventoryItemById(companyId: string, itemId: string): Promise<InventoryItem | null> {
    try {
      const itemRef = doc(db, 'companies', companyId, 'inventory', itemId);
      const itemSnapshot = await getDoc(itemRef);

      if (!itemSnapshot.exists()) {
        return null;
      }

      const data = itemSnapshot.data();
      const currentStock = data.currentStock || 0;
      const reservedStock = data.reservedStock || 0;
      const availableStock = currentStock - reservedStock;
      const unitWeight = data.unitWeight || 0;
      const contentAmount = data.contentAmount || 0;

      return {
        id: itemSnapshot.id,
        name: data.name || '',
        description: data.description,
        sku: data.sku || '',
        category: data.category || 'Allgemein',
        unit: data.unit || 'Stück',
        currentStock,
        reservedStock,
        availableStock,
        minStock: data.minStock || 0,
        maxStock: data.maxStock,
        purchasePrice: data.purchasePrice || 0,
        sellingPrice: data.sellingPrice || 0,
        supplierName: data.supplierName,
        supplierId: data.supplierId,
        supplierEmail: data.supplierEmail,
        supplierContact: data.supplierContact,
        location: data.location,
        barcode: data.barcode,
        image: data.image,
        images: data.images || [],
        status: data.status || 'active',
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        companyId: data.companyId || companyId,
        // Inhalt pro Einheit
        contentAmount: contentAmount,
        contentUnit: data.contentUnit || 'L',
        totalContent: this.calculateTotalContent(contentAmount, currentStock),
        // Gewicht
        unitWeight: unitWeight,
        weightUnit: data.weightUnit || 'kg',
        totalWeight: this.calculateTotalWeight(unitWeight, currentStock),
        // Inventur-Felder
        batchNumber: data.batchNumber,
        manufacturer: data.manufacturer,
        taxRate: data.taxRate || 19,
        expiryDate: data.expiryDate?.toDate(),
        serialNumbers: data.serialNumbers,
        dimensions: data.dimensions,
        notes: data.notes,
        stockValue: currentStock * (data.purchasePrice || 0),
        isLowStock: availableStock <= (data.minStock || 0),
        isOutOfStock: availableStock <= 0,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Einzelnen Inventar-Artikel laden (DEPRECATED - verwendet alte Collection)
   */
  static async getInventoryItem(companyId: string, itemId: string): Promise<InventoryItem | null> {
    try {
      const itemRef = doc(db, 'companies', companyId, 'inventory', itemId);
      const itemSnapshot = await getDocs(
        query(
          collection(db, 'inventory'),
          where('__name__', '==', itemId),
          where('companyId', '==', companyId)
        )
      );

      if (itemSnapshot.empty) {
        return null;
      }

      const data = itemSnapshot.docs[0].data();
      const currentStock = data.currentStock || 0;
      const reservedStock = data.reservedStock || 0;
      const availableStock = currentStock - reservedStock;
      const unitWeight = data.unitWeight || 0;

      return {
        id: itemSnapshot.docs[0].id,
        name: data.name || '',
        description: data.description,
        sku: data.sku || '',
        category: data.category || 'Allgemein',
        unit: data.unit || 'Stück',
        currentStock,
        reservedStock,
        availableStock,
        minStock: data.minStock || 0,
        maxStock: data.maxStock,
        purchasePrice: data.purchasePrice || 0,
        sellingPrice: data.sellingPrice || 0,
        supplierName: data.supplierName,
        supplierId: data.supplierId,
        supplierEmail: data.supplierEmail,
        supplierContact: data.supplierContact,
        location: data.location,
        barcode: data.barcode,
        image: data.image,
        images: data.images || [],
        status: data.status || 'active',
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        companyId: data.companyId || companyId,
        // Inventur-Felder
        unitWeight: unitWeight,
        weightUnit: data.weightUnit || 'kg',
        totalWeight: this.calculateTotalWeight(unitWeight, currentStock),
        batchNumber: data.batchNumber,
        expiryDate: data.expiryDate?.toDate(),
        serialNumbers: data.serialNumbers,
        dimensions: data.dimensions,
        notes: data.notes,
        stockValue: currentStock * (data.purchasePrice || 0),
        isLowStock: availableStock <= (data.minStock || 0),
        isOutOfStock: availableStock <= 0,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Inventar-Artikel nach SKU oder Name finden
   */
  static async findInventoryItems(companyId: string, searchTerm: string): Promise<InventoryItem[]> {
    try {
      const itemsRef = collection(db, 'inventory');

      // Suche nach exakter SKU oder Name (case-insensitive)
      const searchLower = searchTerm.toLowerCase();

      // Alle Artikel der Firma laden und dann filtern (Firebase hat begrenzte String-Suche)
      const itemsQuery = query(
        itemsRef,
        where('companyId', '==', companyId),
        where('status', '==', 'active')
      );

      const snapshot = await getDocs(itemsQuery);
      const allItems = snapshot.docs.map(doc => {
        const data = doc.data();
        const currentStock = data.currentStock || 0;
        const reservedStock = data.reservedStock || 0;
        const availableStock = currentStock - reservedStock;

        return {
          id: doc.id,
          name: data.name || '',
          description: data.description,
          sku: data.sku || '',
          category: data.category || 'Allgemein',
          unit: data.unit || 'Stück',
          currentStock,
          reservedStock,
          availableStock,
          minStock: data.minStock || 0,
          maxStock: data.maxStock,
          purchasePrice: data.purchasePrice || 0,
          sellingPrice: data.sellingPrice || 0,
          supplierName: data.supplierName,
          supplierId: data.supplierId,
          supplierEmail: data.supplierEmail,
          supplierContact: data.supplierContact,
          location: data.location,
          barcode: data.barcode,
          image: data.image,
          status: data.status || 'active',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          companyId: data.companyId,
          weight: data.weight,
          dimensions: data.dimensions,
          notes: data.notes,
          stockValue: currentStock * (data.purchasePrice || 0),
          isLowStock: currentStock <= (data.minStock || 0),
          isOutOfStock: currentStock === 0,
        } as InventoryItem;
      });

      // Client-seitige Filterung nach SKU oder Name
      const filteredItems = allItems.filter(
        item =>
          item.sku.toLowerCase().includes(searchLower) ||
          item.name.toLowerCase().includes(searchLower) ||
          (item.description && item.description.toLowerCase().includes(searchLower))
      );

      return filteredItems;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Einzelnen Inventar-Artikel nach SKU finden
   */
  static async getInventoryItemBySku(
    companyId: string,
    sku: string
  ): Promise<InventoryItem | null> {
    try {
      const items = await this.findInventoryItems(companyId, sku);
      // Exakte SKU-Match bevorzugen
      const exactMatch = items.find(item => item.sku.toLowerCase() === sku.toLowerCase());
      return exactMatch || items[0] || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Inventar-Artikel nach Name finden
   */
  static async getInventoryItemByName(
    companyId: string,
    name: string
  ): Promise<InventoryItem | null> {
    try {
      const items = await this.findInventoryItems(companyId, name);
      // Exakte Name-Match bevorzugen
      const exactMatch = items.find(item => item.name.toLowerCase() === name.toLowerCase());
      return exactMatch || items[0] || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Inventar-Statistiken berechnen
   */
  static async getInventoryStats(companyId: string): Promise<InventoryStats> {
    try {
      const items = await this.getInventoryItems(companyId);

      const stats: InventoryStats = {
        totalItems: items.length,
        totalValue: items.reduce((sum, item) => sum + item.stockValue, 0),
        lowStockItems: items.filter(item => item.isLowStock && !item.isOutOfStock).length,
        outOfStockItems: items.filter(item => item.isOutOfStock).length,
        totalCategories: [...new Set(items.map(item => item.category))].length,
        averageValue:
          items.length > 0
            ? items.reduce((sum, item) => sum + item.stockValue, 0) / items.length
            : 0,
        lastUpdate: new Date(),
      };

      return stats;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Neuen Inventar-Artikel hinzufügen
   */
  static async addInventoryItem(
    companyId: string,
    itemData: Omit<
      InventoryItem,
      'id' | 'createdAt' | 'updatedAt' | 'companyId' | 'stockValue' | 'isLowStock' | 'isOutOfStock'
    >
  ): Promise<string> {
    try {
      // Berechnete Felder hinzufügen
      const stockValue = itemData.currentStock * itemData.purchasePrice;
      const isLowStock = itemData.currentStock <= itemData.minStock;
      const isOutOfStock = itemData.currentStock === 0;

      const newItem = {
        ...itemData,
        companyId,
        stockValue,
        isLowStock,
        isOutOfStock,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } as Record<string, any>;

      // Entferne undefined-Felder (Firestore erlaubt kein undefined)
      const cleanedNewItem = Object.fromEntries(
        Object.entries(newItem).filter(([, v]) => v !== undefined)
      );

      // NEUE SUBCOLLECTION STRUKTUR
      const docRef = await addDoc(collection(db, 'companies', companyId, 'inventory'), cleanedNewItem);

      // Stock-Movement für Initial-Bestand hinzufügen
      if (itemData.currentStock > 0) {
        await this.addStockMovement(companyId, {
          itemId: docRef.id,
          itemName: itemData.name,
          type: 'in',
          quantity: itemData.currentStock,
          previousStock: 0,
          newStock: itemData.currentStock,
          unit: itemData.unit,
          reason: 'Erstbestand',
          createdBy: companyId,
        });
      }

      return docRef.id;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Inventar-Artikel aktualisieren
   */
  static async updateInventoryItem(
    companyId: string,
    itemId: string,
    updates: Partial<Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt' | 'companyId'>>
  ): Promise<void> {
    try {
      const itemRef = doc(db, 'companies', companyId, 'inventory', itemId);
      const payload: Record<string, any> = { ...updates, updatedAt: serverTimestamp() };
      const cleanedUpdates = Object.fromEntries(
        Object.entries(payload).filter(([, v]) => v !== undefined)
      );
      await updateDoc(itemRef, cleanedUpdates);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Lagerbestand anpassen
   */
  static async adjustStock(
    companyId: string,
    itemId: string,
    itemName: string,
    newStock: number,
    unit: string,
    reason: string,
    type: 'in' | 'out' | 'adjustment' = 'adjustment',
    reference?: string
  ): Promise<void> {
    try {
      // Aktuellen Bestand laden
      const items = await this.getInventoryItems(companyId);
      const item = items.find(i => i.id === itemId);

      if (!item) {
        throw new Error('Artikel nicht gefunden');
      }

      const previousStock = item.currentStock;
      const quantity = type === 'out' ? -(previousStock - newStock) : newStock - previousStock;

      // Bestand aktualisieren
      await this.updateInventoryItem(companyId, itemId, { currentStock: newStock });

      // Stock-Movement hinzufügen
      await this.addStockMovement(companyId, {
        itemId,
        itemName,
        type,
        quantity: Math.abs(quantity),
        previousStock,
        newStock,
        unit,
        reason,
        reference,
        createdBy: companyId,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Stock-Movement hinzufügen
   */
  static async addStockMovement(
    companyId: string,
    movementData: Omit<StockMovement, 'id' | 'createdAt' | 'companyId'>
  ): Promise<string> {
    try {
      const movement = {
        ...movementData,
        companyId,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'stockMovements'), movement);
      return docRef.id;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Stock-Movements für einen Artikel laden
   */
  static async getStockMovements(companyId: string, itemId?: string): Promise<StockMovement[]> {
    try {
      // KEINE orderBy - client-seitige Sortierung (Projektregeln)
      let movementsQuery = query(
        collection(db, 'stockMovements'),
        where('companyId', '==', companyId)
      );

      if (itemId) {
        movementsQuery = query(
          collection(db, 'stockMovements'),
          where('companyId', '==', companyId),
          where('itemId', '==', itemId)
        );
      }

      const querySnapshot = await getDocs(movementsQuery);
      const movements: StockMovement[] = [];

      querySnapshot.forEach(doc => {
        const data = doc.data();
        movements.push({
          id: doc.id,
          itemId: data.itemId || '',
          itemName: data.itemName || '',
          type: data.type || 'adjustment',
          quantity: data.quantity || 0,
          previousStock: data.previousStock || 0,
          newStock: data.newStock || 0,
          unit: data.unit || 'Stück',
          reason: data.reason,
          reference: data.reference,
          createdAt: data.createdAt?.toDate() || new Date(),
          createdBy: data.createdBy || '',
          companyId: data.companyId || companyId,
        });
      });

      // Client-seitige Sortierung nach createdAt (neueste zuerst)
      movements.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return movements;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Inventar-Artikel löschen
   */
  static async deleteInventoryItem(companyId: string, itemId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'companies', companyId, 'inventory', itemId));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Artikel für Angebot reservieren
   */
  static async reserveItemsForQuote(
    companyId: string,
    quoteId: string,
    items: { itemId: string; quantity: number }[]
  ): Promise<void> {
    try {
      const batch = writeBatch(db);

      for (const item of items) {
        const itemRef = doc(db, 'companies', companyId, 'inventory', item.itemId);
        const currentItem = await this.getInventoryItem(companyId, item.itemId);

        if (!currentItem) {
          throw new Error(`Artikel ${item.itemId} nicht gefunden`);
        }

        if (currentItem.availableStock < item.quantity) {
          throw new Error(`Nicht genügend verfügbare Artikel für ${currentItem.name}`);
        }

        const newReservedStock = (currentItem.reservedStock || 0) + item.quantity;
        const newAvailableStock = currentItem.currentStock - newReservedStock;

        if (batch) {
          batch.update(itemRef, {
            reservedStock: newReservedStock,
            availableStock: newAvailableStock,
            updatedAt: serverTimestamp(),
          });
        } else {
          await updateDoc(itemRef, {
            reservedStock: newReservedStock,
            availableStock: newAvailableStock,
            updatedAt: serverTimestamp(),
          });
        }

        // Reservierungs-Log erstellen
        await addDoc(collection(db, 'stockMovements'), {
          companyId,
          itemId: item.itemId,
          itemName: currentItem.name,
          type: 'reserve',
          quantity: item.quantity,
          reason: `Reserviert für Angebot ${quoteId}`,
          quoteId,
          previousStock: currentItem.currentStock,
          newStock: currentItem.currentStock,
          reservedStock: newReservedStock,
          unit: currentItem.unit,
          createdAt: serverTimestamp(),
          createdBy: companyId,
        });
      }

      if (batch) {
        await batch.commit();
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reservierung für abgelehntes Angebot freigeben
   */
  static async releaseReservationForQuote(
    companyId: string,
    quoteId: string,
    items: { itemId: string; quantity: number }[]
  ): Promise<void> {
    try {
      const batch = writeBatch(db);

      for (const item of items) {
        const itemRef = doc(db, 'companies', companyId, 'inventory', item.itemId);
        const currentItem = await this.getInventoryItem(companyId, item.itemId);

        if (!currentItem) {
          continue;
        }

        const newReservedStock = Math.max(0, (currentItem.reservedStock || 0) - item.quantity);
        const newAvailableStock = currentItem.currentStock - newReservedStock;

        if (batch) {
          batch.update(itemRef, {
            reservedStock: newReservedStock,
            availableStock: newAvailableStock,
            updatedAt: serverTimestamp(),
          });
        } else {
          await updateDoc(itemRef, {
            reservedStock: newReservedStock,
            availableStock: newAvailableStock,
            updatedAt: serverTimestamp(),
          });
        }

        // Freigabe-Log erstellen
        await addDoc(collection(db, 'stockMovements'), {
          companyId,
          itemId: item.itemId,
          itemName: currentItem.name,
          type: 'release',
          quantity: item.quantity,
          reason: `Freigegeben - Angebot ${quoteId} abgelehnt`,
          quoteId,
          previousStock: currentItem.currentStock,
          newStock: currentItem.currentStock,
          reservedStock: newReservedStock,
          unit: currentItem.unit,
          createdAt: serverTimestamp(),
          createdBy: companyId,
        });
      }

      if (batch) {
        await batch.commit();
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reservierte Artikel als verkauft markieren (Angebot angenommen)
   */
  static async sellReservedItems(
    companyId: string,
    quoteId: string,
    items: { itemId: string; quantity: number }[]
  ): Promise<void> {
    try {
      const batch = writeBatch(db);

      for (const item of items) {
        const itemRef = doc(db, 'companies', companyId, 'inventory', item.itemId);
        const currentItem = await this.getInventoryItem(companyId, item.itemId);

        if (!currentItem) {
          continue;
        }

        const newCurrentStock = currentItem.currentStock - item.quantity;
        const newReservedStock = Math.max(0, (currentItem.reservedStock || 0) - item.quantity);
        const newAvailableStock = newCurrentStock - newReservedStock;

        if (batch) {
          batch.update(itemRef, {
            currentStock: newCurrentStock,
            reservedStock: newReservedStock,
            availableStock: newAvailableStock,
            stockValue: newCurrentStock * currentItem.purchasePrice,
            updatedAt: serverTimestamp(),
          });
        } else {
          await updateDoc(itemRef, {
            currentStock: newCurrentStock,
            reservedStock: newReservedStock,
            availableStock: newAvailableStock,
            stockValue: newCurrentStock * currentItem.purchasePrice,
            updatedAt: serverTimestamp(),
          });
        }

        // Verkaufs-Log erstellen
        await addDoc(collection(db, 'stockMovements'), {
          companyId,
          itemId: item.itemId,
          itemName: currentItem.name,
          type: 'out',
          quantity: item.quantity,
          reason: `Verkauft - Angebot ${quoteId} angenommen`,
          quoteId,
          previousStock: currentItem.currentStock,
          newStock: newCurrentStock,
          reservedStock: newReservedStock,
          unit: currentItem.unit,
          createdAt: serverTimestamp(),
          createdBy: companyId,
        });
      }

      if (batch) {
        await batch.commit();
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Kategorien laden
   */
  static async getCategories(companyId: string): Promise<InventoryCategory[]> {
    try {
      const items = await this.getInventoryItems(companyId);
      const categoryMap = new Map<string, number>();

      items.forEach(item => {
        const count = categoryMap.get(item.category) || 0;
        categoryMap.set(item.category, count + 1);
      });

      const categories: InventoryCategory[] = [];
      categoryMap.forEach((itemCount, name) => {
        categories.push({
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name,
          companyId,
          itemCount,
        });
      });

      return categories.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Eindeutige Lagerorte laden
   */
  static async getUniqueLocations(companyId: string): Promise<string[]> {
    try {
      const items = await this.getInventoryItems(companyId);
      const locationSet = new Set<string>();

      items.forEach(item => {
        if (item.location && item.location.trim()) {
          locationSet.add(item.location.trim());
        }
      });

      return Array.from(locationSet).sort((a, b) => a.localeCompare(b, 'de'));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Lagerbestand für Lieferschein reduzieren
   */
  static async reduceStockForDeliveryNote(
    companyId: string,
    items: Array<{ name: string; sku?: string; quantity: number; unit: string }>,
    deliveryNoteId: string
  ): Promise<{ success: boolean; errors: string[] }> {
    try {
      const batch = writeBatch(db);
      const errors: string[] = [];

      for (const deliveryItem of items) {
        try {
          // Artikel im Inventar finden (erst nach SKU, dann nach Name)
          let inventoryItem: InventoryItem | null = null;

          if (deliveryItem.sku) {
            inventoryItem = await this.getInventoryItemBySku(companyId, deliveryItem.sku);
          }

          if (!inventoryItem) {
            inventoryItem = await this.getInventoryItemByName(companyId, deliveryItem.name);
          }

          if (!inventoryItem) {
            errors.push(`Artikel "${deliveryItem.name}" nicht im Lager gefunden`);
            continue;
          }

          // Verfügbaren Bestand prüfen
          const availableStock = inventoryItem.availableStock;
          if (availableStock < deliveryItem.quantity) {
            errors.push(
              `Nicht genügend Bestand für "${inventoryItem.name}": Verfügbar ${availableStock}, benötigt ${deliveryItem.quantity}`
            );
            continue;
          }

          // Neuen Bestand berechnen
          const newStock = inventoryItem.currentStock - deliveryItem.quantity;
          const newAvailableStock = newStock - inventoryItem.reservedStock;

          // Inventar-Item aktualisieren
          const itemRef = doc(db, 'companies', companyId, 'inventory', inventoryItem.id);
          batch.update(itemRef, {
            currentStock: newStock,
            availableStock: newAvailableStock,
            stockValue: newStock * inventoryItem.purchasePrice,
            isLowStock: newStock <= inventoryItem.minStock,
            isOutOfStock: newStock === 0,
            updatedAt: serverTimestamp(),
          });

          // Stock-Movement hinzufügen
          const movementRef = doc(collection(db, 'stockMovements'));
          batch.set(movementRef, {
            itemId: inventoryItem.id,
            itemName: inventoryItem.name,
            type: 'out',
            quantity: deliveryItem.quantity,
            previousStock: inventoryItem.currentStock,
            newStock: newStock,
            unit: inventoryItem.unit,
            reason: `Lieferschein ${deliveryNoteId}`,
            reference: deliveryNoteId,
            createdAt: serverTimestamp(),
            createdBy: companyId,
            companyId: companyId,
          });
        } catch (itemError: unknown) {
          errors.push(`Fehler bei Artikel "${deliveryItem.name}": ${itemError instanceof Error ? itemError.message : 'Unbekannter Fehler'}`);
        }
      }

      // Batch-Update ausführen wenn keine Fehler
      if (errors.length === 0) {
        await batch.commit();

        return { success: true, errors: [] };
      } else {
        return { success: false, errors };
      }
    } catch (error: unknown) {
      return { success: false, errors: [`Allgemeiner Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`] };
    }
  }
}
