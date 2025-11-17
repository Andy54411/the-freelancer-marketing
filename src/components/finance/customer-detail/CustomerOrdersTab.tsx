'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  CheckCircle,
  Clock,
  Edit,
  Euro,
  Eye,
  Filter,
  Folder,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  Truck,
  User,
  XCircle
} from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/clients';

interface QuoteItem {
  id: string;
  description?: string;
  price: number;
  quantity: number;
  total: number;
  unit?: string;
}

interface Quote {
  id: string;
  companyId: string;
  number: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  date: Date;
  validUntil: Date;
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
  title?: string;
  description?: string;
  notes?: string;
  customerOrderNumber?: string;
  items: QuoteItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  taxRate: number;
}

interface CustomerOrdersTabProps {
  customer: {
    id: string;
    customerNumber: string;
    companyName?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  companyId: string;
}

function CustomerOrdersTab({ customer, companyId }: CustomerOrdersTabProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  // Firebase Real-time Listener für Quotes dieses Kunden
  useEffect(() => {
    if (!companyId || !customer.id) return;

    const quotesRef = collection(db, 'companies', companyId, 'quotes');
    const q = query(
      quotesRef,
      where('customerId', '==', customer.id),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const quotesData: Quote[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
          validUntil: data.validUntil instanceof Timestamp ? data.validUntil.toDate() : new Date(data.validUntil),
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
          items: data.items || [],
          subtotal: data.subtotal || 0,
          taxAmount: data.taxAmount || 0,
          total: data.total || 0,
          taxRate: data.taxRate || 19
        } as Quote;
      });

      setQuotes(quotesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [companyId, customer.id]);

  // Map Quote status to Order status for UI compatibility
  const mapQuoteStatusToOrderStatus = (quoteStatus: string): 'draft' | 'confirmed' | 'in_progress' | 'shipped' | 'delivered' | 'cancelled' => {
    switch (quoteStatus) {
      case 'draft':
        return 'draft';
      case 'sent':
        return 'confirmed';
      case 'accepted':
        return 'in_progress';
      case 'rejected':
      case 'expired':
      case 'cancelled':
        return 'cancelled';
      default:
        return 'draft';
    }
  };

  // Convert quotes to order-like structure for existing UI
  const orders = quotes.map(quote => ({
    id: quote.id,
    orderNumber: quote.number,
    title: quote.title || `Angebot ${quote.number}`,
    description: quote.description || 'Keine Beschreibung verfügbar',
    status: mapQuoteStatusToOrderStatus(quote.status),
    amount: quote.total,
    orderDate: quote.createdAt,
    deliveryDate: quote.validUntil, // Use validUntil as delivery estimate
    assignedTo: 'Taskilo Team',
    items: quote.items.map(item => ({
      name: item.description || 'Artikel',
      quantity: item.quantity,
      price: item.price
    }))
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2 animate-spin" />
          <p className="text-gray-500">Lade Aufträge...</p>
        </div>
      </div>
    );
  }


  const statusConfig = {
    draft: { label: 'Entwurf', color: 'bg-gray-100 text-gray-800', icon: Edit },
    confirmed: { label: 'Bestätigt', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
    in_progress: { label: 'In Bearbeitung', color: 'bg-orange-100 text-orange-800', icon: Clock },
    shipped: { label: 'Versendet', color: 'bg-purple-100 text-purple-800', icon: Truck },
    delivered: { label: 'Geliefert', color: 'bg-green-100 text-green-800', icon: Package },
    cancelled: { label: 'Storniert', color: 'bg-red-100 text-red-800', icon: XCircle }
  };

  const statusFilters = [
    { value: 'all', label: 'Alle Status', count: orders.length },
    { value: 'draft', label: 'Entwürfe', count: orders.filter(o => o.status === 'draft').length },
    { value: 'confirmed', label: 'Bestätigt', count: orders.filter(o => o.status === 'confirmed').length },
    { value: 'in_progress', label: 'In Bearbeitung', count: orders.filter(o => o.status === 'in_progress').length },
    { value: 'delivered', label: 'Geliefert', count: orders.filter(o => o.status === 'delivered').length }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const totalOrderValue = filteredOrders.reduce((sum, order) => sum + order.amount, 0);

  const handleCreateOrder = () => {
    // Navigate to quote/order creation page with pre-filled customer data
    const customerName = customer.companyName || 
                        `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 
                        customer.customerNumber || 
                        'Kunde';
    const createUrl = `/dashboard/company/${companyId}/finance/quotes/create?customerId=${customer.id}&customerName=${encodeURIComponent(customerName)}`;
    router.push(createUrl);
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Gesamtaufträge</p>
                <p className="text-lg font-semibold">{orders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Gesamtwert</p>
                <p className="text-lg font-semibold">{formatCurrency(totalOrderValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm text-gray-600">In Bearbeitung</p>
                <p className="text-lg font-semibold">
                  {orders.filter(o => o.status === 'in_progress').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Abgeschlossen</p>
                <p className="text-lg font-semibold">
                  {orders.filter(o => o.status === 'delivered').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Auftragsverwaltung</CardTitle>
            <Button className="bg-[#14ad9f] hover:bg-taskilo-hover" onClick={handleCreateOrder}>
              <Plus className="h-4 w-4 mr-2" />
              Neuen Auftrag erstellen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Aufträge durchsuchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent"
              >
                {statusFilters.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label} ({status.count})
                  </option>
                ))}
              </select>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>

          {/* Orders List */}
          <div className="space-y-4">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Folder className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">Keine Aufträge gefunden</h3>
                <p className="text-sm mb-4">Erstellen Sie den ersten Auftrag für diesen Kunden</p>
                <Button className="bg-[#14ad9f] hover:bg-taskilo-hover" onClick={handleCreateOrder}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ersten Auftrag erstellen
                </Button>
              </div>
            ) : (
              filteredOrders.map((order) => {
                const StatusIcon = statusConfig[order.status].icon;
                return (
                  <Card key={order.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{order.title}</h3>
                            <Badge className={statusConfig[order.status].color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig[order.status].label}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{order.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Bestellt: {formatDate(order.orderDate)}
                            </span>
                            {order.deliveryDate && (
                              <span className="flex items-center gap-1">
                                <Truck className="h-3 w-3" />
                                Lieferung: {formatDate(order.deliveryDate)}
                              </span>
                            )}
                            {order.assignedTo && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {order.assignedTo}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-lg font-semibold text-[#14ad9f] mb-2">
                            {formatCurrency(order.amount)}
                          </div>
                          <div className="text-sm text-gray-600 mb-2">
                            {order.orderNumber}
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" title="Auftrag anzeigen">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" title="Auftrag bearbeiten">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" title="Weitere Optionen">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Auftragspositionen:</h4>
                        <div className="space-y-1">
                          {order.items.map((item, index) => (
                            <div key={index} className="flex justify-between text-sm text-gray-600">
                              <span>{item.quantity}x {item.name}</span>
                              <span>{formatCurrency(item.price * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export { CustomerOrdersTab };
export default CustomerOrdersTab;