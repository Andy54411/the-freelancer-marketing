'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, Plus, Clock, MapPin, User } from 'lucide-react';
import CompanyCalendar from '@/components/CompanyCalendar';
import { useCalendarEventModal } from '@/hooks/useCalendarEventModal';
import { Customer } from '../finance/AddCustomerModal';

interface CustomerCalendarTabProps {
  customer: Customer;
}

export function CustomerCalendarTab({ customer }: CustomerCalendarTabProps) {
  const {
    handleEventClick,
    handleDateSelect,
    handleCreateEvent,
    CalendarEventModalComponent,
  } = useCalendarEventModal({
    companyId: customer.companyId,
    customerId: customer.id,
  });

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-[#14ad9f]" />
                Kundenkalender - {customer.name}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Alle Termine und Projekte im Zusammenhang mit diesem Kunden
              </p>
            </div>
            <Button
              onClick={() => handleCreateEvent(new Date())}
              className="bg-[#14ad9f] hover:bg-taskilo-hover text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Neuer Termin
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Calendar */}
      <Card>
        <CardContent className="p-0">
          <div className="h-[700px]">
            <CompanyCalendar 
              companyUid={customer.companyId} 
              selectedOrderId={customer.id}
            />
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      {CalendarEventModalComponent}
    </div>
  );
}