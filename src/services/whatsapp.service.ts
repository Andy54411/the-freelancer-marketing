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
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
  FirestoreError,
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
  messageId?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: any;
}

export interface WhatsAppConnection {
  companyId: string;
  phoneNumber: string;
  isConnected: boolean;
  qrCode?: string;
  connectedAt?: string;
  expiresAt?: string;
  lastQrGeneratedAt?: string;
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
   * Nachricht senden (über KUNDENEIGENE WhatsApp Business Nummer via Meta API)
   */
  static async sendMessage(
    companyId: string,
    toPhone: string,
    message: string,
    customerId?: string,
    customerName?: string
  ): Promise<{ success: boolean; messageId?: string }> {
    try {
      // Validierung
      if (!toPhone || toPhone.trim() === '') {
        throw new Error('Telefonnummer ist erforderlich');
      }

      if (!message || message.trim() === '') {
        throw new Error('Nachricht ist erforderlich');
      }

      if (!companyId || companyId.trim() === '') {
        throw new Error('Company ID ist erforderlich');
      }

      console.log('Sending WhatsApp message from company number:', {
        companyId,
        toPhone,
        message: message.substring(0, 50),
        customerId,
        customerName,
      });

      // Sende über Meta API mit KUNDENEIGENER Nummer
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
        console.error('WhatsApp API Error:', error);
        throw new Error(error.error || 'Fehler beim Senden');
      }

      const result = await response.json();

      // Speichere in Firestore für Historie (nur wenn companyId vorhanden)
      if (companyId) {
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
      }

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      console.error('[WhatsApp] Send error:', error);

      // Fehler loggen (nur wenn companyId vorhanden)
      if (companyId) {
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
      }

      throw error;
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
   * Real-time Listener für Chat-Nachrichten
   * Gibt Unsubscribe-Funktion zurück
   */
  static subscribeToMessages(
    companyId: string,
    customerId: string,
    callback: (messages: WhatsAppMessage[]) => void
  ): () => void {
    try {
      const messagesRef = collection(db, 'companies', companyId, 'whatsappMessages');
      const q = query(
        messagesRef,
        where('customerId', '==', customerId),
        orderBy('createdAt', 'asc')
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot: QuerySnapshot<DocumentData>) => {
          const messages = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate?.() || data.createdAt,
            };
          }) as WhatsAppMessage[];

          callback(messages);
        },
        (error: FirestoreError) => {
          console.error('[WhatsApp] Real-time listener error:', error);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('[WhatsApp] Subscribe to messages error:', error);
      return () => {}; // Noop unsubscribe
    }
  }

  /**
   * Lädt alle Nachrichten einer Company
   */
  static async getCompanyMessages(companyId: string): Promise<WhatsAppMessage[]> {
    try {
      const messagesRef = collection(db, 'companies', companyId, 'whatsappMessages');
      const q = query(messagesRef, orderBy('createdAt', 'desc'));

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Convert Firestore Timestamp to Date if needed
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
        };
      }) as WhatsAppMessage[];
    } catch (error) {
      console.error('[WhatsApp] Load company messages error:', error);
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
   * Prüft ob WhatsApp für eine Company konfiguriert ist
   */
  static async isConfigured(companyId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/whatsapp/status?companyId=${companyId}`);
      const data = await response.json();
      return data.configured;
    } catch (error) {
      console.error('[WhatsApp] Config check error:', error);
      return false;
    }
  }

  /**
   * Lädt die WhatsApp-Verbindung einer Company
   */
  static async getConnection(companyId: string): Promise<WhatsAppConnection | null> {
    try {
      const connectionDoc = await getDoc(
        doc(db, 'companies', companyId, 'whatsappConnection', 'current')
      );

      if (!connectionDoc.exists()) {
        return null;
      }

      return connectionDoc.data() as WhatsAppConnection;
    } catch (error) {
      console.error('[WhatsApp] Get connection error:', error);
      return null;
    }
  }

  /**
   * Speichert QR-Code für eine Company
   */
  static async saveQRCode(
    companyId: string,
    qrCode: string,
    expiresInSeconds: number = 120
  ): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

      await setDoc(
        doc(db, 'companies', companyId, 'whatsappConnection', 'current'),
        {
          companyId,
          phoneNumber: '',
          isConnected: false,
          qrCode,
          expiresAt,
          lastQrGeneratedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error('[WhatsApp] Save QR code error:', error);
      throw error;
    }
  }

  /**
   * Speichert erfolgreiche Verbindung
   */
  static async saveConnection(companyId: string, phoneNumber: string): Promise<void> {
    try {
      await setDoc(doc(db, 'companies', companyId, 'whatsappConnection', 'current'), {
        companyId,
        phoneNumber,
        isConnected: true,
        qrCode: undefined,
        connectedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[WhatsApp] Save connection error:', error);
      throw error;
    }
  }

  /**
   * Trennt die WhatsApp-Verbindung
   */
  static async disconnectConnection(companyId: string): Promise<void> {
    try {
      await setDoc(doc(db, 'companies', companyId, 'whatsappConnection', 'current'), {
        companyId,
        phoneNumber: '',
        isConnected: false,
        qrCode: undefined,
      });
    } catch (error) {
      console.error('[WhatsApp] Disconnect error:', error);
      throw error;
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
