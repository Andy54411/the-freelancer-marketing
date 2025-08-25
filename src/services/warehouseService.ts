import { db } from '@/firebase/clients';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';

// Warehouse Item Interface
export interface WarehouseItem {
  id: string;
  sku: string; // SKU/Artikelnummer
  name: string;
  description?: string;
  category?: string;
  unit: string; // Stück, kg, Liter, etc.
  currentStock: number;
  minStock: number; // Mindestbestand
  maxStock?: number; // Maximalbestand
  location?: string; // Lagerort
  supplier?: string;
  supplierSku?: string;
  costPrice?: number; // Einkaufspreis
  sellPrice?: number; // Verkaufspreis
  barcode?: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// Stock Movement Interface
export interface StockMovement {
  id: string;
  itemId: string;
  itemSku: string;
  itemName: string;
  type: 'incoming' | 'outgoing' | 'adjustment' | 'transfer';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string; // Grund für Bewegung
  reference?: string; // Referenz (z.B. Lieferschein-Nr., Bestellung-Nr.)
  referenceType?: 'delivery_note' | 'purchase_order' | 'inventory_adjustment' | 'transfer';
  location?: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

// Low Stock Alert Interface
export interface LowStockAlert {
  id: string;
  itemId: string;
  itemSku: string;
  itemName: string;
  currentStock: number;
  minStock: number;
  alertLevel: 'warning' | 'critical'; // warning: < minStock, critical: = 0
  isResolved: boolean;
  resolvedAt?: string;
  createdAt: string;
}

export class WarehouseService {
  private static readonly WAREHOUSE_ITEMS_COLLECTION = 'warehouse_items';
  private static readonly STOCK_MOVEMENTS_COLLECTION = 'stock_movements';
  private static readonly LOW_STOCK_ALERTS_COLLECTION = 'low_stock_alerts';

  // ===============================
  // WAREHOUSE ITEM MANAGEMENT
  // ===============================

  static async createWarehouseItem(
    itemData: Omit<WarehouseItem, 'id' | 'createdAt' | 'updatedAt'>,
    userId: string
  ): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.WAREHOUSE_ITEMS_COLLECTION), {
        ...itemData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userId,
      });

      // Initial stock movement if current stock > 0
      if (itemData.currentStock > 0) {
        await this.addStockMovement({
          itemId: docRef.id,
          itemSku: itemData.sku,
          itemName: itemData.name,
          type: 'incoming',
          quantity: itemData.currentStock,
          previousStock: 0,
          newStock: itemData.currentStock,
          reason: 'Anfangsbestand',
          referenceType: 'inventory_adjustment',
          createdBy: userId,
        });
      }

      return docRef.id;
    } catch (error) {

      throw error;
    }
  }

  static async getWarehouseItems(): Promise<WarehouseItem[]> {
    try {
      const q = query(
        collection(db, this.WAREHOUSE_ITEMS_COLLECTION),
        where('isActive', '==', true),
        orderBy('name')
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate()?.toISOString() || new Date().toISOString(),
        } as WarehouseItem;
      });
    } catch (error) {

      throw error;
    }
  }

  static async getWarehouseItem(itemId: string): Promise<WarehouseItem | null> {
    try {
      const docSnap = await getDoc(doc(db, this.WAREHOUSE_ITEMS_COLLECTION, itemId));

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate()?.toISOString() || new Date().toISOString(),
        } as WarehouseItem;
      }

      return null;
    } catch (error) {

      throw error;
    }
  }

  static async getWarehouseItemBySku(sku: string): Promise<WarehouseItem | null> {
    try {
      const q = query(
        collection(db, this.WAREHOUSE_ITEMS_COLLECTION),
        where('sku', '==', sku),
        where('isActive', '==', true)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate()?.toISOString() || new Date().toISOString(),
        } as WarehouseItem;
      }

      return null;
    } catch (error) {

      throw error;
    }
  }

  static async updateWarehouseItem(itemId: string, updates: Partial<WarehouseItem>): Promise<void> {
    try {
      await updateDoc(doc(db, this.WAREHOUSE_ITEMS_COLLECTION, itemId), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {

      throw error;
    }
  }

  // ===============================
  // STOCK MOVEMENT MANAGEMENT
  // ===============================

  static async addStockMovement(
    movementData: Omit<StockMovement, 'id' | 'createdAt'>
  ): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.STOCK_MOVEMENTS_COLLECTION), {
        ...movementData,
        createdAt: serverTimestamp(),
      });

      return docRef.id;
    } catch (error) {

      throw error;
    }
  }

  static async getStockMovements(itemId?: string): Promise<StockMovement[]> {
    try {
      let q;
      if (itemId) {
        q = query(
          collection(db, this.STOCK_MOVEMENTS_COLLECTION),
          where('itemId', '==', itemId),
          orderBy('createdAt', 'desc')
        );
      } else {
        q = query(collection(db, this.STOCK_MOVEMENTS_COLLECTION), orderBy('createdAt', 'desc'));
      }

      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
        } as StockMovement;
      });
    } catch (error) {

      throw error;
    }
  }

  // ===============================
  // DELIVERY NOTE INTEGRATION
  // ===============================

  static async processDeliveryNoteStock(
    deliveryNoteId: string,
    deliveryNoteNumber: string,
    items: Array<{
      sku: string;
      name: string;
      quantity: number;
    }>,
    userId: string
  ): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      return await runTransaction(db, async transaction => {
        const movements: StockMovement[] = [];
        const itemUpdates: Array<{ id: string; newStock: number }> = [];

        // Prüfe jeden Artikel und bereite Updates vor
        for (const item of items) {
          const warehouseItem = await this.getWarehouseItemBySku(item.sku);

          if (!warehouseItem) {
            errors.push(`Artikel ${item.sku} (${item.name}) nicht im Lager gefunden`);
            continue;
          }

          if (warehouseItem.currentStock < item.quantity) {
            errors.push(
              `Nicht genügend Bestand für ${item.sku}: Verfügbar ${warehouseItem.currentStock}, benötigt ${item.quantity}`
            );
            continue;
          }

          const newStock = warehouseItem.currentStock - item.quantity;

          // Update vorbereiten
          itemUpdates.push({
            id: warehouseItem.id,
            newStock,
          });

          // Movement vorbereiten
          movements.push({
            id: '', // Wird von addDoc gesetzt
            itemId: warehouseItem.id,
            itemSku: warehouseItem.sku,
            itemName: warehouseItem.name,
            type: 'outgoing',
            quantity: item.quantity,
            previousStock: warehouseItem.currentStock,
            newStock,
            reason: 'Lieferung',
            reference: deliveryNoteNumber,
            referenceType: 'delivery_note',
            createdAt: new Date().toISOString(),
            createdBy: userId,
          });
        }

        // Bei Fehlern abbrechen
        if (errors.length > 0) {
          return { success: false, errors };
        }

        // Alle Updates durchführen
        for (const update of itemUpdates) {
          const itemRef = doc(db, this.WAREHOUSE_ITEMS_COLLECTION, update.id);
          transaction.update(itemRef, {
            currentStock: update.newStock,
            updatedAt: serverTimestamp(),
          });
        }

        // Stock Movements hinzufügen (außerhalb der Transaction)
        for (const movement of movements) {
          await this.addStockMovement(movement);
        }

        // Low Stock Alerts prüfen
        await this.checkLowStockAlerts(itemUpdates.map(u => u.id));

        return { success: true, errors: [] };
      });
    } catch (error) {

      return {
        success: false,
        errors: ['Unerwarteter Fehler beim Aktualisieren des Lagerbestands'],
      };
    }
  }

  // ===============================
  // LOW STOCK MANAGEMENT
  // ===============================

  static async checkLowStockAlerts(itemIds?: string[]): Promise<void> {
    try {
      let items: WarehouseItem[];

      if (itemIds && itemIds.length > 0) {
        // Nur spezifische Items prüfen
        items = [];
        for (const id of itemIds) {
          const item = await this.getWarehouseItem(id);
          if (item) items.push(item);
        }
      } else {
        // Alle Items prüfen
        items = await this.getWarehouseItems();
      }

      for (const item of items) {
        if (item.currentStock <= item.minStock) {
          await this.createLowStockAlert(item);
        } else {
          await this.resolveLowStockAlert(item.id);
        }
      }
    } catch (error) {

    }
  }

  private static async createLowStockAlert(item: WarehouseItem): Promise<void> {
    try {
      // Prüfen ob bereits ein Alert existiert
      const q = query(
        collection(db, this.LOW_STOCK_ALERTS_COLLECTION),
        where('itemId', '==', item.id),
        where('isResolved', '==', false)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        await addDoc(collection(db, this.LOW_STOCK_ALERTS_COLLECTION), {
          itemId: item.id,
          itemSku: item.sku,
          itemName: item.name,
          currentStock: item.currentStock,
          minStock: item.minStock,
          alertLevel: item.currentStock === 0 ? 'critical' : 'warning',
          isResolved: false,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {

    }
  }

  private static async resolveLowStockAlert(itemId: string): Promise<void> {
    try {
      const q = query(
        collection(db, this.LOW_STOCK_ALERTS_COLLECTION),
        where('itemId', '==', itemId),
        where('isResolved', '==', false)
      );
      const querySnapshot = await getDocs(q);

      for (const doc of querySnapshot.docs) {
        await updateDoc(doc.ref, {
          isResolved: true,
          resolvedAt: serverTimestamp(),
        });
      }
    } catch (error) {

    }
  }

  static async getLowStockAlerts(): Promise<LowStockAlert[]> {
    try {
      const q = query(
        collection(db, this.LOW_STOCK_ALERTS_COLLECTION),
        where('isResolved', '==', false),
        orderBy('alertLevel', 'desc'), // critical vor warning
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()?.toISOString() || new Date().toISOString(),
        resolvedAt: doc.data().resolvedAt?.toDate()?.toISOString(),
      })) as LowStockAlert[];
    } catch (error) {

      throw error;
    }
  }

  // ===============================
  // STOCK REPORTS
  // ===============================

  static async getStockReport(): Promise<{
    totalItems: number;
    totalValue: number;
    lowStockItems: number;
    outOfStockItems: number;
    topMovingItems: Array<{
      item: WarehouseItem;
      totalMovements: number;
      lastMovement: string;
    }>;
  }> {
    try {
      const items = await this.getWarehouseItems();
      const lowStockAlerts = await this.getLowStockAlerts();

      const totalItems = items.length;
      const totalValue = items.reduce((sum, item) => {
        return sum + item.currentStock * (item.costPrice || 0);
      }, 0);
      const lowStockItems = lowStockAlerts.filter(alert => alert.alertLevel === 'warning').length;
      const outOfStockItems = lowStockAlerts.filter(
        alert => alert.alertLevel === 'critical'
      ).length;

      // Top Moving Items (vereinfacht - könnte durch echte Bewegungsstatistiken ersetzt werden)
      const topMovingItems = items
        .filter(item => item.currentStock < (item.maxStock || 0))
        .slice(0, 5)
        .map(item => ({
          item,
          totalMovements: 0, // Hier könnten echte Bewegungsstatistiken berechnet werden
          lastMovement: item.updatedAt,
        }));

      return {
        totalItems,
        totalValue,
        lowStockItems,
        outOfStockItems,
        topMovingItems,
      };
    } catch (error) {

      throw error;
    }
  }
}

export default WarehouseService;
