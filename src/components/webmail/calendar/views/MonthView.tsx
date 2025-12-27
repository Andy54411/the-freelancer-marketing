'use client';

import { useCallback, useState } from 'react';
import { CalendarViewProps } from '../types';

export function MonthView({
  currentDate,
  events,
  onEventClick,
  onTimeSlotClick,
  onSwipePrev,
  onSwipeNext,
  isDark,
}: CalendarViewProps) {
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

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
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
    <div 
      className={`flex-1 flex flex-col overflow-hidden ${isDark ? 'bg-[#202124]' : 'bg-white'}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Day headers */}
      <div className={`grid grid-cols-7 border-b ${isDark ? 'border-[#5f6368]' : 'border-gray-200'}`}>
        {['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'].map((day) => (
          <div key={day} className={`p-1 md:p-2 text-center text-[10px] md:text-xs font-medium ${isDark ? 'text-white border-[#5f6368]' : 'text-gray-500 border-gray-200'} border-r last:border-r-0`}>
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
              className={`border-b border-r ${isDark ? 'border-[#5f6368]' : 'border-gray-200'} p-0.5 md:p-1 overflow-hidden cursor-pointer ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'} ${
                !currentMonth ? (isDark ? 'bg-[#171717]' : 'bg-gray-50/50') : ''
              } ${today ? (isDark ? 'bg-teal-500/10' : 'bg-teal-50/30') : ''}`}
              onClick={() => onTimeSlotClick(day, true)}
            >
              <div className="flex justify-center mb-0.5 md:mb-1">
                <span
                  className={`w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-[10px] md:text-xs ${
                    today
                      ? 'bg-teal-600 text-white font-medium'
                      : currentMonth
                      ? (isDark ? 'text-white' : 'text-gray-700')
                      : (isDark ? 'text-gray-500' : 'text-white')
                  }`}
                >
                  {day.getDate()}
                </span>
              </div>
              <div className="space-y-0.5 hidden md:block">
                {dayEvents.slice(0, 2).map((event) => (
                  <button
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    className="w-full text-left text-[8px] md:text-[10px] px-0.5 md:px-1 py-0.5 rounded truncate"
                    style={{ backgroundColor: event.color || '#0d9488', color: 'white' }}
                  >
                    {event.title}
                  </button>
                ))}
                {dayEvents.length > 2 && (
                  <div className={`text-[8px] md:text-[10px] ${isDark ? 'text-white' : 'text-gray-500'} px-0.5 md:px-1`}>
                    +{dayEvents.length - 2}
                  </div>
                )}
              </div>
              {/* Mobile: nur Punkt wenn Events vorhanden */}
              <div className="flex justify-center md:hidden">
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5">
                    {dayEvents.slice(0, 3).map((event, i) => (
                      <div 
                        key={i} 
                        className="w-1.5 h-1.5 rounded-full" 
                        style={{ backgroundColor: event.color || '#0d9488' }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
