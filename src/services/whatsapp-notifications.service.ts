import { WhatsAppService, WhatsAppTemplates } from '@/services/whatsapp.service';

/**
 * Automatische WhatsApp-Benachrichtigungen für Finance Events
 *
 * Integration mit InvoiceService, QuoteService, etc.
 */

export class WhatsAppNotificationService {
  /**
   * Sendet Benachrichtigung wenn Rechnung bezahlt wurde
   */
  static async notifyInvoicePaid(
    companyId: string,
    companyName: string,
    customerId: string,
    customerName: string,
    customerPhone: string,
    invoiceNumber: string,
    amount: number
  ): Promise<void> {
    try {
      if (!customerPhone) return;

      const message = WhatsAppTemplates.INVOICE_PAID(
        customerName,
        invoiceNumber,
        amount,
        companyName
      );

      await WhatsAppService.sendMessage(
        companyId,
        customerPhone,
        message,
        customerId,
        customerName
      );
    } catch (error) {
      console.error('[WhatsApp] Invoice paid notification error:', error);
    }
  }

  /**
   * Sendet Mahnung per WhatsApp
   */
  static async sendInvoiceReminder(
    companyId: string,
    companyName: string,
    customerId: string,
    customerName: string,
    customerPhone: string,
    invoiceNumber: string,
    amount: number,
    daysOverdue: number
  ): Promise<void> {
    try {
      if (!customerPhone) return;

      const message = WhatsAppTemplates.INVOICE_REMINDER(
        customerName,
        invoiceNumber,
        amount,
        daysOverdue,
        companyName
      );

      await WhatsAppService.sendMessage(
        companyId,
        customerPhone,
        message,
        customerId,
        customerName
      );
    } catch (error) {
      console.error('[WhatsApp] Invoice reminder error:', error);
    }
  }

  /**
   * Benachrichtigt Kunden über neue Rechnung
   */
  static async notifyInvoiceSent(
    companyId: string,
    companyName: string,
    customerId: string,
    customerName: string,
    customerPhone: string,
    invoiceNumber: string,
    amount: number,
    dueDate: string
  ): Promise<void> {
    try {
      if (!customerPhone) return;

      const message = WhatsAppTemplates.INVOICE_SENT(
        customerName,
        invoiceNumber,
        amount,
        dueDate,
        companyName
      );

      await WhatsAppService.sendMessage(
        companyId,
        customerPhone,
        message,
        customerId,
        customerName
      );
    } catch (error) {
      console.error('[WhatsApp] Invoice sent notification error:', error);
    }
  }

  /**
   * Terminerin

nerung per WhatsApp
   */
  static async sendAppointmentReminder(
    companyId: string,
    companyName: string,
    customerId: string,
    customerName: string,
    customerPhone: string,
    date: string,
    time: string,
    location: string
  ): Promise<void> {
    try {
      if (!customerPhone) return;

      const message = WhatsAppTemplates.APPOINTMENT_REMINDER(
        customerName,
        date,
        time,
        location,
        companyName
      );

      await WhatsAppService.sendMessage(
        companyId,
        customerPhone,
        message,
        customerId,
        customerName
      );
    } catch (error) {
      console.error('[WhatsApp] Appointment reminder error:', error);
    }
  }
}

export default WhatsAppNotificationService;
