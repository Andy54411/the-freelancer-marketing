'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { MailHeader } from '@/components/webmail/MailHeader';
import { CalendarToolbar } from '@/components/webmail/calendar/CalendarToolbar';
import { CalendarGrid, CreateEventModal, EventFormData } from '@/components/webmail/calendar';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  location?: string;
  attendees?: string[];
  isVideoMeeting?: boolean;
  videoMeetingUrl?: string;
  color?: string;
  allDay?: boolean;
}

export function AdminFullCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'year' | 'agenda' | '4days'>('week');
  const [showWeekends, setShowWeekends] = useState(true);
  const [clickedDate, setClickedDate] = useState<Date | null>(null);
  const [clickedAllDay, setClickedAllDay] = useState(false);

  const adminEmail = 'admin@taskilo.de';

  const loadEvents = useCallback(() => {
    try {
      const storageKey = `admin_calendar_${adminEmail}`;
      const savedEvents = localStorage.getItem(storageKey);
      if (savedEvents) {
        setEvents(JSON.parse(savedEvents));
      }
    } catch {
      // Silently handle errors
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      if (mobile && viewMode === 'week') {
        setViewMode('day');
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [viewMode]);

  const saveEvents = (newEvents: CalendarEvent[]) => {
    const storageKey = `admin_calendar_${adminEmail}`;
    localStorage.setItem(storageKey, JSON.stringify(newEvents));
    setEvents(newEvents);
  };

  const handleDateClick = (date: Date, allDay: boolean) => {
    setClickedDate(date);
    setClickedAllDay(allDay);
    setSelectedEvent(null);
    setShowEventModal(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setClickedDate(new Date(event.start));
    setClickedAllDay(event.allDay || false);
    setShowEventModal(true);
  };

  const handleSaveEvent = async (formData: EventFormData) => {
    setIsCreating(true);
    try {
      const startDateTime = formData.allDay 
        ? formData.startDate 
        : `${formData.startDate}T${formData.startTime}`;
      const endDateTime = formData.allDay 
        ? formData.endDate 
        : `${formData.endDate}T${formData.endTime}`;

      const eventData: CalendarEvent = {
        id: selectedEvent?.id || `event-${Date.now()}`,
        title: formData.title,
        description: formData.description,
        start: startDateTime,
        end: endDateTime,
        location: formData.location,
        attendees: formData.attendees,
        isVideoMeeting: formData.isVideoMeeting,
        videoMeetingUrl: formData.isVideoMeeting 
          ? `https://mail.taskilo.de/webmail/meet/${Date.now()}`
          : undefined,
        allDay: formData.allDay,
        color: formData.color,
      };

      let newEvents: CalendarEvent[];
      if (selectedEvent) {
        newEvents = events.map(e => e.id === selectedEvent.id ? eventData : e);
        toast.success('Termin aktualisiert');
      } else {
        newEvents = [...events, eventData];
        toast.success('Termin erstellt');
      }

      saveEvents(newEvents);
      setShowEventModal(false);
      setSelectedEvent(null);
    } catch {
      toast.error('Fehler beim Speichern');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteEvent = () => {
    if (!selectedEvent) return;
    const newEvents = events.filter(e => e.id !== selectedEvent.id);
    saveEvents(newEvents);
    setShowEventModal(false);
    setSelectedEvent(null);
    toast.success('Termin gelöscht');
  };

  const handleNavigate = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCurrentDate(new Date());
      return;
    }

    const newDate = new Date(currentDate);
    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case '4days':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 4 : -4));
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
      case 'year':
        newDate.setFullYear(newDate.getFullYear() + (direction === 'next' ? 1 : -1));
        break;
    }
    setCurrentDate(newDate);
  };

  return (
    <div className="flex flex-col h-[700px] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Calendar Header */}
      <CalendarHeader
        currentDate={currentDate}
        viewMode={viewMode}
        onViewChange={setViewMode}
        onPrev={() => handleNavigate('prev')}
        onNext={() => handleNavigate('next')}
        onToday={() => handleNavigate('today')}
        onMenuToggle={() => {}}
        showWeekends={showWeekends}
        onShowWeekendsChange={setShowWeekends}
        userEmail={adminEmail}
        onLogout={() => {}}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Calendar Grid - Full Width */}
        <CalendarGrid
          currentDate={currentDate}
          viewMode={viewMode}
          events={events}
          onEventClick={handleEventClick}
          onTimeSlotClick={handleDateClick}
          onSwipePrev={() => handleNavigate('prev')}
          onSwipeNext={() => handleNavigate('next')}
        />
      </div>

      {/* Event Modal */}
      <CreateEventModal
        isOpen={showEventModal}
        onClose={() => {
          setShowEventModal(false);
          setSelectedEvent(null);
        }}
        onSave={handleSaveEvent}
        initialDate={clickedDate || new Date()}
        initialAllDay={clickedAllDay}
        editEvent={selectedEvent ? {
          id: selectedEvent.id,
          title: selectedEvent.title,
          eventType: 'event',
          startDate: selectedEvent.start.split('T')[0],
          startTime: selectedEvent.start.includes('T') ? selectedEvent.start.split('T')[1]?.slice(0, 5) || '' : '',
          endDate: selectedEvent.end.split('T')[0],
          endTime: selectedEvent.end.includes('T') ? selectedEvent.end.split('T')[1]?.slice(0, 5) || '' : '',
          timezone: 'Europe/Berlin',
          isRecurring: false,
          attendees: selectedEvent.attendees || [],
          isVideoMeeting: selectedEvent.isVideoMeeting || false,
          videoMeetingUrl: selectedEvent.videoMeetingUrl,
          location: selectedEvent.location || '',
          description: selectedEvent.description || '',
          calendarId: 'primary',
          visibility: 'default',
          reminder: 30,
          color: selectedEvent.color || '#0d9488',
          allDay: selectedEvent.allDay || false,
        } : null}
        userEmail={adminEmail}
        isLoading={isCreating}
      />

      {/* Delete Dialog */}
      {selectedEvent && (
        <Dialog open={false}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Termin löschen?</DialogTitle>
              <DialogDescription>
                Möchtest du den Termin &quot;{selectedEvent.title}&quot; wirklich löschen?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedEvent(null)}>
                Abbrechen
              </Button>
              <Button variant="destructive" onClick={handleDeleteEvent}>
                <Trash2 className="h-4 w-4 mr-2" />
                Löschen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
