'use client';

import React, { useState } from 'react';
import CompanyCalendar from '@/components/CompanyCalendar';

interface InteractiveCompanyCalendarProps {
  companyUid: string;
  selectedOrderId?: string;
  onDateClick?: (date: Date) => void;
  onEventClick?: (event: any) => void;
}

export function InteractiveCompanyCalendar({ 
  companyUid, 
  selectedOrderId,
  onDateClick,
  onEventClick 
}: InteractiveCompanyCalendarProps) {
  
  // Erweitere das CompanyCalendar mit Click-Handlern
  const handleCalendarClick = (event: any) => {
    // Prüfe ob es ein Datum oder Event-Click war
    if (event.dateStr && onDateClick) {
      // Datum wurde geklickt
      onDateClick(new Date(event.dateStr));
    } else if (event.event && onEventClick) {
      // Event wurde geklickt
      onEventClick(event.event);
    }
  };

  return (
    <div 
      onClick={(e) => {
        // Einfacher Hack: Wenn auf leeren Kalendertag geklickt wird
        const target = e.target as HTMLElement;
        if (target.classList.contains('fc-daygrid-day') || 
            target.classList.contains('fc-daygrid-day-number')) {
          const dateStr = target.closest('.fc-daygrid-day')?.getAttribute('data-date');
          if (dateStr && onDateClick) {
            onDateClick(new Date(dateStr));
          }
        }
      }}
      style={{ cursor: 'pointer' }}
    >
      <CompanyCalendar 
        companyUid={companyUid}
        selectedOrderId={selectedOrderId}
      />
    </div>
  );
}