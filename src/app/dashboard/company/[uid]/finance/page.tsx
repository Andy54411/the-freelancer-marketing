'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  Receipt,
  FileText,
  Euro,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Plus,
  Wallet,
  CreditCard,
  BarChart3,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { db } from '@/firebase/clients';
import { collection, getDocs, query, where } from 'firebase/firestore';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

interface FinanceData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  outstandingInvoices: number;
  outstandingAmount: number;
  paidInvoices: number;
  paidAmount: number;
  overdueInvoices: number;
  overdueAmount: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  recentInvoices: any[];
  recentExpenses: any[];
  employeeCount: number;
  monthlySalaries: number;
  monthlyData: { month: string; einnahmen: number; ausgaben: number }[];
  categoryData: { name: string; value: number; color: string }[];
  invoiceStatusData: { name: string; value: number; color: string }[];
}

const COLORS = {
  primary: '#14ad9f',
  primaryLight: '#5fcdc3',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  gray: '#6b7280',
  purple: '#8b5cf6',
  blue: '#3b82f6',
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
};

export default function FinancePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && uid) {
      router.replace(`/dashboard/company/${uid}/finance/contacts?tab=${tab}`);
    }
  }, [searchParams, uid, router]);

  const loadFinanceData = useCallback(async () => {
    if (!uid) return;
    try {
      setLoading(true);

      // Lade aus Subcollections (diese haben garantiert Zugriff)
      const [invoicesSubSnap, expensesSnap, employeesSnap] = await Promise.all([
        getDocs(collection(db, 'companies', uid, 'invoices')),
        getDocs(collection(db, 'companies', uid, 'expenses')),
        getDocs(collection(db, 'companies', uid, 'employees')),
      ]);

      // Optionale Queries auf globale Collections - können fehlschlagen wegen Security Rules
      let invoicesGlobalSnap: any = { docs: [], forEach: () => {} };
      let auftraegeSnap: any = { docs: [], forEach: () => {} };
      let escrowsSnap: any = { docs: [], forEach: () => {} };

      try {
        invoicesGlobalSnap = await getDocs(query(collection(db, 'invoices'), where('companyId', '==', uid)));
      } catch (e) {
        // Keine Berechtigung für globale invoices Collection - ignorieren
      }

      try {
        auftraegeSnap = await getDocs(query(collection(db, 'auftraege'), where('taskerId', '==', uid)));
      } catch (e) {
        // Keine Berechtigung für auftraege Collection - ignorieren
      }

      try {
        escrowsSnap = await getDocs(query(collection(db, 'escrows'), where('taskerId', '==', uid)));
      } catch (e) {
        // Keine Berechtigung für escrows Collection - ignorieren
      }

      // Merge invoices from both sources (deduplicate by id)
      const invoiceMap = new Map<string, any>();
      invoicesSubSnap.forEach((doc) => {
        invoiceMap.set(doc.id, { id: doc.id, ...doc.data() });
      });
      invoicesGlobalSnap.forEach((doc: any) => {
        if (!invoiceMap.has(doc.id)) {
          invoiceMap.set(doc.id, { id: doc.id, ...doc.data() });
        }
      });
      const allInvoices = Array.from(invoiceMap.values());

      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();

      // Monatsdaten für Chart (letzte 6 Monate)
      const monthlyData: { month: string; einnahmen: number; ausgaben: number }[] = [];
      const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
      
      for (let i = 5; i >= 0; i--) {
        const monthIndex = (thisMonth - i + 12) % 12;
        const year = thisMonth - i < 0 ? thisYear - 1 : thisYear;
        monthlyData.push({
          month: monthNames[monthIndex],
          einnahmen: 0,
          ausgaben: 0,
        });
      }

      let totalRevenue = 0;
      let paidInvoices = 0;
      let paidAmount = 0;
      let outstandingInvoices = 0;
      let outstandingAmount = 0;
      let overdueInvoices = 0;
      let overdueAmount = 0;
      let thisMonthRevenue = 0;
      let lastMonthRevenue = 0;
      const recentInvoices: any[] = [];

      // Kategorie-Daten für Ausgaben
      const categoryTotals: Record<string, number> = {};

      // Verarbeite alle Rechnungen (aus Subcollection und globaler Collection)
      allInvoices.forEach((inv) => {
        const amount = inv.total || inv.amount || 0;
        const status = (inv.status || '').toLowerCase(); // Case-insensitive Vergleich
        const invoiceDate = inv.date?.toDate?.() || (inv.date ? new Date(inv.date) : new Date());
        const dueDate = inv.dueDate?.toDate?.() || (inv.dueDate ? new Date(inv.dueDate) : null);

        if (status === 'paid' || status === 'bezahlt') {
          totalRevenue += amount;
          paidInvoices++;
          paidAmount += amount;

          // Monatsdaten aktualisieren
          const monthDiff = (thisYear - invoiceDate.getFullYear()) * 12 + (thisMonth - invoiceDate.getMonth());
          if (monthDiff >= 0 && monthDiff < 6) {
            monthlyData[5 - monthDiff].einnahmen += amount;
          }

          if (invoiceDate.getMonth() === thisMonth && invoiceDate.getFullYear() === thisYear) {
            thisMonthRevenue += amount;
          }
          const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
          const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;
          if (invoiceDate.getMonth() === lastMonth && invoiceDate.getFullYear() === lastMonthYear) {
            lastMonthRevenue += amount;
          }
        } else if (status === 'sent' || status === 'pending' || status === 'open' || status === 'offen' || status === 'draft' || status === 'entwurf' || status === 'finalized' || status === 'created') {
          // finalized = Rechnung fertiggestellt, aber noch nicht bezahlt
          outstandingInvoices++;
          outstandingAmount += amount;

          if (dueDate && dueDate < now) {
            overdueInvoices++;
            overdueAmount += amount;
          }
        }

        recentInvoices.push({
          id: inv.id,
          ...inv,
          amount,
          originalStatus: inv.status, // Behalte Original-Status für Anzeige
        });
      });

      // Verarbeite abgeschlossene Aufträge für den Gesamtumsatz
      auftraegeSnap.forEach((doc) => {
        const auftrag = doc.data();
        const status = (auftrag.status || '').toLowerCase();
        if (status === 'completed' || status === 'abgeschlossen' || status === 'erledigt') {
          const amount = auftrag.totalAmount || auftrag.amount || auftrag.price || 0;
          totalRevenue += amount;
          paidAmount += amount;
          paidInvoices++;

          const auftragDate = auftrag.completedAt?.toDate?.() || auftrag.updatedAt?.toDate?.() || new Date();
          const monthDiff = (thisYear - auftragDate.getFullYear()) * 12 + (thisMonth - auftragDate.getMonth());
          if (monthDiff >= 0 && monthDiff < 6) {
            monthlyData[5 - monthDiff].einnahmen += amount;
          }

          if (auftragDate.getMonth() === thisMonth && auftragDate.getFullYear() === thisYear) {
            thisMonthRevenue += amount;
          }
        }
      });

      // Verarbeite Escrow-Zahlungen für den Gesamtumsatz
      escrowsSnap.forEach((doc) => {
        const escrow = doc.data();
        const status = (escrow.status || '').toLowerCase();
        if (status === 'completed' || status === 'released' || status === 'paid_out') {
          const amount = escrow.amount || escrow.taskerAmount || 0;
          totalRevenue += amount;
          paidAmount += amount;
          paidInvoices++;

          const escrowDate = escrow.completedAt?.toDate?.() || escrow.releasedAt?.toDate?.() || new Date();
          const monthDiff = (thisYear - escrowDate.getFullYear()) * 12 + (thisMonth - escrowDate.getMonth());
          if (monthDiff >= 0 && monthDiff < 6) {
            monthlyData[5 - monthDiff].einnahmen += amount;
          }

          if (escrowDate.getMonth() === thisMonth && escrowDate.getFullYear() === thisYear) {
            thisMonthRevenue += amount;
          }
        }
      });

      let totalExpenses = 0;
      const recentExpenses: any[] = [];

      expensesSnap.forEach((doc) => {
        const exp = doc.data();
        const amount = exp.amount || 0;
        totalExpenses += amount;

        const category = exp.category || 'Sonstiges';
        categoryTotals[category] = (categoryTotals[category] || 0) + amount;

        const expDate = exp.date?.toDate?.() || new Date(exp.date);
        const monthDiff = (thisYear - expDate.getFullYear()) * 12 + (thisMonth - expDate.getMonth());
        if (monthDiff >= 0 && monthDiff < 6) {
          monthlyData[5 - monthDiff].ausgaben += amount;
        }

        recentExpenses.push({
          id: doc.id,
          ...exp,
        });
      });

      // Top 5 Kategorien für Pie Chart
      const categoryColors = [COLORS.primary, COLORS.blue, COLORS.purple, COLORS.warning, COLORS.gray];
      const categoryData = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value], index) => ({
          name,
          value,
          color: categoryColors[index % categoryColors.length],
        }));

      // Rechnungsstatus für Donut Chart
      const invoiceStatusData = [
        { name: 'Bezahlt', value: paidAmount, color: COLORS.success },
        { name: 'Offen', value: outstandingAmount - overdueAmount, color: COLORS.warning },
        { name: 'Überfällig', value: overdueAmount, color: COLORS.danger },
      ].filter(d => d.value > 0);

      let employeeCount = 0;
      let monthlySalaries = 0;

      employeesSnap.forEach((doc) => {
        const emp = doc.data();
        if (emp.status === 'active' || !emp.status) {
          employeeCount++;
          monthlySalaries += emp.salary || emp.monthlySalary || 0;
        }
      });

      setData({
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        outstandingInvoices,
        outstandingAmount,
        paidInvoices,
        paidAmount,
        overdueInvoices,
        overdueAmount,
        thisMonthRevenue,
        lastMonthRevenue,
        recentInvoices: recentInvoices.slice(0, 5),
        recentExpenses: recentExpenses.slice(0, 5),
        employeeCount,
        monthlySalaries,
        monthlyData,
        categoryData,
        invoiceStatusData,
      });
    } catch (error) {
      console.error('Fehler beim Laden:', error);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    loadFinanceData();
  }, [loadFinanceData]);

  const isOwner = user?.uid === uid;
  const isEmployee = user?.user_type === 'mitarbeiter' && user?.companyId === uid;

  if (!user || (!isOwner && !isEmployee)) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Zugriff verweigert</h2>
          <p className="text-gray-600">Sie sind nicht berechtigt, diese Seite zu sehen.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 bg-gray-200 rounded-xl"></div>
            <div className="h-80 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const revenueChange = data.lastMonthRevenue > 0 
    ? ((data.thisMonthRevenue - data.lastMonthRevenue) / data.lastMonthRevenue * 100).toFixed(1)
    : '0';
  const isPositiveChange = parseFloat(revenueChange) >= 0;

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
        <Link href={`/dashboard/company/${uid}/finance/invoices/create`}>
          <Button className="bg-[#14ad9f] hover:bg-teal-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Rechnung erstellen
          </Button>
        </Link>
        <Link href={`/dashboard/company/${uid}/finance/expenses/create`}>
          <Button variant="outline" className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f]/10">
            <Plus className="h-4 w-4 mr-2" />
            Ausgabe erfassen
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Umsatz */}
        <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-[#14ad9f]/10 flex items-center justify-center">
                <Euro className="h-6 w-6 text-[#14ad9f]" />
              </div>
              <div className={`flex items-center gap-1 text-sm font-medium ${isPositiveChange ? 'text-green-600' : 'text-red-600'}`}>
                {isPositiveChange ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                {revenueChange}%
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-500">Gesamtumsatz</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(data.totalRevenue)}</p>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Diesen Monat: <span className="font-medium text-gray-700">{formatCurrency(data.thisMonthRevenue)}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Ausgaben */}
        <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-red-500" />
              </div>
              <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                Ausgaben
              </Badge>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-500">Gesamtausgaben</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(data.totalExpenses)}</p>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Gewinn: <span className={`font-medium ${data.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(data.netProfit)}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Offene Rechnungen */}
        <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-500" />
              </div>
              <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                {data.outstandingInvoices} offen
              </Badge>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-500">Offene Rechnungen</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(data.outstandingAmount)}</p>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              {data.overdueInvoices > 0 ? (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {data.overdueInvoices} überfällig ({formatCurrency(data.overdueAmount)})
                </p>
              ) : (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Keine überfälligen Rechnungen
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Personal */}
        <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-500" />
              </div>
              <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">
                {data.employeeCount} aktiv
              </Badge>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-500">Personalkosten/Monat</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(data.monthlySalaries)}</p>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <Link href={`/dashboard/company/${uid}/personal`} className="text-xs text-[#14ad9f] hover:underline flex items-center gap-1">
                Personal verwalten <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Umsatz & Ausgaben Trend */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-[#14ad9f]" />
                Einnahmen & Ausgaben
              </CardTitle>
              <Badge variant="outline" className="text-gray-500">Letzte 6 Monate</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEinnahmen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14ad9f" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#14ad9f" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorAusgaben" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: 'none', 
                      borderRadius: '12px', 
                      boxShadow: '0 4px 20px rgba(0,0,0,0.1)' 
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Area type="monotone" dataKey="einnahmen" stroke="#14ad9f" strokeWidth={2} fill="url(#colorEinnahmen)" name="Einnahmen" />
                  <Area type="monotone" dataKey="ausgaben" stroke="#ef4444" strokeWidth={2} fill="url(#colorAusgaben)" name="Ausgaben" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Rechnungsstatus Donut */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-[#14ad9f]" />
                Rechnungsstatus
              </CardTitle>
              <Badge variant="outline" className="text-gray-500">{data.paidInvoices + data.outstandingInvoices} Rechnungen</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-72 flex items-center justify-center">
              {data.invoiceStatusData.length > 0 ? (
                <div className="flex items-center gap-8 w-full">
                  <div className="w-1/2">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={data.invoiceStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {data.invoiceStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-1/2 space-y-3">
                    {data.invoiceStatusData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                          <span className="text-sm text-gray-600">{item.name}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Keine Rechnungsdaten vorhanden</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ausgaben nach Kategorie & Schnellzugriff */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ausgaben nach Kategorie */}
        <Card className="bg-white border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Wallet className="h-5 w-5 text-[#14ad9f]" />
              Ausgaben nach Kategorie
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {data.categoryData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.categoryData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={true} vertical={false} />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k €`} />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} width={120} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]} name="Ausgaben">
                      {data.categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Wallet className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Keine Ausgaben vorhanden</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Schnellzugriff */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-gray-900">Schnellzugriff</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-2">
              <Link href={`/dashboard/company/${uid}/finance/invoices`}>
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-[#14ad9f]/10 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#14ad9f]/10 flex items-center justify-center group-hover:bg-[#14ad9f]/20">
                      <FileText className="h-5 w-5 text-[#14ad9f]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Rechnungen</p>
                      <p className="text-xs text-gray-500">{data.paidInvoices + data.outstandingInvoices} gesamt</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-[#14ad9f]" />
                </div>
              </Link>

              <Link href={`/dashboard/company/${uid}/finance/expenses`}>
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-[#14ad9f]/10 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center group-hover:bg-red-100">
                      <Receipt className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Ausgaben</p>
                      <p className="text-xs text-gray-500">{data.recentExpenses.length} Einträge</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-[#14ad9f]" />
                </div>
              </Link>

              <Link href={`/dashboard/company/${uid}/finance/reminders`}>
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-[#14ad9f]/10 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center group-hover:bg-amber-100">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Mahnungen</p>
                      <p className="text-xs text-gray-500">{data.overdueInvoices} überfällig</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-[#14ad9f]" />
                </div>
              </Link>

              <Link href={`/dashboard/company/${uid}/finance/quotes`}>
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-[#14ad9f]/10 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100">
                      <FileText className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Angebote</p>
                      <p className="text-xs text-gray-500">Angebote verwalten</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-[#14ad9f]" />
                </div>
              </Link>

              <Link href={`/dashboard/company/${uid}/personal`}>
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-[#14ad9f]/10 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center group-hover:bg-purple-100">
                      <Users className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Personal (HR)</p>
                      <p className="text-xs text-gray-500">{data.employeeCount} Mitarbeiter</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-[#14ad9f]" />
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Letzte Aktivitäten */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Letzte Rechnungen */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-900">Letzte Rechnungen</CardTitle>
              <Link href={`/dashboard/company/${uid}/finance/invoices`}>
                <Button variant="ghost" size="sm" className="text-[#14ad9f] hover:text-teal-700">
                  Alle anzeigen <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-3">
              {data.recentInvoices.length > 0 ? (
                data.recentInvoices.map((inv, index) => {
                  const statusLower = (inv.originalStatus || inv.status || '').toLowerCase();
                  const isPaid = statusLower === 'paid' || statusLower === 'bezahlt';
                  const isOverdue = statusLower === 'overdue' || statusLower === 'überfällig';
                  return (
                  <Link key={index} href={`/dashboard/company/${uid}/finance/invoices/${inv.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          isPaid ? 'bg-green-500' : 
                          isOverdue ? 'bg-red-500' : 'bg-amber-500'
                        }`}></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{inv.customerName || inv.invoiceNumber || 'Rechnung'}</p>
                          <p className="text-xs text-gray-500">{inv.invoiceNumber}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{formatCurrency(inv.amount)}</p>
                        <Badge variant="outline" className={`text-xs ${
                          isPaid ? 'text-green-600 border-green-200' : 
                          isOverdue ? 'text-red-600 border-red-200' : 'text-amber-600 border-amber-200'
                        }`}>
                          {isPaid ? 'Bezahlt' : isOverdue ? 'Überfällig' : 'Offen'}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                );})
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>Keine Rechnungen vorhanden</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Letzte Ausgaben */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-900">Letzte Ausgaben</CardTitle>
              <Link href={`/dashboard/company/${uid}/finance/expenses`}>
                <Button variant="ghost" size="sm" className="text-[#14ad9f] hover:text-teal-700">
                  Alle anzeigen <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-3">
              {data.recentExpenses.length > 0 ? (
                data.recentExpenses.map((exp, index) => (
                  <Link key={index} href={`/dashboard/company/${uid}/finance/expenses/${exp.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Receipt className="h-5 w-5 text-gray-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{exp.title || exp.vendor || 'Ausgabe'}</p>
                          <p className="text-xs text-gray-500">{exp.category || 'Sonstiges'}</p>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{formatCurrency(exp.amount || 0)}</p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Receipt className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>Keine Ausgaben vorhanden</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
