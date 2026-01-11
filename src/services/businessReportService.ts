'use client';

import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { InventoryService, type InventoryStats } from './inventoryService';
import { PersonalService } from './personalService';
import { TimeTrackingService } from './timeTrackingService';

/**
 * ====================================================================
 * BUSINESS REPORT SERVICE
 * ====================================================================
 * 
 * Dieser Service führt alle Business-KPIs aus allen Modulen zusammen:
 * - Buchhaltung (Rechnungen, Ausgaben, Angebote)
 * - Lager/Inventar
 * - HR/Personal (Mitarbeiter, Gehälter, Arbeitszeiten)
 * - Zeiterfassung
 * - Aufträge/Projekte
 * 
 * Alle Daten werden aus den korrekten Subcollections geladen:
 * companies/{companyId}/invoices
 * companies/{companyId}/expenses
 * companies/{companyId}/quotes
 * companies/{companyId}/employees
 * companies/{companyId}/payrolls
 * companies/{companyId}/inventory
 * etc.
 */

// ============================================================================
// TYPEN
// ============================================================================

export interface FinanceKPIs {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  outstandingInvoices: number;
  outstandingAmount: number;
  paidInvoices: number;
  paidAmount: number;
  overdueInvoices: number;
  overdueAmount: number;
  vatCollected: number;
  vatPaid: number;
  vatBalance: number;
  thisMonthRevenue: number;
  thisMonthExpenses: number;
  lastMonthRevenue: number;
  lastMonthExpenses: number;
  revenueGrowth: number;
  averageInvoiceValue: number;
  quotesTotal: number;
  quotesAccepted: number;
  quoteConversionRate: number;
}

export interface InventoryKPIs {
  totalItems: number;
  totalValue: number;
  totalRetailValue: number;
  potentialProfit: number;
  averageItemValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  reservedItems: number;
  reservedValue: number;
  categories: number;
  topCategories: Array<{ name: string; count: number; value: number }>;
  lastMovements: Array<{ type: string; count: number }>;
}

export interface HRKPIs {
  totalEmployees: number;
  activeEmployees: number;
  fullTimeEmployees: number;
  partTimeEmployees: number;
  contractWorkers: number;
  totalGrossSalary: number;
  totalNetSalary: number;
  totalEmployerCosts: number;
  averageSalary: number;
  totalWorkingHours: number;
  overtimeHours: number;
  vacationDaysUsed: number;
  vacationDaysRemaining: number;
  sickDays: number;
  upcomingVacations: number;
}

export interface TimeTrackingKPIs {
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  billablePercentage: number;
  totalBillableAmount: number;
  averageHourlyRate: number;
  activeProjects: number;
  completedProjects: number;
  openTasks: number;
  overdueTasks: number;
  byProject: Array<{ name: string; hours: number; amount: number }>;
  byEmployee: Array<{ name: string; hours: number; billable: number }>;
}

export interface OrdersKPIs {
  totalOrders: number;
  activeOrders: number;
  inProgressOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalOrderValue: number;
  averageOrderValue: number;
  pendingPayments: number;
  pendingPaymentAmount: number;
  completionRate: number;
}

export interface MonthlyData {
  month: string;
  year: number;
  monthIndex: number;
  // Finanzen
  revenue: number;
  expenses: number;
  profit: number;
  // HR
  salaries: number;
  employerCosts: number;
  // Zeiterfassung
  workedHours: number;
  billableHours: number;
  // Lager
  inventoryValue: number;
  stockMovements: number;
}

export interface BusinessReportData {
  companyId: string;
  period: {
    startDate: Date;
    endDate: Date;
    type: 'month' | 'quarter' | 'year' | 'custom';
  };
  finance: FinanceKPIs;
  inventory: InventoryKPIs;
  hr: HRKPIs;
  timeTracking: TimeTrackingKPIs;
  orders: OrdersKPIs;
  monthlyData: MonthlyData[];
  generatedAt: Date;
}

export interface BWAData {
  period: { month: number; year: number };
  // Umsatz & Erlöse
  netRevenue: number;
  otherIncome: number;
  totalIncome: number;
  // Wareneinsatz
  materialCosts: number;
  freightCosts: number;
  totalMaterialCosts: number;
  // Rohertrag
  grossProfit: number;
  grossProfitMargin: number;
  // Personalkosten
  wages: number;
  salaries: number;
  socialSecurity: number;
  otherPersonnelCosts: number;
  totalPersonnelCosts: number;
  // Raumkosten
  rent: number;
  utilities: number;
  totalRoomCosts: number;
  // Fahrzeugkosten
  vehicleCosts: number;
  travelCosts: number;
  totalVehicleCosts: number;
  // Sonstige Kosten
  insurance: number;
  repairs: number;
  advertising: number;
  officeCosts: number;
  telecommunications: number;
  bookkeeping: number;
  legal: number;
  otherCosts: number;
  totalOtherCosts: number;
  // Abschreibungen
  depreciation: number;
  // Zinsen
  interestIncome: number;
  interestExpense: number;
  // Ergebnisse
  operatingResult: number;
  extraordinaryItems: number;
  preProfit: number;
  taxes: number;
  netProfit: number;
}

export interface EURData {
  period: { year: number };
  // Einnahmen
  salesRevenue: number;
  otherIncome: number;
  privateUsage: number;
  totalIncome: number;
  // Ausgaben
  materialPurchases: number;
  personnelCosts: number;
  roomCosts: number;
  insuranceCosts: number;
  vehicleCosts: number;
  travelCosts: number;
  advertisingCosts: number;
  officeCosts: number;
  otherOperatingCosts: number;
  depreciation: number;
  totalExpenses: number;
  // Ergebnis
  profit: number;
}

export interface UStVAData {
  period: { month: number; year: number };
  // Umsätze
  taxableRevenue19: number;
  taxableRevenue7: number;
  taxFreeRevenue: number;
  euDeliveries: number;
  // USt auf Umsätze
  outputVat19: number;
  outputVat7: number;
  totalOutputVat: number;
  // Vorsteuer
  inputVat: number;
  importVat: number;
  totalInputVat: number;
  // Zahllast
  vatPayable: number;
}

// ============================================================================
// BUSINESS REPORT SERVICE
// ============================================================================

export class BusinessReportService {
  /**
   * Lädt alle Business-KPIs für ein Unternehmen
   */
  static async getBusinessReport(
    companyId: string,
    period: { startDate: Date; endDate: Date; type: 'month' | 'quarter' | 'year' | 'custom' }
  ): Promise<BusinessReportData> {
    const [finance, inventory, hr, timeTracking, orders, monthlyData] = await Promise.all([
      this.getFinanceKPIs(companyId, period.startDate, period.endDate),
      this.getInventoryKPIs(companyId),
      this.getHRKPIs(companyId, period.startDate, period.endDate),
      this.getTimeTrackingKPIs(companyId, period.startDate, period.endDate),
      this.getOrdersKPIs(companyId, period.startDate, period.endDate),
      this.getMonthlyData(companyId, period.startDate, period.endDate),
    ]);

    return {
      companyId,
      period,
      finance,
      inventory,
      hr,
      timeTracking,
      orders,
      monthlyData,
      generatedAt: new Date(),
    };
  }

  // ============================================================================
  // FINANCE KPIs
  // ============================================================================

  static async getFinanceKPIs(
    companyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<FinanceKPIs> {
    const [invoices, expenses, quotes] = await Promise.all([
      this.getInvoicesFromSubcollection(companyId),
      this.getExpensesFromSubcollection(companyId),
      this.getQuotesFromSubcollection(companyId),
    ]);

    // Filtere nach Zeitraum
    const periodInvoices = invoices.filter(inv => {
      const date = inv.issueDate instanceof Date ? inv.issueDate : new Date(inv.issueDate);
      return date >= startDate && date <= endDate;
    });

    const periodExpenses = expenses.filter(exp => {
      const date = exp.date instanceof Date ? exp.date : new Date(exp.date);
      return date >= startDate && date <= endDate;
    });

    // Berechne Umsatz - GoBD-Konformität: Festgeschriebene ODER bezahlte Rechnungen
    // Eine festgeschriebene Rechnung ist steuerlich relevant
    const paidOrLockedInvoices = periodInvoices.filter(inv => 
      inv.status === 'paid' || inv.isLocked === true || inv.gobdStatus === 'locked'
    );
    const paidAmount = paidOrLockedInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

    const outstandingInv = periodInvoices.filter(inv => 
      (inv.status === 'sent' || inv.status === 'pending') && 
      inv.isLocked !== true && 
      inv.gobdStatus !== 'locked'
    );
    const outstandingAmount = outstandingInv.reduce((sum, inv) => sum + (inv.total || 0), 0);

    const overdueInv = periodInvoices.filter(inv => 
      inv.status === 'overdue' && 
      inv.isLocked !== true && 
      inv.gobdStatus !== 'locked'
    );
    const overdueAmount = overdueInv.reduce((sum, inv) => sum + (inv.total || 0), 0);

    const totalRevenue = paidAmount + outstandingAmount + overdueAmount;
    const totalExpenses = periodExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const netProfit = totalRevenue - totalExpenses;

    // USt
    const vatCollected = periodInvoices.reduce((sum, inv) => sum + (inv.vatAmount || inv.total * 0.19 || 0), 0);
    const vatPaid = periodExpenses
      .filter(exp => exp.taxDeductible)
      .reduce((sum, exp) => sum + (exp.amount * 0.19), 0);

    // Letzter Monat für Vergleich
    const lastMonthStart = new Date(startDate);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    const lastMonthEnd = new Date(startDate);
    lastMonthEnd.setDate(0);

    const lastMonthInvoices = invoices.filter(inv => {
      const date = inv.issueDate instanceof Date ? inv.issueDate : new Date(inv.issueDate);
      return date >= lastMonthStart && date <= lastMonthEnd;
    });
    const lastMonthRevenue = lastMonthInvoices
      .filter(inv => inv.status === 'paid' || inv.isLocked === true || inv.gobdStatus === 'locked')
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    const lastMonthExpenses = expenses
      .filter(exp => {
        const date = exp.date instanceof Date ? exp.date : new Date(exp.date);
        return date >= lastMonthStart && date <= lastMonthEnd;
      })
      .reduce((sum, exp) => sum + (exp.amount || 0), 0);

    // Angebote
    const acceptedQuotes = quotes.filter(q => q.status === 'accepted' || q.status === 'invoiced');

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
      outstandingInvoices: outstandingInv.length,
      outstandingAmount,
      paidInvoices: paidOrLockedInvoices.length,
      paidAmount,
      overdueInvoices: overdueInv.length,
      overdueAmount,
      vatCollected,
      vatPaid,
      vatBalance: vatCollected - vatPaid,
      thisMonthRevenue: totalRevenue,
      thisMonthExpenses: totalExpenses,
      lastMonthRevenue,
      lastMonthExpenses,
      revenueGrowth: lastMonthRevenue > 0 
        ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
        : 0,
      averageInvoiceValue: periodInvoices.length > 0 
        ? totalRevenue / periodInvoices.length 
        : 0,
      quotesTotal: quotes.length,
      quotesAccepted: acceptedQuotes.length,
      quoteConversionRate: quotes.length > 0 
        ? (acceptedQuotes.length / quotes.length) * 100 
        : 0,
    };
  }

  // ============================================================================
  // INVENTORY KPIs
  // ============================================================================

  static async getInventoryKPIs(companyId: string): Promise<InventoryKPIs> {
    try {
      const items = await InventoryService.getInventoryItems(companyId);
      const stats: InventoryStats = await InventoryService.getInventoryStats(companyId);

      // Kategorien gruppieren
      const categoryMap = new Map<string, { count: number; value: number }>();
      items.forEach(item => {
        const cat = item.category || 'Sonstiges';
        const existing = categoryMap.get(cat) || { count: 0, value: 0 };
        categoryMap.set(cat, {
          count: existing.count + 1,
          value: existing.value + item.stockValue,
        });
      });

      const topCategories = Array.from(categoryMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      const reservedItems = items.filter(i => i.reservedStock > 0);
      const reservedValue = reservedItems.reduce((sum, i) => sum + (i.reservedStock * i.purchasePrice), 0);

      // Berechne Verkaufswert und potenzielle Marge
      const totalRetailValue = items.reduce((sum, i) => sum + (i.currentStock * (i.sellingPrice || i.purchasePrice)), 0);
      const potentialProfit = totalRetailValue - stats.totalValue;

      return {
        totalItems: stats.totalItems,
        totalValue: stats.totalValue,
        totalRetailValue,
        potentialProfit,
        averageItemValue: stats.averageValue,
        lowStockItems: stats.lowStockItems,
        outOfStockItems: stats.outOfStockItems,
        reservedItems: reservedItems.length,
        reservedValue,
        categories: stats.totalCategories,
        topCategories,
        lastMovements: [], // Würde aus stockMovements collection kommen
      };
    } catch {
      return {
        totalItems: 0,
        totalValue: 0,
        totalRetailValue: 0,
        potentialProfit: 0,
        averageItemValue: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        reservedItems: 0,
        reservedValue: 0,
        categories: 0,
        topCategories: [],
        lastMovements: [],
      };
    }
  }

  // ============================================================================
  // HR KPIs
  // ============================================================================

  static async getHRKPIs(
    companyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<HRKPIs> {
    try {
      const [employees, payrolls, absences] = await Promise.all([
        PersonalService.getEmployees(companyId),
        this.getPayrollsFromSubcollection(companyId, startDate, endDate),
        this.getAbsencesFromSubcollection(companyId),
      ]);

      const activeEmployees = employees.filter(e => e.status === 'ACTIVE');
      const fullTime = activeEmployees.filter(e => e.contractType === 'PERMANENT');
      const partTime = activeEmployees.filter(e => e.contractType === 'TEMPORARY');
      const contractors = activeEmployees.filter(e => e.contractType === 'PROJECT_BASED');

      // Gehälter berechnen
      const totalGross = payrolls.reduce((sum, p) => sum + (p.grossSalary || 0), 0);
      const totalNet = payrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0);
      const totalEmployerCosts = payrolls.reduce((sum, p) => sum + (p.employerCosts?.socialSecurity || 0), 0);

      // Urlaub/Krankheit
      const vacationDaysUsed = absences
        .filter(a => a.type === 'VACATION' && a.status === 'APPROVED')
        .reduce((sum, a) => sum + (a.days || 0), 0);

      const sickDays = absences
        .filter(a => a.type === 'SICK')
        .reduce((sum, a) => sum + (a.days || 0), 0);

      const now = new Date();
      const upcomingVacations = absences.filter(a => {
        const start = new Date(a.startDate);
        return a.type === 'VACATION' && a.status === 'APPROVED' && start > now;
      }).length;

      // Arbeitszeiten aus timeEntries oder Dienstplan
      const totalWorkingHours = activeEmployees.reduce((sum, e) => {
        return sum + (e.workingHours?.weekly || 40) * 4; // Monatsschätzung
      }, 0);

      return {
        totalEmployees: employees.length,
        activeEmployees: activeEmployees.length,
        fullTimeEmployees: fullTime.length,
        partTimeEmployees: partTime.length,
        contractWorkers: contractors.length,
        totalGrossSalary: totalGross,
        totalNetSalary: totalNet,
        totalEmployerCosts,
        averageSalary: activeEmployees.length > 0 ? totalGross / activeEmployees.length : 0,
        totalWorkingHours,
        overtimeHours: 0, // Würde aus timeEntries kommen
        vacationDaysUsed,
        vacationDaysRemaining: activeEmployees.length * 30 - vacationDaysUsed, // 30 Tage Standard
        sickDays,
        upcomingVacations,
      };
    } catch {
      return {
        totalEmployees: 0,
        activeEmployees: 0,
        fullTimeEmployees: 0,
        partTimeEmployees: 0,
        contractWorkers: 0,
        totalGrossSalary: 0,
        totalNetSalary: 0,
        totalEmployerCosts: 0,
        averageSalary: 0,
        totalWorkingHours: 0,
        overtimeHours: 0,
        vacationDaysUsed: 0,
        vacationDaysRemaining: 0,
        sickDays: 0,
        upcomingVacations: 0,
      };
    }
  }

  // ============================================================================
  // TIME TRACKING KPIs
  // ============================================================================

  static async getTimeTrackingKPIs(
    companyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TimeTrackingKPIs> {
    try {
      const report = await TimeTrackingService.generateTimeReport(companyId, startDate, endDate);

      // Daten kommen aus report.summary
      const { summary, byProject, byCustomer } = report;

      // Projekte und Tasks werden aus dem Report extrahiert
      const activeProjects = byProject?.filter(p => p.totalHours > 0).length || 0;
      const completedProjects = 0; // Wird aus anderem Kontext ermittelt

      return {
        totalHours: summary.totalHours,
        billableHours: summary.billableHours,
        nonBillableHours: summary.totalHours - summary.billableHours,
        billablePercentage: summary.totalHours > 0 
          ? (summary.billableHours / summary.totalHours) * 100 
          : 0,
        totalBillableAmount: summary.totalAmount,
        averageHourlyRate: summary.averageHourlyRate,
        activeProjects,
        completedProjects,
        openTasks: 0,
        overdueTasks: 0,
        byProject: byProject?.slice(0, 5).map(p => ({
          name: p.projectName,
          hours: p.totalHours,
          amount: p.totalAmount,
        })) || [],
        // byCustomer statt byEmployee, da TimeTrackingReport keine Mitarbeiter-Gruppierung hat
        byEmployee: byCustomer?.slice(0, 5).map(c => ({
          name: c.customerName || 'Unbekannt',
          hours: c.totalHours,
          billable: c.billableHours,
        })) || [],
      };
    } catch {
      return {
        totalHours: 0,
        billableHours: 0,
        nonBillableHours: 0,
        billablePercentage: 0,
        totalBillableAmount: 0,
        averageHourlyRate: 0,
        activeProjects: 0,
        completedProjects: 0,
        openTasks: 0,
        overdueTasks: 0,
        byProject: [],
        byEmployee: [],
      };
    }
  }

  // ============================================================================
  // ORDERS KPIs
  // ============================================================================

  static async getOrdersKPIs(
    companyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<OrdersKPIs> {
    try {
      // Lade Aufträge aus der auftraege Collection
      const ordersQuery = query(
        collection(db, 'auftraege'),
        where('selectedAnbieterId', '==', companyId)
      );
      const ordersSnapshot = await getDocs(ordersQuery);
      
      const orders: Array<{
        status: string;
        totalAmount?: number;
        price?: number;
        createdAt?: Date;
      }> = [];

      ordersSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        // Firestore Timestamp korrekt konvertieren
        let createdAt: Date;
        if (data.createdAt?.toDate) {
          createdAt = data.createdAt.toDate();
        } else if (data.createdAt?._seconds) {
          createdAt = new Date(data.createdAt._seconds * 1000);
        } else {
          createdAt = new Date();
        }
        
        if (createdAt >= startDate && createdAt <= endDate) {
          orders.push({
            status: (data.status || '').toLowerCase(), // Normalisiere auf Kleinbuchstaben
            totalAmount: data.totalAmount || data.price || 0,
            price: data.price || 0,
            createdAt,
          });
        }
      });

      // Status-Prüfungen mit Kleinbuchstaben
      const activeOrders = orders.filter(o => 
        o.status === 'aktiv' || o.status === 'in bearbeitung' || o.status === 'active' || o.status === 'in_progress'
      );
      const inProgressOrders = orders.filter(o => 
        o.status === 'in bearbeitung' || o.status === 'in_progress' || o.status === 'in progress'
      );
      const completedOrders = orders.filter(o => 
        o.status === 'abgeschlossen' || o.status === 'completed' || o.status === 'bezahlt' || o.status === 'paid'
      );
      const cancelledOrders = orders.filter(o => 
        o.status === 'storniert' || o.status === 'cancelled' || o.status === 'canceled'
      );

      // Berechne Umsatz aus allen abgeschlossenen Aufträgen
      const totalValue = completedOrders.reduce(
        (sum, o) => sum + (o.totalAmount || o.price || 0), 
        0
      );

      const pendingOrders = orders.filter(o => 
        o.status === 'zahlung_erhalten_clearing' || o.status === 'fehlende details' || o.status === 'pending'
      );
      const pendingAmount = pendingOrders.reduce(
        (sum, o) => sum + (o.totalAmount || o.price || 0), 
        0
      );

      const completionRate = orders.length > 0 
        ? (completedOrders.length / orders.length) * 100 
        : 0;

      return {
        totalOrders: orders.length,
        activeOrders: activeOrders.length,
        inProgressOrders: inProgressOrders.length,
        completedOrders: completedOrders.length,
        cancelledOrders: cancelledOrders.length,
        totalOrderValue: totalValue,
        averageOrderValue: completedOrders.length > 0 ? totalValue / completedOrders.length : 0,
        pendingPayments: pendingOrders.length,
        pendingPaymentAmount: pendingAmount,
        completionRate,
      };
    } catch {
      return {
        totalOrders: 0,
        activeOrders: 0,
        inProgressOrders: 0,
        completedOrders: 0,
        cancelledOrders: 0,
        totalOrderValue: 0,
        averageOrderValue: 0,
        pendingPayments: 0,
        pendingPaymentAmount: 0,
        completionRate: 0,
      };
    }
  }

  // ============================================================================
  // MONTHLY DATA
  // ============================================================================

  static async getMonthlyData(
    companyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<MonthlyData[]> {
    const [invoices, expenses, payrolls] = await Promise.all([
      this.getInvoicesFromSubcollection(companyId),
      this.getExpensesFromSubcollection(companyId),
      this.getPayrollsFromSubcollection(companyId, startDate, endDate),
    ]);

    const monthlyMap = new Map<string, MonthlyData>();
    const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

    // Initialisiere alle Monate im Zeitraum
    const current = new Date(startDate);
    while (current <= endDate) {
      const key = `${current.getFullYear()}-${current.getMonth()}`;
      monthlyMap.set(key, {
        month: months[current.getMonth()],
        year: current.getFullYear(),
        monthIndex: current.getMonth(),
        revenue: 0,
        expenses: 0,
        profit: 0,
        salaries: 0,
        employerCosts: 0,
        workedHours: 0,
        billableHours: 0,
        inventoryValue: 0,
        stockMovements: 0,
      });
      current.setMonth(current.getMonth() + 1);
    }

    // Rechnungen aggregieren
    invoices.forEach(inv => {
      const date = inv.issueDate instanceof Date ? inv.issueDate : new Date(inv.issueDate);
      // GoBD-Konformität: Festgeschriebene ODER bezahlte Rechnungen
      const isRelevant = inv.status === 'paid' || inv.isLocked === true || inv.gobdStatus === 'locked';
      if (date >= startDate && date <= endDate && isRelevant) {
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        const data = monthlyMap.get(key);
        if (data) {
          data.revenue += inv.total || 0;
        }
      }
    });

    // Ausgaben aggregieren
    expenses.forEach(exp => {
      const date = exp.date instanceof Date ? exp.date : new Date(exp.date);
      if (date >= startDate && date <= endDate) {
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        const data = monthlyMap.get(key);
        if (data) {
          data.expenses += exp.amount || 0;
        }
      }
    });

    // Gehälter aggregieren
    payrolls.forEach(payroll => {
      const key = `${payroll.period.year}-${payroll.period.month - 1}`;
      const data = monthlyMap.get(key);
      if (data) {
        data.salaries += payroll.grossSalary || 0;
        data.employerCosts += payroll.employerCosts?.socialSecurity || 0;
      }
    });

    // Profit berechnen
    monthlyMap.forEach(data => {
      data.profit = data.revenue - data.expenses - data.salaries;
    });

    return Array.from(monthlyMap.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.monthIndex - b.monthIndex;
    });
  }

  // ============================================================================
  // BWA GENERATION
  // ============================================================================

  static async generateBWA(
    companyId: string,
    month: number,
    year: number
  ): Promise<BWAData> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const [invoices, expenses, payrolls] = await Promise.all([
      this.getInvoicesFromSubcollection(companyId),
      this.getExpensesFromSubcollection(companyId),
      this.getPayrollsFromSubcollection(companyId, startDate, endDate),
    ]);

    // Filtere nach Monat - GoBD-Konformität: Festgeschriebene ODER bezahlte Rechnungen
    const monthInvoices = invoices.filter(inv => {
      const date = inv.issueDate instanceof Date ? inv.issueDate : new Date(inv.issueDate);
      const isRelevant = inv.status === 'paid' || inv.isLocked === true || inv.gobdStatus === 'locked';
      return date >= startDate && date <= endDate && isRelevant;
    });

    const monthExpenses = expenses.filter(exp => {
      const date = exp.date instanceof Date ? exp.date : new Date(exp.date);
      return date >= startDate && date <= endDate;
    });

    // Umsatz
    const netRevenue = monthInvoices.reduce((sum, inv) => sum + (inv.netAmount || inv.total / 1.19 || 0), 0);

    // Kategorisierte Ausgaben
    const categorizedExpenses = this.categorizeExpenses(monthExpenses);

    // Personalkosten
    const totalSalaries = payrolls.reduce((sum, p) => sum + (p.grossSalary || 0), 0);
    const totalSocialSecurity = payrolls.reduce((sum, p) => sum + (p.employerCosts?.socialSecurity || 0), 0);

    const totalPersonnelCosts = totalSalaries + totalSocialSecurity;
    const grossProfit = netRevenue - categorizedExpenses.material;
    const operatingResult = grossProfit - totalPersonnelCosts - 
      categorizedExpenses.room - categorizedExpenses.vehicle - 
      categorizedExpenses.other - categorizedExpenses.depreciation;

    return {
      period: { month, year },
      netRevenue,
      otherIncome: 0,
      totalIncome: netRevenue,
      materialCosts: categorizedExpenses.material,
      freightCosts: 0,
      totalMaterialCosts: categorizedExpenses.material,
      grossProfit,
      grossProfitMargin: netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0,
      wages: 0,
      salaries: totalSalaries,
      socialSecurity: totalSocialSecurity,
      otherPersonnelCosts: 0,
      totalPersonnelCosts,
      rent: categorizedExpenses.rent,
      utilities: categorizedExpenses.utilities,
      totalRoomCosts: categorizedExpenses.room,
      vehicleCosts: categorizedExpenses.vehicle,
      travelCosts: categorizedExpenses.travel,
      totalVehicleCosts: categorizedExpenses.vehicle + categorizedExpenses.travel,
      insurance: categorizedExpenses.insurance,
      repairs: categorizedExpenses.repairs,
      advertising: categorizedExpenses.advertising,
      officeCosts: categorizedExpenses.office,
      telecommunications: categorizedExpenses.telecom,
      bookkeeping: categorizedExpenses.bookkeeping,
      legal: categorizedExpenses.legal,
      otherCosts: categorizedExpenses.other,
      totalOtherCosts: categorizedExpenses.insurance + categorizedExpenses.repairs + 
        categorizedExpenses.advertising + categorizedExpenses.office + 
        categorizedExpenses.telecom + categorizedExpenses.bookkeeping + 
        categorizedExpenses.legal + categorizedExpenses.other,
      depreciation: categorizedExpenses.depreciation,
      interestIncome: 0,
      interestExpense: 0,
      operatingResult,
      extraordinaryItems: 0,
      preProfit: operatingResult,
      taxes: 0, // Wird separat berechnet
      netProfit: operatingResult,
    };
  }

  // ============================================================================
  // EÜR GENERATION
  // ============================================================================

  static async generateEUR(companyId: string, year: number): Promise<EURData> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    const [invoices, expenses, payrolls] = await Promise.all([
      this.getInvoicesFromSubcollection(companyId),
      this.getExpensesFromSubcollection(companyId),
      this.getPayrollsFromSubcollection(companyId, startDate, endDate),
    ]);

    // Jahres-Rechnungen - GoBD-Konformität: Festgeschriebene ODER bezahlte Rechnungen
    const yearInvoices = invoices.filter(inv => {
      const date = inv.issueDate instanceof Date ? inv.issueDate : new Date(inv.issueDate);
      const isRelevant = inv.status === 'paid' || inv.isLocked === true || inv.gobdStatus === 'locked';
      return date >= startDate && date <= endDate && isRelevant;
    });

    const yearExpenses = expenses.filter(exp => {
      const date = exp.date instanceof Date ? exp.date : new Date(exp.date);
      return date >= startDate && date <= endDate;
    });

    const salesRevenue = yearInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const categorizedExpenses = this.categorizeExpenses(yearExpenses);
    const personnelCosts = payrolls.reduce((sum, p) => sum + (p.grossSalary || 0) + (p.employerCosts?.socialSecurity || 0), 0);

    const totalExpenses = 
      categorizedExpenses.material + 
      personnelCosts +
      categorizedExpenses.room +
      categorizedExpenses.insurance +
      categorizedExpenses.vehicle +
      categorizedExpenses.travel +
      categorizedExpenses.advertising +
      categorizedExpenses.office +
      categorizedExpenses.other +
      categorizedExpenses.depreciation;

    return {
      period: { year },
      salesRevenue,
      otherIncome: 0,
      privateUsage: 0,
      totalIncome: salesRevenue,
      materialPurchases: categorizedExpenses.material,
      personnelCosts,
      roomCosts: categorizedExpenses.room,
      insuranceCosts: categorizedExpenses.insurance,
      vehicleCosts: categorizedExpenses.vehicle,
      travelCosts: categorizedExpenses.travel,
      advertisingCosts: categorizedExpenses.advertising,
      officeCosts: categorizedExpenses.office,
      otherOperatingCosts: categorizedExpenses.other,
      depreciation: categorizedExpenses.depreciation,
      totalExpenses,
      profit: salesRevenue - totalExpenses,
    };
  }

  // ============================================================================
  // UStVA GENERATION
  // ============================================================================

  static async generateUStVA(
    companyId: string,
    month: number,
    year: number
  ): Promise<UStVAData> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const [invoices, expenses] = await Promise.all([
      this.getInvoicesFromSubcollection(companyId),
      this.getExpensesFromSubcollection(companyId),
    ]);

    // Monats-Rechnungen
    const monthInvoices = invoices.filter(inv => {
      const date = inv.issueDate instanceof Date ? inv.issueDate : new Date(inv.issueDate);
      return date >= startDate && date <= endDate;
    });

    const monthExpenses = expenses.filter(exp => {
      const date = exp.date instanceof Date ? exp.date : new Date(exp.date);
      return date >= startDate && date <= endDate && exp.taxDeductible;
    });

    // Berechne Umsätze nach Steuersatz
    const revenue19 = monthInvoices
      .filter(inv => !inv.vatRate || inv.vatRate === 19)
      .reduce((sum, inv) => sum + (inv.netAmount || inv.total / 1.19 || 0), 0);

    const revenue7 = monthInvoices
      .filter(inv => inv.vatRate === 7)
      .reduce((sum, inv) => sum + (inv.netAmount || inv.total / 1.07 || 0), 0);

    const taxFreeRevenue = monthInvoices
      .filter(inv => inv.vatRate === 0 || inv.taxFree)
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    // USt auf Umsätze
    const outputVat19 = revenue19 * 0.19;
    const outputVat7 = revenue7 * 0.07;
    const totalOutputVat = outputVat19 + outputVat7;

    // Vorsteuer
    const inputVat = monthExpenses.reduce((sum, exp) => {
      const vatRate = exp.vatRate || 0.19;
      return sum + (exp.amount * vatRate / (1 + vatRate));
    }, 0);

    return {
      period: { month, year },
      taxableRevenue19: revenue19,
      taxableRevenue7: revenue7,
      taxFreeRevenue,
      euDeliveries: 0,
      outputVat19,
      outputVat7,
      totalOutputVat,
      inputVat,
      importVat: 0,
      totalInputVat: inputVat,
      vatPayable: totalOutputVat - inputVat,
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private static async getInvoicesFromSubcollection(companyId: string): Promise<any[]> {
    try {
      const invoicesRef = collection(db, 'companies', companyId, 'invoices');
      const snapshot = await getDocs(invoicesRef);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          issueDate: this.toDate(data.issueDate || data.createdAt),
          createdAt: this.toDate(data.createdAt),
        };
      });
    } catch {
      return [];
    }
  }

  private static async getExpensesFromSubcollection(companyId: string): Promise<any[]> {
    try {
      const expensesRef = collection(db, 'companies', companyId, 'expenses');
      const snapshot = await getDocs(expensesRef);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: this.toDate(data.date || data.createdAt),
          createdAt: this.toDate(data.createdAt),
        };
      });
    } catch {
      return [];
    }
  }

  private static async getQuotesFromSubcollection(companyId: string): Promise<any[]> {
    try {
      const quotesRef = collection(db, 'companies', companyId, 'quotes');
      const snapshot = await getDocs(quotesRef);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch {
      return [];
    }
  }

  private static async getPayrollsFromSubcollection(
    companyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    try {
      const payrollsRef = collection(db, 'companies', companyId, 'payrolls');
      const snapshot = await getDocs(payrollsRef);
      
      return snapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            grossSalary: data.grossSalary || 0,
            netSalary: data.netSalary || 0,
            employerCosts: data.employerCosts || { socialSecurity: 0 },
            period: data.period || { year: 0, month: 0 },
          };
        })
        .filter(payroll => {
          const year = payroll.period?.year;
          const month = payroll.period?.month;
          if (!year || !month) return false;
          const payrollDate = new Date(year, month - 1, 15);
          return payrollDate >= startDate && payrollDate <= endDate;
        });
    } catch {
      return [];
    }
  }

  private static async getAbsencesFromSubcollection(companyId: string): Promise<any[]> {
    try {
      const absencesRef = collection(db, 'companies', companyId, 'absenceRequests');
      const snapshot = await getDocs(absencesRef);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch {
      return [];
    }
  }

  private static toDate(value: unknown): Date {
    if (!value) return new Date();
    if (value instanceof Timestamp) return value.toDate();
    if (value instanceof Date) return value;
    if (typeof value === 'object' && 'toDate' in value) {
      return (value as { toDate: () => Date }).toDate();
    }
    if (typeof value === 'object' && '_seconds' in value) {
      return new Date((value as { _seconds: number })._seconds * 1000);
    }
    if (typeof value === 'string' || typeof value === 'number') {
      return new Date(value);
    }
    return new Date();
  }

  private static categorizeExpenses(expenses: any[]): Record<string, number> {
    const categories: Record<string, number> = {
      material: 0,
      rent: 0,
      utilities: 0,
      room: 0,
      vehicle: 0,
      travel: 0,
      insurance: 0,
      repairs: 0,
      advertising: 0,
      office: 0,
      telecom: 0,
      bookkeeping: 0,
      legal: 0,
      depreciation: 0,
      other: 0,
    };

    const categoryMapping: Record<string, string> = {
      'Material': 'material',
      'Wareneinkauf': 'material',
      'Rohstoffe': 'material',
      'Miete': 'rent',
      'Pacht': 'rent',
      'Strom': 'utilities',
      'Gas': 'utilities',
      'Wasser': 'utilities',
      'Nebenkosten': 'utilities',
      'Fahrzeug': 'vehicle',
      'Auto': 'vehicle',
      'Benzin': 'vehicle',
      'Kfz': 'vehicle',
      'Reise': 'travel',
      'Reisekosten': 'travel',
      'Versicherung': 'insurance',
      'Reparatur': 'repairs',
      'Instandhaltung': 'repairs',
      'Werbung': 'advertising',
      'Marketing': 'advertising',
      'Büro': 'office',
      'Büromaterial': 'office',
      'Telefon': 'telecom',
      'Internet': 'telecom',
      'Buchhaltung': 'bookkeeping',
      'Steuerberater': 'bookkeeping',
      'Rechtsanwalt': 'legal',
      'Rechtsberatung': 'legal',
      'AfA': 'depreciation',
      'Abschreibung': 'depreciation',
    };

    expenses.forEach(exp => {
      const cat = exp.category || 'Sonstiges';
      const mapped = categoryMapping[cat] || 'other';
      categories[mapped] += exp.amount || 0;
    });

    // Room = Rent + Utilities
    categories.room = categories.rent + categories.utilities;

    return categories;
  }
}
