/**
 * WhatsApp DSGVO Opt-In Management
 * 
 * Verwaltet die Zustimmung von Kunden für WhatsApp-Kommunikation
 */

import { db } from '@/firebase/server';

/**
 * Prüft, ob Kunde bereits zugestimmt hat
 */
export async function hasCustomerOptedIn(
  companyId: string,
  customerPhone: string
): Promise<boolean> {
  if (!db) return false;
  
  const cleanPhone = customerPhone.replace(/\D/g, '');
  
  const optInSnapshot = await db
    .collection('companies')
    .doc(companyId)
    .collection('whatsappOptIns')
    .where('customerPhone', '==', `+${cleanPhone}`)
    .where('status', '==', 'opted_in')
    .limit(1)
    .get();
  
  return !optInSnapshot.empty;
}

/**
 * Speichert Zustimmung des Kunden
 */
export async function recordOptIn(
  companyId: string,
  customerPhone: string,
  customerId?: string,
  customerName?: string,
  source: 'manual' | 'whatsapp_reply' | 'form' = 'whatsapp_reply'
): Promise<void> {
  if (!db) throw new Error('Firebase nicht verfügbar');
  
  const cleanPhone = customerPhone.replace(/\D/g, '');
  
  await db
    .collection('companies')
    .doc(companyId)
    .collection('whatsappOptIns')
    .add({
      customerId: customerId || null,
      customerPhone: `+${cleanPhone}`,
      customerName: customerName || null,
      companyId,
      status: 'opted_in',
      optInDate: new Date().toISOString(),
      source,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
}

/**
 * Speichert Ablehnung des Kunden
 */
export async function recordOptOut(
  companyId: string,
  customerPhone: string,
  customerId?: string,
  customerName?: string
): Promise<void> {
  if (!db) throw new Error('Firebase nicht verfügbar');
  
  const cleanPhone = customerPhone.replace(/\D/g, '');
  
  // Finde existierenden Opt-In und aktualisiere ihn
  const optInSnapshot = await db
    .collection('companies')
    .doc(companyId)
    .collection('whatsappOptIns')
    .where('customerPhone', '==', `+${cleanPhone}`)
    .limit(1)
    .get();
  
  if (!optInSnapshot.empty) {
    const docRef = optInSnapshot.docs[0].ref;
    await docRef.update({
      status: 'opted_out',
      optOutDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } else {
    // Erstelle neuen Opt-Out Eintrag
    await db
      .collection('companies')
      .doc(companyId)
      .collection('whatsappOptIns')
      .add({
        customerId: customerId || null,
        customerPhone: `+${cleanPhone}`,
        customerName: customerName || null,
        companyId,
        status: 'opted_out',
        optOutDate: new Date().toISOString(),
        source: 'whatsapp_reply',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
  }
}

/**
 * Generiert DSGVO Opt-In Nachricht
 */
export function generateOptInMessage(companyName: string): string {
  return `Hallo,

wir möchten Sie künftig über WhatsApp über wichtige Informationen informieren.

Bitte antworten Sie mit START, um zuzustimmen, oder mit STOP, wenn Sie keine Nachrichten wünschen.

Ihre Zustimmung können Sie jederzeit widerrufen.

Mit freundlichen Grüßen
${companyName}`;
}

/**
 * Prüft, ob eine Nachricht ein Opt-In/Opt-Out Command ist
 */
export function parseOptInCommand(message: string): 'opt_in' | 'opt_out' | null {
  const normalized = message.trim().toUpperCase();
  
  if (normalized === 'START' || normalized === 'JA' || normalized === 'YES') {
    return 'opt_in';
  }
  
  if (normalized === 'STOP' || normalized === 'NEIN' || normalized === 'NO') {
    return 'opt_out';
  }
  
  return null;
}
