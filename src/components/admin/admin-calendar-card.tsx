'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Users, Video } from 'lucide-react';
import Link from 'next/link';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  attendees?: string[];
  isVideoMeeting?: boolean;
  color?: string;
}

export function AdminCalendarCard() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Admin-User laden
    const loadAdminAndEvents = async () => {
      try {
        const response = await fetch('/api/admin/auth/verify');
        if (response.ok) {
          const data = await response.json();
          const email = data.user?.email || 'admin@taskilo.de';
          
          // Events laden mit dem Webmail Storage Key für Synchronisation
          const storageKey = `webmail_calendar_${email}`;
          const savedEvents = localStorage.getItem(storageKey);
          if (savedEvents) {
            const allEvents = JSON.parse(savedEvents) as CalendarEvent[];
            const sortedEvents = allEvents.sort((a, b) => 
              new Date(a.start).getTime() - new Date(b.start).getTime()
            );
            setEvents(sortedEvents);
          }
        }
      } catch {
        // Silently handle
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAdminAndEvents();
  }, []);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      time: date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const isUpcoming = (dateString: string) => {
    return new Date(dateString) >= new Date();
  };

  const upcomingEvents = events.filter(e => isUpcoming(e.start));

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Calendar className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Anstehende Termine</h3>
              <p className="text-sm text-gray-500">{upcomingEvents.length} Termine</p>
            </div>
          </div>
          <Link
            href="/dashboard/admin/calendar"
            className="px-4 py-2 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
          >
            Kalender öffnen
          </Link>
        </div>
      </div>

      <div className="p-6">
        {upcomingEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Keine anstehenden Termine</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Termin</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Datum</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Uhrzeit</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Ort</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Teilnehmer</th>
                </tr>
              </thead>
              <tbody>
                {upcomingEvents.slice(0, 10).map((event) => {
                  const { date, time } = formatDateTime(event.start);
                  const endTime = formatDateTime(event.end).time;
                  
                  return (
                    <tr key={event.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: event.color || '#0d9488' }}
                          />
                          <span className="font-medium text-gray-900">{event.title}</span>
                          {event.isVideoMeeting && (
                            <Video className="w-4 h-4 text-blue-500" />
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{date}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          {time} - {endTime}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {event.location ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            {event.location}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {event.attendees && event.attendees.length > 0 ? (
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-gray-400" />
                            {event.attendees.length}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
