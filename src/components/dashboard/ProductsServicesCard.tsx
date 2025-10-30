'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ServicePackage {
  id: string;
  name: string;
  title?: string;
  description: string;
  price: number;
  duration?: string;
  category?: string;
  features?: string[];
  active?: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  // Usage tracking
  usageCount?: number;
  totalRevenue?: number;
}

interface InlineInvoiceService {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  // Usage tracking from invoices
  usageCount?: number;
  totalRevenue?: number;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  sales: number;
  revenue: number;
  type: 'servicePackage' | 'inlineService';
  unit?: string;
}

interface ProductsServicesCardProps {
  companyId?: string;
  requiresData?: boolean;
}

export default function ProductsServicesCard({
  companyId,
  requiresData = true,
}: ProductsServicesCardProps) {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use companyId from props or fall back to user's uid
  const activeCompanyId = companyId || user?.uid;

  useEffect(() => {
    if (!activeCompanyId) {
      setError('Keine Company ID verfügbar');
      setLoading(false);
      return;
    }

    loadProductsAndServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId]);

  const loadProductsAndServices = async () => {
    if (!activeCompanyId) return;

    try {
      setLoading(true);

      // Parallel loading von beiden Subcollections
      const [servicePackagesSnapshot, inlineServicesSnapshot, invoicesSnapshot] = await Promise.all(
        [
          // 1. ServicePackages laden
          getDocs(collection(db, 'companies', activeCompanyId, 'servicePackages')),

          // 2. InlineInvoiceServices laden
          getDocs(collection(db, 'companies', activeCompanyId, 'inlineInvoiceServices')),

          // 3. Rechnungen laden für Usage-Analyse
          getDocs(
            query(
              collection(db, 'companies', activeCompanyId, 'invoices'),
              orderBy('createdAt', 'desc')
            )
          ),
        ]
      );

      // Analysiere Invoice-Usage
      const serviceUsage = analyzeInvoiceUsage(invoicesSnapshot);

      const allProducts: Product[] = [];

      // ServicePackages verarbeiten - Nutze direkte Service-Statistiken
      servicePackagesSnapshot.forEach(doc => {
        const data = doc.data() as ServicePackage;

        // Priorisiere direkte Service-Statistiken über Invoice-Analyse
        const directUsage = {
          count: data.usageCount || 0,
          revenue: data.totalRevenue || 0,
        };

        // Fallback auf alte Invoice-Analyse nur wenn keine direkten Daten vorhanden
        const fallbackUsage = serviceUsage.servicePackages[doc.id] || { count: 0, revenue: 0 };
        const finalUsage = directUsage.count > 0 ? directUsage : fallbackUsage;

        allProducts.push({
          id: doc.id,
          name: data.name || data.title || 'Unbenanntes Service-Paket',
          description: data.description,
          price: data.price || 0,
          sales: finalUsage.count,
          revenue: finalUsage.revenue,
          type: 'servicePackage',
        });
      });

      // InlineInvoiceServices verarbeiten - Nutze direkte Service-Statistiken
      inlineServicesSnapshot.forEach(doc => {
        const data = doc.data() as InlineInvoiceService;

        // Priorisiere direkte Service-Statistiken über Invoice-Analyse
        const directUsage = {
          count: data.usageCount || 0,
          revenue: data.totalRevenue || 0,
        };

        // Fallback auf alte Invoice-Analyse nur wenn keine direkten Daten vorhanden
        const fallbackUsage = serviceUsage.inlineServices[doc.id] || { count: 0, revenue: 0 };
        const finalUsage = directUsage.count > 0 ? directUsage : fallbackUsage;

        allProducts.push({
          id: doc.id,
          name: data.name || 'Unbenannter Service',
          description: data.description,
          price: data.price || 0,
          sales: finalUsage.count,
          revenue: finalUsage.revenue,
          type: 'inlineService',
          unit: data.unit,
        });
      });

      setProducts(allProducts);
      setError(null);
    } catch (error) {
      console.error('❌ ProductsServicesCard: Error loading products:', error);
      setError('Fehler beim Laden der Produkte & Services');
    } finally {
      setLoading(false);
    }
  };

  // DEPRECATED: Diese Funktion wird durch das neue ServiceUsageTrackingService ersetzt
  // Die Service-Nutzung wird jetzt direkt in den Service-Dokumenten gespeichert
  const analyzeInvoiceUsage = (invoicesSnapshot: any) => {
    // Fallback für alte Daten ohne Service-Tracking
    const usage = {
      servicePackages: {} as Record<string, { count: number; revenue: number }>,
      inlineServices: {} as Record<string, { count: number; revenue: number }>,
    };

    invoicesSnapshot.forEach((doc: any) => {
      const invoice = doc.data();

      // Analysiere Invoice-Items/Services (nur als Fallback)
      if (invoice.items && Array.isArray(invoice.items)) {
        invoice.items.forEach((item: any) => {
          // Check für ServicePackage-Referenz
          if (item.servicePackageId) {
            const id = item.servicePackageId;
            if (!usage.servicePackages[id]) {
              usage.servicePackages[id] = { count: 0, revenue: 0 };
            }
            usage.servicePackages[id].count += item.quantity || 1;
            usage.servicePackages[id].revenue += item.total || item.amount || 0;
          }

          // Check für InlineService-Referenz (inventoryItemId)
          if (item.inventoryItemId) {
            const id = item.inventoryItemId;
            if (!usage.inlineServices[id]) {
              usage.inlineServices[id] = { count: 0, revenue: 0 };
            }
            usage.inlineServices[id].count += item.quantity || 1;
            usage.inlineServices[id].revenue += item.total || item.amount || 0;
          }

          // Fallback: Match by name für Services ohne ID-Referenz
          if (!item.servicePackageId && !item.inventoryItemId && item.name) {
            // Simple name matching für bestehende Services
            const matchingServicePackage = products.find(
              p => p.type === 'servicePackage' && p.name.toLowerCase() === item.name.toLowerCase()
            );

            if (matchingServicePackage) {
              const id = matchingServicePackage.id;
              if (!usage.servicePackages[id]) {
                usage.servicePackages[id] = { count: 0, revenue: 0 };
              }
              usage.servicePackages[id].count += item.quantity || 1;
              usage.servicePackages[id].revenue += item.total || item.amount || 0;
            }

            const matchingInlineService = products.find(
              p => p.type === 'inlineService' && p.name.toLowerCase() === item.name.toLowerCase()
            );

            if (matchingInlineService) {
              const id = matchingInlineService.id;
              if (!usage.inlineServices[id]) {
                usage.inlineServices[id] = { count: 0, revenue: 0 };
              }
              usage.inlineServices[id].count += item.quantity || 1;
              usage.inlineServices[id].revenue += item.total || item.amount || 0;
            }
          }
        });
      }
    });

    return usage;
  };

  // Berechne Top und Niedrigst-Performer
  const topProducts = products
    .filter(p => p.sales > 0) // Nur verkaufte Produkte
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5); // Top 5

  const lowestProducts = products
    .filter(p => p.sales > 0) // Nur verkaufte Produkte
    .sort((a, b) => a.revenue - b.revenue)
    .slice(0, 3); // Niedrigste 3

  const noSalesProducts = products.filter(p => p.sales === 0);

  const formatAmount = (amount: number) => {
    return `${amount.toFixed(2).replace('.', ',')} €`;
  };

  const formatSales = (sales: number) => {
    if (sales === 0) return 'Noch keine Verkäufe';
    return sales === 1 ? '1 Verkauf' : `${sales} Verkäufe`;
  };

  const getProductTypeIcon = (type: Product['type']) => {
    switch (type) {
      case 'servicePackage':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-blue-600">
            <path
              d="M20 7L12 3L4 7L12 11L20 7Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M4 12L12 16L20 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M4 17L12 21L20 17"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );

      case 'inlineService':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-purple-600">
            <path
              d="M12 2L2 7V10C2 16 6 20.88 12 22C18 20.88 22 16 22 10V7L12 2Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
    }
  };

  if (!activeCompanyId) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Produkte & Dienstleistungen</h2>
        <div className="text-center py-8 text-gray-500">
          <p>Keine Company ID verfügbar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Produkte & Dienstleistungen</h2>
          {products.length > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              {products.length} Services • {topProducts.length} mit Verkäufen •{' '}
              {noSalesProducts.length} ohne Verkäufe
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[#14ad9f]" />
            <span className="ml-2 text-gray-600">Services werden geladen...</span>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-600">
            <p>{error}</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              className="mx-auto mb-4 text-gray-300"
            >
              <path
                d="M20 7L12 3L4 7L12 11L20 7Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M4 12L12 16L20 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M4 17L12 21L20 17"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p>Noch keine Produkte oder Services erstellt</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Höchste Umsätze - SevDesk Style */}
            {topProducts.length > 0 && (
              <div className="bg-white">
                <div className="flex items-center gap-3 mb-6">
                  <span className="flex items-center justify-center w-10 h-10 bg-green-50 rounded-lg">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-green-600"
                    >
                      <path
                        d="M17.5 6.5L6.5 17.5M8.7451 5.75H17.25C17.8023 5.75 18.25 6.19772 18.25 6.75V16.2458"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <span className="text-lg font-semibold text-gray-900">
                    Höchste Umsätze (Netto)
                  </span>
                </div>
                <ul className="space-y-4">
                  {topProducts.map((product, index) => (
                    <li
                      key={product.id}
                      className="flex items-center justify-between py-4 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8 h-8 bg-white rounded-md shadow-sm">
                          {getProductTypeIcon(product.type)}
                        </div>
                        <div className="flex flex-col">
                          <div className="text-base font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {formatSales(product.sales)}
                          </div>
                        </div>
                      </div>
                      <div className="text-lg font-semibold text-gray-900">
                        {formatAmount(product.revenue)}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Geringste Umsätze - SevDesk Style */}
            {lowestProducts.length > 0 && topProducts.length > 0 && (
              <div className="bg-white">
                <div className="flex items-center gap-3 mb-6">
                  <span className="flex items-center justify-center w-10 h-10 bg-red-50 rounded-lg">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-red-600"
                    >
                      <path
                        d="M17.5 17.5L6.5 6.5M18.25 8.7451V17.25C18.25 17.8023 17.8023 18.25 17.25 18.25H7.75419"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <span className="text-lg font-semibold text-gray-900">
                    Geringster Umsatz (Netto)
                  </span>
                </div>
                <ul className="space-y-4">
                  {lowestProducts.map((product, index) => (
                    <li
                      key={product.id}
                      className="flex items-center justify-between py-4 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8 h-8 bg-white rounded-md shadow-sm">
                          {getProductTypeIcon(product.type)}
                        </div>
                        <div className="flex flex-col">
                          <div className="text-base font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {formatSales(product.sales)}
                          </div>
                        </div>
                      </div>
                      <div className="text-lg font-semibold text-gray-900">
                        {formatAmount(product.revenue)}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Services ohne Verkäufe - Kompakter aber sichtbar */}
            {noSalesProducts.length > 0 && (
              <div className="bg-white">
                <div className="flex items-center gap-3 mb-6">
                  <span className="flex items-center justify-center w-10 h-10 bg-gray-50 rounded-lg">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-gray-500"
                    >
                      <path
                        d="M12 8V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <span className="text-lg font-semibold text-gray-900">Noch keine Verkäufe</span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {noSalesProducts.slice(0, 3).map((product, index) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between py-3 px-4 bg-gray-25 rounded-lg border border-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-6 h-6 bg-white rounded shadow-sm">
                          {getProductTypeIcon(product.type)}
                        </div>
                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-gray-800">{product.name}</div>
                          <div className="text-xs text-gray-500">
                            {product.type === 'servicePackage'
                              ? 'Service-Paket'
                              : `Inline-Service (${product.unit})`}{' '}
                            • {formatAmount(product.price)}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 font-medium">Noch keine Verkäufe</div>
                    </div>
                  ))}
                  {noSalesProducts.length > 3 && (
                    <div className="text-sm text-gray-500 text-center py-3 border-t border-gray-100">
                      +{noSalesProducts.length - 3} weitere Services ohne Verkäufe
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <div className="flex items-center justify-between">
          {requiresData && products.length === 0 && (
            <div className="text-sm text-gray-500">
              Erstellen Sie Services um Verkaufsdaten zu sehen
            </div>
          )}
          <button className="text-sm text-[#14ad9f] hover:text-[#129a8f] font-medium flex items-center gap-2 transition-colors ml-auto">
            Service erstellen
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M14.3322 5.83209L19.8751 11.375C20.2656 11.7655 20.2656 12.3987 19.8751 12.7892L14.3322 18.3321M19.3322 12.0821H3.83218"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
