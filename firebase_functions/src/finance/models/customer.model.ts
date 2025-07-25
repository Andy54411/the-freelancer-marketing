// firebase_functions/src/finance/models/customer.model.ts

import { BaseModel } from './base.model';
import { 
  CustomerData, 
  CustomerStatus,
  CreateCustomerRequest, 
  UpdateCustomerRequest,
  CustomerSearchFilters,
  CustomerListResponse,
  CustomerAddress,
  CustomerContact
} from '../types/customer.types';

export class CustomerModel extends BaseModel<CustomerData> {
  constructor() {
    super('customers');
  }

  // Erweiterte Kunden-Erstellung
  async createCustomer(
    data: CreateCustomerRequest, 
    userId: string, 
    companyId: string
  ): Promise<CustomerData> {
    // Validierung
    this.validateRequired(data, ['type', 'displayName']);
    
    if (data.type === 'BUSINESS' && !data.companyName) {
      throw new Error('Company name is required for business customers');
    }

    if (data.type === 'INDIVIDUAL' && (!data.firstName || !data.lastName)) {
      throw new Error('First and last name are required for individual customers');
    }

    // Kundennummer generieren
    const customerNumber = await this.generateCustomerNumber(companyId);
    
    // Adressen verarbeiten
    const addresses = this.processAddresses(data);
    
    // Kontakte verarbeiten
    const contacts = this.processContacts(data);

    const customerData: Omit<CustomerData, keyof import('../types').BaseEntity> & { companyId: string } = {
      companyId,
      customerNumber,
      type: data.type,
      status: 'ACTIVE' as CustomerStatus,
      
      // Stammdaten
      displayName: data.displayName,
      companyName: data.companyName,
      firstName: data.firstName,
      lastName: data.lastName,
      
      // Adressen und Kontakte
      addresses,
      contacts,
      
      // Steuerliche Informationen
      taxInfo: {
        vatNumber: data.vatNumber,
        taxNumber: data.taxNumber,
        isVatExempt: data.isVatExempt || false,
        defaultTaxRate: data.defaultTaxRate || 19,
        taxCountry: 'DE', // Default Deutschland
      },
      
      // Zahlungskonditionen
      paymentSettings: {
        defaultPaymentTerms: {
          dueDays: data.paymentTermsDays || 30,
          discountDays: undefined,
          discountRate: undefined,
        },
        preferredPaymentMethods: data.preferredPaymentMethods || ['BANK_TRANSFER'],
        creditLimit: undefined,
        dunningLevel: 0,
      },
      
      // Synchronisation
      syncData: {
        taskiloCustomerId: data.taskiloCustomerId,
        externalIds: {},
        syncErrors: [],
      },
      
      // Statistiken (initial leer)
      statistics: {
        totalInvoices: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        outstandingAmount: 0,
        paymentDelayAverage: 0,
      },
      
      // Zusätzliche Informationen
      notes: data.notes,
      tags: data.tags || [],
    };

    return await this.create(customerData, userId);
  }

  // Kunde aktualisieren
  async updateCustomer(
    id: string, 
    updates: UpdateCustomerRequest, 
    userId: string, 
    companyId: string
  ): Promise<CustomerData> {
    const existing = await this.getById(id, companyId);
    if (!existing) {
      throw new Error('Customer not found');
    }

    const updateData: any = {
      displayName: updates.displayName,
      companyName: updates.companyName,
      firstName: updates.firstName,
      lastName: updates.lastName,
      status: updates.status,
      notes: updates.notes,
      tags: updates.tags,
    };

    // Steuerliche Informationen
    if (updates.vatNumber !== undefined) updateData['taxInfo.vatNumber'] = updates.vatNumber;
    if (updates.taxNumber !== undefined) updateData['taxInfo.taxNumber'] = updates.taxNumber;
    if (updates.isVatExempt !== undefined) updateData['taxInfo.isVatExempt'] = updates.isVatExempt;
    if (updates.defaultTaxRate !== undefined) updateData['taxInfo.defaultTaxRate'] = updates.defaultTaxRate;

    // Zahlungskonditionen
    if (updates.paymentTermsDays !== undefined) {
      updateData['paymentSettings.defaultPaymentTerms.dueDays'] = updates.paymentTermsDays;
    }
    if (updates.preferredPaymentMethods !== undefined) {
      updateData['paymentSettings.preferredPaymentMethods'] = updates.preferredPaymentMethods;
    }
    if (updates.creditLimit !== undefined) {
      updateData['paymentSettings.creditLimit'] = updates.creditLimit;
    }

    return await this.update(id, updateData, userId, companyId);
  }

  // Erweiterte Suche
  async searchCustomers(
    companyId: string,
    filters: CustomerSearchFilters,
    pagination: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}
  ): Promise<CustomerListResponse> {
    const result = await this.list(companyId, pagination, {
      status: filters.status,
      type: filters.type,
      assignedUserId: filters.assignedUserId,
    });

    // Zusätzliche Filterung im Memory
    let filteredItems = result.items;

    // Text-Suche
    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      filteredItems = filteredItems.filter(customer =>
        customer.displayName.toLowerCase().includes(searchTerm) ||
        customer.customerNumber.toLowerCase().includes(searchTerm) ||
        (customer.companyName && customer.companyName.toLowerCase().includes(searchTerm)) ||
        (customer.firstName && customer.firstName.toLowerCase().includes(searchTerm)) ||
        (customer.lastName && customer.lastName.toLowerCase().includes(searchTerm))
      );
    }

    // Tags-Filter
    if (filters.tags && filters.tags.length > 0) {
      filteredItems = filteredItems.filter(customer =>
        customer.tags && filters.tags!.some(tag => customer.tags!.includes(tag))
      );
    }

    // Offene Rechnungen-Filter
    if (filters.hasOutstandingInvoices !== undefined) {
      filteredItems = filteredItems.filter(customer =>
        filters.hasOutstandingInvoices ? customer.statistics.outstandingAmount > 0 : customer.statistics.outstandingAmount === 0
      );
    }

    // Erstellungsdatum-Filter
    if (filters.createdFrom || filters.createdTo) {
      filteredItems = filteredItems.filter(customer => {
        const createdAt = customer.createdAt;
        if (filters.createdFrom && createdAt.toMillis() < filters.createdFrom.toMillis()) {
          return false;
        }
        if (filters.createdTo && createdAt.toMillis() > filters.createdTo.toMillis()) {
          return false;
        }
        return true;
      });
    }

    return {
      customers: filteredItems,
      total: filteredItems.length,
      page: pagination.page || 1,
      limit: pagination.limit || 20,
      hasNext: false, // Vereinfacht
    };
  }

  // Adresse hinzufügen
  async addAddress(
    customerId: string,
    address: Omit<CustomerAddress, 'isDefault'>,
    isDefault: boolean,
    userId: string,
    companyId: string
  ): Promise<CustomerData> {
    const customer = await this.getById(customerId, companyId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const newAddress: CustomerAddress = {
      ...address,
      isDefault,
    };

    // Wenn neue Adresse Default ist, alle anderen auf false setzen
    if (isDefault) {
      customer.addresses = customer.addresses.map(addr => ({
        ...addr,
        isDefault: false,
      }));
    }

    customer.addresses.push(newAddress);

    return await this.update(customerId, { addresses: customer.addresses } as any, userId, companyId);
  }

  // Kontakt hinzufügen
  async addContact(
    customerId: string,
    contact: Omit<CustomerContact, 'isPrimary'>,
    isPrimary: boolean,
    userId: string,
    companyId: string
  ): Promise<CustomerData> {
    const customer = await this.getById(customerId, companyId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const newContact: CustomerContact = {
      ...contact,
      isPrimary,
    };

    // Wenn neuer Kontakt Primary ist, alle anderen vom gleichen Typ auf false setzen
    if (isPrimary) {
      customer.contacts = customer.contacts.map(cont => ({
        ...cont,
        isPrimary: cont.type === contact.type ? false : cont.isPrimary,
      }));
    }

    customer.contacts.push(newContact);

    return await this.update(customerId, { contacts: customer.contacts } as any, userId, companyId);
  }

  // Statistiken aktualisieren
  async updateStatistics(
    customerId: string,
    statistics: Partial<CustomerData['statistics']>,
    userId: string,
    companyId: string
  ): Promise<CustomerData> {
    const customer = await this.getById(customerId, companyId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const updateData: any = {};
    Object.entries(statistics).forEach(([key, value]) => {
      updateData[`statistics.${key}`] = value;
    });

    return await this.update(customerId, updateData, userId, companyId);
  }

  // Nach Taskilo-ID suchen
  async findByTaskiloId(taskiloCustomerId: string, companyId: string): Promise<CustomerData | null> {
    const snapshot = await this.collection
      .where('companyId', '==', companyId)
      .where('syncData.taskiloCustomerId', '==', taskiloCustomerId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as CustomerData;
  }

  // Hilfsmethoden
  private processAddresses(data: CreateCustomerRequest): CustomerAddress[] {
    const addresses: CustomerAddress[] = [];

    // Rechnungsadresse (erforderlich)
    addresses.push({
      type: 'BILLING',
      ...data.billingAddress,
      isDefault: true,
    });

    // Lieferadresse (optional)
    if (data.shippingAddress) {
      addresses.push({
        type: 'SHIPPING',
        ...data.shippingAddress,
        isDefault: false,
      });
    }

    return addresses;
  }

  private processContacts(data: CreateCustomerRequest): CustomerContact[] {
    const contacts: CustomerContact[] = [];

    if (data.email) {
      contacts.push({
        type: 'EMAIL',
        value: data.email,
        isPrimary: true,
        label: 'Primary Email',
      });
    }

    if (data.phone) {
      contacts.push({
        type: 'PHONE',
        value: data.phone,
        isPrimary: true,
        label: 'Primary Phone',
      });
    }

    return contacts;
  }

  private async generateCustomerNumber(companyId: string): Promise<string> {
    // Einfache sequenzielle Nummer
    const companyShort = companyId.slice(-4).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    
    return `K${companyShort}-${timestamp}`;
  }
}
