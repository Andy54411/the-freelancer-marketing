'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface Expense {
  id: string;
  title: string;
  description: string;
  amount: number;
  category: string;
  date: string;
}

interface ExpenseData {
  name: string;
  value: number;
  color: string;
}

const EXPENSE_COLORS = [
'#FB523B', // Rot
'#FF736B', // Helles Rot
'#FF948F', // Rosa
'#FFC6C4', // Hellrosa
'#FFE9E9' // Sehr hellrosa
];

export default function TopExpensesCard() {
  const [_expenses, setExpenses] = useState<Expense[]>([]);
  const [chartData, setChartData] = useState<ExpenseData[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }

    fetchExpenses();
  }, [user?.uid]);

  const fetchExpenses = async () => {
    if (!user?.uid) return;

    setIsLoading(true);
    try {


      // Lade ALLE Ausgaben erst einmal ohne Datum-Filter
      const expensesQuery = query(
        collection(db, 'companies', user.uid, 'expenses'),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(expensesQuery);
      const allExpenses: Expense[] = [];



      querySnapshot.forEach((doc) => {
        const data = doc.data();









        if (data.amount && data.amount > 0) {
          // Parse das Datum flexibler
          let expenseDate = data.date;
          if (data.createdAt && data.createdAt.toDate) {
            expenseDate = data.createdAt.toDate().toISOString().split('T')[0];
          } else if (data.date) {
            expenseDate = data.date;
          } else {
            expenseDate = new Date().toISOString().split('T')[0];
          }

          allExpenses.push({
            id: doc.id,
            title: data.title || data.description || 'Unbekannt',
            description: data.description || '',
            amount: data.amount,
            category: data.category || 'Sonstiges',
            date: expenseDate
          });
        }
      });



      // Filter für letzte 3 Monate (nach dem Laden)
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const recentExpenses = allExpenses.filter((expense) => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= threeMonthsAgo;
      });



      // Gruppiere nach Kategorie und summiere Beträge
      const categoryTotals = new Map<string, number>();
      recentExpenses.forEach((expense) => {
        const current = categoryTotals.get(expense.category) || 0;
        categoryTotals.set(expense.category, current + expense.amount);
      });

      // Sortiere nach Betrag und nimm Top 5
      const sortedCategories = Array.from(categoryTotals.entries()).
      sort(([, a], [, b]) => b - a).
      slice(0, 5);



      // Erstelle Chart-Daten
      const chartExpenses: ExpenseData[] = sortedCategories.map(([category, amount], index) => ({
        name: category,
        value: amount,
        color: EXPENSE_COLORS[index] || '#FFE9E9'
      }));

      const total = sortedCategories.reduce((sum, [, amount]) => sum + amount, 0);

      setExpenses(recentExpenses);
      setChartData(chartExpenses);
      setTotalAmount(total);
    } catch (error) {
      console.error('❌ Fehler beim Laden der Ausgaben:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return `${amount.toFixed(2).replace('.', ',')}\u00A0€`;
  };

  const renderCenterText = () => {
    const text = formatAmount(totalAmount);
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

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Top 5 Ausgaben</h3>
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
          <h3 className="text-lg font-semibold text-gray-900">Top 5 Ausgaben</h3>
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
              <div key={`legend-${index}`} className="flex items-center gap-2 text-sm">
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
            Keine Ausgabendaten verfügbar
          </div>
        }
      </div>

      <div className="border-t bg-gray-50 px-6 py-4 rounded-b-lg">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Daten erforderlich
          </div>
          <Link
            href={`/dashboard/company/${user?.uid}/finance/expenses`}
            className="inline-flex items-center text-sm font-medium text-[#14ad9f] hover:text-taskilo-hover transition-colors">

            Ausgabe erfassen
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>);

}