'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { CalendarViewProps, CalendarEvent } from '../types';

export function DayView({
  currentDate,
  events,
  onEventClick,
  onTimeSlotClick,
  onSwipePrev,
  onSwipeNext,
  isDark,
}: CalendarViewProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance && onSwipeNext) {
      onSwipeNext();
    }
    if (distance < -minSwipeDistance && onSwipePrev) {
      onSwipePrev();
    }
  }, [touchStart, touchEnd, onSwipeNext, onSwipePrev]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      const now = new Date();
      const currentHour = now.getHours();
      const scrollPosition = currentHour * 48 - 200;
      scrollContainerRef.current.scrollTop = Math.max(0, scrollPosition);
    }
  }, []);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const formatDayName = (date: Date) => {
    return date.toLocaleDateString('de-DE', { weekday: 'short' }).replace('.', '');
  };

  const getEventsForDay = (date: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.start);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const getAllDayEvents = (date: Date) => getEventsForDay(date).filter((e) => e.allDay);
  const getTimedEvents = (date: Date) => getEventsForDay(date).filter((e) => !e.allDay);

  const getEventPosition = (event: CalendarEvent) => {
    const start = new Date(event.start);
    const end = new Date(event.end);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const duration = endMinutes - startMinutes;
    return {
      top: (startMinutes / 60) * 48,
      height: Math.max((duration / 60) * 48, 24),
    };
  };

  const getCurrentTimePosition = () => {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    return (minutes / 60) * 48;
  };

  return (
    <div 
      className={`flex-1 flex flex-col overflow-hidden ${isDark ? 'bg-[#202124]' : 'bg-white'}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Header */}
      <div className={`flex border-b ${isDark ? 'border-[#5f6368] bg-[#202124]' : 'border-gray-200 bg-white'} sticky top-0 z-10`}>
        <div className={`w-12 md:w-16 shrink-0 border-r ${isDark ? 'border-[#5f6368]' : 'border-gray-200'}`}>
          <div className="h-12 flex items-end justify-center pb-1">
            <span className={`text-[10px] md:text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>GMT+01</span>
          </div>
        </div>
        <div className={`flex-1 ${isToday(currentDate) ? (isDark ? 'bg-teal-500/10' : 'bg-teal-50/30') : ''}`}>
          <div className="h-12 flex flex-col items-center justify-center">
            <span className={`text-xs font-medium ${isToday(currentDate) ? 'text-teal-500' : (isDark ? 'text-gray-400' : 'text-gray-500')}`}>
              {formatDayName(currentDate)}
            </span>
            <span
              className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-medium ${
                isToday(currentDate) ? 'bg-teal-600 text-white' : (isDark ? 'text-gray-200' : 'text-gray-700')
              }`}
            >
              {currentDate.getDate()}
            </span>
          </div>
        </div>
      </div>

      {/* All-day events */}
      <div className={`flex border-b ${isDark ? 'border-[#5f6368]' : 'border-gray-200'} min-h-8`}>
        <div className={`w-12 md:w-16 shrink-0 border-r ${isDark ? 'border-[#5f6368]' : 'border-gray-200'}`} />
        <div className={`flex-1 p-0.5 ${isToday(currentDate) ? (isDark ? 'bg-teal-500/10' : 'bg-teal-50/30') : ''}`}>
          {getAllDayEvents(currentDate).map((event) => (
            <button
              key={event.id}
              onClick={() => onEventClick(event)}
              className="w-full text-left text-xs px-1 py-0.5 rounded truncate mb-0.5"
              style={{ backgroundColor: event.color || '#0d9488', color: 'white' }}
            >
              {event.title}
            </button>
          ))}
        </div>
      </div>

      {/* Time grid */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        <div className="flex relative">
          <div className={`w-12 md:w-16 shrink-0 border-r ${isDark ? 'border-[#5f6368]' : 'border-gray-200'}`}>
            {hours.map((hour) => (
              <div key={hour} className="h-12 relative">
                <span className={`absolute -top-2 right-1 md:right-2 text-[10px] md:text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {hour.toString().padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          <div className={`flex-1 relative ${isToday(currentDate) ? (isDark ? 'bg-teal-500/5' : 'bg-teal-50/10') : ''}`}>
            {hours.map((hour) => (
              <div
                key={hour}
                className={`h-12 border-b ${isDark ? 'border-[#3c4043] hover:bg-white/5' : 'border-gray-100 hover:bg-gray-50'} cursor-pointer`}
                onClick={() => {
                  const clickDate = new Date(currentDate);
                  clickDate.setHours(hour, 0, 0, 0);
                  onTimeSlotClick(clickDate, false);
                }}
              />
            ))}

            {isToday(currentDate) && (
              <div
                className="absolute left-0 right-0 flex items-center z-20 pointer-events-none"
                style={{ top: getCurrentTimePosition() }}
              >
                <div className="w-3 h-3 rounded-full bg-red-500 -ml-1.5" />
                <div className="flex-1 h-0.5 bg-red-500" />
              </div>
            )}

            {getTimedEvents(currentDate).map((event) => {
              const position = getEventPosition(event);
              return (
                <button
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className="absolute left-1 right-1 md:left-2 md:right-2 rounded px-1 md:px-2 py-1 text-xs md:text-sm text-left overflow-hidden z-10 hover:opacity-90 transition-opacity"
                  style={{
                    top: position.top,
                    height: position.height,
                    backgroundColor: event.color || '#0d9488',
                    color: 'white',
                  }}
                >
                  <div className="font-medium truncate">{event.title}</div>
                  {position.height > 36 && (
                    <div className="text-[10px] md:text-xs opacity-80">
                      {new Date(event.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                      {event.location && ` - ${event.location}`}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
