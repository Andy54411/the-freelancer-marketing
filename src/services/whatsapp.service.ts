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
  writeBatch,
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
  waId?: string;
  direction: 'outbound' | 'inbound';
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  body: string;
  messageId?: string;
  messageType?: string;
  mediaId?: string;
  mediaUrl?: string;
  templateName?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date | string | { seconds: number; nanoseconds: number };
  timestamp?: Date | string;
}

export interface WhatsAppConnection {
  companyId: string;
  phoneNumber: string;
  isConnected: boolean;
  qrCode?: string;
  connectedAt?: string;
  expiresAt?: string;
  lastQrGeneratedAt?: string;
  // Meta API Credentials
  accessToken?: string;
  phoneNumberId?: string;
  wabaId?: string;
  displayName?: string;
  status?: string;
  tokenType?: string;
  tokenExpiresAt?: string;
  tokenLastUpdated?: string;
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
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Fehler beim Senden');
      }

      const result = await response.json();

      // Nachricht wird bereits in der API gespeichert - KEINE doppelte Speicherung!

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      // Fehler wird geloggt, aber nicht nochmal gespeichert (API macht das bereits)

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
    } catch {
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
        (_error: FirestoreError) => {
          // Fehler wird ignoriert - Listener wird fortgesetzt
        }
      );

      return unsubscribe;
    } catch {
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
    } catch {
      return [];
    }
  }

  /**
   * Lädt alle Chats gruppiert nach Telefonnummer
   * Gibt eine Liste von Chat-Objekten zurück mit letzter Nachricht
   */
  static async getChats(companyId: string): Promise<{
    phone: string;
    customerId?: string;
    customerName?: string;
    lastMessage: WhatsAppMessage;
    unreadCount: number;
  }[]> {
    try {
      const messages = await this.getCompanyMessages(companyId);
      
      // Gruppiere nach Telefonnummer (customerPhone - konsistent für inbound und outbound)
      const chatMap = new Map<string, {
        phone: string;
        customerId?: string;
        customerName?: string;
        messages: WhatsAppMessage[];
      }>();

      for (const msg of messages) {
        // Nutze customerPhone als primären Schlüssel (wird jetzt konsistent gespeichert)
        const rawPhone = msg.customerPhone || (msg as unknown as { to?: string }).to || '';
        if (!rawPhone) continue;
        
        // Normalisiere Telefonnummer (entferne alles außer Ziffern, behalte + am Anfang)
        const phone = rawPhone.startsWith('+') ? rawPhone : `+${rawPhone.replace(/\D/g, '')}`;

        if (!chatMap.has(phone)) {
          chatMap.set(phone, {
            phone,
            customerId: msg.customerId,
            customerName: msg.customerName,
            messages: [],
          });
        }
        
        const chat = chatMap.get(phone);
        if (chat) {
          chat.messages.push(msg);
          // Update customerName falls vorhanden
          if (msg.customerName && !chat.customerName) {
            chat.customerName = msg.customerName;
          }
          if (msg.customerId && !chat.customerId) {
            chat.customerId = msg.customerId;
          }
        }
      }

      // Konvertiere zu Array und sortiere nach letzter Nachricht
      return Array.from(chatMap.values())
        .filter(chat => chat.messages.length > 0)
        .map(chat => ({
          phone: chat.phone,
          customerId: chat.customerId,
          customerName: chat.customerName,
          lastMessage: chat.messages[0], // Neueste Nachricht (bereits nach createdAt desc sortiert)
          unreadCount: chat.messages.filter(m => m.direction === 'inbound' && m.status !== 'read').length,
        }))
        .sort((a, b) => {
          const dateA = a.lastMessage.createdAt instanceof Date ? a.lastMessage.createdAt : new Date(a.lastMessage.createdAt);
          const dateB = b.lastMessage.createdAt instanceof Date ? b.lastMessage.createdAt : new Date(b.lastMessage.createdAt);
          return dateB.getTime() - dateA.getTime();
        });
    } catch {
      return [];
    }
  }

  /**
   * Lädt Nachrichten für eine bestimmte Telefonnummer
   */
  static async getMessagesByPhone(
    companyId: string,
    phone: string
  ): Promise<WhatsAppMessage[]> {
    try {
      // Normalisiere die gesuchte Telefonnummer
      const normalizedSearch = phone.replace(/\D/g, '');
      
      // Lade alle Nachrichten und filtere nach Telefonnummer
      const messages = await this.getCompanyMessages(companyId);
      
      return messages.filter(msg => {
        const msgPhone = (msg.customerPhone || (msg as unknown as { to?: string }).to || '').replace(/\D/g, '');
        // Vergleiche die letzten 10 Ziffern (für internationale Nummern)
        return msgPhone === normalizedSearch || 
               msgPhone.endsWith(normalizedSearch.slice(-10)) || 
               normalizedSearch.endsWith(msgPhone.slice(-10));
      }).sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateA.getTime() - dateB.getTime(); // Älteste zuerst für Chat-Ansicht
      });
    } catch {
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
    } catch {
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
    } catch {
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
      throw error;
    }
  }

  /**
   * Markiert alle Nachrichten eines Chats als gelesen
   */
  static async markMessagesAsRead(companyId: string, phone: string): Promise<void> {
    try {
      const normalizedSearch = phone.replace(/\D/g, '');
      const messagesRef = collection(db, 'companies', companyId, 'whatsappMessages');
      const messagesSnapshot = await getDocs(messagesRef);
      
      const batch = writeBatch(db);
      let updateCount = 0;
      
      messagesSnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        const msgPhone = (data.customerPhone || data.to || '').replace(/\D/g, '');
        
        // Prüfe ob Nachricht zu diesem Chat gehört und ungelesen ist
        if ((msgPhone === normalizedSearch || 
             msgPhone.endsWith(normalizedSearch.slice(-10)) || 
             normalizedSearch.endsWith(msgPhone.slice(-10))) &&
            data.direction === 'inbound' &&
            data.status !== 'read') {
          batch.update(docSnapshot.ref, { status: 'read', readAt: new Date() });
          updateCount++;
        }
      });
      
      if (updateCount > 0) {
        await batch.commit();
      }
    } catch {
      // Fehler ignorieren - nicht kritisch
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
