'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { CalendarViewProps, CalendarEvent } from '../types';

export function WeekView({
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

  const getWeekDays = () => {
    const days: Date[] = [];
    const startOfWeek = new Date(currentDate);
    const dayOfWeek = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const weekDays = getWeekDays();

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
      {/* Header with day names */}
      <div className={`flex ${isDark ? 'border-[#5f6368] bg-[#202124]' : 'border-gray-200 bg-white'} border-b sticky top-0 z-10`}>
        {/* Timezone column */}
        <div className={`w-10 md:w-16 shrink-0 border-r ${isDark ? 'border-[#5f6368]' : 'border-gray-200'}`}>
          <div className="h-12 flex items-end justify-center pb-1">
            <span className={`text-[8px] md:text-xs ${isDark ? 'text-white' : 'text-gray-500'}`}>GMT+01</span>
          </div>
        </div>

        {/* Day columns headers */}
        {weekDays.map((day, index) => (
          <div
            key={index}
            className={`flex-1 min-w-0 border-r ${isDark ? 'border-[#5f6368]' : 'border-gray-200'} last:border-r-0 ${
              isToday(day) ? (isDark ? 'bg-teal-500/10' : 'bg-teal-50/30') : ''
            }`}
          >
            <div className="h-12 flex flex-col items-center justify-center">
              <span className={`text-[10px] md:text-xs font-medium ${isToday(day) ? 'text-teal-500' : (isDark ? 'text-white' : 'text-gray-500')}`}>
                {formatDayName(day)}
              </span>
              <button
                onClick={() => onTimeSlotClick(day, true)}
                className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-sm md:text-lg font-medium transition-colors ${
                  isToday(day)
                    ? 'bg-teal-600 text-white'
                    : (isDark ? 'text-white hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100')
                }`}
              >
                {day.getDate()}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* All-day events row */}
      <div className={`flex border-b ${isDark ? 'border-[#5f6368]' : 'border-gray-200'} min-h-6 md:min-h-8`}>
        <div className={`w-10 md:w-16 shrink-0 border-r ${isDark ? 'border-[#5f6368]' : 'border-gray-200'}`} />
        {weekDays.map((day, index) => {
          const allDayEvents = getAllDayEvents(day);
          return (
            <div
              key={index}
              className={`flex-1 min-w-0 border-r ${isDark ? 'border-[#5f6368]' : 'border-gray-200'} last:border-r-0 p-0.5 ${
                isToday(day) ? (isDark ? 'bg-teal-500/10' : 'bg-teal-50/30') : ''
              }`}
              onClick={() => onTimeSlotClick(day, true)}
            >
              {allDayEvents.slice(0, 1).map((event) => (
                <button
                  key={event.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(event);
                  }}
                  className="w-full text-left text-[8px] md:text-xs px-0.5 md:px-1 py-0.5 rounded truncate"
                  style={{ backgroundColor: event.color || '#0d9488', color: 'white' }}
                >
                  {event.title}
                </button>
              ))}
              {allDayEvents.length > 1 && (
                <span className={`text-[8px] ${isDark ? 'text-white' : 'text-gray-500'}`}>+{allDayEvents.length - 1}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex relative">
          {/* Time labels column */}
          <div className={`w-10 md:w-16 shrink-0 border-r ${isDark ? 'border-[#5f6368]' : 'border-gray-200'}`}>
            {hours.map((hour) => (
              <div key={hour} className="h-12 relative">
                <span className={`absolute -top-2 right-0.5 md:right-2 text-[8px] md:text-xs ${isDark ? 'text-white' : 'text-gray-500'}`}>
                  {hour.toString().padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day, dayIndex) => {
            const timedEvents = getTimedEvents(day);
            const showCurrentTime = isToday(day);

            return (
              <div
                key={dayIndex}
                className={`flex-1 min-w-0 border-r ${isDark ? 'border-[#5f6368]' : 'border-gray-200'} last:border-r-0 relative ${
                  isToday(day) ? (isDark ? 'bg-teal-500/5' : 'bg-teal-50/10') : ''
                }`}
              >
                {/* Hour grid lines */}
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className={`h-12 border-b ${isDark ? 'border-[#3c4043] hover:bg-white/5' : 'border-gray-100 hover:bg-gray-50'} cursor-pointer`}
                    onClick={() => {
                      const clickDate = new Date(day);
                      clickDate.setHours(hour, 0, 0, 0);
                      onTimeSlotClick(clickDate, false);
                    }}
                  />
                ))}

                {/* Current time indicator */}
                {showCurrentTime && (
                  <div
                    className="absolute left-0 right-0 flex items-center z-20 pointer-events-none"
                    style={{ top: getCurrentTimePosition() }}
                  >
                    <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-red-500 -ml-1" />
                    <div className="flex-1 h-0.5 bg-red-500" />
                  </div>
                )}

                {/* Events */}
                {timedEvents.map((event) => {
                  const position = getEventPosition(event);
                  return (
                    <button
                      key={event.id}
                      onClick={() => onEventClick(event)}
                      className="absolute left-0.5 right-0.5 md:left-1 md:right-1 rounded px-0.5 md:px-1 py-0.5 text-[8px] md:text-xs text-left overflow-hidden z-10 hover:opacity-90 transition-opacity"
                      style={{
                        top: position.top,
                        height: position.height,
                        backgroundColor: event.color || '#0d9488',
                        color: 'white',
                      }}
                    >
                      <div className="font-medium truncate">{event.title}</div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
