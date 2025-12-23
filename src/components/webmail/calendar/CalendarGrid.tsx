'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';

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

interface CalendarGridProps {
  currentDate: Date;
  viewMode: 'day' | 'week' | 'month' | 'year' | 'agenda' | '4days';
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onTimeSlotClick: (date: Date, allDay: boolean) => void;
  onSwipePrev?: () => void;
  onSwipeNext?: () => void;
}

export function CalendarGrid({
  currentDate,
  viewMode,
  events,
  onEventClick,
  onTimeSlotClick,
  onSwipePrev,
  onSwipeNext,
}: CalendarGridProps) {
  const { isDark } = useWebmailTheme();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Minimum swipe distance (in px)
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
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && onSwipeNext) {
      onSwipeNext();
    }
    if (isRightSwipe && onSwipePrev) {
      onSwipePrev();
    }
  }, [touchStart, touchEnd, onSwipeNext, onSwipePrev]);

  // Scroll to current time on mount
  useEffect(() => {
    if (scrollContainerRef.current && (viewMode === 'week' || viewMode === 'day' || viewMode === '4days')) {
      const now = new Date();
      const currentHour = now.getHours();
      const scrollPosition = currentHour * 48 - 200; // 48px per hour, offset to show some hours before
      scrollContainerRef.current.scrollTop = Math.max(0, scrollPosition);
    }
  }, [viewMode]);

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

  const get4Days = () => {
    const days: Date[] = [];
    for (let i = 0; i < 4; i++) {
      const day = new Date(currentDate);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  };

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

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const weekDays = getWeekDays();

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

  const getAllDayEvents = (date: Date) => {
    return getEventsForDay(date).filter((e) => e.allDay);
  };

  const getTimedEvents = (date: Date) => {
    return getEventsForDay(date).filter((e) => !e.allDay);
  };

  const getEventPosition = (event: CalendarEvent) => {
    const start = new Date(event.start);
    const end = new Date(event.end);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const duration = endMinutes - startMinutes;

    return {
      top: (startMinutes / 60) * 48, // 48px per hour
      height: Math.max((duration / 60) * 48, 24), // Minimum 24px height
    };
  };

  const getCurrentTimePosition = () => {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    return (minutes / 60) * 48;
  };

  const renderWeekView = () => (
    <div className={`flex-1 flex flex-col overflow-hidden ${isDark ? 'bg-[#202124]' : 'bg-white'}`}>
      {/* Header with day names */}
      <div className={`flex ${isDark ? 'border-[#5f6368] bg-[#202124]' : 'border-gray-200 bg-white'} border-b sticky top-0 z-10`}>
        {/* Timezone column */}
        <div className={`w-16 shrink-0 border-r ${isDark ? 'border-[#5f6368]' : 'border-gray-200'}`}>
          <div className="h-12 flex items-end justify-center pb-1">
            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>GMT+01</span>
          </div>
        </div>

        {/* Day columns headers */}
        {weekDays.map((day, index) => (
          <div
            key={index}
            className={`flex-1 border-r ${isDark ? 'border-[#5f6368]' : 'border-gray-200'} last:border-r-0 ${
              isToday(day) ? (isDark ? 'bg-teal-500/10' : 'bg-teal-50/30') : ''
            }`}
          >
            <div className="h-12 flex flex-col items-center justify-center">
              <span className={`text-xs font-medium ${isToday(day) ? 'text-teal-500' : (isDark ? 'text-gray-400' : 'text-gray-500')}`}>
                {formatDayName(day)}
              </span>
              <button
                onClick={() => onTimeSlotClick(day, true)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-medium transition-colors ${
                  isToday(day)
                    ? 'bg-teal-600 text-white'
                    : (isDark ? 'text-gray-200 hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100')
                }`}
              >
                {day.getDate()}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* All-day events row */}
      <div className={`flex border-b ${isDark ? 'border-[#5f6368]' : 'border-gray-200'} min-h-8`}>
        <div className={`w-16 shrink-0 border-r ${isDark ? 'border-[#5f6368]' : 'border-gray-200'}`} />
        {weekDays.map((day, index) => {
          const allDayEvents = getAllDayEvents(day);
          return (
            <div
              key={index}
              className={`flex-1 border-r ${isDark ? 'border-[#5f6368]' : 'border-gray-200'} last:border-r-0 p-0.5 ${
                isToday(day) ? (isDark ? 'bg-teal-500/10' : 'bg-teal-50/30') : ''
              }`}
              onClick={() => onTimeSlotClick(day, true)}
            >
              {allDayEvents.map((event) => (
                <button
                  key={event.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(event);
                  }}
                  className="w-full text-left text-xs px-1 py-0.5 rounded truncate"
                  style={{ backgroundColor: event.color || '#0d9488', color: 'white' }}
                >
                  {event.title}
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        <div className="flex relative">
          {/* Time labels column */}
          <div className={`w-16 shrink-0 border-r ${isDark ? 'border-[#5f6368]' : 'border-gray-200'}`}>
            {hours.map((hour) => (
              <div key={hour} className="h-12 relative">
                <span className={`absolute -top-2 right-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
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
                className={`flex-1 border-r ${isDark ? 'border-[#5f6368]' : 'border-gray-200'} last:border-r-0 relative ${
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
                    <div className="w-3 h-3 rounded-full bg-red-500 -ml-1.5" />
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
                      className="absolute left-1 right-1 rounded px-1 py-0.5 text-xs text-left overflow-hidden z-10 hover:opacity-90 transition-opacity"
                      style={{
                        top: position.top,
                        height: position.height,
                        backgroundColor: event.color || '#0d9488',
                        color: 'white',
                      }}
                    >
                      <div className="font-medium truncate">{event.title}</div>
                      {position.height > 36 && (
                        <div className="text-[10px] opacity-80 truncate">
                          {new Date(event.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
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

  const renderDayView = () => (
    <div 
      className={`flex-1 flex flex-col overflow-hidden ${isDark ? 'bg-[#202124]' : 'bg-white'}`}
      ref={gridContainerRef}
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
                  className="absolute left-2 right-2 rounded px-2 py-1 text-sm text-left overflow-hidden z-10 hover:opacity-90 transition-opacity"
                  style={{
                    top: position.top,
                    height: position.height,
                    backgroundColor: event.color || '#0d9488',
                    color: 'white',
                  }}
                >
                  <div className="font-medium truncate">{event.title}</div>
                  {position.height > 36 && (
                    <div className="text-xs opacity-80">
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

  const renderMonthView = () => {
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDay = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    const days: Date[] = [];
    
    // Previous month days
    for (let i = startDay - 1; i >= 0; i--) {
      const day = new Date(currentDate.getFullYear(), currentDate.getMonth(), -i);
      days.push(day);
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
    }
    
    // Next month days to fill grid
    const remainingSlots = 42 - days.length;
    for (let i = 1; i <= remainingSlots; i++) {
      days.push(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i));
    }

    const isCurrentMonthDay = (date: Date) => date.getMonth() === currentDate.getMonth();

    return (
      <div className={`flex-1 flex flex-col overflow-hidden ${isDark ? 'bg-[#202124]' : 'bg-white'}`}>
        {/* Day headers */}
        <div className={`grid grid-cols-7 border-b ${isDark ? 'border-[#5f6368]' : 'border-gray-200'}`}>
          {['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'].map((day) => (
            <div key={day} className={`p-2 text-center text-xs font-medium ${isDark ? 'text-gray-400 border-[#5f6368]' : 'text-gray-500 border-gray-200'} border-r last:border-r-0`}>
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="flex-1 grid grid-cols-7 grid-rows-6 overflow-hidden">
          {days.map((day, index) => {
            const dayEvents = getEventsForDay(day);
            const today = isToday(day);
            const currentMonth = isCurrentMonthDay(day);

            return (
              <div
                key={index}
                className={`border-b border-r ${isDark ? 'border-[#5f6368]' : 'border-gray-200'} p-1 overflow-hidden cursor-pointer ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'} ${
                  !currentMonth ? (isDark ? 'bg-[#171717]' : 'bg-gray-50/50') : ''
                } ${today ? (isDark ? 'bg-teal-500/10' : 'bg-teal-50/30') : ''}`}
                onClick={() => onTimeSlotClick(day, true)}
              >
                <div className="flex justify-center mb-1">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      today
                        ? 'bg-teal-600 text-white font-medium'
                        : currentMonth
                        ? (isDark ? 'text-gray-200' : 'text-gray-700')
                        : (isDark ? 'text-gray-500' : 'text-gray-400')
                    }`}
                  >
                    {day.getDate()}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((event) => (
                    <button
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                      className="w-full text-left text-[10px] px-1 py-0.5 rounded truncate"
                      style={{ backgroundColor: event.color || '#0d9488', color: 'white' }}
                    >
                      {event.title}
                    </button>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'} px-1`}>
                      +{dayEvents.length - 3} weitere
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAgendaView = () => {
    const sortedEvents = [...events].sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );
    const futureEvents = sortedEvents.filter(
      (e) => new Date(e.start) >= new Date(new Date().setHours(0, 0, 0, 0))
    );

    return (
      <div className={`flex-1 overflow-y-auto ${isDark ? 'bg-[#202124]' : 'bg-white'} p-6`}>
        <h2 className={`text-lg font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'} mb-4`}>Kommende Termine</h2>
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
                    className="w-1 h-full min-h-10 rounded-full"
                    style={{ backgroundColor: event.color || '#0d9488' }}
                  />
                  <div className="flex-1">
                    <div className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{event.title}</div>
                    <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {new Date(event.start).toLocaleDateString('de-DE', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
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
                      <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{event.location}</div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const render4DaysView = () => {
    const days = get4Days();
    
    return (
      <div className={`flex-1 flex flex-col overflow-hidden ${isDark ? 'bg-[#202124]' : 'bg-white'}`}>
        {/* Header with day names */}
        <div className={`flex border-b ${isDark ? 'border-[#5f6368] bg-[#202124]' : 'border-gray-200 bg-white'} sticky top-0 z-10`}>
          {/* Timezone column */}
          <div className={`w-16 shrink-0 border-r ${isDark ? 'border-[#5f6368]' : 'border-gray-200'}`}>
            <div className="h-12 flex items-end justify-center pb-1">
              <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>GMT+01</span>
            </div>
          </div>

          {/* Day columns headers */}
          {days.map((day, index) => (
            <div
              key={index}
              className={`flex-1 border-r ${isDark ? 'border-[#5f6368]' : 'border-gray-200'} last:border-r-0 ${
                isToday(day) ? (isDark ? 'bg-teal-500/10' : 'bg-teal-50/30') : ''
              }`}
            >
              <div className="h-12 flex flex-col items-center justify-center">
                <span className={`text-xs font-medium ${isToday(day) ? 'text-teal-500' : (isDark ? 'text-gray-400' : 'text-gray-500')}`}>
                  {formatDayName(day)}
                </span>
                <button
                  onClick={() => onTimeSlotClick(day, true)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-medium transition-colors ${
                    isToday(day)
                      ? 'bg-teal-600 text-white'
                      : (isDark ? 'text-gray-200 hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100')
                  }`}
                >
                  {day.getDate()}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* All-day events row */}
        <div className={`flex border-b ${isDark ? 'border-[#5f6368]' : 'border-gray-200'} min-h-8`}>
          <div className={`w-16 shrink-0 border-r ${isDark ? 'border-[#5f6368]' : 'border-gray-200'}`} />
          {days.map((day, index) => {
            const allDayEvents = getAllDayEvents(day);
            return (
              <div
                key={index}
                className={`flex-1 border-r ${isDark ? 'border-[#5f6368]' : 'border-gray-200'} last:border-r-0 p-0.5 ${
                  isToday(day) ? (isDark ? 'bg-teal-500/10' : 'bg-teal-50/30') : ''
                }`}
                onClick={() => onTimeSlotClick(day, true)}
              >
                {allDayEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    className="w-full text-left text-xs px-1 py-0.5 rounded truncate"
                    style={{ backgroundColor: event.color || '#0d9488', color: 'white' }}
                  >
                    {event.title}
                  </button>
                ))}
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
          <div className="flex relative">
            {/* Time labels column */}
            <div className={`w-16 shrink-0 border-r ${isDark ? 'border-[#5f6368]' : 'border-gray-200'}`}>
              {hours.map((hour) => (
                <div key={hour} className="h-12 relative">
                  <span className={`absolute -top-2 right-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map((day, dayIndex) => {
              const timedEvents = getTimedEvents(day);
              const showCurrentTime = isToday(day);

              return (
                <div
                  key={dayIndex}
                  className={`flex-1 border-r ${isDark ? 'border-[#5f6368]' : 'border-gray-200'} last:border-r-0 relative ${
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
                      <div className="w-3 h-3 rounded-full bg-red-500 -ml-1.5" />
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
                        className="absolute left-1 right-1 rounded px-1 py-0.5 text-xs text-left overflow-hidden z-10 hover:opacity-90 transition-opacity"
                        style={{
                          top: position.top,
                          height: position.height,
                          backgroundColor: event.color || '#0d9488',
                          color: 'white',
                        }}
                      >
                        <div className="font-medium truncate">{event.title}</div>
                        {position.height > 36 && (
                          <div className="text-[10px] opacity-80 truncate">
                            {new Date(event.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
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
  };

  switch (viewMode) {
    case 'day':
      return renderDayView();
    case 'week':
      return renderWeekView();
    case '4days':
      return render4DaysView();
    case 'month':
      return renderMonthView();
    case 'agenda':
      return renderAgendaView();
    case 'year':
      // For year view, show month view as fallback
      return renderMonthView();
    default:
      return renderWeekView();
  }
}
