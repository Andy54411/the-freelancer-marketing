'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWebmailSession } from '../layout';
import { useRouter } from 'next/navigation';
import { 
  Trash2
} from 'lucide-react';
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
import { CalendarHeader, CalendarSidebar, CalendarGrid, CreateEventModal, EventFormData } from '@/components/webmail/calendar';

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

export default function WebmailCalendarPage() {
  const { session } = useWebmailSession();
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // New state for Google-style calendar
  const [currentDate, setCurrentDate] = useState(new Date());
  // Auf Mobile standardmäßig Tagesansicht, sonst Wochenansicht
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'year' | 'agenda' | '4days'>('week');
  const [sidebarOpen, setSidebarOpen] = useState(false); // Auf Mobile geschlossen
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showWeekends, setShowWeekends] = useState(true);
  const [showDeclinedEvents, setShowDeclinedEvents] = useState(false);
  const [showCompletedTasks, setShowCompletedTasks] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [clickedDate, setClickedDate] = useState<Date | null>(null);
  const [clickedAllDay, setClickedAllDay] = useState(false);
  const [calendars, setCalendars] = useState([
    { id: 'primary', name: 'Mein Kalender', color: '#0d9488', enabled: true },
    { id: 'birthdays', name: 'Geburtstage', color: '#8b5cf6', enabled: true },
    { id: 'tasks', name: 'Aufgaben', color: '#3b82f6', enabled: true },
  ]);

  const loadEvents = useCallback(() => {
    if (!session?.email) return;
    
    try {
      const storageKey = `webmail_calendar_${session.email}`;
      const savedEvents = localStorage.getItem(storageKey);
      if (savedEvents) {
        setEvents(JSON.parse(savedEvents));
      }
    } catch {
      // Silently handle errors
    }
  }, [session?.email]);

  // Session wird bereits vom Layout geprüft - hier nur Events laden
  useEffect(() => {
    if (session?.isAuthenticated) {
      setIsLoading(false);
      loadEvents();
    }
  }, [session?.isAuthenticated, loadEvents]);

  // Mobile-Erkennung und automatische Anpassung
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile && viewMode === 'week') {
        setViewMode('day');
      }
      // Sidebar auf Desktop öffnen, auf Mobile geschlossen lassen
      if (!mobile) {
        setSidebarOpen(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [viewMode]);

  const saveEvents = (newEvents: CalendarEvent[]) => {
    if (!session?.email) return;
    const storageKey = `webmail_calendar_${session.email}`;
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

      // Send calendar invite email if there are attendees
      if (eventData.attendees && eventData.attendees.length > 0) {
        await sendCalendarInvite(eventData);
      }
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

  const handleCalendarToggle = (calendarId: string) => {
    setCalendars(prev =>
      prev.map(cal =>
        cal.id === calendarId ? { ...cal, enabled: !cal.enabled } : cal
      )
    );
  };

  const handleMiniCalendarSelect = (date: Date) => {
    setSelectedDate(date);
    setCurrentDate(date);
  };

  const sendCalendarInvite = async (event: CalendarEvent) => {
    if (!session?.email || !event.attendees?.length) return;

    try {
      // Send invite via webmail proxy
      for (const attendee of event.attendees) {
        await fetch('/api/webmail/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: session.email,
            password: session.password,
            to: attendee,
            subject: `Einladung: ${event.title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px;">
                <h2 style="color: #0d9488;">Kalendereinladung</h2>
                <h3>${event.title}</h3>
                <p><strong>Wann:</strong> ${new Date(event.start).toLocaleString('de-DE')} - ${new Date(event.end).toLocaleString('de-DE')}</p>
                ${event.location ? `<p><strong>Wo:</strong> ${event.location}</p>` : ''}
                ${event.description ? `<p><strong>Beschreibung:</strong> ${event.description}</p>` : ''}
                ${event.isVideoMeeting ? `<p><strong>Video-Meeting:</strong> <a href="${event.videoMeetingUrl}">${event.videoMeetingUrl}</a></p>` : ''}
                <p style="color: #666;">Eingeladen von ${session.email}</p>
              </div>
            `,
            text: `Kalendereinladung: ${event.title}\n\nWann: ${new Date(event.start).toLocaleString('de-DE')} - ${new Date(event.end).toLocaleString('de-DE')}\n${event.location ? `Wo: ${event.location}\n` : ''}${event.description ? `Beschreibung: ${event.description}\n` : ''}${event.isVideoMeeting ? `Video-Meeting: ${event.videoMeetingUrl}\n` : ''}\nEingeladen von ${session.email}`,
          }),
        });
      }
      toast.success('Einladungen versendet');
    } catch {
      // Silently handle error
    }
  };

  // Filter events by enabled calendars (all events currently belong to primary calendar)
  const filteredEvents = events.filter(() => calendars.find(c => c.id === 'primary')?.enabled);

  // Loading-State anzeigen während Session geprüft wird
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Google-style Header */}
      <CalendarHeader
        currentDate={currentDate}
        viewMode={viewMode}
        onViewChange={setViewMode}
        onPrev={() => handleNavigate('prev')}
        onNext={() => handleNavigate('next')}
        onToday={() => handleNavigate('today')}
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        userEmail={session?.email || ''}
        onLogout={() => router.push('/webmail')}
        showWeekends={showWeekends}
        onShowWeekendsChange={setShowWeekends}
        showDeclinedEvents={showDeclinedEvents}
        onShowDeclinedEventsChange={setShowDeclinedEvents}
        showCompletedTasks={showCompletedTasks}
        onShowCompletedTasksChange={setShowCompletedTasks}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Sidebar Overlay */}
        {isMobile && sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Sidebar - Overlay auf Mobile, normal auf Desktop */}
        {sidebarOpen && (
          <div className={`${isMobile ? 'fixed left-0 top-14 bottom-0 z-50 shadow-xl' : ''}`}>
            <CalendarSidebar
              isCollapsed={false}
              currentDate={currentDate}
              selectedDate={selectedDate}
              onDateSelect={(date) => {
                handleMiniCalendarSelect(date);
                if (isMobile) setSidebarOpen(false);
              }}
              calendars={calendars}
              onCalendarToggle={handleCalendarToggle}
              onCreateEvent={() => {
                handleDateClick(new Date(), false);
                if (isMobile) setSidebarOpen(false);
              }}
            />
          </div>
        )}

        {/* Calendar Grid */}
        <CalendarGrid
          currentDate={currentDate}
          viewMode={viewMode}
          events={filteredEvents}
          onEventClick={handleEventClick}
          onTimeSlotClick={handleDateClick}
          onSwipePrev={() => handleNavigate('prev')}
          onSwipeNext={() => handleNavigate('next')}
        />
      </div>

      {/* Event Modal - Google Style */}
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
        userEmail={session?.email || ''}
        isLoading={isCreating}
      />

      {/* Delete Confirmation Dialog */}
      {selectedEvent && (
        <Dialog open={false}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Termin löschen?</DialogTitle>
              <DialogDescription>
                Möchtest du den Termin "{selectedEvent.title}" wirklich löschen?
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
