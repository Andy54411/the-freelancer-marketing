'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase/clients';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertTriangle, Clock, CalendarX, UserCheck, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  contractType: 'PERMANENT' | 'TEMPORARY' | 'PROJECT_BASED';
  startDate: string;
  endDate?: string;
  probationPeriodEnd?: string;
  avatar?: string;
  isActive?: boolean;
}

interface ContractAlert {
  employee: Employee;
  type: 'CONTRACT_EXPIRING' | 'PROBATION_ENDING';
  date: string;
  daysRemaining: number;
  urgency: 'critical' | 'warning' | 'info';
}

export default function ContractAlertsCard() {
  const [alerts, setAlerts] = useState<ContractAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const loadEmployeeData = async () => {
      if (!user?.uid) return;

      try {
        setIsLoading(true);

        const employeesRef = collection(db, 'companies', user.uid, 'employees');
        const employeesQuery = query(
          employeesRef,
          where('isActive', '==', true)
        );

        const snapshot = await getDocs(employeesQuery);
        const employees: Employee[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          employees.push({
            id: doc.id,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            position: data.position || 'Mitarbeiter',
            department: data.department || 'Allgemein',
            contractType: data.contractType || 'PERMANENT',
            startDate: data.startDate || '',
            endDate: data.endDate || undefined,
            probationPeriodEnd: data.probationPeriodEnd || undefined,
            avatar: data.avatar || undefined,
            isActive: data.isActive !== false,
          });
        });

        // Berechne Alerts
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const newAlerts: ContractAlert[] = [];

        // Wir prüfen die nächsten 90 Tage für Warnungen
        const alertThresholds = {
          critical: 14, // 14 Tage oder weniger = kritisch (rot)
          warning: 30,  // 30 Tage oder weniger = Warnung (gelb)
          info: 90,     // 90 Tage oder weniger = Info (blau)
        };

        employees.forEach((emp) => {
          // Befristeter Vertrag prüfen
          if (emp.endDate && (emp.contractType === 'TEMPORARY' || emp.contractType === 'PROJECT_BASED')) {
            const endDate = new Date(emp.endDate);
            endDate.setHours(0, 0, 0, 0);
            const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysRemaining > 0 && daysRemaining <= alertThresholds.info) {
              let urgency: 'critical' | 'warning' | 'info' = 'info';
              if (daysRemaining <= alertThresholds.critical) {
                urgency = 'critical';
              } else if (daysRemaining <= alertThresholds.warning) {
                urgency = 'warning';
              }

              newAlerts.push({
                employee: emp,
                type: 'CONTRACT_EXPIRING',
                date: emp.endDate,
                daysRemaining,
                urgency,
              });
            }
          }

          // Probezeit prüfen
          if (emp.probationPeriodEnd) {
            const probationEnd = new Date(emp.probationPeriodEnd);
            probationEnd.setHours(0, 0, 0, 0);
            const daysRemaining = Math.ceil((probationEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysRemaining > 0 && daysRemaining <= alertThresholds.info) {
              let urgency: 'critical' | 'warning' | 'info' = 'info';
              if (daysRemaining <= alertThresholds.critical) {
                urgency = 'critical';
              } else if (daysRemaining <= alertThresholds.warning) {
                urgency = 'warning';
              }

              newAlerts.push({
                employee: emp,
                type: 'PROBATION_ENDING',
                date: emp.probationPeriodEnd,
                daysRemaining,
                urgency,
              });
            }
          }
        });

        // Sortiere nach Dringlichkeit (kritisch zuerst) und dann nach Tagen
        newAlerts.sort((a, b) => {
          const urgencyOrder = { critical: 0, warning: 1, info: 2 };
          if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
            return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
          }
          return a.daysRemaining - b.daysRemaining;
        });

        setAlerts(newAlerts);
      } catch (error) {
        // Error handling ohne console.log
      } finally {
        setIsLoading(false);
      }
    };

    loadEmployeeData();
  }, [user?.uid]);

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getUrgencyStyles = (urgency: 'critical' | 'warning' | 'info') => {
    switch (urgency) {
      case 'critical':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-700',
          badge: 'bg-red-100 text-red-700 border-red-200',
          icon: 'text-red-500',
        };
      case 'warning':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-700',
          badge: 'bg-amber-100 text-amber-700 border-amber-200',
          icon: 'text-amber-500',
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-700',
          badge: 'bg-blue-100 text-blue-700 border-blue-200',
          icon: 'text-blue-500',
        };
    }
  };

  const getAlertIcon = (type: 'CONTRACT_EXPIRING' | 'PROBATION_ENDING') => {
    return type === 'CONTRACT_EXPIRING' ? CalendarX : Clock;
  };

  const getAlertLabel = (type: 'CONTRACT_EXPIRING' | 'PROBATION_ENDING') => {
    return type === 'CONTRACT_EXPIRING' ? 'Vertrag endet' : 'Probezeit endet';
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-[#14ad9f]" />
          <h3 className="text-lg font-semibold">Personalwarnungen</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-[#14ad9f]" />
          <h3 className="text-lg font-semibold">Personalwarnungen</h3>
          {alerts.length > 0 && (
            <Badge variant="outline" className="ml-2 bg-red-50 text-red-700 border-red-200">
              {alerts.length}
            </Badge>
          )}
        </div>
        {user?.uid && (
          <Link 
            href={`/dashboard/company/${user.uid}/personal/employees`}
            className="text-sm text-[#14ad9f] hover:underline flex items-center gap-1"
          >
            Alle Mitarbeiter
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-8">
          <UserCheck className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Keine anstehenden Fristen</p>
          <p className="text-sm text-gray-400 mt-1">
            Alle Verträge und Probezeiten sind aktuell
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.slice(0, 5).map((alert, index) => {
            const styles = getUrgencyStyles(alert.urgency);
            const Icon = getAlertIcon(alert.type);
            
            return (
              <div
                key={`${alert.employee.id}-${alert.type}-${index}`}
                className={cn(
                  'p-3 rounded-lg border transition-colors',
                  styles.bg,
                  styles.border
                )}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={alert.employee.avatar} />
                    <AvatarFallback className="bg-gray-100 text-gray-600 text-sm">
                      {alert.employee.firstName?.[0]}{alert.employee.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {alert.employee.firstName} {alert.employee.lastName}
                      </span>
                      <Badge variant="outline" className={cn('text-xs', styles.badge)}>
                        <Icon className={cn('h-3 w-3 mr-1', styles.icon)} />
                        {getAlertLabel(alert.type)}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      {alert.employee.position} - {alert.employee.department}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={cn('text-lg font-bold', styles.text)}>
                      {alert.daysRemaining} Tage
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(alert.date)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {alerts.length > 5 && (
            <div className="text-center pt-2">
              <Link 
                href={`/dashboard/company/${user?.uid}/personal/employees`}
                className="text-sm text-[#14ad9f] hover:underline"
              >
                +{alerts.length - 5} weitere Warnungen anzeigen
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Legende */}
      {alerts.length > 0 && (
        <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-100 border border-red-200" />
            <span>Kritisch (14 Tage)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-amber-100 border border-amber-200" />
            <span>Warnung (30 Tage)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-100 border border-blue-200" />
            <span>Info (90 Tage)</span>
          </div>
        </div>
      )}
    </div>
  );
}
