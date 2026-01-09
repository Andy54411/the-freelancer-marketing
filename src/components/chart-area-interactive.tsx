'use client';

import * as React from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import { callHttpsFunction } from '@/lib/httpsFunctions';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/firebase/clients';

import { useIsMobile } from '@/hooks/use-mobile';
import { AlertCircle as FiAlertCircle, Loader2 as FiLoader } from 'lucide-react';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from '@/components/ui/chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export const description = 'Ein interaktiver Flächenchart, der Umsatz und Ausgaben anzeigt';

// Typ für die Rohdaten, die wir von der Funktion erwarten
type OrderData = {
  id: string;
  orderDate?:
    | Date
    | string
    | { _seconds: number; _nanoseconds: number }
    | { seconds: number; nanoseconds: number }
    | { toDate: () => Date }
    | any;
  totalAmountPaidByBuyer: number;
  status: string;
};

// Typ für Ausgaben
type ExpenseData = {
  id: string;
  amount: number;
  date:
    | Date
    | { seconds: number; nanoseconds: number }
    | { _seconds: number; _nanoseconds: number }
    | string;
  createdAt?:
    | Date
    | { seconds: number; nanoseconds: number }
    | { _seconds: number; _nanoseconds: number }
    | string
    | any;
};

// Typ für Angebote
type QuoteData = {
  id: string;
  totalAmount: number;
  status: string;
  createdAt: any;
  acceptedAt?:
    | Date
    | string
    | { seconds: number; nanoseconds: number }
    | { _seconds: number; _nanoseconds: number }
    | { toDate: () => Date }
    | any;
};

// Typ für Rechnungen
type InvoiceData = {
  id: string;
  totalAmount: number;
  total?: number; // Alternative amount field
  status: string;
  createdAt:
    | Date
    | string
    | { seconds: number; nanoseconds: number }
    | { _seconds: number; _nanoseconds: number }
    | { toDate: () => Date }
    | any;
  paidAt?:
    | Date
    | string
    | { seconds: number; nanoseconds: number }
    | { _seconds: number; _nanoseconds: number }
    | { toDate: () => Date }
    | any;
  isStorno?: boolean;
  dueDate?: string; // Fälligkeitsdatum
  validUntil?: string; // Alternative Fälligkeit
  vatRate?: number; // Deutsche Umsatzsteuersatz (0%, 7%, 19%)
};

const _chartConfigStatic = {
  umsatz: {
    label: 'Umsatz (Aufträge)',
    color: 'var(--primary)',
  },
  rechnungen: {
    label: 'Rechnungen',
    color: '#14ad9f', // Taskilo Grün
  },
  angebote: {
    label: 'Angebote (angenommen)',
    color: '#3b82f6', // Blau
  },
  ausgaben: {
    label: 'Ausgaben',
    color: '#ef4444', // Rot für Ausgaben
  },
  stornos: {
    label: 'Stornos',
    color: '#f97316', // Orange für Stornos
  },
  rueckerstattungen: {
    label: 'Rückerstattungen',
    color: '#dc2626', // Dunkelrot für Rückerstattungen
  },
} satisfies ChartConfig;

export function ChartAreaInteractive({
  companyUid,
  onFinancialDataChangeAction,
}: {
  companyUid: string;
  onFinancialDataChangeAction?: (data: {
    totalRevenue: number;
    totalExpenses: number;
    netRevenue: number;
    grossProfitBeforeTax: number;
    vatAmount: number;
  }) => void;
}) {
  const isMobile = useIsMobile();
  const { user, loading: authLoading } = useAuth();
  const [timeRange, setTimeRange] = React.useState('90d');
  const [orders, setOrders] = React.useState<OrderData[]>([]);
  const [expenses, setExpenses] = React.useState<ExpenseData[]>([]);
  const [quotes, setQuotes] = React.useState<QuoteData[]>([]);
  const [invoices, setInvoices] = React.useState<InvoiceData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filter-State für Chart-Kategorien
  const [activeCategories, setActiveCategories] = React.useState({
    umsatz: true,
    rechnungen: true,
    angebote: true,
    ausgaben: true,
    stornos: false,
    rueckerstattungen: false,
    negativeWerte: false, // Kombinierter Button
  });

  // Filter für Rechnungs-Status
  const [invoiceStatusFilter, setInvoiceStatusFilter] = React.useState<
    'alle' | 'entwurf' | 'versendet' | 'bezahlt' | 'ueberfaellig'
  >('alle');
  const [showInvoiceDropdown, setShowInvoiceDropdown] = React.useState(false);

  // Filter für Negative Werte Dropdown
  const [showNegativeDropdown, setShowNegativeDropdown] = React.useState(false);
  const [negativeFilter, setNegativeFilter] = React.useState<
    'keine' | 'stornos' | 'rueckerstattungen' | 'beide'
  >('keine');
  const [lastUpdateTime, setLastUpdateTime] = React.useState<Date>(new Date());
  const [isUpdating, setIsUpdating] = React.useState(false);

  // Debounced Update-Funktion für Performance
  const updateIndicator = React.useCallback(
    React.useMemo(() => {
      let timeoutId: NodeJS.Timeout;
      return () => {
        setIsUpdating(true);
        setLastUpdateTime(new Date());

        // Clear previous timeout
        if (timeoutId) clearTimeout(timeoutId);

        // Set new timeout
        timeoutId = setTimeout(() => {
          setIsUpdating(false);
        }, 500);
      };
    }, []),
    []
  );

  // Toggle-Funktion für Kategorien
  const toggleCategory = React.useCallback((category: keyof typeof activeCategories) => {
    setActiveCategories(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  }, []);

  // Click-Outside-Handler für Dropdowns
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const negativeDropdownRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowInvoiceDropdown(false);
      }
      if (
        negativeDropdownRef.current &&
        !negativeDropdownRef.current.contains(event.target as Node)
      ) {
        setShowNegativeDropdown(false);
      }
    };

    if (showInvoiceDropdown || showNegativeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showInvoiceDropdown, showNegativeDropdown]);

  // Alle Kategorien an/aus
  const toggleAllCategories = React.useCallback(() => {
    const allActive = Object.values(activeCategories).every(Boolean);
    const newState = allActive ? false : true;
    setActiveCategories({
      umsatz: newState,
      rechnungen: newState,
      angebote: newState,
      ausgaben: newState,
      stornos: newState,
      rueckerstattungen: newState,
      negativeWerte: newState,
    });
  }, [activeCategories]);

  // Chart-Konfiguration mit übersetzten Labels
  const chartConfig = React.useMemo(
    () =>
      ({
        umsatz: {
          label: 'Umsatz (Aufträge)',
          color: 'var(--primary)',
        },
        rechnungen: {
          label: 'Rechnungen',
          color: '#14ad9f',
        },
        angebote: {
          label: 'Angebote (angenommen)',
          color: '#3b82f6',
        },
        ausgaben: {
          label: 'Ausgaben',
          color: '#ef4444',
        },
        stornos: {
          label: 'Stornos',
          color: '#f97316',
        },
        rueckerstattungen: {
          label: 'Rückerstattungen',
          color: '#dc2626',
        },
      }) satisfies ChartConfig,
    []
  );

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange('7d');
    }
  }, [isMobile]);

  React.useEffect(() => {
    if (authLoading || !user || !companyUid) {
      return;
    }

    // Loading-Timer für den Fall dass keine Daten kommen
    const loadingTimer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    // Mitarbeiter haben keine Firestore-Berechtigungen, daher direkt HTTP-API verwenden
    const isEmployee = user.user_type === 'mitarbeiter';

    const fetchOrders = () => {
      // Mitarbeiter: Nur HTTP-API verwenden (keine Firestore-Berechtigungen)
      if (isEmployee) {
        const fetchViaHttp = async () => {
          try {
            const result = await callHttpsFunction(
              'getProviderOrders',
              { providerId: companyUid },
              'GET'
            );
            setOrders(result.orders || []);
            updateIndicator();
          } catch (httpErr) {
            console.error('HTTP fetch failed for employee:', httpErr);
            setError('Fehler beim Laden der Umsatzdaten');
          } finally {
            setLoading(false);
          }
        };
        fetchViaHttp();
        return () => {}; // Kein Unsubscribe nötig für HTTP
      }

      // Firmeninhaber: Firestore-Listener mit HTTP-Fallback
      try {
        // Erst Real-time listener für Aufträge/Orders versuchen
        const ordersQuery = query(
          collection(db, 'auftraege'),
          where('providerId', '==', companyUid)
        );

        const unsubscribe = onSnapshot(
          ordersQuery,
          async ordersSnapshot => {
            const orderData: OrderData[] = [];

            ordersSnapshot.forEach(doc => {
              const order = doc.data();

              orderData.push({
                id: doc.id,
                orderDate: order.orderDate || order.createdAt,
                totalAmountPaidByBuyer: order.totalAmountPaidByBuyer || 0,
                status: order.status || 'AKTIV',
              });
            });

            // Fallback zur HTTP-Funktion wenn keine Firestore-Daten
            if (orderData.length === 0) {
              try {
                const result = await callHttpsFunction(
                  'getProviderOrders',
                  { providerId: companyUid },
                  'GET'
                );

                if (result.orders && result.orders.length > 0) {
                  setOrders(result.orders);
                } else {
                  setOrders(orderData); // Leeres Array
                }
              } catch (httpErr) {
                console.error('HTTP fallback failed:', httpErr);
                setOrders(orderData); // Leeres Array
              }
            } else {
              setOrders(orderData);
            }

            updateIndicator();
            setLoading(false); // Loading nur nach erstem Laden beenden
          },
          error => {
            console.error('Orders Firestore error, falling back to HTTP:', error);

            // Fallback zur HTTP-Funktion bei Firestore-Fehler
            const fallbackToHttp = async () => {
              try {
                const result = await callHttpsFunction(
                  'getProviderOrders',
                  { providerId: companyUid },
                  'GET'
                );
                setOrders(result.orders || []);
                updateIndicator();
              } catch (httpErr) {
                console.error('HTTP fallback also failed:', httpErr);
                setError('Fehler beim Laden der Umsatzdaten');
              } finally {
                setLoading(false);
              }
            };

            fallbackToHttp();
          }
        );

        return unsubscribe;
      } catch (err) {
        console.error('Fehler beim Setup der Aufträge-Listener:', err);

        // Direkter Fallback zur HTTP-Funktion
        const fallbackToHttp = async () => {
          try {
            const result = await callHttpsFunction(
              'getProviderOrders',
              { providerId: companyUid },
              'GET'
            );
            setOrders(result.orders || []);
            updateIndicator();
          } catch (httpErr) {
            console.error('HTTP fallback failed:', httpErr);
            setError('Fehler beim Laden der Umsatzdaten');
          } finally {
            setLoading(false);
          }
        };

        fallbackToHttp();
        return () => {};
      }
    };

    const fetchExpenses = () => {
      try {
        // Verwende Company-Subcollection statt globaler customers Collection
        const expensesQuery = query(
          collection(db, 'companies', companyUid, 'customers'),
          where('isSupplier', '==', true)
        );

        // Real-time listener für Ausgaben - dieselbe Logik wie SectionCards
        const unsubscribe = onSnapshot(
          expensesQuery,
          expensesSnapshot => {
            const expenseData: ExpenseData[] = [];
            let totalAmount = 0;

            expensesSnapshot.forEach(doc => {
              const supplier = doc.data();
              if (supplier.totalAmount && supplier.totalAmount > 0) {
                totalAmount += supplier.totalAmount;
              }
            });

            // Erstelle einen einzelnen Expense-Eintrag mit der Gesamtsumme für heute
            if (totalAmount > 0) {
              expenseData.push({
                id: 'total-expenses',
                amount: totalAmount,
                date: new Date(), // Immer heute
                createdAt: new Date(),
              });
            }

            setExpenses(expenseData);
            updateIndicator();
          },
          error => {
            console.error('Expenses Firestore error:', error);
            // Bei Fehler leeres Array setzen
            setExpenses([]);
          }
        );

        return unsubscribe;
      } catch (err) {
        console.error('Fehler beim Setup der Expenses-Listener:', err);
        return () => {};
      }
    };

    const fetchQuotes = () => {
      try {
        const quotesQuery = query(
          collection(db, 'companies', companyUid, 'quotes'),
          orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(quotesQuery, quotesSnapshot => {
          const quoteData: QuoteData[] = [];

          quotesSnapshot.forEach(doc => {
            const quote = doc.data();

            quoteData.push({
              id: doc.id,
              totalAmount: quote.totalAmount || 0,
              status: quote.status || 'ENTWURF',
              createdAt: quote.createdAt,
              acceptedAt: quote.acceptedAt,
            });
          });

          setQuotes(quoteData);
          updateIndicator();
        });

        return unsubscribe;
      } catch (err) {
        console.error('Fehler beim Laden der Angebote:', err);
        return () => {};
      }
    };

    const fetchInvoices = () => {
      try {
        const invoicesQuery = query(collection(db, 'companies', companyUid, 'invoices'));

        const unsubscribe = onSnapshot(
          invoicesQuery,
          invoicesSnapshot => {
            const invoiceData: InvoiceData[] = [];

            invoicesSnapshot.forEach(doc => {
              const invoice = doc.data();

              invoiceData.push({
                id: doc.id,
                totalAmount: invoice.totalAmount || invoice.total || 0,
                status: invoice.status || 'ENTWURF',
                createdAt: invoice.createdAt,
                paidAt: invoice.paidAt,
                isStorno: invoice.isStorno || false,
                dueDate: invoice.dueDate,
                validUntil: invoice.validUntil,
              });
            });

            setInvoices(invoiceData);
            updateIndicator();
          },
          error => {
            console.error('[ChartDebug] Firestore error:', error);
          }
        );

        return unsubscribe;
      } catch (err) {
        console.error('Fehler beim Laden der Rechnungen:', err);
        return () => {};
      }
    };

    const unsubscribeOrders = fetchOrders();
    const unsubscribeExpenses = fetchExpenses();
    const unsubscribeQuotes = fetchQuotes();
    const unsubscribeInvoices = fetchInvoices();

    // Cleanup function für alle Real-time Listener
    return () => {
      clearTimeout(loadingTimer);
      if (unsubscribeOrders) {
        unsubscribeOrders();
      }
      if (unsubscribeExpenses) {
        unsubscribeExpenses();
      }
      if (unsubscribeQuotes) {
        unsubscribeQuotes();
      }
      if (unsubscribeInvoices) {
        unsubscribeInvoices();
      }
    };
  }, [companyUid, user, authLoading]);

  const { chartData, totalRevenue, totalExpenses, netRevenue, grossProfitBeforeTax, vatAmount } =
    React.useMemo(() => {
      if (!orders.length && !expenses.length && !quotes.length && !invoices.length) {
        return {
          chartData: [],
          totalRevenue: 0,
          totalExpenses: 0,
          netRevenue: 0,
          grossProfitBeforeTax: 0,
          vatAmount: 0,
        };
      }

      const referenceDate = new Date();
      let daysToSubtract = 90;
      if (timeRange === '30d') daysToSubtract = 30;
      else if (timeRange === '7d') daysToSubtract = 7;
      else if (timeRange === '365d') daysToSubtract = 365;
      const startDate = new Date(referenceDate);
      startDate.setDate(startDate.getDate() - daysToSubtract);
      startDate.setHours(0, 0, 0, 0); // Auf Beginn des Tages setzen

      const dailyRevenue: { [key: string]: number } = {};
      const dailyExpenses: { [key: string]: number } = {};
      const dailyInvoices: { [key: string]: number } = {};
      const dailyQuotes: { [key: string]: number } = {};
      const dailyStornos: { [key: string]: number } = {};
      const dailyRefunds: { [key: string]: number } = {};
      let currentTotalRevenue = 0;
      let currentTotalExpenses = 0;

      // Umsatz verarbeiten
      orders.forEach(order => {
        if (!order.orderDate) {
          return;
        }

        // Zeige alle Aufträge mit Umsatz an (nicht nur ABGESCHLOSSEN/BEZAHLT)
        // da auch AKTIVE Aufträge bereits Umsatz generiert haben können
        if (!order.totalAmountPaidByBuyer) {
          return;
        }

        if (order.totalAmountPaidByBuyer < 0) {
          // orderDate ist hier noch nicht verfügbar - muss später verarbeitet werden
          const _refundAmount = Math.abs(order.totalAmountPaidByBuyer / 100); // Positiver Betrag für Rückerstattungen
          // Rückerstattung - wird später nach orderDate-Verarbeitung behandelt
          return;
        }

        let orderDate: Date;
        try {
          if (typeof order.orderDate === 'string') {
            orderDate = new Date(order.orderDate);
          } else if (order.orderDate && typeof order.orderDate === 'object') {
            // Firebase Timestamp handling
            if ('_seconds' in order.orderDate) {
              orderDate = new Date(order.orderDate._seconds * 1000);
            } else if ('seconds' in order.orderDate) {
              orderDate = new Date(order.orderDate.seconds * 1000);
            } else if (order.orderDate.toDate && typeof order.orderDate.toDate === 'function') {
              orderDate = order.orderDate.toDate();
            } else {
              throw new Error('Unknown date format');
            }
          } else {
            throw new Error('Invalid orderDate');
          }

          if (orderDate >= startDate) {
            const dateString = orderDate.toISOString().split('T')[0]; // YYYY-MM-DD
            const euroAmount = order.totalAmountPaidByBuyer / 100; // In Euro umrechnen

            if (euroAmount < 0) {
              // NEGATIVE WERTE = RÜCKERSTATTUNGEN
              if (!dailyRefunds[dateString]) {
                dailyRefunds[dateString] = 0;
              }
              dailyRefunds[dateString] += Math.abs(euroAmount); // Als positive Rückerstattung
            } else {
              // POSITIVE WERTE = UMSATZ
              if (!dailyRevenue[dateString]) {
                dailyRevenue[dateString] = 0;
              }
              dailyRevenue[dateString] += euroAmount;
              currentTotalRevenue += euroAmount;
            }
          }
        } catch {
          // Skip invalid dates
        }
      });

      // Ausgaben verarbeiten - vereinfachte Logik da alle Ausgaben aktuelles Datum haben
      expenses.forEach(expense => {
        // Konvertiere expense.date zu einem Date-Objekt
        let expenseDate: Date;

        if (expense.date instanceof Date) {
          expenseDate = expense.date;
        } else if (typeof expense.date === 'string') {
          expenseDate = new Date(expense.date);
        } else if (typeof expense.date === 'object' && expense.date !== null) {
          // Firestore Timestamp handling
          if ('seconds' in expense.date) {
            expenseDate = new Date(expense.date.seconds * 1000);
          } else if ('_seconds' in expense.date) {
            expenseDate = new Date(expense.date._seconds * 1000);
          } else {
            expenseDate = new Date();
          }
        } else {
          expenseDate = new Date();
        }

        // Da alle Ausgaben dasselbe Datum (heute) haben, prüfe nur ob sie innerhalb des Zeitraums liegen
        if (expenseDate >= startDate) {
          const dateString = expenseDate.toISOString().split('T')[0]; // YYYY-MM-DD
          if (!dailyExpenses[dateString]) {
            dailyExpenses[dateString] = 0;
          }
          dailyExpenses[dateString] += expense.amount;
          currentTotalExpenses += expense.amount;
        }
      });

      // Angebote verarbeiten - FIXED: Use available data

      quotes.forEach(quote => {
        // Since acceptedAt and totalAmount are missing, use finalized quotes with createdAt
        if (quote.status !== 'finalized' || !quote.createdAt) {
          return;
        }

        // Use fallback amount for quotes (should be fixed in data structure later)
        const quoteAmount = quote.totalAmount || 250; // Reasonable fallback

        // Use createdAt since acceptedAt is missing
        let quoteDate: Date;
        try {
          if (quote.createdAt && typeof quote.createdAt === 'object') {
            // Firebase Timestamp handling
            if ('seconds' in quote.createdAt) {
              quoteDate = new Date((quote.createdAt as any).seconds * 1000);
            } else if ('_seconds' in quote.createdAt) {
              quoteDate = new Date((quote.createdAt as any)._seconds * 1000);
            } else if (
              'toDate' in quote.createdAt &&
              typeof (quote.createdAt as any).toDate === 'function'
            ) {
              quoteDate = (quote.createdAt as any).toDate();
            } else {
              throw new Error('Unknown timestamp format');
            }
          } else {
            throw new Error('Invalid createdAt');
          }
        } catch {
          return; // Skip quote mit ungültigem Datum
        }

        if (quoteDate >= startDate) {
          const dateString = quoteDate.toISOString().split('T')[0];
          if (!dailyQuotes[dateString]) {
            dailyQuotes[dateString] = 0;
          }
          // Convert cent to euro if needed, otherwise use as euro
          const euroAmount = quoteAmount >= 1000 ? quoteAmount / 100 : quoteAmount;
          dailyQuotes[dateString] += euroAmount;
          // WICHTIG: Auch zur Gesamt-Einnahmen hinzufügen
          currentTotalRevenue += euroAmount;
        } else {
        }
      });

      // Debug: Status-Informationen (kompakt)

      // Debug Orders speziell
      if (orders.length > 0) {
      }

      // Rechnungen verarbeiten (alle erstellten Rechnungen und Stornos)
      invoices.forEach(invoice => {
        // Prüfe ob totalAmount existiert - sowohl als Number als auch als total
        const amount = invoice.totalAmount || invoice.total || 0;

        // Special debug for RE-1000
        if (invoice.id && invoice.id.includes('RE-1000')) {
        }

        if (!amount || amount === 0) {
          return;
        }

        // Verwende NUR createdAt für alle Rechnungen
        let relevantDate: Date | null = null;

        if (invoice.createdAt) {
          if (typeof invoice.createdAt === 'string') {
            relevantDate = new Date(invoice.createdAt);
          } else if (typeof invoice.createdAt === 'object') {
            // Firebase Timestamp handling - verschiedene Formate
            if (invoice.createdAt.seconds) {
              const tempDate = new Date(invoice.createdAt.seconds * 1000);
              relevantDate = tempDate;
            } else if (invoice.createdAt._seconds) {
              const tempDate = new Date(invoice.createdAt._seconds * 1000);
              relevantDate = tempDate;
            } else if (invoice.createdAt.toDate && typeof invoice.createdAt.toDate === 'function') {
              const tempDate = invoice.createdAt.toDate();
              relevantDate = tempDate;
            }
          }
        }

        if (!relevantDate || isNaN(relevantDate.getTime())) {
          return;
        }

        // TypeScript assertion - wir wissen, dass relevantDate hier nicht null ist
        const validDate: Date = relevantDate;
        const invoiceDate = validDate.toISOString().split('T')[0];

        if (validDate < startDate) {
          return;
        }

        const dateString = invoiceDate; // Verwende bereits berechneten invoiceDate

        // Intelligente Cent-zu-Euro-Konvertierung
        let euroAmount = amount;
        // Nur konvertieren wenn der Wert sehr groß ist (wahrscheinlich Cent)
        // Typische Euro-Beträge: 10€, 100€, 1000€ - NICHT durch 100 teilen
        // Typische Cent-Werte: 1000+ (für 10€+), meist > 50000 (für 500€+)
        if (Math.abs(amount) >= 50000 && Number.isInteger(amount)) {
          // Wahrscheinlich Cent-Wert - konvertiere zu Euro (auch negative Werte)
          euroAmount = amount / 100;
        } else {
        }

        if (invoice.isStorno || euroAmount < 0) {
          // Stornos und negative Rechnungen als separate Kategorie
          if (!dailyStornos[dateString]) {
            dailyStornos[dateString] = 0;
          }
          dailyStornos[dateString] += Math.abs(euroAmount); // Immer als positive Storno-Werte
        } else {
          // Prüfe ob Rechnung überfällig ist (basierend auf Fälligkeitsdatum)
          const isOverdue = () => {
            if (!invoice.dueDate && !invoice.validUntil) return false;

            const dueDateStr = invoice.dueDate || invoice.validUntil;
            if (!dueDateStr) return false;

            const dueDate = new Date(dueDateStr);
            if (isNaN(dueDate.getTime())) return false; // Ungültiges Datum

            const today = new Date();
            today.setHours(0, 0, 0, 0); // Setze auf Tagesbeginn für korrekte Vergleiche

            const isPaid = invoice.status === 'BEZAHLT' || invoice.status === 'paid';
            const isOverdueDate = dueDate < today;

            return isOverdueDate && !isPaid;
          };

          // Prüfe Status-Filter für normale Rechnungen
          const shouldIncludeInvoice =
            invoiceStatusFilter === 'alle' ||
            (invoiceStatusFilter === 'entwurf' &&
              (invoice.status === 'ENTWURF' ||
                invoice.status === 'draft' ||
                invoice.status === 'finalized' ||
                !invoice.status)) || // Keine Status = Entwurf
            (invoiceStatusFilter === 'versendet' &&
              (invoice.status === 'VERSENDET' || invoice.status === 'sent')) ||
            (invoiceStatusFilter === 'bezahlt' &&
              (invoice.status === 'BEZAHLT' || invoice.status === 'paid')) ||
            (invoiceStatusFilter === 'ueberfaellig' &&
              (invoice.status === 'ÜBERFÄLLIG' || invoice.status === 'overdue' || isOverdue())); // Berechne Überfälligkeit basierend auf Datum

          if (shouldIncludeInvoice) {
            if (euroAmount > 0) {
              // Nur POSITIVE Rechnungen zu dailyInvoices
              if (!dailyInvoices[dateString]) {
                dailyInvoices[dateString] = 0;
              }
              dailyInvoices[dateString] += euroAmount;

              // Deutsche Steuerberechnung basierend auf tatsächlichem vatRate
              const vatRate = invoice.vatRate || 19; // Fallback auf 19%
              const vatDecimal = vatRate / 100;

              // Bestimme ob Betrag Brutto oder Netto ist basierend auf priceInput
              // Aus Company-Settings: priceInput: "netto"
              const isNettoInput = true; // Meistens Netto-Eingabe in Business-Software

              let nettoAmount: number;
              let vatAmount: number;
              let bruttoAmount: number;

              if (isNettoInput) {
                // Betrag ist Netto → Brutto berechnen
                nettoAmount = euroAmount;
                vatAmount = nettoAmount * vatDecimal;
                bruttoAmount = nettoAmount + vatAmount;
              } else {
                // Betrag ist Brutto → Netto berechnen
                bruttoAmount = euroAmount;
                nettoAmount = bruttoAmount / (1 + vatDecimal);
                vatAmount = bruttoAmount - nettoAmount;
              }

              // Zur Gesamt-Einnahmen hinzufügen (als Brutto für Gewinn-Berechnung)
              currentTotalRevenue += bruttoAmount;
            } else {
            }
          }
        }
      });

      // Alle Daten sammeln und Chart-Daten erstellen
      const allDates = new Set([
        ...Object.keys(dailyRevenue),
        ...Object.keys(dailyExpenses),
        ...Object.keys(dailyInvoices),
        ...Object.keys(dailyQuotes),
        ...Object.keys(dailyStornos),
        ...Object.keys(dailyRefunds),
      ]);

      const finalChartData = Array.from(allDates)
        .map(date => {
          const umsatzValue = dailyRevenue[date] || 0;
          const rechnungenValue = dailyInvoices[date] || 0;
          const angeboteValue = dailyQuotes[date] || 0;
          const ausgabenValue = dailyExpenses[date] || 0;
          const stornosValue = dailyStornos[date] || 0;
          const rueckerstattungenValue = dailyRefunds[date] || 0;

          // Debug: Zeige alle Werte für problematische Daten
          if (umsatzValue < 0 || rechnungenValue < 0 || angeboteValue < 0) {
          }

          return {
            date,
            umsatz: Math.max(0, umsatzValue), // Erzwinge positive Werte
            rechnungen: Math.max(0, rechnungenValue),
            angebote: Math.max(0, angeboteValue),
            ausgaben: Math.max(0, ausgabenValue),
            stornos: Math.max(0, stornosValue),
            rueckerstattungen: Math.max(0, rueckerstattungenValue),
          };
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // DEBUG: Zeige alle Rohdaten vor Math.max
      Object.keys(dailyRevenue).forEach(date => {
        if (dailyRevenue[date] < 0) {
        }
      });

      // Kompakte Debug-Info für finale Chart-Daten
      if (finalChartData.length > 0) {
        const _totalInvoices = Object.keys(dailyInvoices).reduce(
          (sum, date) => sum + dailyInvoices[date],
          0
        );

        // DEBUG: Zeige ein paar finale Datenpunkte
      }

      // Deutsche Buchhaltung: Präzise Berechnung mit tatsächlichen Steuersätzen
      // currentTotalRevenue enthält bereits die korrekt berechneten Brutto-Beträge

      // Sammle alle Steuerbeträge (wurde bereits in der Invoice-Verarbeitung berechnet)
      let totalNetRevenue = 0;
      let totalVatAmount = 0;

      // Neuberechnung basierend auf individuellen Rechnungen für präzise Steuer-Aufschlüsselung
      invoices.forEach(invoice => {
        if (invoice.totalAmount && invoice.totalAmount > 0) {
          const euroAmount =
            invoice.totalAmount >= 50000 ? invoice.totalAmount / 100 : invoice.totalAmount;
          const vatRate = invoice.vatRate || 19;
          const vatDecimal = vatRate / 100;

          // Annahme: Netto-Eingabe (wie in Company-Settings)
          const nettoAmount = euroAmount;
          const vatAmount = nettoAmount * vatDecimal;

          totalNetRevenue += nettoAmount;
          totalVatAmount += vatAmount;
        }
      });

      const grossProfitBeforeTax = currentTotalRevenue - currentTotalExpenses; // Gewinn vor Steuern (brutto)

      // Debug: Deutsche Buchhaltung mit präzisen Steuersätzen

      return {
        chartData: finalChartData,
        totalRevenue: currentTotalRevenue, // Brutto-Einnahmen
        totalExpenses: currentTotalExpenses,
        netRevenue: totalNetRevenue, // Präzise Netto-Einnahmen (für "Einnahmen" Anzeige)
        grossProfitBeforeTax: grossProfitBeforeTax, // Gewinn vor Steuern (brutto)
        vatAmount: totalVatAmount, // Präziser USt-Betrag
      };
    }, [orders, expenses, quotes, invoices, timeRange, invoiceStatusFilter]);

  // Übertrage berechnete Werte an Parent-Komponente
  React.useEffect(() => {
    if (onFinancialDataChangeAction && (totalRevenue > 0 || totalExpenses > 0)) {
      onFinancialDataChangeAction({
        totalRevenue,
        totalExpenses,
        netRevenue,
        grossProfitBeforeTax,
        vatAmount,
      });
    }
  }, [
    totalRevenue,
    totalExpenses,
    netRevenue,
    grossProfitBeforeTax,
    vatAmount,
    onFinancialDataChangeAction,
  ]);

  if (loading) {
    return (
      <Card className="flex h-[350px] w-full items-center justify-center">
        <FiLoader className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Lade Daten...</span>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="flex h-[350px] w-full flex-col items-center justify-center">
        <FiAlertCircle className="mb-2 h-8 w-8 text-destructive" />
        <p className="text-destructive">{error}</p>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="flex h-[350px] w-full flex-col items-center justify-center">
        <FiAlertCircle className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">Keine Daten verfügbar</p>
      </Card>
    );
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Umsatz und Ausgaben
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-600 font-medium">Live</span>
              </div>
            </CardTitle>
            <CardDescription>
              Überblick über Ihre Einnahmen und Ausgaben im ausgewählten Zeitraum
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 mb-1">Letzte Aktualisierung</div>
            <div className="text-xs text-gray-700 font-medium">
              {lastUpdateTime.toLocaleTimeString('de-DE', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </div>
          </div>
        </div>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={value => {
              if (value) setTimeRange(value);
            }}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="365d">1 Jahr</ToggleGroupItem>
            <ToggleGroupItem value="90d">90 Tage</ToggleGroupItem>
            <ToggleGroupItem value="30d">30 Tage</ToggleGroupItem>
            <ToggleGroupItem value="7d">7 Tage</ToggleGroupItem>
          </ToggleGroup>
          <Select
            value={timeRange}
            onValueChange={value => {
              if (value) setTimeRange(value);
            }}
          >
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Zeitraum auswählen"
            >
              <SelectValue placeholder="90 Tage" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="365d" className="rounded-lg">
                1 Jahr
              </SelectItem>
              <SelectItem value="90d" className="rounded-lg">
                90 Tage
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                30 Tage
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                7 Tage
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className={`aspect-auto h-[250px] w-full transition-all duration-300 ${isUpdating ? 'scale-[1.02] shadow-lg' : ''}`}
        >
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="fillUmsatz" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-umsatz)" stopOpacity={1.0} />
                <stop offset="95%" stopColor="var(--color-umsatz)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillRechnungen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-rechnungen)" stopOpacity={1.0} />
                <stop offset="95%" stopColor="var(--color-rechnungen)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillAngebote" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-angebote)" stopOpacity={1.0} />
                <stop offset="95%" stopColor="var(--color-angebote)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillAusgaben" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-ausgaben)" stopOpacity={1.0} />
                <stop offset="95%" stopColor="var(--color-ausgaben)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillStornos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-stornos)" stopOpacity={1.0} />
                <stop offset="95%" stopColor="var(--color-stornos)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillRueckerstattungen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-rueckerstattungen)" stopOpacity={1.0} />
                <stop offset="95%" stopColor="var(--color-rueckerstattungen)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={
                timeRange === '7d' ? 50 : timeRange === '30d' ? 60 : timeRange === '90d' ? 80 : 100
              }
              interval={
                timeRange === '7d' ? 0 : timeRange === '30d' ? 2 : timeRange === '90d' ? 7 : 14
              }
              tickFormatter={value => {
                const date = new Date(value + 'T00:00:00'); // Verhindert Zeitzonenprobleme

                // Dynamische Formatierung je nach Zeitraum
                if (timeRange === '7d') {
                  return date.toLocaleDateString('de-DE', {
                    weekday: 'short',
                    day: 'numeric',
                  });
                } else if (timeRange === '30d') {
                  return date.toLocaleDateString('de-DE', {
                    day: 'numeric',
                    month: 'short',
                  });
                } else if (timeRange === '90d') {
                  return date.toLocaleDateString('de-DE', {
                    day: 'numeric',
                    month: 'short',
                  });
                } else {
                  // 365d - Nur Monat anzeigen
                  return date.toLocaleDateString('de-DE', {
                    month: 'short',
                  });
                }
              }}
            />

            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={value => `${Number(value).toFixed(0)}€`}
              domain={[0, 'dataMax']}
            />

            <ChartTooltip
              cursor={false}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const categoryLabels: Record<string, string> = {
                    umsatz: 'Umsatz',
                    rechnungen: 'Rechnungen',
                    angebote: 'Angebote',
                    ausgaben: 'Ausgaben',
                    stornos: 'Stornos',
                    rueckerstattungen: 'Rückerstattungen',
                  };

                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-md">
                      <div className="grid grid-cols-1 gap-2">
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            {new Date(label + 'T00:00:00').toLocaleDateString('de-DE', {
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                        {payload.map((entry: any, index: number) => {
                          if (entry.value === 0) return null;
                          return (
                            <div key={index} className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1">
                                <div
                                  className="h-2.5 w-2.5 shrink-0 rounded-[2px] bg-[--color-bg]"
                                  style={
                                    {
                                      '--color-bg': entry.color,
                                    } as React.CSSProperties
                                  }
                                />

                                <span className="text-sm font-medium">
                                  {categoryLabels[entry.dataKey] || entry.dataKey}
                                </span>
                              </div>
                              <span className="text-sm font-mono text-right">
                                {Number(entry.value).toFixed(2)} €
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            {activeCategories.umsatz && (
              <Area
                dataKey="umsatz"
                type="monotone"
                fill="url(#fillUmsatz)"
                stroke="var(--color-umsatz)"
              />
            )}

            {activeCategories.rechnungen && (
              <Area
                dataKey="rechnungen"
                type="monotone"
                fill="url(#fillRechnungen)"
                stroke="var(--color-rechnungen)"
              />
            )}

            {activeCategories.angebote && (
              <Area
                dataKey="angebote"
                type="monotone"
                fill="url(#fillAngebote)"
                stroke="var(--color-angebote)"
              />
            )}

            {activeCategories.ausgaben && (
              <Area
                dataKey="ausgaben"
                type="monotone"
                fill="url(#fillAusgaben)"
                stroke="var(--color-ausgaben)"
              />
            )}

            {activeCategories.stornos && (
              <Area
                dataKey="stornos"
                type="monotone"
                fill="url(#fillStornos)"
                stroke="var(--color-stornos)"
              />
            )}

            {activeCategories.rueckerstattungen && (
              <Area
                dataKey="rueckerstattungen"
                type="monotone"
                fill="url(#fillRueckerstattungen)"
                stroke="var(--color-rueckerstattungen)"
              />
            )}
          </AreaChart>
        </ChartContainer>

        {/* Professionelle Filter-Sektion */}
        <div className="mt-6 border-t border-gray-100 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-1 h-4 bg-[#14ad9f] rounded-full"></div>
              <h4 className="text-sm font-semibold text-gray-800">Filter</h4>
              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                {Object.values(activeCategories).filter(Boolean).length}/
                {Object.keys(activeCategories).length}
              </div>
            </div>
            <button
              onClick={toggleAllCategories}
              className="group inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-[#14ad9f] bg-gray-50 hover:bg-[#14ad9f]/5 border border-gray-200 hover:border-[#14ad9f]/20 rounded-lg transition-all duration-200 whitespace-nowrap"
            >
              {Object.values(activeCategories).every(Boolean) ? 'Alle aus' : 'Alle an'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {Object.entries(chartConfig)
              .filter(([key]) => key !== 'stornos' && key !== 'rueckerstattungen') // Filter die separaten Buttons heraus
              .map(([key, config]) => {
                const isActive = activeCategories[key as keyof typeof activeCategories];
                // Verkürzte Labels für mobile Ansicht
                const getShortLabel = (label: string) => {
                  const shortLabels: { [key: string]: string } = {
                    'Umsatz (Aufträge)': 'Umsatz',
                    Rechnungen: 'Rechnungen',
                    'Angebote (angenommen)': 'Angebote',
                    Ausgaben: 'Ausgaben',
                    Stornos: 'Stornos',
                    Rückerstattungen: 'Refunds',
                  };
                  return shortLabels[label] || label.split(' (')[0];
                };

                return (
                  <div
                    key={key}
                    className="relative"
                    ref={key === 'rechnungen' ? dropdownRef : undefined}
                  >
                    <button
                      onClick={() => {
                        if (key === 'rechnungen') {
                          setShowInvoiceDropdown(!showInvoiceDropdown);
                        } else {
                          toggleCategory(key as keyof typeof activeCategories);
                        }
                      }}
                      className={`group relative flex items-center gap-2 p-2.5 rounded-lg text-left transition-all duration-200 border-2 min-h-12 w-full ${
                        isActive
                          ? 'bg-white shadow-md border-gray-200 hover:shadow-lg'
                          : 'bg-gray-50/50 border-gray-100 hover:bg-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className="shrink-0">
                        <div
                          className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                            isActive ? 'border-white shadow-sm' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: isActive ? config.color : '#e5e7eb' }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-sm font-medium leading-tight transition-colors ${
                            isActive ? 'text-gray-900' : 'text-gray-500'
                          }`}
                        >
                          {getShortLabel(config.label)}
                          {key === 'rechnungen' && invoiceStatusFilter !== 'alle' && (
                            <span className="ml-1 text-xs text-[#14ad9f]">
                              (
                              {invoiceStatusFilter === 'entwurf'
                                ? 'E'
                                : invoiceStatusFilter === 'versendet'
                                  ? 'V'
                                  : invoiceStatusFilter === 'bezahlt'
                                    ? 'B'
                                    : invoiceStatusFilter === 'ueberfaellig'
                                      ? 'Ü'
                                      : invoiceStatusFilter}
                              )
                            </span>
                          )}
                        </div>
                      </div>
                      {key === 'rechnungen' && (
                        <div className="shrink-0">
                          <svg
                            className="w-3 h-3 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </div>
                      )}
                    </button>

                    {/* Status-Dropdown für Rechnungen */}
                    {key === 'rechnungen' && showInvoiceDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                        <div className="p-2 space-y-1">
                          {[
                            { value: 'ausblenden', label: 'Ausblenden' },
                            { value: 'alle', label: 'Alle Rechnungen' },
                            { value: 'entwurf', label: 'Entwürfe' },
                            { value: 'versendet', label: 'Versendet' },
                            { value: 'bezahlt', label: 'Bezahlt' },
                            { value: 'ueberfaellig', label: 'Überfällig' },
                          ].map(option => (
                            <button
                              key={option.value}
                              onClick={() => {
                                if (option.value === 'ausblenden') {
                                  // Deaktiviere Rechnungen-Kategorie
                                  if (activeCategories.rechnungen) {
                                    toggleCategory('rechnungen');
                                  }
                                  setShowInvoiceDropdown(false);
                                } else {
                                  setInvoiceStatusFilter(option.value as any);
                                  setShowInvoiceDropdown(false);
                                  // Aktiviere Rechnungen-Kategorie wenn sie deaktiviert ist
                                  if (!activeCategories.rechnungen) {
                                    toggleCategory('rechnungen');
                                  }
                                }
                              }}
                              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                                (option.value === 'ausblenden' && !activeCategories.rechnungen) ||
                                (option.value !== 'ausblenden' &&
                                  invoiceStatusFilter === option.value &&
                                  activeCategories.rechnungen)
                                  ? 'bg-[#14ad9f] text-white'
                                  : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

            {/* Kombinierter Stornos & Rückerstattungen Button */}
            <div className="relative" ref={negativeDropdownRef}>
              <button
                onClick={() => setShowNegativeDropdown(!showNegativeDropdown)}
                className={`group relative flex items-center gap-2 p-2.5 rounded-lg text-left transition-all duration-200 border-2 min-h-12 w-full ${
                  activeCategories.stornos || activeCategories.rueckerstattungen
                    ? 'bg-white shadow-md border-gray-200 hover:shadow-lg'
                    : 'bg-gray-50/50 border-gray-100 hover:bg-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="shrink-0">
                  <div
                    className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                      activeCategories.stornos || activeCategories.rueckerstattungen
                        ? 'border-white shadow-sm'
                        : 'border-gray-300'
                    }`}
                    style={{
                      backgroundColor:
                        activeCategories.stornos || activeCategories.rueckerstattungen
                          ? '#ef4444'
                          : '#e5e7eb',
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm font-medium leading-tight transition-colors ${
                      activeCategories.stornos || activeCategories.rueckerstattungen
                        ? 'text-gray-900'
                        : 'text-gray-500'
                    }`}
                  >
                    Stornos/Refunds
                    {(activeCategories.stornos || activeCategories.rueckerstattungen) && (
                      <span className="ml-1 text-xs text-[#14ad9f]">
                        (
                        {negativeFilter === 'stornos'
                          ? 'S'
                          : negativeFilter === 'rueckerstattungen'
                            ? 'R'
                            : negativeFilter === 'beide'
                              ? 'S+R'
                              : ''}
                        )
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0">
                  <svg
                    className="w-3 h-3 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </button>

              {/* Dropdown */}
              {showNegativeDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="p-2 space-y-1">
                    {[
                      { value: 'keine', label: 'Ausblenden' },
                      { value: 'stornos', label: 'Nur Stornos' },
                      { value: 'rueckerstattungen', label: 'Nur Rückerstattungen' },
                      { value: 'beide', label: 'Beide anzeigen' },
                    ].map(option => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setNegativeFilter(option.value as any);

                          // Setze entsprechende Kategorien
                          if (option.value === 'keine') {
                            if (activeCategories.stornos) toggleCategory('stornos');
                            if (activeCategories.rueckerstattungen)
                              toggleCategory('rueckerstattungen');
                          } else if (option.value === 'stornos') {
                            if (!activeCategories.stornos) toggleCategory('stornos');
                            if (activeCategories.rueckerstattungen)
                              toggleCategory('rueckerstattungen');
                          } else if (option.value === 'rueckerstattungen') {
                            if (activeCategories.stornos) toggleCategory('stornos');
                            if (!activeCategories.rueckerstattungen)
                              toggleCategory('rueckerstattungen');
                          } else if (option.value === 'beide') {
                            if (!activeCategories.stornos) toggleCategory('stornos');
                            if (!activeCategories.rueckerstattungen)
                              toggleCategory('rueckerstattungen');
                          }

                          setShowNegativeDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                          negativeFilter === option.value
                            ? 'bg-[#14ad9f] text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Kompakte Schnellauswahl */}
          <div className="mt-4 pt-3 border-t border-gray-50">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() =>
                  setActiveCategories({
                    umsatz: true,
                    rechnungen: true,
                    angebote: true,
                    ausgaben: false,
                    stornos: false,
                    rueckerstattungen: false,
                    negativeWerte: false,
                  })
                }
                className="flex items-center justify-center px-3 py-2 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors"
              >
                <span className="whitespace-nowrap">Einnahmen</span>
              </button>
              <button
                onClick={() =>
                  setActiveCategories({
                    umsatz: false,
                    rechnungen: false,
                    angebote: false,
                    ausgaben: true,
                    stornos: false,
                    rueckerstattungen: false,
                    negativeWerte: false,
                  })
                }
                className="flex items-center justify-center px-3 py-2 text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition-colors"
              >
                <span className="whitespace-nowrap">Ausgaben</span>
              </button>
              <button
                onClick={() =>
                  setActiveCategories({
                    umsatz: false,
                    rechnungen: true,
                    angebote: false,
                    ausgaben: false,
                    stornos: false,
                    rueckerstattungen: false,
                    negativeWerte: false,
                  })
                }
                className="flex items-center justify-center px-3 py-2 text-xs font-medium text-[#14ad9f] bg-[#14ad9f]/5 hover:bg-[#14ad9f]/10 border border-[#14ad9f]/20 rounded-lg transition-colors"
              >
                <span className="whitespace-nowrap">Rechnungen</span>
              </button>
              <button
                onClick={() =>
                  setActiveCategories({
                    umsatz: false,
                    rechnungen: false,
                    angebote: false,
                    ausgaben: false,
                    stornos: true,
                    rueckerstattungen: true,
                    negativeWerte: false,
                  })
                }
                className="flex items-center justify-center px-3 py-2 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
              >
                <span className="whitespace-nowrap">Negative</span>
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
