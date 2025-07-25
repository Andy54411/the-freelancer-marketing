// firebase_functions/src/finance/sync/order-to-invoice.sync.ts

import { Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { getDb } from '../../helpers';
import { InvoiceModel, CustomerModel } from '../models';
import {
    OrderToInvoiceSyncData,
    CreateInvoiceRequest,
    CreateCustomerRequest,
    InvoiceData,
    CustomerData
} from '../types';

export class OrderToInvoiceSyncService {
    private invoiceModel: InvoiceModel;
    private customerModel: CustomerModel;

    constructor() {
        this.invoiceModel = new InvoiceModel();
        this.customerModel = new CustomerModel();
    }

    /**
     * Hauptfunktion: Synchronisiert einen Taskilo-Auftrag zu einer Finance-Rechnung
     */
    async syncOrderToInvoice(
        taskiloOrderId: string,
        companyId: string,
        userId: string,
        options: {
            forceOverwrite?: boolean;
            dryRun?: boolean;
            autoSendInvoice?: boolean;
        } = {}
    ): Promise<{
        success: boolean;
        invoiceId?: string;
        customerId?: string;
        errors: string[];
        warnings: string[];
    }> {
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            logger.info(`[OrderToInvoiceSync] Starting sync for order ${taskiloOrderId}`);

            // 1. Taskilo-Auftrags-Daten laden
            const orderData = await this.loadTaskiloOrderData(taskiloOrderId, companyId);
            if (!orderData) {
                errors.push('Taskilo order not found');
                return { success: false, errors, warnings };
            }

            // 2. Prüfen ob bereits eine Rechnung existiert
            const existingInvoice = await this.findExistingInvoice(taskiloOrderId, companyId);
            if (existingInvoice && !options.forceOverwrite) {
                warnings.push(`Invoice already exists: ${existingInvoice.invoiceNumber}`);
                return {
                    success: true,
                    invoiceId: existingInvoice.id,
                    customerId: existingInvoice.customerId,
                    errors,
                    warnings
                };
            }

            // 3. Kunde synchronisieren/erstellen
            const customerResult = await this.syncOrCreateCustomer(orderData, userId, companyId);
            if (!customerResult.success) {
                errors.push(...customerResult.errors);
                return { success: false, errors, warnings };
            }

            // 4. TimeTracking-Daten laden (für tatsächliche Stunden)
            const timeTrackingData = await this.loadTimeTrackingData(taskiloOrderId, companyId);

            // 5. Rechnungs-Daten transformieren
            const invoiceData = await this.transformOrderToInvoiceData(
                orderData,
                customerResult.customerId!,
                timeTrackingData
            );

            // 6. Rechnung erstellen (oder aktualisieren)
            let invoice: InvoiceData;
            if (existingInvoice && options.forceOverwrite) {
                if (options.dryRun) {
                    logger.info('[OrderToInvoiceSync] Dry run - would update existing invoice');
                    return {
                        success: true,
                        invoiceId: existingInvoice.id,
                        customerId: customerResult.customerId,
                        errors,
                        warnings: [...warnings, 'Dry run - no changes made']
                    };
                }

                invoice = await this.invoiceModel.updateInvoice(
                    existingInvoice.id,
                    invoiceData,
                    userId,
                    companyId
                );
                warnings.push('Updated existing invoice');
            } else {
                if (options.dryRun) {
                    logger.info('[OrderToInvoiceSync] Dry run - would create new invoice');
                    return {
                        success: true,
                        customerId: customerResult.customerId,
                        errors,
                        warnings: [...warnings, 'Dry run - no changes made']
                    };
                }

                invoice = await this.invoiceModel.createInvoice(
                    invoiceData,
                    userId,
                    companyId
                );
            }

            // 7. Sync-Daten zur Rechnung hinzufügen
            await this.addSyncDataToInvoice(invoice.id, orderData, timeTrackingData, userId, companyId);

            // 8. Optional: Rechnung automatisch versenden
            if (options.autoSendInvoice && !options.dryRun) {
                await this.invoiceModel.updateStatus(invoice.id, 'SENT', userId, companyId);
                warnings.push('Invoice automatically sent');
            }

            logger.info(`[OrderToInvoiceSync] Successfully synced order ${taskiloOrderId} to invoice ${invoice.id}`);

            return {
                success: true,
                invoiceId: invoice.id,
                customerId: customerResult.customerId,
                errors,
                warnings,
            };

        } catch (error) {
            logger.error('[OrderToInvoiceSync] Sync failed:', error);
            errors.push(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return { success: false, errors, warnings };
        }
    }

    /**
     * Batch-Synchronisation mehrerer Aufträge
     */
    async batchSyncOrders(
        orderIds: string[],
        companyId: string,
        userId: string,
        options: {
            forceOverwrite?: boolean;
            dryRun?: boolean;
            autoSendInvoices?: boolean;
            continueOnError?: boolean;
        } = {}
    ): Promise<{
        totalProcessed: number;
        successful: number;
        failed: number;
        results: Array<{
            orderId: string;
            success: boolean;
            invoiceId?: string;
            customerId?: string;
            errors: string[];
            warnings: string[];
        }>;
    }> {
        const results = [];
        let successful = 0;
        let failed = 0;

        for (const orderId of orderIds) {
            try {
                const result = await this.syncOrderToInvoice(orderId, companyId, userId, {
                    forceOverwrite: options.forceOverwrite,
                    dryRun: options.dryRun,
                    autoSendInvoice: options.autoSendInvoices,
                });

                results.push({
                    orderId,
                    ...result,
                });

                if (result.success) {
                    successful++;
                } else {
                    failed++;
                    if (!options.continueOnError) {
                        break;
                    }
                }
            } catch (error) {
                failed++;
                results.push({
                    orderId,
                    success: false,
                    errors: [`Batch sync error: ${error instanceof Error ? error.message : 'Unknown error'}`],
                    warnings: [],
                });

                if (!options.continueOnError) {
                    break;
                }
            }
        }

        return {
            totalProcessed: results.length,
            successful,
            failed,
            results,
        };
    }

    // Private Hilfsmethoden

    private async loadTaskiloOrderData(
        orderId: string,
        companyId: string
    ): Promise<OrderToInvoiceSyncData['orderData'] | null> {
        try {
            const db = getDb();
            const orderDoc = await db
                .collection('orders')
                .doc(orderId)
                .get();

            if (!orderDoc.exists) {
                return null;
            }

            const orderData = orderDoc.data();

            // Firmen-Zugehörigkeit prüfen
            if (orderData?.companyId !== companyId) {
                throw new Error('Access denied: Order belongs to different company');
            }

            // Daten in unser Format transformieren
            return {
                id: orderDoc.id,
                customerId: orderData.customerId,
                customerEmail: orderData.customerEmail,
                customerName: orderData.customerName || orderData.displayName,
                serviceDescription: orderData.serviceDescription || orderData.description || 'Service',
                hourlyRate: orderData.hourlyRate ? Math.round(orderData.hourlyRate * 100) : undefined, // Convert to cents
                estimatedHours: orderData.estimatedHours,
                actualHours: orderData.actualHours,
                totalAmount: orderData.totalAmount ? Math.round(orderData.totalAmount * 100) : 0, // Convert to cents
                status: orderData.status,
                createdAt: orderData.createdAt || Timestamp.now(),
                completedAt: orderData.completedAt,
            };
        } catch (error) {
            logger.error('[OrderToInvoiceSync] Error loading order data:', error);
            return null;
        }
    }

    private async loadTimeTrackingData(
        orderId: string,
        companyId: string
    ): Promise<OrderToInvoiceSyncData['timeTrackingData'] | undefined> {
        try {
            const db = getDb();
            const timeTrackingSnapshot = await db
                .collection('TimeTracking')
                .where('orderId', '==', orderId)
                .where('companyId', '==', companyId)
                .get();

            if (timeTrackingSnapshot.empty) {
                return undefined;
            }

            let totalHours = 0;
            const dailyEntries: { date: string; hours: number; description?: string }[] = [];

            timeTrackingSnapshot.docs.forEach(doc => {
                const data = doc.data();
                const hours = data.totalHours || 0;
                totalHours += hours;

                dailyEntries.push({
                    date: data.date || new Date().toISOString().split('T')[0],
                    hours: hours,
                    description: data.description,
                });
            });

            return {
                totalHours,
                dailyEntries,
            };
        } catch (error) {
            logger.error('[OrderToInvoiceSync] Error loading time tracking data:', error);
            return undefined;
        }
    }

    private async findExistingInvoice(
        taskiloOrderId: string,
        companyId: string
    ): Promise<InvoiceData | null> {
        try {
            const db = getDb();
            const invoiceSnapshot = await db
                .collection('invoices')
                .where('companyId', '==', companyId)
                .where('syncData.sourceOrderId', '==', taskiloOrderId)
                .limit(1)
                .get();

            if (invoiceSnapshot.empty) {
                return null;
            }

            return invoiceSnapshot.docs[0].data() as InvoiceData;
        } catch (error) {
            logger.error('[OrderToInvoiceSync] Error finding existing invoice:', error);
            return null;
        }
    }

    private async syncOrCreateCustomer(
        orderData: OrderToInvoiceSyncData['orderData'],
        userId: string,
        companyId: string
    ): Promise<{
        success: boolean;
        customerId?: string;
        customerCreated: boolean;
        errors: string[];
    }> {
        const errors: string[] = [];

        try {
            // 1. Versuche existierenden Kunden zu finden
            let customer: CustomerData | null = null;

            // Suche nach Taskilo-Kunden-ID
            if (orderData.customerId) {
                customer = await this.customerModel.findByTaskiloId(orderData.customerId, companyId);
            }

            // Suche nach E-Mail (falls kein Kunde gefunden)
            if (!customer && orderData.customerEmail) {
                const customers = await this.customerModel.searchCustomers(companyId, {
                    searchTerm: orderData.customerEmail,
                });

                // Prüfe ob E-Mail exakt übereinstimmt
                customer = customers.customers.find(c =>
                    c.contacts.some(contact =>
                        contact.type === 'EMAIL' &&
                        contact.value.toLowerCase() === orderData.customerEmail!.toLowerCase()
                    )
                ) || null;
            }

            // 2. Kunde existiert bereits
            if (customer) {
                logger.info(`[OrderToInvoiceSync] Found existing customer: ${customer.id}`);
                return {
                    success: true,
                    customerId: customer.id,
                    customerCreated: false,
                    errors,
                };
            }

            // 3. Neuen Kunden erstellen
            if (!orderData.customerName && !orderData.customerEmail) {
                errors.push('Insufficient customer data - need at least name or email');
                return { success: false, customerCreated: false, errors };
            }

            const customerData: CreateCustomerRequest = {
                type: 'INDIVIDUAL', // Default - kann später angepasst werden
                displayName: orderData.customerName || orderData.customerEmail || 'Unbekannter Kunde',
                firstName: this.extractFirstName(orderData.customerName),
                lastName: this.extractLastName(orderData.customerName),

                // Minimale Rechnungsadresse (Placeholder)
                billingAddress: {
                    street: 'Noch nicht angegeben',
                    postalCode: '00000',
                    city: 'Noch nicht angegeben',
                    country: 'DE',
                },

                email: orderData.customerEmail,
                taskiloCustomerId: orderData.customerId,

                notes: `Automatisch erstellt bei Sync von Auftrag: ${orderData.id}`,
                tags: ['auto-created', 'from-taskilo'],
            };

            customer = await this.customerModel.createCustomer(customerData, userId, companyId);

            logger.info(`[OrderToInvoiceSync] Created new customer: ${customer.id}`);

            return {
                success: true,
                customerId: customer.id,
                customerCreated: true,
                errors,
            };

        } catch (error) {
            logger.error('[OrderToInvoiceSync] Error syncing customer:', error);
            errors.push(`Customer sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return { success: false, customerCreated: false, errors };
        }
    }

    private async transformOrderToInvoiceData(
        orderData: OrderToInvoiceSyncData['orderData'],
        customerId: string,
        timeTrackingData?: OrderToInvoiceSyncData['timeTrackingData']
    ): Promise<CreateInvoiceRequest> {
        // Stunden berechnen: TimeTracking hat Vorrang, sonst actualHours, sonst estimatedHours
        const hours = timeTrackingData?.totalHours || orderData.actualHours || orderData.estimatedHours || 0;

        // Stundensatz (in Cent)
        const hourlyRateInCents = orderData.hourlyRate || 5000; // Default 50€/h

        // Line Items erstellen
        const lineItems = [{
            description: orderData.serviceDescription,
            quantity: hours,
            unitPrice: hourlyRateInCents,
            taxRate: 19, // Standard MwSt.
            unit: 'Stunden',
            category: 'Service',
        }];

        // Zusätzliche Details aus TimeTracking
        let detailDescription = orderData.serviceDescription;
        if (timeTrackingData && timeTrackingData.dailyEntries.length > 0) {
            detailDescription += '\n\nAufschlüsselung der Arbeitszeiten:\n';
            timeTrackingData.dailyEntries.forEach(entry => {
                detailDescription += `• ${entry.date}: ${entry.hours}h`;
                if (entry.description) {
                    detailDescription += ` - ${entry.description}`;
                }
                detailDescription += '\n';
            });
        }

        return {
            customerId,
            serviceDate: orderData.completedAt || orderData.createdAt,
            lineItems,
            introduction: `Rechnung für die erbrachten Dienstleistungen gemäß Auftrag ${orderData.id}.`,
            conclusion: detailDescription,
            notes: `Automatisch generiert aus Taskilo-Auftrag: ${orderData.id}`,
        };
    }

    private async addSyncDataToInvoice(
        invoiceId: string,
        orderData: OrderToInvoiceSyncData['orderData'],
        timeTrackingData: OrderToInvoiceSyncData['timeTrackingData'] | undefined,
        userId: string,
        companyId: string
    ): Promise<void> {
        const syncData = {
            sourceType: 'TASKILO_ORDER',
            sourceOrderId: orderData.id,
            originalAmount: orderData.totalAmount,
            actualAmount: orderData.totalAmount, // TODO: Könnte sich unterscheiden
            hoursPlanned: orderData.estimatedHours,
            hoursActual: timeTrackingData?.totalHours || orderData.actualHours,
            autoGenerated: true,
            syncedAt: Timestamp.now(),
        };

        await this.invoiceModel.update(
            invoiceId,
            { syncData } as any,
            userId,
            companyId
        );
    }

    private extractFirstName(fullName?: string): string | undefined {
        if (!fullName) return undefined;
        const parts = fullName.trim().split(' ');
        return parts.length > 0 ? parts[0] : undefined;
    }

    private extractLastName(fullName?: string): string | undefined {
        if (!fullName) return undefined;
        const parts = fullName.trim().split(' ');
        return parts.length > 1 ? parts.slice(1).join(' ') : undefined;
    }
}
