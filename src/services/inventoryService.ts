'use client';

import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';

export interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  sku: string; // Artikelnummer/SKU
  category: string;
  unit: string; // Einheit (Stück, kg, Liter, etc.)
  currentStock: number;
  minStock: number; // Mindestbestand
  maxStock?: number; // Maximalbestand
  purchasePrice: number; // Einkaufspreis
  sellingPrice: number; // Verkaufspreis
  supplierName?: string;
  supplierContact?: string;
  location?: string; // Lagerort
  barcode?: string;
  image?: string;
  status: 'active' | 'inactive' | 'discontinued';
  createdAt: Date;
  updatedAt: Date;
  companyId: string;

  // Zusätzliche Felder
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  notes?: string;

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

export class InventoryService {
  /**
   * Alle Inventar-Artikel eines Unternehmens laden
   */
  static async getInventoryItems(companyId: string): Promise<InventoryItem[]> {
    try {
      const itemsQuery = query(
        collection(db, 'inventory'),
        where('companyId', '==', companyId),
        orderBy('name', 'asc')
      );

      const querySnapshot = await getDocs(itemsQuery);
      const items: InventoryItem[] = [];

      querySnapshot.forEach(doc => {
        const data = doc.data();
        const item: InventoryItem = {
          id: doc.id,
          name: data.name || '',
          description: data.description,
          sku: data.sku || '',
          category: data.category || 'Allgemein',
          unit: data.unit || 'Stück',
          currentStock: data.currentStock || 0,
          minStock: data.minStock || 0,
          maxStock: data.maxStock,
          purchasePrice: data.purchasePrice || 0,
          sellingPrice: data.sellingPrice || 0,
          supplierName: data.supplierName,
          supplierContact: data.supplierContact,
          location: data.location,
          barcode: data.barcode,
          image: data.image,
          status: data.status || 'active',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          companyId: data.companyId || companyId,
          weight: data.weight,
          dimensions: data.dimensions,
          notes: data.notes,
          // Berechnete Felder
          stockValue: (data.currentStock || 0) * (data.purchasePrice || 0),
          isLowStock: (data.currentStock || 0) <= (data.minStock || 0),
          isOutOfStock: (data.currentStock || 0) === 0,
        };
        items.push(item);
      });

      return items;
    } catch (error) {
      console.error('Fehler beim Laden der Inventar-Artikel:', error);
      throw error;
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
      console.error('Fehler beim Berechnen der Inventar-Statistiken:', error);
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
      const newItem = {
        ...itemData,
        companyId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'inventory'), newItem);

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
      console.error('Fehler beim Hinzufügen des Inventar-Artikels:', error);
      throw error;
    }
  }

  /**
   * Inventar-Artikel aktualisieren
   */
  static async updateInventoryItem(
    itemId: string,
    updates: Partial<Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt' | 'companyId'>>
  ): Promise<void> {
    try {
      const itemRef = doc(db, 'inventory', itemId);
      await updateDoc(itemRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Inventar-Artikels:', error);
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
      await this.updateInventoryItem(itemId, { currentStock: newStock });

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
      console.error('Fehler beim Anpassen des Lagerbestands:', error);
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
      console.error('Fehler beim Hinzufügen der Lagerbewegung:', error);
      throw error;
    }
  }

  /**
   * Stock-Movements für einen Artikel laden
   */
  static async getStockMovements(companyId: string, itemId?: string): Promise<StockMovement[]> {
    try {
      let movementsQuery = query(
        collection(db, 'stockMovements'),
        where('companyId', '==', companyId),
        orderBy('createdAt', 'desc')
      );

      if (itemId) {
        movementsQuery = query(
          collection(db, 'stockMovements'),
          where('companyId', '==', companyId),
          where('itemId', '==', itemId),
          orderBy('createdAt', 'desc')
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

      return movements;
    } catch (error) {
      console.error('Fehler beim Laden der Lagerbewegungen:', error);
      throw error;
    }
  }

  /**
   * Inventar-Artikel löschen
   */
  static async deleteInventoryItem(itemId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'inventory', itemId));
    } catch (error) {
      console.error('Fehler beim Löschen des Inventar-Artikels:', error);
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
      console.error('Fehler beim Laden der Kategorien:', error);
      throw error;
    }
  }
}
