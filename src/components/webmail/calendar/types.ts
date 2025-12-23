export interface CalendarEvent {
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

export interface CalendarViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onTimeSlotClick: (date: Date, allDay: boolean) => void;
  onSwipePrev?: () => void;
  onSwipeNext?: () => void;
  isDark: boolean;
}
