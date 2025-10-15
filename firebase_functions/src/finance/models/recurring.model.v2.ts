// firebase_functions/src/finance/models/recurring.model.v2.ts

/**
 * RecurringInvoiceModel V2
 * 
 * NEUE ARCHITEKTUR:
 * - Wiederkehrende Rechnungen = normale Rechnungen in invoices Subcollection
 * - Pfad: companies/{companyId}/invoices/{invoiceId}
 * - Kennzeichnung: isRecurringTemplate = true
 * - Generierte Rechnungen: recurringParentId = {templateInvoiceId}
 * - Nummerkreislauf bleibt konsistent (GoBD-konform)
 */

import { Timestamp, getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

export class RecurringInvoiceModelV2 {
    
    /**
     * Findet alle fälligen wiederkehrenden Rechnungs-Templates
     */
    async findDueTemplates(
        dueDate: Timestamp,
        companyId?: string
    ): Promise<any[]> {
        const db = getFirestore();
        
        if (companyId) {
            // Query für spezifische Company
            const invoicesRef = db.collection('companies').doc(companyId).collection('invoices');
            
            const snapshot = await invoicesRef
                .where('isRecurringTemplate', '==', true)
                .where('recurringStatus', '==', 'active')
                .where('recurringNextExecutionDate', '<=', dueDate.toDate().toISOString())
                .get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } else {
            // Query über alle Companies
            const companiesSnapshot = await db.collection('companies').get();
            const allTemplates: any[] = [];
            
            for (const companyDoc of companiesSnapshot.docs) {
                const invoicesRef = companyDoc.ref.collection('invoices');
                
                const snapshot = await invoicesRef
                    .where('isRecurringTemplate', '==', true)
                    .where('recurringStatus', '==', 'active')
                    .where('recurringNextExecutionDate', '<=', dueDate.toDate().toISOString())
                    .get();
                
                snapshot.docs.forEach(doc => {
                    allTemplates.push({
                        id: doc.id,
                        companyId: companyDoc.id,
                        ...doc.data()
                    });
                });
            }
            
            return allTemplates;
        }
    }

    /**
     * Generiert eine neue Rechnung aus einem Template
     * Erstellt normale Rechnung mit recurringParentId Referenz
     */
    async generateInvoiceFromTemplate(
        template: any,
        companyId: string
    ): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
        try {
            const db = getFirestore();
            const now = new Date();
            
            // Nächste Rechnungsnummer aus Nummerkreislauf holen
            const invoiceNumber = await this.getNextInvoiceNumber(companyId);
            
            // Fälligkeitsdatum berechnen (Standard: 14 Tage)
            const dueDate = new Date(now);
            dueDate.setDate(dueDate.getDate() + 14);
            
            // Neue Rechnung erstellen
            const invoiceData = {
                companyId,
                
                // Referenz zum Template
                recurringParentId: template.id,
                isGeneratedFromRecurring: true,
                
                // Rechnungsdaten vom Template kopieren
                customerId: template.customerId,
                customerName: template.customerName,
                customerEmail: template.customerEmail || '',
                customerAddress: template.customerAddress || '',
                
                title: template.title || 'Wiederkehrende Rechnung',
                items: template.items || [],
                headTextHtml: template.headTextHtml || '',
                footerText: template.footerText || '',
                notes: template.notes || '',
                paymentTerms: template.paymentTerms || 'Zahlbar innerhalb von 14 Tagen',
                
                currency: template.currency || 'EUR',
                taxRate: template.taxRate || 19,
                taxRule: template.taxRule || 'DE_TAXABLE',
                
                // Rechnungsnummer und Status
                invoiceNumber,
                status: 'sent', // Generierte Rechnungen sind initial "sent"
                
                // Datum
                invoiceDate: Timestamp.fromDate(now),
                validUntil: Timestamp.fromDate(dueDate),
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            };
            
            // Rechnung in invoices Subcollection speichern
            const invoicesRef = db.collection('companies').doc(companyId).collection('invoices');
            const invoiceDoc = await invoicesRef.add(invoiceData);
            
            logger.info(`[RecurringInvoice] Generated invoice ${invoiceNumber} from template ${template.id}`);
            
            // Template aktualisieren
            await this.updateTemplateAfterGeneration(template.id, companyId, invoiceDoc.id);
            
            // Auto-Send wenn aktiviert
            if (template.recurringAutoSendEmail) {
                logger.info(`[RecurringInvoice] Auto-send email for invoice ${invoiceNumber}`);
                // TODO: Email-Versand implementieren
            }
            
            return {
                success: true,
                invoiceId: invoiceDoc.id,
            };
            
        } catch (error) {
            logger.error('[RecurringInvoice] Error generating invoice:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Holt die nächste Rechnungsnummer aus dem Nummerkreislauf
     */
    private async getNextInvoiceNumber(companyId: string): Promise<string> {
        const db = getFirestore();
        const currentYear = new Date().getFullYear();
        
        // Prüfe ob NumberSequenceService existiert
        const sequencesRef = db.collection('companies').doc(companyId).collection('numberSequences');
        const invoiceSequenceQuery = await sequencesRef
            .where('type', '==', 'Rechnung')
            .where('year', '==', currentYear)
            .limit(1)
            .get();
        
        if (!invoiceSequenceQuery.empty) {
            const sequenceDoc = invoiceSequenceQuery.docs[0];
            const sequenceData = sequenceDoc.data();
            const nextNumber = sequenceData.nextNumber || 1;
            
            // Update next number
            await sequenceDoc.ref.update({
                nextNumber: nextNumber + 1,
                updatedAt: Timestamp.now(),
            });
            
            // Format: RE-2025-0001
            const formattedNumber = `RE-${currentYear}-${String(nextNumber).padStart(4, '0')}`;
            return formattedNumber;
        }
        
        // Fallback: Einfache fortlaufende Nummer
        const invoicesRef = db.collection('companies').doc(companyId).collection('invoices');
        const snapshot = await invoicesRef
            .where('invoiceNumber', '!=', null)
            .get();
        
        const nextNumber = snapshot.size + 1;
        return `RE-${currentYear}-${String(nextNumber).padStart(4, '0')}`;
    }

    /**
     * Aktualisiert Template nach erfolgreicher Generierung
     */
    private async updateTemplateAfterGeneration(
        templateId: string,
        companyId: string,
        generatedInvoiceId: string
    ): Promise<void> {
        const db = getFirestore();
        const templateRef = db.collection('companies').doc(companyId).collection('invoices').doc(templateId);
        
        const templateDoc = await templateRef.get();
        if (!templateDoc.exists) {
            throw new Error('Template not found');
        }
        
        const templateData = templateDoc.data();
        const currentGenerated = templateData?.recurringTotalGenerated || 0;
        
        // Nächstes Ausführungsdatum berechnen
        const nextExecutionDate = this.calculateNextExecutionDate(
            templateData?.recurringNextExecutionDate,
            templateData?.recurringInterval
        );
        
        // Template aktualisieren
        await templateRef.update({
            recurringTotalGenerated: currentGenerated + 1,
            recurringLastGeneratedAt: Timestamp.now(),
            recurringNextExecutionDate: nextExecutionDate,
            updatedAt: Timestamp.now(),
        });
        
        // Prüfen ob Template beendet werden soll
        if (templateData?.recurringEndDate) {
            const endDate = new Date(templateData.recurringEndDate);
            if (new Date(nextExecutionDate) > endDate) {
                await templateRef.update({
                    recurringStatus: 'completed',
                });
                logger.info(`[RecurringInvoice] Template ${templateId} completed (end date reached)`);
            }
        }
    }

    /**
     * Berechnet das nächste Ausführungsdatum basierend auf Intervall
     */
    private calculateNextExecutionDate(
        currentDate: string,
        interval: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
    ): string {
        const date = new Date(currentDate);
        
        switch (interval) {
            case 'weekly':
                date.setDate(date.getDate() + 7);
                break;
            case 'monthly':
                date.setMonth(date.getMonth() + 1);
                break;
            case 'quarterly':
                date.setMonth(date.getMonth() + 3);
                break;
            case 'yearly':
                date.setFullYear(date.getFullYear() + 1);
                break;
        }
        
        return date.toISOString();
    }

    /**
     * Verarbeitet alle fälligen Templates für eine Company
     */
    async processScheduledExecutions(companyId?: string): Promise<{
        processed: number;
        successful: number;
        failed: number;
    }> {
        const dueDate = Timestamp.now();
        const templates = await this.findDueTemplates(dueDate, companyId);
        
        let successful = 0;
        let failed = 0;
        
        for (const template of templates) {
            const result = await this.generateInvoiceFromTemplate(template, template.companyId);
            
            if (result.success) {
                successful++;
            } else {
                failed++;
                logger.error(`[RecurringInvoice] Failed to generate invoice for template ${template.id}:`, result.error);
            }
        }
        
        return {
            processed: templates.length,
            successful,
            failed,
        };
    }
}
