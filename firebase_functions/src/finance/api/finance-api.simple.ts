// firebase_functions/src/finance/api/finance-api.simple.ts

import { https } from 'firebase-functions/v1';

// Vereinfachte CORS und Auth Implementation
async function corsMiddleware(req: any, res: any): Promise<void> {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

async function authenticateUser(req: any): Promise<{ userId: string; companyId: string }> {
    // Vereinfachte Auth - in der Realität würde hier Firebase Auth Token validiert
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('No valid authorization header');
    }
    
    return {
        userId: 'user_123', // Mock User ID
        companyId: 'company_123' // Mock Company ID
    };
}

// Vereinfachte Typen ohne komplexe Vererbung
interface SimpleFinanceData {
    invoices: {
        id: string;
        companyId: string;
        customerName: string;
        amount: number;
        status: string;
        date: string;
    }[];
    customers: {
        id: string;
        name: string;
        email: string;
    }[];
    expenses: {
        id: string;
        description: string;
        amount: number;
        date: string;
    }[];
    bankAccounts: {
        id: string;
        bankName: string;
        iban: string;
        balance: number;
    }[];
    recurringInvoices: {
        id: string;
        templateName: string;
        frequency: string;
        nextExecution: string;
        status: string;
    }[];
    emailTemplates: {
        id: string;
        name: string;
        subject: string;
        type: string;
    }[];
    documents: {
        id: string;
        fileName: string;
        type: string;
        status: string;
        uploadDate: string;
    }[];
    reports: {
        id: string;
        type: string;
        title: string;
        status: string;
        generatedAt?: string;
    }[];
}

export const financeApiSimple = https.onRequest(async (req, res) => {
    // CORS
    await corsMiddleware(req, res);
    if (req.method === 'OPTIONS') return;

    try {
        // Auth
        const { userId, companyId } = await authenticateUser(req);
        if (!userId || !companyId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const { method } = req;
        const { action } = req.body || {};

        switch (method) {
            case 'GET':
                // Alle Finance-Daten für Dashboard laden
                const financeData = await getFinanceData(companyId);
                res.json(financeData);
                break;

            case 'POST':
                switch (action) {
                    case 'createInvoice':
                        const invoice = await createInvoice(req.body, companyId, userId);
                        res.json({ success: true, invoice });
                        break;

                    case 'createCustomer':
                        const customer = await createCustomer(req.body, companyId, userId);
                        res.json({ success: true, customer });
                        break;

                    case 'createExpense':
                        const expense = await createExpense(req.body, companyId, userId);
                        res.json({ success: true, expense });
                        break;

                    case 'createBankAccount':
                        const bankAccount = await createBankAccount(req.body, companyId, userId);
                        res.json({ success: true, bankAccount });
                        break;

                    case 'createRecurringInvoice':
                        const recurring = await createRecurringInvoice(req.body, companyId, userId);
                        res.json({ success: true, recurring });
                        break;

                    case 'createEmailTemplate':
                        const template = await createEmailTemplate(req.body, companyId, userId);
                        res.json({ success: true, template });
                        break;

                    case 'uploadDocument':
                        const document = await uploadDocument(req.body, companyId, userId);
                        res.json({ success: true, document });
                        break;

                    case 'generateReport':
                        const report = await generateReport(req.body, companyId, userId);
                        res.json({ success: true, report });
                        break;

                    case 'sendEmail':
                        const emailResult = await sendEmail(req.body, companyId, userId);
                        res.json({ success: true, result: emailResult });
                        break;

                    case 'processRecurring':
                        const processingResult = await processRecurringInvoices(companyId);
                        res.json({ success: true, result: processingResult });
                        break;

                    default:
                        res.status(400).json({ error: 'Unknown action' });
                }
                break;

            default:
                res.status(405).json({ error: 'Method not allowed' });
        }

    } catch (error) {
        console.error('Finance API Error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Vereinfachte Implementierungen ohne komplexe Models

async function getFinanceData(companyId: string): Promise<SimpleFinanceData> {
    // Simulierte Daten - in der Realität würde hier Firestore abgefragt
    return {
        invoices: [
            {
                id: 'inv_001',
                companyId,
                customerName: 'Mustermann GmbH',
                amount: 1190.00,
                status: 'PAID',
                date: '2024-01-15'
            },
            {
                id: 'inv_002',
                companyId,
                customerName: 'TechCorp AG',
                amount: 2380.00,
                status: 'OPEN',
                date: '2024-01-20'
            }
        ],
        customers: [
            { id: 'cust_001', name: 'Mustermann GmbH', email: 'info@mustermann.de' },
            { id: 'cust_002', name: 'TechCorp AG', email: 'billing@techcorp.com' }
        ],
        expenses: [
            { id: 'exp_001', description: 'Büromaterial', amount: 150.50, date: '2024-01-10' },
            { id: 'exp_002', description: 'Software-Lizenz', amount: 299.00, date: '2024-01-12' }
        ],
        bankAccounts: [
            { id: 'bank_001', bankName: 'Sparkasse', iban: 'DE89370400440532013000', balance: 15750.00 }
        ],
        recurringInvoices: [
            {
                id: 'rec_001',
                templateName: 'Monatliche Wartung',
                frequency: 'MONTHLY',
                nextExecution: '2024-02-01',
                status: 'ACTIVE'
            }
        ],
        emailTemplates: [
            { id: 'tpl_001', name: 'Rechnung', subject: 'Ihre Rechnung {{invoiceNumber}}', type: 'INVOICE' },
            { id: 'tpl_002', name: 'Mahnung', subject: 'Zahlungserinnerung {{invoiceNumber}}', type: 'REMINDER' }
        ],
        documents: [
            {
                id: 'doc_001',
                fileName: 'rechnung_001.pdf',
                type: 'INVOICE',
                status: 'PROCESSED',
                uploadDate: '2024-01-15'
            }
        ],
        reports: [
            {
                id: 'rep_001',
                type: 'EUR',
                title: 'EÜR 2024',
                status: 'COMPLETED',
                generatedAt: '2024-01-31'
            }
        ]
    };
}

async function createInvoice(data: any, companyId: string, userId: string): Promise<any> {
    return {
        id: `inv_${Date.now()}`,
        companyId,
        customerName: data.customerName || 'Neuer Kunde',
        amount: data.amount || 0,
        status: 'OPEN',
        date: new Date().toISOString().split('T')[0],
        createdBy: userId
    };
}

async function createCustomer(data: any, companyId: string, userId: string): Promise<any> {
    return {
        id: `cust_${Date.now()}`,
        companyId,
        name: data.name || 'Neuer Kunde',
        email: data.email || '',
        createdBy: userId
    };
}

async function createExpense(data: any, companyId: string, userId: string): Promise<any> {
    return {
        id: `exp_${Date.now()}`,
        companyId,
        description: data.description || 'Neue Ausgabe',
        amount: data.amount || 0,
        date: new Date().toISOString().split('T')[0],
        createdBy: userId
    };
}

async function createBankAccount(data: any, companyId: string, userId: string): Promise<any> {
    return {
        id: `bank_${Date.now()}`,
        companyId,
        bankName: data.bankName || 'Bank',
        iban: data.iban || '',
        balance: 0,
        createdBy: userId
    };
}

async function createRecurringInvoice(data: any, companyId: string, userId: string): Promise<any> {
    return {
        id: `rec_${Date.now()}`,
        companyId,
        templateName: data.templateName || 'Neues Template',
        frequency: data.frequency || 'MONTHLY',
        nextExecution: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'ACTIVE',
        createdBy: userId
    };
}

async function createEmailTemplate(data: any, companyId: string, userId: string): Promise<any> {
    return {
        id: `tpl_${Date.now()}`,
        companyId,
        name: data.name || 'Neues Template',
        subject: data.subject || 'Betreff',
        type: data.type || 'CUSTOM',
        htmlBody: data.htmlBody || '<p>Template-Inhalt</p>',
        createdBy: userId
    };
}

async function uploadDocument(data: any, companyId: string, userId: string): Promise<any> {
    return {
        id: `doc_${Date.now()}`,
        companyId,
        fileName: data.fileName || 'document.pdf',
        type: data.type || 'OTHER',
        status: 'UPLOADED',
        uploadDate: new Date().toISOString().split('T')[0],
        createdBy: userId
    };
}

async function generateReport(data: any, companyId: string, userId: string): Promise<any> {
    const reportTypes: { [key: string]: string } = {
        'EUR': 'Einnahme-Überschuss-Rechnung',
        'USTVA': 'Umsatzsteuer-Voranmeldung',
        'BWA': 'Betriebswirtschaftliche Auswertung',
        'DATEV': 'DATEV Export'
    };

    return {
        id: `rep_${Date.now()}`,
        companyId,
        type: data.type || 'EUR',
        title: reportTypes[data.type] || 'Report',
        status: 'GENERATING',
        createdBy: userId
    };
}

async function sendEmail(data: any, companyId: string, userId: string): Promise<any> {
    return {
        deliveryId: `delivery_${Date.now()}`,
        status: 'SENT',
        recipientEmail: data.recipientEmail || 'test@example.com',
        sentAt: new Date().toISOString()
    };
}

async function processRecurringInvoices(companyId: string): Promise<any> {
    return {
        processed: 3,
        successful: 3,
        failed: 0,
        processedAt: new Date().toISOString()
    };
}
