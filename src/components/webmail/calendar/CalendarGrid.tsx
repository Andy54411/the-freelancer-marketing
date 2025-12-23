'use client';

import { useWebmailTheme } from '@/contexts/WebmailThemeContext';
import { 
  DayView, 
  WeekView, 
  FourDaysView, 
  MonthView, 
  YearView, 
  AgendaView 
} from './views';
import { CalendarEvent } from './types';

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

  const viewProps = {
    currentDate,
    events,
    onEventClick,
    onTimeSlotClick,
    onSwipePrev,
    onSwipeNext,
    isDark,
  };

  switch (viewMode) {
    case 'day':
      return <DayView {...viewProps} />;
    case 'week':
      return <WeekView {...viewProps} />;
    case '4days':
      return <FourDaysView {...viewProps} />;
    case 'month':
      return <MonthView {...viewProps} />;
    case 'agenda':
      return <AgendaView {...viewProps} />;
    case 'year':
      return <YearView {...viewProps} />;
    default:
      return <WeekView {...viewProps} />;
  }
}
