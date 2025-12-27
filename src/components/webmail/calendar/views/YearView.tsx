'use client';

import { useCallback, useState } from 'react';
import { CalendarViewProps } from '../types';

export function YearView({
  currentDate,
  events,
  onEventClick: _onEventClick,
  onTimeSlotClick,
  onSwipePrev,
  onSwipeNext,
  isDark,
}: CalendarViewProps) {
  // _onEventClick wird in YearView nicht direkt verwendet, da Klicks auf Tage zu onTimeSlotClick delegiert werden
  void _onEventClick;
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

  const months = Array.from({ length: 12 }, (_, i) => i);
  const monthNames = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];
  const shortMonthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  const dayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  const getDaysForMonth = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = (firstDay.getDay() + 6) % 7; // Monday = 0
    const daysInMonth = lastDay.getDate();

    const days: (Date | null)[] = [];
    
    // Empty slots for days before first of month
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    
    // Days of month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const year = currentDate.getFullYear();

  return (
    <div 
      className={`flex-1 overflow-y-auto ${isDark ? 'bg-[#202124]' : 'bg-white'} p-2 md:p-4`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
        {months.map((month) => {
          const days = getDaysForMonth(year, month);
          const isCurrentMonth = month === new Date().getMonth() && year === new Date().getFullYear();

          return (
            <div
              key={month}
              className={`p-2 md:p-3 rounded-lg border ${isDark ? 'border-[#5f6368]' : 'border-gray-200'} ${
                isCurrentMonth ? (isDark ? 'bg-teal-500/10' : 'bg-teal-50/30') : ''
              }`}
            >
              {/* Month header */}
              <div className={`text-xs md:text-sm font-medium mb-2 ${isCurrentMonth ? 'text-teal-500' : (isDark ? 'text-white' : 'text-gray-700')}`}>
                <span className="hidden md:inline">{monthNames[month]}</span>
                <span className="md:hidden">{shortMonthNames[month]}</span>
              </div>

              {/* Day names - nur auf Desktop */}
              <div className="hidden md:grid grid-cols-7 gap-0.5 mb-1">
                {dayNames.map((day) => (
                  <div key={day} className={`text-[8px] text-center ${isDark ? 'text-gray-500' : 'text-white'}`}>
                    {day}
                  </div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-0.5">
                {days.map((day, index) => {
                  if (!day) {
                    return <div key={`empty-${index}`} className="aspect-square" />;
                  }

                  const today = isToday(day);
                  const hasEvents = getEventsForDay(day).length > 0;

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => onTimeSlotClick(day, true)}
                      className={`aspect-square flex items-center justify-center text-[8px] md:text-[10px] rounded-full transition-colors ${
                        today
                          ? 'bg-teal-600 text-white font-medium'
                          : isDark
                          ? 'text-white hover:bg-white/10'
                          : 'text-gray-700 hover:bg-gray-100'
                      } ${hasEvents && !today ? 'font-bold' : ''}`}
                    >
                      {day.getDate()}
                      {hasEvents && !today && (
                        <span className="absolute bottom-0 w-1 h-1 rounded-full bg-teal-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
