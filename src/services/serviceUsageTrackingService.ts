import { 
  doc, 
  collection, 
  getDocs, 
  getDoc,
  updateDoc, 
  increment, 
  serverTimestamp,
  writeBatch 
} from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { FirestoreInvoiceService } from '@/services/firestoreInvoiceService';

export interface ServiceUsageRecord {
  serviceId: string;
  serviceType: 'servicePackage' | 'inlineService';
  quantity: number;
  revenue: number;
  source: 'invoice' | 'platform_booking' | 'quote';
  metadata?: {
    invoiceId?: string;
    orderId?: string;
    quoteId?: string;
    customerName?: string;
    bookingDate?: string;
  };
}

/**
 * Service für die Verfolgung der Service-Nutzung über alle Plattformen hinweg
 * Trackt sowohl servicePackages als auch inlineInvoiceServices
 */
export class ServiceUsageTrackingService {
  
  /**
   * Automatische Reparatur fehlender inventoryItemId in Rechnungsitems
   */
  static async repairInvoiceInventoryIds(companyId: string, invoiceId: string): Promise<boolean> {
    try {
      console.log('🔧 AUTO-REPAIR: Fixing missing inventoryItemIds for invoice:', invoiceId);
      
      // 1. Rechnung laden
      const invoiceRef = doc(db, 'companies', companyId, 'invoices', invoiceId);
      const invoiceDoc = await getDoc(invoiceRef);
      
      if (!invoiceDoc.exists()) {
        console.log('❌ Invoice not found:', invoiceId);
        return false;
      }
      
      const invoiceData = invoiceDoc.data();
      const items = invoiceData.items || [];
      
      // 2. Services laden für Matching
      const [servicePackagesSnapshot, inlineServicesSnapshot] = await Promise.all([
        getDocs(collection(db, 'companies', companyId, 'servicePackages')),
        getDocs(collection(db, 'companies', companyId, 'inlineInvoiceServices'))
      ]);
      
      // Service-Map erstellen
      const serviceMap = new Map<string, { id: string; type: 'servicePackage' | 'inlineService' }>();
      
      servicePackagesSnapshot.forEach(doc => {
        const data = doc.data();
        const key = data.name?.toLowerCase().trim();
        if (key) {
          serviceMap.set(key, { id: doc.id, type: 'servicePackage' });
        }
      });
      
      inlineServicesSnapshot.forEach(doc => {
        const data = doc.data();
        const key = data.name?.toLowerCase().trim();
        if (key) {
          serviceMap.set(key, { id: doc.id, type: 'inlineService' });
        }
      });
      
      // 3. Items reparieren
      let repaired = false;
      const repairedItems = items.map((item: any) => {
        if (!item.inventoryItemId && item.description) {
          const serviceName = item.description.toLowerCase().trim();
          const matchingService = serviceMap.get(serviceName);
          
          if (matchingService) {
            console.log(`✅ REPAIRED: "${item.description}" -> ${matchingService.id} (${matchingService.type})`);
            repaired = true;
            return {
              ...item,
              inventoryItemId: matchingService.id
            };
          } else {
            console.log(`⚠️ NO MATCH: "${item.description}" - creating as inline service`);
          }
        }
        return item;
      });
      
      // 4. Rechnung updaten wenn Reparaturen nötig waren
      if (repaired) {
        await updateDoc(invoiceRef, {
          items: repairedItems,
          updatedAt: serverTimestamp()
        });
        console.log(`✅ UPDATED invoice ${invoiceId} with repaired inventoryItemIds`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error repairing invoice inventory IDs:', error);
      return false;
    }
  }

  /**
   * Trackt Service-Nutzung bei Rechnungserstellung
   * Wird aufgerufen, wenn eine Rechnung erstellt/gespeichert wird
   */
  static async trackInvoiceServiceUsage(
    companyId: string,
    invoiceId: string,
    items: Array<{
      id: string;
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
      inventoryItemId?: string;
      category?: string;
    }>,
    customerName?: string
  ): Promise<void> {
    try {
      console.log('🔄 ServiceUsageTracking: Starting tracking for invoice:', invoiceId);
      
      // 🔧 AUTOMATISCHE REPARATUR ZUERST AUSFÜHREN
      console.log('🔧 AUTO-REPAIR: Checking for missing inventoryItemIds...');
      const wasRepaired = await this.repairInvoiceInventoryIds(companyId, invoiceId);
      
      if (wasRepaired) {
        console.log('✅ AUTO-REPAIR: inventoryItemIds were repaired, reloading invoice data...');
        // Rechnung neu laden um reparierte Daten zu bekommen
        const invoiceRef = doc(db, 'companies', companyId, 'invoices', invoiceId);
        const invoiceDoc = await getDoc(invoiceRef);
        if (invoiceDoc.exists()) {
          const updatedItems = invoiceDoc.data().items || [];
          console.log('🔄 Using repaired items for tracking:', updatedItems.length);
          // Rekursiver Aufruf mit reparierten Daten
          return this.trackInvoiceServiceUsage(companyId, invoiceId, updatedItems, customerName);
        }
      }
      
      const batch = writeBatch(db);
      const usageRecords: ServiceUsageRecord[] = [];

      for (const item of items) {
        if (!item.inventoryItemId || item.category === 'discount') {
          continue; // Skip items ohne Service-Referenz oder Rabatte
        }

        // Prüfe ob es ein servicePackage oder inlineService ist
        const serviceType = await this.determineServiceType(companyId, item.inventoryItemId);
        
        if (!serviceType) {
          console.warn(`Service type not found for inventoryItemId: ${item.inventoryItemId}`);
          continue;
        }

        // Erstelle Usage Record
        const usageRecord: ServiceUsageRecord = {
          serviceId: item.inventoryItemId,
          serviceType: serviceType,
          quantity: item.quantity || 1,
          revenue: item.total || 0,
          source: 'invoice',
          metadata: {
            invoiceId,
            customerName,
            bookingDate: new Date().toISOString().split('T')[0]
          }
        };

        usageRecords.push(usageRecord);

        // Update Service-Statistiken in der entsprechenden Subcollection
        const serviceRef = doc(
          db, 
          'companies', 
          companyId, 
          serviceType === 'servicePackage' ? 'servicePackages' : 'inlineInvoiceServices',
          item.inventoryItemId
        );

        batch.update(serviceRef, {
          usageCount: increment(item.quantity || 1),
          totalRevenue: increment(item.total || 0),
          lastUsed: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        console.log(`📊 Updated ${serviceType} usage: ${item.inventoryItemId} (+${item.quantity}, +${item.total}€)`);
      }

      // Batch commit für bessere Performance
      await batch.commit();

      // Erstelle Kundenaktivität
      if (customerName && usageRecords.length > 0) {
        try {
          const serviceNames = usageRecords.map(r => r.metadata?.customerName || 'Service').join(', ');
          await FirestoreInvoiceService.createCustomerActivity(
            companyId,
            customerName,
            'invoice',
            `Rechnung erstellt: ${invoiceId}`,
            `Services verwendet: ${serviceNames}`,
            {
              invoiceId,
              servicesUsed: usageRecords.length,
              totalRevenue: usageRecords.reduce((sum, r) => sum + r.revenue, 0)
            }
          );
        } catch (activityError) {
          console.warn('Could not create customer activity:', activityError);
        }
      }

      console.log('✅ ServiceUsageTracking: Invoice service usage tracked successfully');
      
    } catch (error) {
      console.error('❌ ServiceUsageTracking: Error tracking invoice service usage:', error);
      // Nicht werfen - Service-Tracking soll die Hauptfunktion nicht blockieren
    }
  }

  /**
   * Trackt Service-Nutzung bei Plattform-Buchungen
   * Wird aufgerufen, wenn ein Auftrag über die Plattform gebucht wird
   */
  static async trackPlatformBookingUsage(
    providerId: string,
    orderId: string,
    servicePackageData: {
      servicePackageId?: string;
      packageName: string;
      packagePrice: number;
      subcategory: string;
    },
    customerName?: string,
    bookingDate?: string
  ): Promise<void> {
    try {
      console.log('🔄 ServiceUsageTracking: Tracking platform booking usage for provider:', providerId);

      if (!servicePackageData.servicePackageId) {
        // Versuche Service-Paket anhand des Namens zu finden
        const servicePackageId = await this.findServicePackageByName(
          providerId, 
          servicePackageData.packageName,
          servicePackageData.subcategory
        );
        
        if (!servicePackageId) {
          console.warn('Service package not found for platform booking:', servicePackageData.packageName);
          return;
        }
        
        servicePackageData.servicePackageId = servicePackageId;
      }

      // Update Service-Package-Statistiken
      const serviceRef = doc(
        db, 
        'companies', 
        providerId, 
        'servicePackages',
        servicePackageData.servicePackageId
      );

      await updateDoc(serviceRef, {
        usageCount: increment(1),
        totalRevenue: increment(servicePackageData.packagePrice),
        lastUsed: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Platform-spezifische Statistiken
        platformBookings: increment(1),
        lastPlatformBooking: serverTimestamp()
      });

      console.log(`📊 Updated servicePackage platform usage: ${servicePackageData.servicePackageId} (+1, +${servicePackageData.packagePrice}€)`);

      // Erstelle Kundenaktivität
      if (customerName) {
        try {
          await FirestoreInvoiceService.createCustomerActivity(
            providerId,
            customerName,
            'system',
            `Plattform-Buchung: ${orderId}`,
            `Service-Paket gebucht: ${servicePackageData.packageName}`,
            {
              orderId,
              servicePackageId: servicePackageData.servicePackageId,
              packageName: servicePackageData.packageName,
              packagePrice: servicePackageData.packagePrice,
              source: 'platform_booking',
              bookingDate
            }
          );
        } catch (activityError) {
          console.warn('Could not create customer activity for platform booking:', activityError);
        }
      }

      console.log('✅ ServiceUsageTracking: Platform booking usage tracked successfully');
      
    } catch (error) {
      console.error('❌ ServiceUsageTracking: Error tracking platform booking usage:', error);
      // Nicht werfen - Service-Tracking soll die Hauptfunktion nicht blockieren
    }
  }

  /**
   * Bestimmt den Service-Typ anhand der inventoryItemId
   */
  private static async determineServiceType(
    companyId: string, 
    inventoryItemId: string
  ): Promise<'servicePackage' | 'inlineService' | null> {
    try {
      // Prüfe zuerst servicePackages
      const servicePackagesSnapshot = await getDocs(
        collection(db, 'companies', companyId, 'servicePackages')
      );
      
      const servicePackageExists = servicePackagesSnapshot.docs.some(doc => doc.id === inventoryItemId);
      if (servicePackageExists) {
        return 'servicePackage';
      }

      // Prüfe inlineInvoiceServices
      const inlineServicesSnapshot = await getDocs(
        collection(db, 'companies', companyId, 'inlineInvoiceServices')
      );
      
      const inlineServiceExists = inlineServicesSnapshot.docs.some(doc => doc.id === inventoryItemId);
      if (inlineServiceExists) {
        return 'inlineService';
      }

      return null;
    } catch (error) {
      console.error('Error determining service type:', error);
      return null;
    }
  }

  /**
   * Findet Service-Paket anhand des Namens und der Kategorie
   */
  private static async findServicePackageByName(
    companyId: string,
    packageName: string,
    subcategory: string
  ): Promise<string | null> {
    try {
      const servicePackagesSnapshot = await getDocs(
        collection(db, 'companies', companyId, 'servicePackages')
      );

      for (const doc of servicePackagesSnapshot.docs) {
        const data = doc.data();
        const serviceName = data.name || data.title || '';
        
        // Exact match oder ähnlicher Name in gleicher Kategorie
        if (
          serviceName.toLowerCase() === packageName.toLowerCase() ||
          (serviceName.toLowerCase().includes(packageName.toLowerCase()) && 
           data.category?.toLowerCase() === subcategory.toLowerCase())
        ) {
          return doc.id;
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding service package by name:', error);
      return null;
    }
  }

  /**
   * Holt Service-Nutzungsstatistiken für das Dashboard
   */
  static async getServiceUsageStats(companyId: string): Promise<{
    servicePackages: Array<{ id: string; name: string; usageCount: number; totalRevenue: number; lastUsed?: Date }>;
    inlineServices: Array<{ id: string; name: string; usageCount: number; totalRevenue: number; lastUsed?: Date }>;
  }> {
    try {
      const [servicePackagesSnapshot, inlineServicesSnapshot] = await Promise.all([
        getDocs(collection(db, 'companies', companyId, 'servicePackages')),
        getDocs(collection(db, 'companies', companyId, 'inlineInvoiceServices'))
      ]);

      const servicePackages = servicePackagesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || data.title || 'Unbenanntes Service-Paket',
          usageCount: data.usageCount || 0,
          totalRevenue: data.totalRevenue || 0,
          lastUsed: data.lastUsed?.toDate()
        };
      });

      const inlineServices = inlineServicesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || 'Unbenannter Service',
          usageCount: data.usageCount || 0,
          totalRevenue: data.totalRevenue || 0,
          lastUsed: data.lastUsed?.toDate()
        };
      });

      return { servicePackages, inlineServices };
    } catch (error) {
      console.error('Error getting service usage stats:', error);
      return { servicePackages: [], inlineServices: [] };
    }
  }
}