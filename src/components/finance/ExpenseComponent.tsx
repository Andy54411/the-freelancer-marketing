'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  receipt?: string;
  description: string;
}

interface ExpenseComponentProps {
  expenses: Expense[];
}

export function ExpenseComponent({ expenses }: ExpenseComponentProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Ausgaben</CardTitle>
            <CardDescription>Verwalten Sie Ihre Geschäftsausgaben</CardDescription>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Neue Ausgabe
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {expenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Keine Ausgaben vorhanden</div>
          ) : (
            <div className="space-y-3">
              {expenses.map(expense => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="font-medium">{expense.title}</div>
                        <div className="text-sm text-muted-foreground">{expense.category}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(expense.amount)}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(expense.date).toLocaleDateString('de-DE')}
                        </div>
                      </div>
                    </div>
                    {expense.description && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {expense.description}
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
