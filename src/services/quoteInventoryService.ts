'use client';

import { InventoryService } from './inventoryService';

export interface QuoteInventoryItem {
  itemId: string;
  quantity: number;
  reservedAt: Date;
}

export interface Quote {
  id: string;
  companyId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  inventoryItems?: QuoteInventoryItem[];
  tempQuoteId?: string;
}

export class QuoteInventoryService {
  /**
   * Quote erstellen und Inventar reservieren
   */
  static async createQuoteWithReservation(
    companyId: string,
    quoteData: any,
    inventoryItems: { itemId: string; quantity: number }[]
  ): Promise<string> {
    try {
      // Temporäre Quote-ID für Reservierung
      const tempQuoteId = `quote-${Date.now()}`;

      // Inventar reservieren
      if (inventoryItems.length > 0) {
        await InventoryService.reserveItemsForQuote(companyId, tempQuoteId, inventoryItems);
      }

      // Quote erstellen (hier würde normalerweise die Quote in der Datenbank gespeichert)
      // TODO: Implementiere Quote-Speicherung in Firestore
      console.log('Quote würde erstellt mit:', {
        ...quoteData,
        inventoryItems: inventoryItems.map(item => ({
          ...item,
          reservedAt: new Date(),
        })),
        tempQuoteId,
        status: 'pending',
      });

      return tempQuoteId;
    } catch (error) {
      console.error('Fehler beim Erstellen der Quote mit Reservierung:', error);
      throw error;
    }
  }

  /**
   * Quote annehmen - Reservierte Artikel als verkauft markieren
   */
  static async acceptQuote(
    companyId: string,
    quoteId: string,
    inventoryItems: { itemId: string; quantity: number }[]
  ): Promise<void> {
    try {
      if (inventoryItems.length > 0) {
        await InventoryService.sellReservedItems(companyId, quoteId, inventoryItems);
      }

      // Quote-Status aktualisieren
      // TODO: Implementiere Quote-Status-Update in Firestore
      console.log(`Quote ${quoteId} angenommen, Artikel verkauft:`, inventoryItems);
    } catch (error) {
      console.error('Fehler beim Annehmen der Quote:', error);
      throw error;
    }
  }

  /**
   * Quote ablehnen - Reservierung freigeben
   */
  static async rejectQuote(
    companyId: string,
    quoteId: string,
    inventoryItems: { itemId: string; quantity: number }[]
  ): Promise<void> {
    try {
      if (inventoryItems.length > 0) {
        await InventoryService.releaseReservationForQuote(companyId, quoteId, inventoryItems);
      }

      // Quote-Status aktualisieren
      // TODO: Implementiere Quote-Status-Update in Firestore
      console.log(`Quote ${quoteId} abgelehnt, Reservierung freigegeben:`, inventoryItems);
    } catch (error) {
      console.error('Fehler beim Ablehnen der Quote:', error);
      throw error;
    }
  }

  /**
   * Abgelaufene Quotes bereinigen - Reservierungen freigeben
   */
  static async cleanupExpiredQuotes(companyId: string): Promise<void> {
    try {
      // TODO: Implementiere Bereinigung abgelaufener Quotes
      // 1. Finde alle Quotes mit Status 'pending' und älter als X Tage
      // 2. Gebe Reservierungen frei
      // 3. Markiere Quotes als 'expired'
      console.log('Bereinigung abgelaufener Quotes für Unternehmen:', companyId);
    } catch (error) {
      console.error('Fehler beim Bereinigen abgelaufener Quotes:', error);
      throw error;
    }
  }

  /**
   * Inventar-Reservierungen für ein Unternehmen anzeigen
   */
  static async getInventoryReservations(companyId: string): Promise<QuoteInventoryItem[]> {
    try {
      // TODO: Implementiere Abfrage aller Reservierungen
      // Momentan als Platzhalter
      return [];
    } catch (error) {
      console.error('Fehler beim Laden der Inventar-Reservierungen:', error);
      throw error;
    }
  }
}
