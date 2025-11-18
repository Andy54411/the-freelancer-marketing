'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ChevronDown } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import CustomerDetailModal from './CustomerDetailModal';

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  status: string;
  issueDate: string;
  dueDate?: string;
}

interface CustomerRevenue {
  id: string;
  name: string;
  totalRevenue: number;
  invoiceCount: number;
  email?: string;
  phone?: string;
  address?: string;
  invoices: Invoice[];
  lastInvoiceDate?: string;
  averageInvoiceAmount?: number;
}

interface CustomerData {
  name: string;
  value: number;
  color: string;
  fullName: string;
}

const CUSTOMER_COLORS = [
'#393196', // Lila
'#5B4FCF', // Helles Lila  
'#7C6EE7', // Mittleres Lila
'#A299FF', // Helles Lila
'#C8C1FF' // Sehr helles Lila
];

export default function TopCustomersCard() {
  const [customers, setCustomers] = useState<CustomerRevenue[]>([]);
  const [chartData, setChartData] = useState<CustomerData[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('1year');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRevenue | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }

    fetchCustomerRevenue();
  }, [user?.uid, selectedPeriod]);

  const fetchCustomerRevenue = async () => {
    if (!user?.uid) return;

    setIsLoading(true);
    try {


      // Berechne Zeitraum
      const now = new Date();
      const startDate = new Date();

      switch (selectedPeriod) {
        case '1month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case '3months':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case '6months':
          startDate.setMonth(now.getMonth() - 6);
          break;
        case '1year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          startDate.setMonth(now.getMonth() - 3);
      }







      // Lade ALLE Rechnungen erst einmal ohne Datum-Filter 
      const invoicesQuery = query(
        collection(db, 'companies', user.uid, 'invoices'),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(invoicesQuery);
      const customerRevenueMap = new Map<string, CustomerRevenue>();



      querySnapshot.forEach((doc) => {
        const invoice = doc.data();
        const customerName = invoice.customerName || invoice.customer?.name || 'Unbekannter Kunde';
        const amount = invoice.total || invoice.amount || 0;
        const status = invoice.status || 'draft';











        // Filter Rechnungen mit Umsatz (alle Status außer draft/cancelled)
        const excludedStatuses = ['draft', 'cancelled', 'deleted'];
        const validStatuses = ['paid', 'sent', 'open', 'overdue', 'finalized', 'bezahlt', 'versendet', 'offen'];
        if (amount > 0 && (validStatuses.includes(status) || !excludedStatuses.includes(status))) {
          // Parse das Datum flexibler
          let invoiceDate = invoice.issueDate;
          if (invoice.createdAt && invoice.createdAt.toDate) {
            invoiceDate = invoice.createdAt.toDate().toISOString().split('T')[0];
          } else if (!invoiceDate && invoice.createdAt) {
            invoiceDate = invoice.createdAt;
          }

          // Erstelle Invoice-Objekt
          const invoiceObj: Invoice = {
            id: doc.id,
            invoiceNumber: invoice.invoiceNumber || `INV-${doc.id.slice(-6)}`,
            amount: amount,
            status: status,
            issueDate: invoiceDate || new Date().toISOString().split('T')[0],
            dueDate: invoice.dueDate
          };

          // Temporär: Alle Rechnungen ohne Zeitraum-Filter für vollständige Erfassung
          const existing = customerRevenueMap.get(customerName);
          if (existing) {
            existing.totalRevenue += amount;
            existing.invoiceCount += 1;
            existing.invoices.push(invoiceObj);
            if (!existing.lastInvoiceDate || invoiceDate > existing.lastInvoiceDate) {
              existing.lastInvoiceDate = invoiceDate || new Date().toISOString().split('T')[0];
            }
          } else {
            customerRevenueMap.set(customerName, {
              id: doc.id,
              name: customerName,
              totalRevenue: amount,
              invoiceCount: 1,
              email: invoice.customerEmail || invoice.customer?.email,
              invoices: [invoiceObj],
              lastInvoiceDate: invoiceDate || new Date().toISOString().split('T')[0]
            });
          }
        }
      });



      // Zusätzlich: Lade auch Kunden aus der Kunden-Subcollection für vollständige Liste
      try {
        const customersQuery = query(
          collection(db, 'companies', user.uid, 'customers'),
          orderBy('createdAt', 'desc')
        );

        const customersSnapshot = await getDocs(customersQuery);


        customersSnapshot.forEach((doc) => {
          const customer = doc.data();
          const customerName = customer.name || customer.companyName || 'Unbekannter Kunde';








          // Wenn Kunde noch nicht in der Revenue-Map ist, füge ihn hinzu
          if (!customerRevenueMap.has(customerName) && customerName !== 'Unbekannter Kunde') {
            customerRevenueMap.set(customerName, {
              id: doc.id,
              name: customerName,
              totalRevenue: 0,
              invoiceCount: 0,
              email: customer.email,
              phone: customer.phone,
              address: customer.address,
              invoices: []
            });
          } else if (customerRevenueMap.has(customerName)) {
            // Update existing customer with contact info
            const existing = customerRevenueMap.get(customerName)!;
            existing.email = existing.email || customer.email;
            existing.phone = existing.phone || customer.phone;
            existing.address = existing.address || customer.address;
          }
        });


      } catch (customerError) {
        console.warn('⚠️ Could not load customers collection:', customerError);
      }

      // Berechne durchschnittliche Rechnungsbeträge und sortiere
      const allCustomers = Array.from(customerRevenueMap.values()).
      map((customer) => ({
        ...customer,
        averageInvoiceAmount: customer.invoiceCount > 0 ? customer.totalRevenue / customer.invoiceCount : 0
      })).
      sort((a, b) => b.totalRevenue - a.totalRevenue);

      // Nur Kunden mit Umsatz für Chart verwenden (mindestens 0.01€)
      const customersWithRevenue = allCustomers.filter((customer) => customer.totalRevenue >= 0.01);
      const sortedCustomers = customersWithRevenue.slice(0, 5);






      // Erstelle Chart-Daten (nur Kunden mit Umsatz)
      const chartCustomers: CustomerData[] = sortedCustomers.map((customer, index) => ({
        name: customer.name.length > 20 ? `${customer.name.substring(0, 17)}...` : customer.name,
        fullName: customer.name,
        value: customer.totalRevenue,
        color: CUSTOMER_COLORS[index] || '#C8C1FF'
      }));




      const finalTotal = sortedCustomers.reduce((sum, customer) => sum + customer.totalRevenue, 0);



      // Verwende alle Kunden (auch mit 0€) für die Kundenliste, aber nur Kunden mit Umsatz für Chart
      setCustomers(allCustomers);
      setChartData(chartCustomers);
      setTotalRevenue(finalTotal);
    } catch (error) {
      console.error('❌ Fehler beim Laden der Kundenumsätze:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return `${amount.toFixed(2).replace('.', ',')}\u00A0€`;
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case '1month':return 'Letzter Monat';
      case '3months':return 'Letzte 3 Monate';
      case '6months':return 'Letzte 6 Monate';
      case '1year':return 'Letztes Jahr';
      default:return 'Letzte 3 Monate';
    }
  };

  const renderCenterText = () => {
    const text = formatAmount(totalRevenue);
    const textLength = text.length;

    // Dynamische Schriftgröße basierend auf Textlänge
    let fontSize = 24;
    if (textLength > 12) fontSize = 16;else
    if (textLength > 10) fontSize = 18;else
    if (textLength > 8) fontSize = 20;

    // Bei sehr langen Zahlen: aufteilen in zwei Zeilen
    if (textLength > 12) {
      const parts = text.split('\u00A0'); // Split bei Non-Breaking Space vor €
      const number = parts[0];
      const currency = parts[1] || '€';

      return (
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
          <tspan
            x="50%"
            y="45%"
            style={{
              fontWeight: 600,
              fontSize: `${fontSize}px`,
              fill: 'rgb(16, 11, 45)'
            }}>

            {number}
          </tspan>
          <tspan
            x="50%"
            y="58%"
            style={{
              fontWeight: 600,
              fontSize: `${fontSize - 2}px`,
              fill: 'rgb(16, 11, 45)'
            }}>

            {currency}
          </tspan>
        </text>);

    }

    return (
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
        <tspan
          x="50%"
          y="50%"
          style={{
            fontWeight: 600,
            fontSize: `${fontSize}px`,
            fill: 'rgb(16, 11, 45)'
          }}>

          {text}
        </tspan>
      </text>);

  };

  const handleCustomerClick = (customerName: string) => {
    const customer = customers.find((c) => c.name === customerName);
    if (customer) {
      setSelectedCustomer(customer);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCustomer(null);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Top 5 Kunden</h3>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#14ad9f]" />
        </div>
      </div>);

  }

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Top 5 Kunden</h3>
        </div>

        {chartData.length > 0 ?
        <div className="h-64 flex">
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="#fff"
                  strokeWidth={2}>

                    {chartData.map((entry, index) =>
                  <Cell key={`cell-${index}`} fill={entry.color} />
                  )}
                  </Pie>
                  {renderCenterText()}
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-40 flex items-center">
              <div className="space-y-2">
                {chartData.map((entry, index) =>
              <div
                key={`legend-${index}`}
                className="flex items-center gap-2 text-sm cursor-pointer hover:opacity-80 hover:bg-gray-100 p-2 rounded transition-colors"
                title={entry.fullName}
                onClick={() => handleCustomerClick(entry.fullName)}>

                    <div
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: entry.color }} />

                    <span className="text-gray-600 font-medium truncate">{entry.name}</span>
                  </div>
              )}
              </div>
            </div>
          </div> :

        <div className="h-64 flex items-center justify-center text-gray-500">
            Keine Kundendaten verfügbar
          </div>
        }
      </div>

      <div className="border-t bg-gray-50 px-6 py-4 rounded-b-lg">
        <div className="flex items-center justify-between">
          <div className="relative">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="appearance-none bg-transparent border-none text-sm text-gray-600 cursor-pointer pr-6 focus:outline-none">

              <option value="1month">Letzter Monat</option>
              <option value="3months">Letzte 3 Monate</option>
              <option value="6months">Letzte 6 Monate</option>
              <option value="1year">Letztes Jahr</option>
            </select>
            <ChevronDown className="absolute right-0 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="text-sm text-gray-500">
            {customers.length} von 5 Kunden
          </div>
        </div>
      </div>

      <CustomerDetailModal
        customer={selectedCustomer}
        isOpen={isModalOpen}
        onClose={handleCloseModal} />

    </div>);

}