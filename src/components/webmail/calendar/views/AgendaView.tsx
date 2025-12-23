'use client';

import { CalendarViewProps } from '../types';

export function AgendaView({
  events,
  onEventClick,
  isDark,
}: CalendarViewProps) {
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );
  const futureEvents = sortedEvents.filter(
    (e) => new Date(e.start) >= new Date(new Date().setHours(0, 0, 0, 0))
  );

  return (
    <div className={`flex-1 overflow-y-auto ${isDark ? 'bg-[#202124]' : 'bg-white'} p-4 md:p-6`}>
      <h2 className={`text-base md:text-lg font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'} mb-4`}>
        Kommende Termine
      </h2>
      {futureEvents.length === 0 ? (
        <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Keine kommenden Termine</p>
      ) : (
        <div className="space-y-2">
          {futureEvents.map((event) => (
            <button
              key={event.id}
              onClick={() => onEventClick(event)}
              className={`w-full text-left p-3 rounded-lg border ${isDark ? 'border-[#5f6368] hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50'} transition-colors`}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-1 h-full min-h-10 rounded-full shrink-0"
                  style={{ backgroundColor: event.color || '#0d9488' }}
                />
                <div className="flex-1 min-w-0">
                  <div className={`font-medium text-sm md:text-base ${isDark ? 'text-gray-100' : 'text-gray-900'} truncate`}>
                    {event.title}
                  </div>
                  <div className={`text-xs md:text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {new Date(event.start).toLocaleDateString('de-DE', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                    {!event.allDay && (
                      <>
                        {' '}
                        {new Date(event.start).toLocaleTimeString('de-DE', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {' - '}
                        {new Date(event.end).toLocaleTimeString('de-DE', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </>
                    )}
                  </div>
                  {event.location && (
                    <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'} truncate`}>
                      {event.location}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
