/**
 * ====================================================================
 * INVENTUR SERVICE
 * ====================================================================
 * 
 * Dieser Service verwaltet Jahresinventuren für die GoBD-konforme
 * Bestandserfassung. Features:
 * 
 * - Inventuren erstellen (Vollständig, Stichprobe, Permanent)
 * - Zähllisten nach Kategorie/Lagerort generieren
 * - Ist-Bestände erfassen
 * - Differenzen berechnen und buchen
 * - Inventurprotokoll erstellen (PDF)
 * - Bestandsveränderung für BWA berechnen
 * 
 * Firestore Collections:
 * - companies/{companyId}/inventories - Inventur-Header
 * - companies/{companyId}/inventories/{inventoryId}/items - Zählpositionen
 * - companies/{companyId}/inventorySnapshots - Bestandsfotos für BWA
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { InventoryService, type InventoryItem } from './inventoryService';

// ============================================================================
// TYPEN
// ============================================================================

export type InventoryType = 'vollstaendig' | 'stichprobe' | 'permanent';
export type InventoryStatus = 'geplant' | 'in_bearbeitung' | 'abgeschlossen' | 'storniert';
export type InventoryItemStatus = 'offen' | 'gezaehlt' | 'geprueft';

// Unterschriften-Interface
export interface InventurSignature {
  signatureData: string;             // Base64-kodiertes Bild der Unterschrift
  signerName: string;                // Name des Unterzeichners
  signedAt: Date;                    // Zeitpunkt der Unterschrift
  signedBy?: string;                 // User-ID (falls bekannt)
  authMethod?: 'signature' | 'biometric';  // Authentifizierungsmethode (handschriftlich oder biometrisch)
}

export interface Inventur {
  id: string;
  companyId: string;
  name: string;                      // z.B. "Jahresinventur 2025"
  type: InventoryType;
  status: InventoryStatus;
  
  // Stichtag & Zeitraum
  countDate: Date;                   // Stichtag der Inventur
  startedAt?: Date;                  // Beginn der Zählung
  completedAt?: Date;                // Abschluss
  
  // Filter (optional)
  filterByCategories?: string[];     // Nur bestimmte Kategorien
  filterByLocations?: string[];      // Nur bestimmte Lagerorte
  filterBySuppliers?: string[];      // Nur bestimmte Lieferanten
  
  // Zusammenfassung
  totalItems: number;                // Anzahl Artikel
  countedItems: number;              // Bereits gezählt
  itemsWithDifference: number;       // Mit Abweichung
  totalDifferenceValue: number;      // Gesamtwert der Differenzen
  
  // Bestandswerte
  expectedTotalValue: number;        // Soll-Wert gesamt
  actualTotalValue: number;          // Ist-Wert gesamt
  
  // Unterschriften (digital)
  performedBySignature?: InventurSignature;   // Unterschrift: Durchgeführt von
  approvedBySignature?: InventurSignature;    // Unterschrift: Geprüft und freigegeben
  
  // GoBD
  createdAt: Date;
  createdBy: string;
  lockedAt?: Date;
  lockedBy?: string;
  
  // Notizen
  notes?: string;
}

export interface InventurItem {
  id: string;
  inventoryId: string;
  itemId: string;                    // Referenz zu inventory-Artikel
  itemName: string;
  sku?: string;
  category: string;
  location?: string;
  unit: string;
  
  // Bestände
  expectedQuantity: number;          // Soll (System)
  countedQuantity?: number;          // Ist (gezählt)
  difference?: number;               // Abweichung
  differenceValue?: number;          // Wert der Abweichung
  unitPrice: number;                 // Bewertungspreis (Einkaufspreis)
  
  // Status
  status: InventoryItemStatus;
  countedAt?: Date;
  countedBy?: string;
  notes?: string;                    // Bemerkung bei Differenz
  
  // Buchung
  differenceBooked: boolean;
  expenseId?: string;                // Verknüpfung zur Ausgabe (Schwund)
}

export interface InventorySnapshot {
  id: string;
  companyId: string;
  snapshotDate: Date;
  type: 'periode_start' | 'periode_ende' | 'inventur';
  totalValue: number;
  itemCount: number;
  createdAt: Date;
  createdBy: string;
  inventoryId?: string;              // Falls aus Inventur erstellt
}

export interface InventurFilter {
  categories?: string[];
  locations?: string[];
  suppliers?: string[];
}

export interface ZaehllisteOptions {
  groupBy: 'category' | 'location' | 'alphabetical';
  includeBarcode: boolean;
  includeImage: boolean;
  pageSize: 'A4' | 'A5';
}

export interface InventurStats {
  totalInventories: number;
  completedInventories: number;
  openInventories: number;
  lastInventoryDate?: Date;
  totalDifferenceValue: number;
  averageDifferencePercent: number;
}

// ============================================================================
// INVENTUR SERVICE
// ============================================================================

export class InventurService {
  
  // =========================================================================
  // INVENTUR CRUD
  // =========================================================================
  
  /**
   * Erstellt eine neue Inventur
   */
  static async createInventur(
    companyId: string,
    data: {
      name: string;
      type: InventoryType;
      countDate: Date;
      filter?: InventurFilter;
      notes?: string;
    },
    userId: string
  ): Promise<string> {
    // Lade alle Inventar-Artikel (gefiltert)
    const allItems = await InventoryService.getInventoryItems(companyId);
    
    // Filter anwenden
    let filteredItems = allItems.filter(item => item.status === 'active');
    
    if (data.filter?.categories?.length) {
      filteredItems = filteredItems.filter(item => 
        data.filter!.categories!.includes(item.category)
      );
    }
    
    if (data.filter?.locations?.length) {
      filteredItems = filteredItems.filter(item => 
        item.location && data.filter!.locations!.includes(item.location)
      );
    }
    
    // Berechne Soll-Wert
    const expectedTotalValue = filteredItems.reduce(
      (sum, item) => sum + (item.currentStock * item.purchasePrice),
      0
    );
    
    // Inventur-Dokument erstellen
    const inventurRef = collection(db, 'companies', companyId, 'inventories');
    const inventurDoc = await addDoc(inventurRef, {
      companyId,
      name: data.name,
      type: data.type,
      status: 'geplant' as InventoryStatus,
      countDate: Timestamp.fromDate(data.countDate),
      filterByCategories: data.filter?.categories || [],
      filterByLocations: data.filter?.locations || [],
      filterBySuppliers: data.filter?.suppliers || [],
      totalItems: filteredItems.length,
      countedItems: 0,
      itemsWithDifference: 0,
      totalDifferenceValue: 0,
      expectedTotalValue,
      actualTotalValue: 0,
      notes: data.notes || '',
      createdAt: serverTimestamp(),
      createdBy: userId,
    });
    
    // Inventur-Items erstellen (Subcollection)
    const batch = writeBatch(db);
    const itemsRef = collection(db, 'companies', companyId, 'inventories', inventurDoc.id, 'items');
    
    for (const item of filteredItems) {
      const itemDocRef = doc(itemsRef);
      batch.set(itemDocRef, {
        inventoryId: inventurDoc.id,
        itemId: item.id,
        itemName: item.name,
        sku: item.sku || '',
        category: item.category,
        location: item.location || '',
        unit: item.unit,
        expectedQuantity: item.currentStock,
        countedQuantity: null,
        difference: null,
        differenceValue: null,
        unitPrice: item.purchasePrice,
        status: 'offen' as InventoryItemStatus,
        differenceBooked: false,
        notes: '',
      });
    }
    
    await batch.commit();
    
    return inventurDoc.id;
  }
  
  /**
   * Lädt alle Inventuren einer Firma
   */
  static async getInventuren(companyId: string): Promise<Inventur[]> {
    const inventurenRef = collection(db, 'companies', companyId, 'inventories');
    const snapshot = await getDocs(inventurenRef);
    
    const inventuren: Inventur[] = [];
    
    snapshot.forEach(docSnapshot => {
      const data = docSnapshot.data();
      inventuren.push({
        id: docSnapshot.id,
        companyId,
        name: data.name || '',
        type: data.type || 'vollstaendig',
        status: data.status || 'geplant',
        countDate: data.countDate?.toDate() || new Date(),
        startedAt: data.startedAt?.toDate(),
        completedAt: data.completedAt?.toDate(),
        filterByCategories: data.filterByCategories || [],
        filterByLocations: data.filterByLocations || [],
        filterBySuppliers: data.filterBySuppliers || [],
        totalItems: data.totalItems || 0,
        countedItems: data.countedItems || 0,
        itemsWithDifference: data.itemsWithDifference || 0,
        totalDifferenceValue: data.totalDifferenceValue || 0,
        expectedTotalValue: data.expectedTotalValue || 0,
        actualTotalValue: data.actualTotalValue || 0,
        createdAt: data.createdAt?.toDate() || new Date(),
        createdBy: data.createdBy || '',
        lockedAt: data.lockedAt?.toDate(),
        lockedBy: data.lockedBy,
        notes: data.notes,
      });
    });
    
    // Sortiere nach Datum (neueste zuerst)
    inventuren.sort((a, b) => b.countDate.getTime() - a.countDate.getTime());
    
    return inventuren;
  }
  
  /**
   * Lädt eine einzelne Inventur
   */
  static async getInventur(companyId: string, inventurId: string): Promise<Inventur | null> {
    const inventurRef = doc(db, 'companies', companyId, 'inventories', inventurId);
    const snapshot = await getDoc(inventurRef);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    const data = snapshot.data();
    
    // Signaturen konvertieren
    const performedBySignature = data.performedBySignature ? {
      signatureData: data.performedBySignature.signatureData,
      signerName: data.performedBySignature.signerName,
      signedAt: data.performedBySignature.signedAt?.toDate() || new Date(),
      signedBy: data.performedBySignature.signedBy,
      authMethod: data.performedBySignature.authMethod,
    } : undefined;
    
    const approvedBySignature = data.approvedBySignature ? {
      signatureData: data.approvedBySignature.signatureData,
      signerName: data.approvedBySignature.signerName,
      signedAt: data.approvedBySignature.signedAt?.toDate() || new Date(),
      signedBy: data.approvedBySignature.signedBy,
      authMethod: data.approvedBySignature.authMethod,
    } : undefined;
    
    return {
      id: snapshot.id,
      companyId,
      name: data.name || '',
      type: data.type || 'vollstaendig',
      status: data.status || 'geplant',
      countDate: data.countDate?.toDate() || new Date(),
      startedAt: data.startedAt?.toDate(),
      completedAt: data.completedAt?.toDate(),
      filterByCategories: data.filterByCategories || [],
      filterByLocations: data.filterByLocations || [],
      filterBySuppliers: data.filterBySuppliers || [],
      totalItems: data.totalItems || 0,
      countedItems: data.countedItems || 0,
      itemsWithDifference: data.itemsWithDifference || 0,
      totalDifferenceValue: data.totalDifferenceValue || 0,
      expectedTotalValue: data.expectedTotalValue || 0,
      actualTotalValue: data.actualTotalValue || 0,
      performedBySignature,
      approvedBySignature,
      createdAt: data.createdAt?.toDate() || new Date(),
      createdBy: data.createdBy || '',
      lockedAt: data.lockedAt?.toDate(),
      lockedBy: data.lockedBy,
      notes: data.notes,
    };
  }
  
  // =========================================================================
  // INVENTUR-ITEMS (Zählpositionen)
  // =========================================================================
  
  /**
   * Lädt alle Items einer Inventur
   */
  static async getInventurItems(
    companyId: string,
    inventurId: string,
    filter?: { category?: string; location?: string; status?: InventoryItemStatus }
  ): Promise<InventurItem[]> {
    const itemsRef = collection(db, 'companies', companyId, 'inventories', inventurId, 'items');
    const snapshot = await getDocs(itemsRef);
    
    let items: InventurItem[] = [];
    
    snapshot.forEach(docSnapshot => {
      const data = docSnapshot.data();
      items.push({
        id: docSnapshot.id,
        inventoryId: inventurId,
        itemId: data.itemId || '',
        itemName: data.itemName || '',
        sku: data.sku,
        category: data.category || '',
        location: data.location,
        unit: data.unit || 'Stück',
        expectedQuantity: data.expectedQuantity || 0,
        countedQuantity: data.countedQuantity,
        difference: data.difference,
        differenceValue: data.differenceValue,
        unitPrice: data.unitPrice || 0,
        status: data.status || 'offen',
        countedAt: data.countedAt?.toDate(),
        countedBy: data.countedBy,
        notes: data.notes,
        differenceBooked: data.differenceBooked || false,
        expenseId: data.expenseId,
      });
    });
    
    // Filter anwenden
    if (filter?.category) {
      items = items.filter(item => item.category === filter.category);
    }
    if (filter?.location) {
      items = items.filter(item => item.location === filter.location);
    }
    if (filter?.status) {
      items = items.filter(item => item.status === filter.status);
    }
    
    // Sortiere nach Name
    items.sort((a, b) => a.itemName.localeCompare(b.itemName, 'de'));
    
    return items;
  }
  
  /**
   * Erfasst Zählergebnis für ein Item
   */
  static async recordCount(
    companyId: string,
    inventurId: string,
    itemId: string,
    countedQuantity: number,
    userId: string,
    notes?: string
  ): Promise<void> {
    const itemRef = doc(db, 'companies', companyId, 'inventories', inventurId, 'items', itemId);
    const itemSnapshot = await getDoc(itemRef);
    
    if (!itemSnapshot.exists()) {
      throw new Error('Inventur-Position nicht gefunden');
    }
    
    const itemData = itemSnapshot.data();
    const expectedQuantity = itemData.expectedQuantity || 0;
    const unitPrice = itemData.unitPrice || 0;
    
    // Differenz berechnen
    const difference = countedQuantity - expectedQuantity;
    const differenceValue = difference * unitPrice;
    
    // Item aktualisieren
    await updateDoc(itemRef, {
      countedQuantity,
      difference,
      differenceValue,
      status: 'gezaehlt' as InventoryItemStatus,
      countedAt: serverTimestamp(),
      countedBy: userId,
      notes: notes || '',
    });
    
    // Inventur-Zusammenfassung aktualisieren
    await this.updateInventurSummary(companyId, inventurId);
  }
  
  /**
   * Aktualisiert die Zusammenfassung einer Inventur
   */
  private static async updateInventurSummary(companyId: string, inventurId: string): Promise<void> {
    const items = await this.getInventurItems(companyId, inventurId);
    
    const countedItems = items.filter(i => i.status !== 'offen').length;
    const itemsWithDifference = items.filter(i => i.difference !== null && i.difference !== 0).length;
    const totalDifferenceValue = items.reduce((sum, i) => sum + (i.differenceValue || 0), 0);
    const actualTotalValue = items.reduce((sum, i) => {
      const qty = i.countedQuantity ?? i.expectedQuantity;
      return sum + (qty * i.unitPrice);
    }, 0);
    
    const inventurRef = doc(db, 'companies', companyId, 'inventories', inventurId);
    await updateDoc(inventurRef, {
      countedItems,
      itemsWithDifference,
      totalDifferenceValue,
      actualTotalValue,
    });
  }
  
  // =========================================================================
  // INVENTUR STARTEN / ABSCHLIESSEN
  // =========================================================================
  
  /**
   * Startet eine Inventur (setzt Status auf "in_bearbeitung")
   */
  static async startInventur(companyId: string, inventurId: string, userId: string): Promise<void> {
    const inventurRef = doc(db, 'companies', companyId, 'inventories', inventurId);
    await updateDoc(inventurRef, {
      status: 'in_bearbeitung' as InventoryStatus,
      startedAt: serverTimestamp(),
    });
  }
  
  /**
   * Schließt eine Inventur ab (GoBD-konform)
   */
  static async completeInventur(
    companyId: string,
    inventurId: string,
    userId: string,
    options: {
      updateStock: boolean;      // Bestände im Inventar aktualisieren?
      createSnapshot: boolean;   // Bestandsfoto für BWA erstellen?
    }
  ): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    // Prüfe ob alle Items gezählt wurden
    const items = await this.getInventurItems(companyId, inventurId);
    const openItems = items.filter(i => i.status === 'offen');
    
    if (openItems.length > 0) {
      errors.push(`${openItems.length} Artikel wurden noch nicht gezählt`);
      return { success: false, errors };
    }
    
    const batch = writeBatch(db);
    
    // Bestände im Inventar aktualisieren
    if (options.updateStock) {
      for (const item of items) {
        if (item.countedQuantity !== null && item.countedQuantity !== item.expectedQuantity) {
          const inventoryItemRef = doc(db, 'companies', companyId, 'inventory', item.itemId);
          batch.update(inventoryItemRef, {
            currentStock: item.countedQuantity,
            availableStock: item.countedQuantity, // Reservierungen müssten separat behandelt werden
            updatedAt: serverTimestamp(),
          });
        }
      }
    }
    
    // Inventur abschließen
    const inventurRef = doc(db, 'companies', companyId, 'inventories', inventurId);
    batch.update(inventurRef, {
      status: 'abgeschlossen' as InventoryStatus,
      completedAt: serverTimestamp(),
      lockedAt: serverTimestamp(),
      lockedBy: userId,
    });
    
    await batch.commit();
    
    // Bestandsfoto erstellen
    if (options.createSnapshot) {
      await this.createInventorySnapshot(companyId, inventurId, userId);
    }
    
    return { success: true, errors: [] };
  }
  
  // =========================================================================
  // BESTANDSVERÄNDERUNG FÜR BWA
  // =========================================================================
  
  /**
   * Erstellt ein Bestandsfoto (für BWA-Berechnung)
   */
  static async createInventorySnapshot(
    companyId: string,
    inventurId: string,
    userId: string
  ): Promise<string> {
    const inventur = await this.getInventur(companyId, inventurId);
    if (!inventur) {
      throw new Error('Inventur nicht gefunden');
    }
    
    const items = await this.getInventurItems(companyId, inventurId);
    const totalValue = items.reduce((sum, i) => {
      const qty = i.countedQuantity ?? i.expectedQuantity;
      return sum + (qty * i.unitPrice);
    }, 0);
    
    const snapshotRef = collection(db, 'companies', companyId, 'inventorySnapshots');
    const snapshotDoc = await addDoc(snapshotRef, {
      companyId,
      snapshotDate: Timestamp.fromDate(inventur.countDate),
      type: 'inventur',
      totalValue,
      itemCount: items.length,
      inventoryId: inventurId,
      createdAt: serverTimestamp(),
      createdBy: userId,
    });
    
    return snapshotDoc.id;
  }
  
  /**
   * Berechnet Bestandsveränderung für BWA (Zeile 2)
   */
  static async calculateStockChange(
    companyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ openingStock: number; closingStock: number; change: number }> {
    // Lade Snapshots im Zeitraum
    const snapshotsRef = collection(db, 'companies', companyId, 'inventorySnapshots');
    const snapshot = await getDocs(snapshotsRef);
    
    const snapshots: InventorySnapshot[] = [];
    snapshot.forEach(docSnapshot => {
      const data = docSnapshot.data();
      snapshots.push({
        id: docSnapshot.id,
        companyId,
        snapshotDate: data.snapshotDate?.toDate() || new Date(),
        type: data.type || 'inventur',
        totalValue: data.totalValue || 0,
        itemCount: data.itemCount || 0,
        createdAt: data.createdAt?.toDate() || new Date(),
        createdBy: data.createdBy || '',
        inventoryId: data.inventoryId,
      });
    });
    
    // Sortiere nach Datum
    snapshots.sort((a, b) => a.snapshotDate.getTime() - b.snapshotDate.getTime());
    
    // Finde Anfangs- und Endbestand
    const openingSnapshot = snapshots.find(s => s.snapshotDate <= startDate);
    const closingSnapshot = snapshots.find(s => s.snapshotDate <= endDate);
    
    // Falls keine Snapshots: Aktuellen Inventarwert berechnen
    let openingStock = openingSnapshot?.totalValue || 0;
    let closingStock = closingSnapshot?.totalValue || 0;
    
    if (!closingSnapshot) {
      // Aktuellen Bestandswert aus Inventar berechnen
      const currentItems = await InventoryService.getInventoryItems(companyId);
      closingStock = currentItems.reduce(
        (sum, item) => sum + (item.currentStock * item.purchasePrice),
        0
      );
    }
    
    const change = closingStock - openingStock;
    
    return {
      openingStock,
      closingStock,
      change,
    };
  }
  
  // =========================================================================
  // ZÄHLLISTEN
  // =========================================================================
  
  /**
   * Generiert Zähllisten-Daten (für PDF-Export)
   * Liest direkt aus der inventory Collection (Lager-Artikel)
   */
  static async generateZaehllistenData(
    companyId: string,
    inventurId: string,
    options: ZaehllisteOptions
  ): Promise<{
    inventur: Inventur;
    groups: Array<{
      name: string;
      items: InventurItem[];
    }>;
  }> {
    const inventur = await this.getInventur(companyId, inventurId);
    if (!inventur) {
      throw new Error('Inventur nicht gefunden');
    }
    
    // Lade Artikel direkt aus der inventory Collection (Lager-Artikel)
    const inventoryItems = await InventoryService.getInventoryItems(companyId);
    
    // Filter nach Inventur-Einstellungen anwenden
    let filteredItems = inventoryItems.filter(item => item.status === 'active');
    
    if (inventur.filterByCategories && inventur.filterByCategories.length > 0) {
      filteredItems = filteredItems.filter(item => 
        inventur.filterByCategories!.includes(item.category)
      );
    }
    
    if (inventur.filterByLocations && inventur.filterByLocations.length > 0) {
      filteredItems = filteredItems.filter(item => 
        item.location && inventur.filterByLocations!.includes(item.location)
      );
    }
    
    // Konvertiere InventoryItem zu InventurItem Format
    const items: InventurItem[] = filteredItems.map(item => ({
      id: item.id,
      inventoryId: inventurId,
      itemId: item.id,
      itemName: item.name,
      sku: item.sku,
      category: item.category,
      location: item.location,
      unit: item.unit,
      expectedQuantity: item.currentStock,
      countedQuantity: undefined,
      difference: undefined,
      differenceValue: undefined,
      unitPrice: item.purchasePrice,
      status: 'offen' as InventoryItemStatus,
      countedAt: undefined,
      countedBy: undefined,
      notes: undefined,
      differenceBooked: false,
      expenseId: undefined,
    }));
    
    // Gruppierung
    const groupMap = new Map<string, InventurItem[]>();
    
    for (const item of items) {
      let groupKey: string;
      
      switch (options.groupBy) {
        case 'category':
          groupKey = item.category || 'Ohne Kategorie';
          break;
        case 'location':
          groupKey = item.location || 'Ohne Lagerort';
          break;
        case 'alphabetical':
          groupKey = item.itemName.charAt(0).toUpperCase() || '#';
          break;
        default:
          groupKey = 'Alle';
      }
      
      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, []);
      }
      groupMap.get(groupKey)!.push(item);
    }
    
    // Sortiere Gruppen
    const sortedGroups = Array.from(groupMap.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'de'))
      .map(([name, groupItems]) => ({
        name,
        items: groupItems.sort((a, b) => a.itemName.localeCompare(b.itemName, 'de')),
      }));
    
    return {
      inventur,
      groups: sortedGroups,
    };
  }
  
  // =========================================================================
  // STATISTIKEN
  // =========================================================================
  
  /**
   * Lädt Inventur-Statistiken
   */
  static async getInventurStats(companyId: string): Promise<InventurStats> {
    const inventuren = await this.getInventuren(companyId);
    
    const completed = inventuren.filter(i => i.status === 'abgeschlossen');
    const open = inventuren.filter(i => i.status !== 'abgeschlossen' && i.status !== 'storniert');
    
    const totalDifferenceValue = completed.reduce((sum, i) => sum + Math.abs(i.totalDifferenceValue), 0);
    const averageDifferencePercent = completed.length > 0
      ? (completed.reduce((sum, i) => {
          const diffPercent = i.expectedTotalValue > 0
            ? (Math.abs(i.totalDifferenceValue) / i.expectedTotalValue) * 100
            : 0;
          return sum + diffPercent;
        }, 0) / completed.length)
      : 0;
    
    return {
      totalInventories: inventuren.length,
      completedInventories: completed.length,
      openInventories: open.length,
      lastInventoryDate: completed[0]?.completedAt,
      totalDifferenceValue,
      averageDifferencePercent: Math.round(averageDifferencePercent * 10) / 10,
    };
  }

  // =========================================================================
  // UNTERSCHRIFTEN
  // =========================================================================

  /**
   * Speichert eine digitale Unterschrift für eine Inventur
   */
  static async saveInventurSignature(
    companyId: string,
    inventurId: string,
    signatureType: 'performed' | 'approved',
    signatureData: {
      signatureData: string;
      signerName: string;
      signedBy?: string;
      authMethod?: 'signature' | 'biometric';
    }
  ): Promise<void> {
    const inventurRef = doc(db, 'companies', companyId, 'inventories', inventurId);
    
    const signature: InventurSignature = {
      signatureData: signatureData.signatureData,
      signerName: signatureData.signerName,
      signedAt: new Date(),
      signedBy: signatureData.signedBy,
      authMethod: signatureData.authMethod,
    };

    const updateData: Record<string, InventurSignature | Date> = {
      updatedAt: new Date(),
    };

    if (signatureType === 'performed') {
      updateData.performedBySignature = signature;
    } else {
      updateData.approvedBySignature = signature;
    }

    await updateDoc(inventurRef, updateData);
  }

  /**
   * Löscht eine Unterschrift von einer Inventur
   */
  static async removeInventurSignature(
    companyId: string,
    inventurId: string,
    signatureType: 'performed' | 'approved'
  ): Promise<void> {
    const inventurRef = doc(db, 'companies', companyId, 'inventories', inventurId);
    
    const updateData: Record<string, null | Date> = {
      updatedAt: new Date(),
    };

    if (signatureType === 'performed') {
      updateData.performedBySignature = null;
    } else {
      updateData.approvedBySignature = null;
    }

    await updateDoc(inventurRef, updateData);
  }
}

export default InventurService;
