// firebase_functions/src/finance/functions/finance-http.ts

import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { Timestamp } from 'firebase-admin/firestore';
import { corsOptions } from '../../helpers';
import { InvoiceModel, CustomerModel } from '../models';
import { OrderToInvoiceSyncService } from '../sync';
import { 
  CreateInvoiceRequest, 
  UpdateInvoiceRequest,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  InvoiceSearchFilters,
  CustomerSearchFilters 
} from '../types';

// CORS Setup
const cors = require('cors')({ origin: corsOptions });

// Model-Instanzen
const invoiceModel = new InvoiceModel();
const customerModel = new CustomerModel();
const syncService = new OrderToInvoiceSyncService();

/**
 * Zentrale HTTP-API für das Finance-Modul
 */
export const financeApi = onRequest(async (request, response) => {
  return cors(request, response, async () => {
    try {
      const { method, url } = request;
      const path = url?.split('?')[0] || '';
      const pathParts = path.split('/').filter(Boolean);
      
      // Route: /finance/{resource}/{action?}/{id?}
      const [, resource, action, id] = pathParts;

      // Authentifizierung prüfen
      const userId = request.headers['x-user-id'] as string;
      const companyId = request.headers['x-company-id'] as string;
      
      if (!userId || !companyId) {
        response.status(401).json({ 
          error: 'Authentication required', 
          message: 'x-user-id and x-company-id headers are required' 
        });
        return;
      }

      logger.info(`[FinanceAPI] ${method} ${path} - User: ${userId}, Company: ${companyId}`);

      // Router basierend auf Resource und Action
      switch (resource) {
        case 'invoices':
          await handleInvoiceRoutes(method, action, id, request, response, userId, companyId);
          break;
          
        case 'customers':
          await handleCustomerRoutes(method, action, id, request, response, userId, companyId);
          break;
          
        case 'sync':
          await handleSyncRoutes(method, action, id, request, response, userId, companyId);
          break;
          
        default:
          response.status(404).json({ error: 'Resource not found' });
      }

    } catch (error) {
      logger.error('[FinanceAPI] Unhandled error:', error);
      response.status(500).json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
});

// Invoice-Routen Handler
async function handleInvoiceRoutes(
  method: string,
  action: string | undefined,
  id: string | undefined,
  request: any,
  response: any,
  userId: string,
  companyId: string
) {
  switch (method) {
    case 'GET':
      if (id) {
        // GET /finance/invoices/{id}
        const invoice = await invoiceModel.getById(id, companyId);
        if (!invoice) {
          response.status(404).json({ error: 'Invoice not found' });
          return;
        }
        response.json({ invoice });
      } else {
        // GET /finance/invoices?filters...
        const filters: InvoiceSearchFilters = {
          status: request.query.status ? request.query.status.split(',') : undefined,
          customerId: request.query.customerId,
          dateFrom: request.query.dateFrom ? Timestamp.fromDate(new Date(request.query.dateFrom)) : undefined,
          dateTo: request.query.dateTo ? Timestamp.fromDate(new Date(request.query.dateTo)) : undefined,
          amountMin: request.query.amountMin ? parseInt(request.query.amountMin) : undefined,
          amountMax: request.query.amountMax ? parseInt(request.query.amountMax) : undefined,
          invoiceNumber: request.query.invoiceNumber,
        };
        
        const pagination = {
          page: parseInt(request.query.page) || 1,
          limit: parseInt(request.query.limit) || 20,
          sortBy: request.query.sortBy || 'createdAt',
          sortOrder: request.query.sortOrder === 'asc' ? 'asc' as const : 'desc' as const,
        };

        const result = await invoiceModel.searchInvoices(companyId, filters, pagination);
        response.json(result);
      }
      break;

    case 'POST':
      if (action === 'status' && id) {
        // POST /finance/invoices/{id}/status
        const { status } = request.body;
        const invoice = await invoiceModel.updateStatus(id, status, userId, companyId);
        response.json({ invoice });
      } else if (!id) {
        // POST /finance/invoices
        const invoiceData: CreateInvoiceRequest = request.body;
        const invoice = await invoiceModel.createInvoice(invoiceData, userId, companyId);
        response.status(201).json({ invoice });
      } else {
        response.status(400).json({ error: 'Invalid request' });
      }
      break;

    case 'PUT':
      if (id) {
        // PUT /finance/invoices/{id}
        const updateData: UpdateInvoiceRequest = request.body;
        const invoice = await invoiceModel.updateInvoice(id, updateData, userId, companyId);
        response.json({ invoice });
      } else {
        response.status(400).json({ error: 'Invoice ID required' });
      }
      break;

    case 'DELETE':
      if (id) {
        // DELETE /finance/invoices/{id}
        await invoiceModel.delete(id, companyId);
        response.json({ success: true });
      } else {
        response.status(400).json({ error: 'Invoice ID required' });
      }
      break;

    default:
      response.status(405).json({ error: 'Method not allowed' });
  }
}

// Customer-Routen Handler
async function handleCustomerRoutes(
  method: string,
  action: string | undefined,
  id: string | undefined,
  request: any,
  response: any,
  userId: string,
  companyId: string
) {
  switch (method) {
    case 'GET':
      if (id) {
        // GET /finance/customers/{id}
        const customer = await customerModel.getById(id, companyId);
        if (!customer) {
          response.status(404).json({ error: 'Customer not found' });
          return;
        }
        response.json({ customer });
      } else {
        // GET /finance/customers?filters...
        const filters: CustomerSearchFilters = {
          status: request.query.status ? request.query.status.split(',') : undefined,
          type: request.query.type ? request.query.type.split(',') : undefined,
          searchTerm: request.query.searchTerm,
          tags: request.query.tags ? request.query.tags.split(',') : undefined,
          hasOutstandingInvoices: request.query.hasOutstandingInvoices === 'true',
        };
        
        const pagination = {
          page: parseInt(request.query.page) || 1,
          limit: parseInt(request.query.limit) || 20,
          sortBy: request.query.sortBy || 'displayName',
          sortOrder: request.query.sortOrder === 'asc' ? 'asc' as const : 'desc' as const,
        };

        const result = await customerModel.searchCustomers(companyId, filters, pagination);
        response.json(result);
      }
      break;

    case 'POST':
      if (action === 'address' && id) {
        // POST /finance/customers/{id}/address
        const { address, isDefault } = request.body;
        const customer = await customerModel.addAddress(id, address, isDefault, userId, companyId);
        response.json({ customer });
      } else if (action === 'contact' && id) {
        // POST /finance/customers/{id}/contact
        const { contact, isPrimary } = request.body;
        const customer = await customerModel.addContact(id, contact, isPrimary, userId, companyId);
        response.json({ customer });
      } else if (!id) {
        // POST /finance/customers
        const customerData: CreateCustomerRequest = request.body;
        const customer = await customerModel.createCustomer(customerData, userId, companyId);
        response.status(201).json({ customer });
      } else {
        response.status(400).json({ error: 'Invalid request' });
      }
      break;

    case 'PUT':
      if (id) {
        // PUT /finance/customers/{id}
        const updateData: UpdateCustomerRequest = request.body;
        const customer = await customerModel.updateCustomer(id, updateData, userId, companyId);
        response.json({ customer });
      } else {
        response.status(400).json({ error: 'Customer ID required' });
      }
      break;

    case 'DELETE':
      if (id) {
        // DELETE /finance/customers/{id}
        await customerModel.delete(id, companyId);
        response.json({ success: true });
      } else {
        response.status(400).json({ error: 'Customer ID required' });
      }
      break;

    default:
      response.status(405).json({ error: 'Method not allowed' });
  }
}

// Sync-Routen Handler
async function handleSyncRoutes(
  method: string,
  action: string | undefined,
  id: string | undefined,
  request: any,
  response: any,
  userId: string,
  companyId: string
) {
  switch (method) {
    case 'POST':
      if (action === 'order-to-invoice') {
        if (id) {
          // POST /finance/sync/order-to-invoice/{orderId}
          const options = {
            forceOverwrite: request.body.forceOverwrite || false,
            dryRun: request.body.dryRun || false,
            autoSendInvoice: request.body.autoSendInvoice || false,
          };

          const result = await syncService.syncOrderToInvoice(id, companyId, userId, options);
          response.json(result);
        } else {
          // POST /finance/sync/order-to-invoice (batch)
          const { orderIds, ...options } = request.body;
          
          if (!Array.isArray(orderIds) || orderIds.length === 0) {
            response.status(400).json({ error: 'orderIds array is required' });
            return;
          }

          const result = await syncService.batchSyncOrders(orderIds, companyId, userId, options);
          response.json(result);
        }
      } else {
        response.status(404).json({ error: 'Sync action not found' });
      }
      break;

    default:
      response.status(405).json({ error: 'Method not allowed' });
  }
}
