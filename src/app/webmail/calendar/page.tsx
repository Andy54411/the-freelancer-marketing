'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWebmailSession } from '../layout';
import { useRouter } from 'next/navigation';
import { 
  MapPin, 
  Users,
  Video,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { CalendarHeader, CalendarSidebar, CalendarGrid } from '@/components/webmail/calendar';

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
  const [calendars, setCalendars] = useState([
    { id: 'primary', name: 'Mein Kalender', color: '#0d9488', enabled: true },
    { id: 'birthdays', name: 'Geburtstage', color: '#8b5cf6', enabled: true },
    { id: 'tasks', name: 'Aufgaben', color: '#3b82f6', enabled: true },
  ]);

  // Form state
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    start: '',
    end: '',
    location: '',
    attendees: '',
    isVideoMeeting: false,
    allDay: false,
    color: '#0d9488', // Teal
  });

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

  useEffect(() => {
    if (!session?.isAuthenticated) {
      router.push('/webmail');
      return;
    }
    loadEvents();
  }, [session, router, loadEvents]);

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

  const handleDateClick = (clickedDate: Date, allDay: boolean) => {
    const startDate = new Date(clickedDate);
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 1);

    setEventForm({
      title: '',
      description: '',
      start: allDay ? startDate.toISOString().split('T')[0] : startDate.toISOString().slice(0, 16),
      end: allDay ? endDate.toISOString().split('T')[0] : endDate.toISOString().slice(0, 16),
      location: '',
      attendees: '',
      isVideoMeeting: false,
      allDay: allDay,
      color: '#0d9488',
    });
    setSelectedEvent(null);
    setShowEventModal(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setEventForm({
      title: event.title,
      description: event.description || '',
      start: event.start.slice(0, 16),
      end: event.end.slice(0, 16),
      location: event.location || '',
      attendees: event.attendees?.join(', ') || '',
      isVideoMeeting: event.isVideoMeeting || false,
      allDay: event.allDay || false,
      color: event.color || '#0d9488',
    });
    setShowEventModal(true);
  };

  const handleSaveEvent = async () => {
    if (!eventForm.title.trim()) {
      toast.error('Bitte gib einen Titel ein');
      return;
    }

    setIsCreating(true);
    try {
      const eventData: CalendarEvent = {
        id: selectedEvent?.id || `event-${Date.now()}`,
        title: eventForm.title,
        description: eventForm.description,
        start: eventForm.start,
        end: eventForm.end,
        location: eventForm.location,
        attendees: eventForm.attendees.split(',').map(a => a.trim()).filter(Boolean),
        isVideoMeeting: eventForm.isVideoMeeting,
        videoMeetingUrl: eventForm.isVideoMeeting 
          ? `https://mail.taskilo.de/webmail/meet/${Date.now()}`
          : undefined,
        allDay: eventForm.allDay,
        color: eventForm.color,
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

      {/* Event Modal */}
      <Dialog open={showEventModal} onOpenChange={setShowEventModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selectedEvent ? 'Termin bearbeiten' : 'Neuer Termin'}
            </DialogTitle>
            <DialogDescription>
              {selectedEvent ? 'Bearbeite die Details des Termins' : 'Erstelle einen neuen Kalendertermin'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="title">Titel</Label>
              <Input
                id="title"
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                placeholder="Titel des Termins"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start">Start</Label>
                <Input
                  id="start"
                  type={eventForm.allDay ? 'date' : 'datetime-local'}
                  value={eventForm.start}
                  onChange={(e) => setEventForm({ ...eventForm, start: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="end">Ende</Label>
                <Input
                  id="end"
                  type={eventForm.allDay ? 'date' : 'datetime-local'}
                  value={eventForm.end}
                  onChange={(e) => setEventForm({ ...eventForm, end: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="allDay"
                checked={eventForm.allDay}
                onCheckedChange={(checked) => setEventForm({ ...eventForm, allDay: checked })}
              />
              <Label htmlFor="allDay">Ganztägig</Label>
            </div>

            <div>
              <Label htmlFor="location">Ort</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="location"
                  className="pl-9"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  placeholder="Ort hinzufügen"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="attendees">Teilnehmer</Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="attendees"
                  className="pl-9"
                  value={eventForm.attendees}
                  onChange={(e) => setEventForm({ ...eventForm, attendees: e.target.value })}
                  placeholder="E-Mail-Adressen (kommagetrennt)"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="videoMeeting"
                checked={eventForm.isVideoMeeting}
                onCheckedChange={(checked) => setEventForm({ ...eventForm, isVideoMeeting: checked })}
              />
              <Label htmlFor="videoMeeting" className="flex items-center gap-2">
                <Video className="h-4 w-4 text-teal-600" />
                Video-Meeting hinzufügen
              </Label>
            </div>

            <div>
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                placeholder="Beschreibung hinzufügen"
                rows={3}
              />
            </div>

            <div>
              <Label>Farbe</Label>
              <div className="flex gap-2 mt-2">
                {['#0d9488', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#22c55e'].map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full transition-transform ${
                      eventForm.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setEventForm({ ...eventForm, color })}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            {selectedEvent && (
              <Button variant="destructive" onClick={handleDeleteEvent}>
                <Trash2 className="h-4 w-4 mr-2" />
                Löschen
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setShowEventModal(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSaveEvent} disabled={isCreating}>
              {isCreating ? 'Speichern...' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
