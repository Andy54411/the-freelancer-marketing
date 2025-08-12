'use client';

import type { TicketStats } from '@/types/ticket';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Ticket,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Zap,
  Users,
  Target,
} from 'lucide-react';

interface TicketStatsCardsProps {
  stats: TicketStats;
}

export function TicketStatsCards({ stats }: TicketStatsCardsProps) {
  const priorityColors: Record<string, string> = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
  };

  const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    bug: AlertTriangle,
    feature: Zap,
    support: Users,
    billing: Target,
    payment: Target,
    account: Users,
    technical: AlertTriangle,
    feedback: Users,
    other: Ticket,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Gesamt-Tickets */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Gesamt Tickets</CardTitle>
          <Ticket className="h-4 w-4 text-[#14ad9f]" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="text-xs">
              {stats.ticketsCreatedToday} heute erstellt
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Offene Tickets */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Offene Tickets</CardTitle>
          <AlertTriangle className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{stats.open}</div>
          <div className="flex items-center gap-2 mt-2">
            <Badge className="bg-blue-100 text-blue-800 text-xs">
              {stats.inProgress} in Bearbeitung
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Gelöste Tickets */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Gelöste Tickets</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="text-xs">
              {stats.ticketsResolvedToday} heute gelöst
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Durchschnittliche Lösungszeit */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Ø Lösungszeit</CardTitle>
          <Clock className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {stats.avgResolutionTime.toFixed(1)}h
          </div>
          <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
            <TrendingUp className="h-3 w-3" />
            Durchschnitt letzte 30 Tage
          </div>
        </CardContent>
      </Card>

      {/* Prioritäten-Übersicht */}
      <Card className="md:col-span-2 hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg">Tickets nach Priorität</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(stats.byPriority).map(([priority, count]) => (
              <div key={priority} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      priority === 'urgent'
                        ? 'bg-red-500'
                        : priority === 'high'
                          ? 'bg-orange-500'
                          : priority === 'medium'
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                    }`}
                  />
                  <span className="text-sm font-medium capitalize">
                    {priority === 'urgent'
                      ? 'Dringend'
                      : priority === 'high'
                        ? 'Hoch'
                        : priority === 'medium'
                          ? 'Mittel'
                          : 'Niedrig'}
                  </span>
                </div>
                <Badge className={priorityColors[priority] || 'bg-gray-100 text-gray-800'}>
                  {count}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Kategorien-Übersicht */}
      <Card className="md:col-span-2 hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg">Tickets nach Kategorie</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(stats.byCategory)
              .filter(([_, count]) => count > 0)
              .map(([category, count]) => {
                const Icon = categoryIcons[category] || Ticket;
                return (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-[#14ad9f]" />
                      <span className="text-sm font-medium capitalize">
                        {category === 'bug'
                          ? 'Bug/Fehler'
                          : category === 'feature'
                            ? 'Feature'
                            : category === 'support'
                              ? 'Support'
                              : category === 'billing'
                                ? 'Abrechnung'
                                : category === 'payment'
                                  ? 'Zahlung'
                                  : category === 'account'
                                    ? 'Account'
                                    : category === 'technical'
                                      ? 'Technisch'
                                      : category === 'feedback'
                                        ? 'Feedback'
                                        : 'Sonstiges'}
                      </span>
                    </div>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
