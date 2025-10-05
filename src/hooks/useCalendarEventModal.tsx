'use client';

import { useState, useCallback } from 'react';
import { CalendarEventModal } from '@/components/calendar/CalendarEventModal';
import type { EventClickArg, DateSelectArg } from '@fullcalendar/core';

interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  location?: string;
  eventType: 'meeting' | 'appointment' | 'task' | 'reminder' | 'call';
  status: 'planned' | 'confirmed' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  participants?: string[];
  customerId?: string;
  companyId: string;
  createdBy: string;
  createdAt?: any;
  updatedAt?: any;
}

interface UseCalendarEventModalProps {
  companyId: string;
  customerId?: string;
  onEventChange?: (events: CalendarEvent[]) => void;
}

export function useCalendarEventModal({ 
  companyId, 
  customerId, 
  onEventChange 
}: UseCalendarEventModalProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  // Handle event click from calendar
  const handleEventClick = useCallback((clickInfo: EventClickArg) => {
    const event = clickInfo.event;
    
    // Extract the real calendar event ID from FullCalendar event ID
    // FullCalendar events have IDs like "calendar-actualId", we need just "actualId"
    let actualEventId = event.id;
    if (event.id.startsWith('calendar-')) {
      actualEventId = event.id.replace('calendar-', '');
    }
    
    // Convert FullCalendar event to our CalendarEvent format
    const calendarEvent: CalendarEvent = {
      id: actualEventId, // Use the extracted real ID
      title: event.title,
      description: event.extendedProps.description || '',
      startDate: event.start ? event.start.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      endDate: event.end ? event.end.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      startTime: event.start ? event.start.toTimeString().substring(0, 5) : '09:00',
      endTime: event.end ? event.end.toTimeString().substring(0, 5) : '10:00',
      location: event.extendedProps.location || '',
      eventType: event.extendedProps.eventType || 'meeting',
      status: event.extendedProps.status || 'planned',
      priority: event.extendedProps.priority || 'medium',
      participants: event.extendedProps.participants || [],
      customerId: event.extendedProps.customerId || customerId,
      companyId,
      createdBy: event.extendedProps.createdBy || '',
      createdAt: event.extendedProps.createdAt,
      updatedAt: event.extendedProps.updatedAt,
    };

    setSelectedEvent(calendarEvent);
    setIsModalOpen(true);
  }, [companyId, customerId]);

  // Handle date selection from calendar
  const handleDateSelect = useCallback((selectInfo: DateSelectArg) => {
    setSelectedEvent(null);
    setSelectedDate(selectInfo.start);
    setIsModalOpen(true);
  }, []);

  // Handle creating new event
  const handleCreateEvent = useCallback((date?: Date) => {
    setSelectedEvent(null);
    setSelectedDate(date);
    setIsModalOpen(true);
  }, []);

  // Handle event saved
  const handleEventSaved = useCallback((event: CalendarEvent) => {
    setIsModalOpen(false);
    setSelectedEvent(null);
    setSelectedDate(undefined);
    
    // Notify parent component of event change
    onEventChange?.([event]);
  }, [onEventChange]);

  // Handle event deleted
  const handleEventDeleted = useCallback((eventId: string) => {
    setIsModalOpen(false);
    setSelectedEvent(null);
    setSelectedDate(undefined);
    
    // Notify parent component of event deletion
    onEventChange?.([]);
  }, [onEventChange]);

  // Close modal
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedEvent(null);
    setSelectedDate(undefined);
  }, []);

  return {
    // State
    isModalOpen,
    selectedEvent,
    selectedDate,
    
    // Handlers for FullCalendar integration
    handleEventClick,
    handleDateSelect,
    handleCreateEvent,
    
    // Modal handlers
    handleEventSaved,
    handleEventDeleted,
    handleCloseModal,
    
    // Modal component
    CalendarEventModalComponent: (
      <CalendarEventModal
        open={isModalOpen}
        onClose={handleCloseModal}
        event={selectedEvent}
        selectedDate={selectedDate}
        companyId={companyId}
        customerId={customerId}
        onEventSaved={handleEventSaved}
        onEventDeleted={handleEventDeleted}
      />
    ),
  };
}

export type { CalendarEvent };