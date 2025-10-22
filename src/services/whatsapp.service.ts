'use client';

import { db } from '@/firebase/clients';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { createClickToChatLink } from '@/lib/whatsapp';

/**
 * WhatsApp Service für Taskilo
 *
 * Features:
 * 1. Click-to-Chat Links (kostenlos, funktioniert sofort)
 * 2. Meta WhatsApp Business API Integration (optional)
 * 3. Nachrichten-Historie in Firestore
 *
 * Setup (optional - für In-App Messaging):
 * - META_WHATSAPP_ACCESS_TOKEN
 * - META_WHATSAPP_PHONE_NUMBER_ID
 */

export interface WhatsAppMessage {
  id?: string;
  companyId: string;
  customerId?: string;
  customerName?: string;
  customerPhone: string;
  direction: 'outbound' | 'inbound';
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  body: string;
  messageId?: string; // Meta/WhatsApp Message ID
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: any;
}

export class WhatsAppService {
  /**
   * Generiert Click-to-Chat Link (funktioniert IMMER)
   */
  static getClickToChatLink(phone: string, message?: string): string {
    return createClickToChatLink(phone, message);
  }

  /**
   * Öffnet WhatsApp Chat in neuem Tab/App
   */
  static openChat(phone: string, message?: string): void {
    const link = this.getClickToChatLink(phone, message);
    window.open(link, '_blank');
  }

  /**
   * Sendet WhatsApp-Nachricht über Meta API (nur wenn konfiguriert)
   */
  static async sendMessage(
    companyId: string,
    toPhone: string,
    message: string,
    customerId?: string,
    customerName?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Prüfe ob Meta API konfiguriert ist
      const configCheck = await fetch('/api/whatsapp/status');
      const config = await configCheck.json();

      if (!config.configured) {
        // Fallback: Öffne Click-to-Chat
        this.openChat(toPhone, message);
        return {
          success: true,
          messageId: 'click-to-chat',
        };
      }

      // Meta API verfügbar - sende über Server
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          to: toPhone,
          message,
          customerId,
          customerName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Fehler beim Senden');
      }

      const result = await response.json();

      // Speichere in Firestore
      await this.saveMessage({
        companyId,
        customerId,
        customerName,
        customerPhone: toPhone,
        direction: 'outbound',
        status: 'sent',
        body: message,
        messageId: result.messageId,
        createdAt: serverTimestamp(),
      });

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      console.error('[WhatsApp] Send error:', error);

      // Fehler loggen
      await this.saveMessage({
        companyId,
        customerId,
        customerName,
        customerPhone: toPhone,
        direction: 'outbound',
        status: 'failed',
        body: message,
        errorMessage: error instanceof Error ? error.message : 'Unbekannter Fehler',
        createdAt: serverTimestamp(),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Fehler beim Senden',
      };
    }
  }

  /**
   * Lädt Chat-Historie für einen Kunden
   */
  static async getCustomerMessages(
    companyId: string,
    customerId: string
  ): Promise<WhatsAppMessage[]> {
    try {
      const messagesRef = collection(db, 'companies', companyId, 'whatsappMessages');
      const q = query(
        messagesRef,
        where('customerId', '==', customerId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as WhatsAppMessage[];
    } catch (error) {
      console.error('[WhatsApp] Load messages error:', error);
      return [];
    }
  }

  /**
   * Speichert Nachricht in Firestore
   */
  private static async saveMessage(message: Omit<WhatsAppMessage, 'id'>): Promise<string> {
    try {
      const messagesRef = collection(db, 'companies', message.companyId, 'whatsappMessages');
      const docRef = await addDoc(messagesRef, message);
      return docRef.id;
    } catch (error) {
      console.error('[WhatsApp] Save message error:', error);
      throw error;
    }
  }

  /**
   * Prüft ob Meta API konfiguriert ist
   */
  static async isConfigured(): Promise<boolean> {
    try {
      const response = await fetch('/api/whatsapp/status');
      const data = await response.json();
      return data.configured;
    } catch {
      return false;
    }
  }
}

/**
 * Vordefinierte Nachrichten-Templates
 */
export const WhatsAppTemplates = {
  INVOICE_PAID: (
    customerName: string,
    invoiceNumber: string,
    amount: number,
    companyName: string
  ) =>
    `Hallo ${customerName},\n\nvielen Dank! Ihre Zahlung für Rechnung ${invoiceNumber} über ${amount.toFixed(2)} € ist eingegangen.\n\nMit freundlichen Grüßen\n${companyName}`,

  INVOICE_REMINDER: (
    customerName: string,
    invoiceNumber: string,
    amount: number,
    daysOverdue: number,
    companyName: string
  ) =>
    `Hallo ${customerName},\n\ndie Rechnung ${invoiceNumber} über ${amount.toFixed(2)} € ist seit ${daysOverdue} Tagen fällig.\n\nBitte überweisen Sie den Betrag zeitnah.\n\nMit freundlichen Grüßen\n${companyName}`,

  INVOICE_SENT: (
    customerName: string,
    invoiceNumber: string,
    amount: number,
    dueDate: string,
    companyName: string
  ) =>
    `Hallo ${customerName},\n\nIhre Rechnung ${invoiceNumber} über ${amount.toFixed(2)} € wurde erstellt.\n\nZahlbar bis: ${dueDate}\n\nMit freundlichen Grüßen\n${companyName}`,

  APPOINTMENT_REMINDER: (
    customerName: string,
    date: string,
    time: string,
    location: string,
    companyName: string
  ) =>
    `Hallo ${customerName},\n\nErinnerung: Ihr Termin am ${date} um ${time} Uhr.\n\nOrt: ${location}\n\nBis bald!\n${companyName}`,
};

export default WhatsAppService;
