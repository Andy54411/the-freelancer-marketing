'use client';

import * as React from 'react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';

import { callHttpsFunction } from '@/lib/httpsFunctions';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
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
  ChartTooltipContent,
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
  orderDate?: { _seconds: number; _nanoseconds: number } | string;
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

const chartConfigStatic = {
  umsatz: {
    label: 'Umsatz',
    color: 'var(--primary)',
  },
  ausgaben: {
    label: 'Ausgaben',
    color: '#ef4444', // Rot für Ausgaben
  },
} satisfies ChartConfig;

export function ChartAreaInteractive({ companyUid }: { companyUid: string }) {
  const isMobile = useIsMobile();
  const { user, loading: authLoading } = useAuth();
  const [timeRange, setTimeRange] = React.useState('90d');
  const [orders, setOrders] = React.useState<OrderData[]>([]);
  const [expenses, setExpenses] = React.useState<ExpenseData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Chart-Konfiguration mit übersetzten Labels
  const chartConfig = React.useMemo(
    () =>
      ({
        umsatz: {
          label: 'Umsatz',
          color: 'var(--primary)',
        },
        ausgaben: {
          label: 'Ausgaben',
          color: '#ef4444',
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

    const fetchOrders = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await callHttpsFunction(
          'getProviderOrders',
          { providerId: companyUid },
          'GET'
        );
        setOrders(result.orders || []);
      } catch (err: any) {
        setError(err.message || 'Fehler beim Laden der Umsatzdaten');
      } finally {
        setLoading(false);
      }
    };

    const fetchExpenses = () => {
      try {
        const expensesQuery = query(
          collection(db, 'customers'),
          where('companyId', '==', companyUid),
          where('isSupplier', '==', true)
        );

        // Real-time listener für Ausgaben - dieselbe Logik wie SectionCards
        const unsubscribe = onSnapshot(expensesQuery, expensesSnapshot => {
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
        });

        return unsubscribe;
      } catch (err) {
        console.error('Fehler beim Laden der Ausgaben:', err);
        return () => {};
      }
    };

    fetchOrders();
    const unsubscribeExpenses = fetchExpenses();

    // Cleanup function
    return () => {
      if (unsubscribeExpenses) {
        unsubscribeExpenses();
      }
    };
  }, [companyUid, user, authLoading]);

  const { chartData, totalRevenue, totalExpenses } = React.useMemo(() => {
    console.log(
      'Chart recalculating with timeRange:',
      timeRange,
      'Orders:',
      orders.length,
      'Expenses:',
      expenses.length
    );

    if (!orders.length && !expenses.length)
      return { chartData: [], totalRevenue: 0, totalExpenses: 0 };

    const referenceDate = new Date();
    let daysToSubtract = 90;
    if (timeRange === '30d') daysToSubtract = 30;
    else if (timeRange === '7d') daysToSubtract = 7;
    else if (timeRange === '365d') daysToSubtract = 365;
    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);

    console.log('Date range:', startDate, 'to', referenceDate);

    const dailyRevenue: { [key: string]: number } = {};
    const dailyExpenses: { [key: string]: number } = {};
    let currentTotalRevenue = 0;
    let currentTotalExpenses = 0;

    // Umsatz verarbeiten
    orders.forEach(order => {
      if (!order.orderDate) {
        return;
      }

      // Zeige alle Aufträge mit Umsatz an (nicht nur ABGESCHLOSSEN/BEZAHLT)
      // da auch AKTIVE Aufträge bereits Umsatz generiert haben können
      if (!order.totalAmountPaidByBuyer || order.totalAmountPaidByBuyer <= 0) {
        return;
      }

      const orderDate = new Date(
        typeof order.orderDate === 'string' ? order.orderDate : order.orderDate._seconds * 1000
      );

      if (orderDate >= startDate) {
        const dateString = orderDate.toISOString().split('T')[0]; // YYYY-MM-DD
        if (!dailyRevenue[dateString]) {
          dailyRevenue[dateString] = 0;
        }
        dailyRevenue[dateString] += order.totalAmountPaidByBuyer / 100; // In Euro umrechnen
        currentTotalRevenue += order.totalAmountPaidByBuyer / 100;
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

    // Alle Daten sammeln und Chart-Daten erstellen
    const allDates = new Set([...Object.keys(dailyRevenue), ...Object.keys(dailyExpenses)]);

    const finalChartData = Array.from(allDates)
      .map(date => ({
        date,
        umsatz: dailyRevenue[date] || 0,
        ausgaben: dailyExpenses[date] || 0,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      chartData: finalChartData,
      totalRevenue: currentTotalRevenue,
      totalExpenses: currentTotalExpenses,
    };
  }, [orders, expenses, timeRange]);

  console.log('Final chart state:', { chartData: chartData.length, totalRevenue, totalExpenses });

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
        <CardTitle>Umsatz und Ausgaben</CardTitle>
        <CardDescription>
          Überblick über Ihre Einnahmen und Ausgaben im ausgewählten Zeitraum
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={value => {
              if (value) setTimeRange(value);
            }}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
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
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="fillUmsatz" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-umsatz)" stopOpacity={1.0} />
                <stop offset="95%" stopColor="var(--color-umsatz)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillAusgaben" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-ausgaben)" stopOpacity={1.0} />
                <stop offset="95%" stopColor="var(--color-ausgaben)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={value => {
                const date = new Date(value + 'T00:00:00'); // Verhindert Zeitzonenprobleme
                return date.toLocaleDateString('de-DE', {
                  month: 'short',
                  day: 'numeric',
                });
              }}
            />
            <ChartTooltip
              cursor={false}
              defaultIndex={isMobile ? -1 : chartData.length - 1}
              content={
                <ChartTooltipContent
                  labelFormatter={value =>
                    new Date(value + 'T00:00:00').toLocaleDateString('de-DE', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })
                  }
                  formatter={value => `${Number(value).toFixed(2)} €`}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="umsatz"
              type="natural"
              fill="url(#fillUmsatz)"
              stroke="var(--color-umsatz)"
              stackId="a"
            />
            <Area
              dataKey="ausgaben"
              type="natural"
              fill="url(#fillAusgaben)"
              stroke="var(--color-ausgaben)"
              stackId="b"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
