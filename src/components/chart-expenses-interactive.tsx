'use client';

import * as React from 'react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
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

export const description = 'Ein interaktiver Flächenchart, der die Gesamtausgaben anzeigt';

// Typ für Ausgaben-Daten aus Firestore
interface ExpenseData {
  id: string;
  amount: number;
  date: Date;
}

const chartConfigStatic = {
  ausgaben: {
    label: 'Ausgaben',
    color: '#14ad9f', // Taskilo Hauptfarbe für Ausgaben
  },
} satisfies ChartConfig;

export function ChartExpensesInteractive({ companyUid }: { companyUid: string }) {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [timeRange, setTimeRange] = React.useState('90d');
  const [expenses, setExpenses] = React.useState<ExpenseData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Real-time Ausgaben-Daten von Firestore laden - exakt wie in SectionCards
  React.useEffect(() => {
    if (!user || !companyUid) {
      setIsLoading(false);
      return;
    }

    // Real-time listener für Ausgaben
    const expensesQuery = query(
      collection(db, 'customers'),
      where('companyId', '==', companyUid),
      where('isSupplier', '==', true)
    );

    const unsubscribe = onSnapshot(expensesQuery, expensesSnapshot => {
      const expenseData: ExpenseData[] = [];

      expensesSnapshot.forEach(doc => {
        const supplier = doc.data();
        if (supplier.totalAmount && supplier.totalAmount > 0) {
          expenseData.push({
            id: doc.id,
            amount: supplier.totalAmount,
            date: new Date(), // Verwende aktuelles Datum für alle Ausgaben (wie in SectionCards)
          });
        }
      });

      setExpenses(expenseData);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, companyUid]);

  // Berechne Zeitfilter
  const getDateFilter = (range: string) => {
    const now = new Date();
    switch (range) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
      default:
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    }
  };

  // Filtere und verarbeite Ausgaben-Daten
  const processExpensesData = React.useMemo(() => {
    const dateFilter = getDateFilter(timeRange);

    // Filtere Ausgaben nach Zeitraum
    const filteredExpenses = expenses.filter(expense => {
      return expense.date >= dateFilter;
    });

    // Da alle Ausgaben das heutige Datum haben, gruppiere sie alle zum heutigen Tag
    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD

    const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Erstelle Chart-Daten für heute
    const chartData =
      totalAmount > 0
        ? [
            {
              date: todayString,
              ausgaben: totalAmount,
              displayDate: today.toLocaleDateString('de-DE', {
                day: '2-digit',
                month: 'short',
              }),
            },
          ]
        : [];

    return chartData;
  }, [expenses, timeRange]);

  // Berechne Gesamtausgaben
  const totalExpenses = React.useMemo(() => {
    const dateFilter = getDateFilter(timeRange);
    return expenses
      .filter(expense => expense.date >= dateFilter)
      .reduce((sum, expense) => sum + expense.amount, 0);
  }, [expenses, timeRange]);

  // Zeige Loading-State
  if (isLoading) {
    return (
      <Card className="flex h-[350px] w-full flex-col items-center justify-center">
        <FiLoader className="mb-2 h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Lade Ausgaben-Daten...</p>
      </Card>
    );
  }

  // Zeige Fehler-State bei leeren Daten
  if (!processExpensesData || processExpensesData.length === 0) {
    return (
      <Card className="flex h-[350px] w-full flex-col items-center justify-center">
        <FiAlertCircle className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">Keine Ausgaben-Daten verfügbar</p>
      </Card>
    );
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Ausgaben</CardTitle>
        <CardDescription>
          Gesamtausgaben im ausgewählten Zeitraum{' '}
          <span className="font-bold" style={{ color: '#14ad9f' }}>
            {totalExpenses.toFixed(2)} €
          </span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">90 Tage</ToggleGroupItem>
            <ToggleGroupItem value="30d">30 Tage</ToggleGroupItem>
            <ToggleGroupItem value="7d">7 Tage</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              aria-label="Zeitraum auswählen"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="90d">90 Tage</SelectItem>
              <SelectItem value="30d">30 Tage</SelectItem>
              <SelectItem value="7d">7 Tage</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfigStatic} className="aspect-auto h-[250px] w-full">
          <AreaChart data={processExpensesData}>
            <defs>
              <linearGradient id="fillAusgaben" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-ausgaben)" stopOpacity={1} />
                <stop offset="95%" stopColor="var(--color-ausgaben)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="displayDate"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={value => value}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value, payload) => {
                    if (payload && payload[0]) {
                      const fullDate = payload[0].payload?.date;
                      return new Date(fullDate).toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      });
                    }
                    return value;
                  }}
                  formatter={value => [`${value} €`, 'Ausgaben']}
                />
              }
            />
            <Area
              dataKey="ausgaben"
              type="natural"
              fill="url(#fillAusgaben)"
              stroke="var(--color-ausgaben)"
              strokeWidth={2}
              fillOpacity={0.6}
              stackId="ausgaben"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
