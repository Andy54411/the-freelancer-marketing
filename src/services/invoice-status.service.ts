import { db } from '@/firebase/clients';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

export interface InvoiceStatusUpdate {
  status: 'open' | 'paid' | 'overdue' | 'cancelled';
  paidAt?: Date | null;
  paidAmount?: number;
  paymentMethod?: string;
  transactionId?: string;
  notes?: string;
}

export class InvoiceStatusService {
  /**
   * Aktualisiert den Status einer Rechnung
   */
  static async updateStatus(
    companyId: string,
    invoiceId: string,
    statusUpdate: InvoiceStatusUpdate
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!companyId || !invoiceId) {
        throw new Error('Company ID und Invoice ID sind erforderlich');
      }

      console.log(`🔄 Aktualisiere Rechnung ${invoiceId} Status zu "${statusUpdate.status}"`);

      const invoiceRef = doc(db, 'companies', companyId, 'invoices', invoiceId);
      
      const updateData: any = {
        status: statusUpdate.status,
        updatedAt: serverTimestamp()
      };

      // Spezifische Felder für "bezahlt" Status
      if (statusUpdate.status === 'paid') {
        updateData.paidAt = statusUpdate.paidAt || serverTimestamp();
        if (statusUpdate.paidAmount) {
          updateData.paidAmount = statusUpdate.paidAmount;
        }
        if (statusUpdate.paymentMethod) {
          updateData.paymentMethod = statusUpdate.paymentMethod;
        }
        if (statusUpdate.transactionId) {
          updateData.linkedTransactionId = statusUpdate.transactionId;
        }
      } else if (statusUpdate.status === 'open') {
        // Reset payment fields wenn Status zurück auf "offen" gesetzt wird
        updateData.paidAt = null;
        updateData.paidAmount = null;
        updateData.paymentMethod = null;
        updateData.linkedTransactionId = null;
      }

      if (statusUpdate.notes) {
        updateData.statusNotes = statusUpdate.notes;
      }

      await updateDoc(invoiceRef, updateData);

      console.log(`✅ Rechnung ${invoiceId} erfolgreich aktualisiert:`, statusUpdate);

      return { success: true };

    } catch (error) {
      console.error(`❌ Fehler beim Aktualisieren von Rechnung ${invoiceId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler'
      };
    }
  }

  /**
   * Markiert eine Rechnung als bezahlt
   */
  static async markAsPaid(
    companyId: string,
    invoiceId: string,
    paidAmount: number,
    transactionId?: string,
    paymentMethod: string = 'Banküberweisung'
  ): Promise<{ success: boolean; error?: string }> {
    return this.updateStatus(companyId, invoiceId, {
      status: 'paid',
      paidAmount,
      paymentMethod,
      transactionId,
      paidAt: new Date()
    });
  }

  /**
   * Markiert eine Rechnung als offen
   */
  static async markAsOpen(
    companyId: string,
    invoiceId: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.updateStatus(companyId, invoiceId, {
      status: 'open'
    });
  }

  /**
   * Markiert eine Rechnung als überfällig
   */
  static async markAsOverdue(
    companyId: string,
    invoiceId: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.updateStatus(companyId, invoiceId, {
      status: 'overdue'
    });
  }
}