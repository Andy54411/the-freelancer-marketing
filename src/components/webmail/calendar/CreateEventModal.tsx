'use client';

import { useState, useEffect } from 'react';
import { 
  X, 
  Clock, 
  Users, 
  Video, 
  MapPin, 
  AlignLeft,
  Calendar as CalendarIcon,
  Globe,
  Bell,
  Loader2,
  Menu,
  CheckCircle2,
  List,
  ChevronDown,
  Info,
} from 'lucide-react';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';
import { ExtendedEventModal } from './ExtendedEventModal';

type EventType = 'event' | 'task' | 'schedule';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: EventFormData) => void;
  initialDate?: Date;
  initialAllDay?: boolean;
  editEvent?: EventFormData | null;
  userEmail: string;
  isLoading?: boolean;
}

export interface MeetingSettings {
  coOrganizers: string[];
  hostMustJoinFirst: boolean;
  allowScreenShare: boolean;
  allowReactions: boolean;
  allowChat: boolean;
  waitingRoom: boolean;
  accessType: 'open' | 'trusted' | 'restricted';
  allowGuestsWithLink: boolean;
}

export interface EventFormData {
  id?: string;
  title: string;
  eventType: EventType;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  timezone: string;
  isRecurring: boolean;
  attendees: string[];
  isVideoMeeting: boolean;
  videoMeetingUrl?: string;
  meetingCode?: string;
  meetingSettings?: MeetingSettings;
  location: string;
  description: string;
  calendarId: string;
  visibility: 'default' | 'public' | 'private';
  reminder: number; // Minuten vorher
  color: string;
  allDay: boolean;
}

const COLORS = [
  { id: 'teal', value: '#0d9488', label: 'Teal' },
  { id: 'blue', value: '#3b82f6', label: 'Blau' },
  { id: 'purple', value: '#8b5cf6', label: 'Violett' },
  { id: 'orange', value: '#f59e0b', label: 'Orange' },
  { id: 'red', value: '#ef4444', label: 'Rot' },
  { id: 'green', value: '#22c55e', label: 'Grün' },
];

export function CreateEventModal({
  isOpen,
  onClose,
  onSave,
  initialDate,
  initialAllDay = false,
  editEvent,
  userEmail,
  isLoading = false,
}: CreateEventModalProps) {
  const { isDark } = useWebmailTheme();
  
  const getDefaultFormData = (): EventFormData => {
    const now = initialDate || new Date();
    const start = new Date(now);
    const end = new Date(now);
    end.setHours(end.getHours() + 1);
    
    return {
      title: '',
      eventType: 'event',
      startDate: start.toISOString().split('T')[0],
      startTime: initialAllDay ? '' : start.toTimeString().slice(0, 5),
      endDate: end.toISOString().split('T')[0],
      endTime: initialAllDay ? '' : end.toTimeString().slice(0, 5),
      timezone: 'Europe/Berlin',
      isRecurring: false,
      attendees: [],
      isVideoMeeting: false,
      location: '',
      description: '',
      calendarId: 'primary',
      visibility: 'default',
      reminder: 30,
      color: '#0d9488',
      allDay: initialAllDay,
    };
  };

  const [formData, setFormData] = useState<EventFormData>(getDefaultFormData());
  const [attendeeInput, setAttendeeInput] = useState('');
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showExtendedModal, setShowExtendedModal] = useState(false);

  useEffect(() => {
    if (editEvent) {
      setFormData(editEvent);
    } else {
      const now = initialDate || new Date();
      const start = new Date(now);
      const end = new Date(now);
      end.setHours(end.getHours() + 1);
      
      setFormData({
        title: '',
        eventType: 'event',
        startDate: start.toISOString().split('T')[0],
        startTime: initialAllDay ? '' : start.toTimeString().slice(0, 5),
        endDate: end.toISOString().split('T')[0],
        endTime: initialAllDay ? '' : end.toTimeString().slice(0, 5),
        timezone: 'Europe/Berlin',
        isRecurring: false,
        attendees: [],
        isVideoMeeting: false,
        location: '',
        description: '',
        calendarId: 'primary',
        visibility: 'default',
        reminder: 30,
        color: '#0d9488',
        allDay: initialAllDay,
      });
    }
  }, [isOpen, editEvent, initialDate, initialAllDay]);

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      return;
    }
    onSave(formData);
  };

  const addAttendee = () => {
    if (attendeeInput.trim() && attendeeInput.includes('@')) {
      setFormData({
        ...formData,
        attendees: [...formData.attendees, attendeeInput.trim()],
      });
      setAttendeeInput('');
    }
  };

  const removeAttendee = (email: string) => {
    setFormData({
      ...formData,
      attendees: formData.attendees.filter((a) => a !== email),
    });
  };

  const _formatDisplayDate = () => {
    const start = new Date(formData.startDate);
    const dayName = start.toLocaleDateString('de-DE', { weekday: 'long' });
    const day = start.getDate();
    const month = start.toLocaleDateString('de-DE', { month: 'long' });
    
    if (formData.allDay) {
      return `${dayName}, ${day}. ${month}`;
    }
    
    return `${dayName}, ${day}. ${month}    ${formData.startTime} - ${formData.endTime}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] md:pt-[10vh]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className={`relative w-full max-w-lg mx-2 md:mx-4 rounded-2xl shadow-2xl overflow-hidden ${
          isDark ? 'bg-[#303134]' : 'bg-white'
        }`}
        style={{ maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 ${isDark ? 'bg-[#303134]' : 'bg-gray-50'}`}>
          <button
            onClick={onClose}
            className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-200 text-gray-600'}`}
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            onClick={onClose}
            className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-200 text-gray-600'}`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content - scrollable */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 130px)' }}>
          <div className="px-4 pb-4">
            {/* Titel Input */}
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Titel hinzufügen"
              className={`w-full text-2xl font-normal py-3 border-b-2 focus:outline-none transition-colors ${
                isDark 
                  ? 'bg-transparent text-white border-gray-600 focus:border-teal-500 placeholder-gray-500' 
                  : 'bg-transparent text-gray-800 border-gray-200 focus:border-teal-500 placeholder-gray-400'
              }`}
              autoFocus
            />

            {/* Event Type Tabs */}
            <div className="flex gap-2 mt-4 mb-6">
              {[
                { key: 'event', label: 'Termin' },
                { key: 'task', label: 'Aufgabe' },
                { key: 'schedule', label: 'Terminplan' },
              ].map((type) => (
                <button
                  key={type.key}
                  onClick={() => setFormData({ ...formData, eventType: type.key as EventType })}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    formData.eventType === type.key
                      ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300'
                      : isDark
                        ? 'text-white hover:bg-white/10'
                        : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>

            {/* Date & Time Row */}
            <div className={`flex items-start gap-4 py-3 ${isDark ? 'text-white' : 'text-gray-700'}`}>
              <Clock className={`h-5 w-5 mt-1 ${isDark ? 'text-white' : 'text-gray-500'}`} />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value, endDate: e.target.value })}
                    className={`px-2 py-1 rounded text-sm ${
                      isDark 
                        ? 'bg-[#3c4043] text-white border-none' 
                        : 'bg-gray-100 text-gray-800 border-none'
                    }`}
                  />
                  {!formData.allDay && (
                    <>
                      <input
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        className={`px-2 py-1 rounded text-sm w-24 ${
                          isDark 
                            ? 'bg-[#3c4043] text-white border-none' 
                            : 'bg-gray-100 text-gray-800 border-none'
                        }`}
                      />
                      <span className={isDark ? 'text-white' : 'text-gray-500'}>-</span>
                      <input
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        className={`px-2 py-1 rounded text-sm w-24 ${
                          isDark 
                            ? 'bg-[#3c4043] text-white border-none' 
                            : 'bg-gray-100 text-gray-800 border-none'
                        }`}
                      />
                    </>
                  )}
                </div>
                <div className={`flex items-center gap-3 mt-2 text-sm ${isDark ? 'text-white' : 'text-gray-500'}`}>
                  {formData.eventType === 'event' && (
                    <>
                      <button className="flex items-center gap-1 hover:underline">
                        <Globe className="h-4 w-4" />
                        Zeitzone
                      </button>
                      <span>-</span>
                    </>
                  )}
                  <button 
                    onClick={() => setFormData({ ...formData, allDay: !formData.allDay })}
                    className={`hover:underline ${formData.allDay ? 'text-teal-500' : ''}`}
                  >
                    {formData.allDay ? 'Ganztägig' : 'Einmalig'}
                  </button>
                </div>
              </div>
            </div>

            {/* Schedule: Info Box */}
            {formData.eventType === 'schedule' && (
              <div className={`mx-0 my-4 p-4 rounded-xl ${isDark ? 'bg-[#3c4043]' : 'bg-gray-100'}`}>
                <div className="flex items-start gap-3">
                  <Info className={`h-5 w-5 mt-0.5 shrink-0 ${isDark ? 'text-white' : 'text-gray-500'}`} />
                  <div>
                    <p className={`text-sm ${isDark ? 'text-white' : 'text-gray-600'}`}>
                      Erstellen Sie eine Reservierungsseite, die Sie für andere Personen freigeben können, damit diese einen Termin bei Ihnen buchen können
                    </p>
                    <div className="flex gap-6 mt-3">
                      <a 
                        href="/hilfe/terminplan/erstellen" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-400 hover:text-blue-300 font-medium"
                      >
                        So gehts
                      </a>
                      <a 
                        href="/hilfe/terminplan/verfuegbarkeit" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-400 hover:text-blue-300 font-medium"
                      >
                        Weitere Informationen
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Task: Frist hinzufügen */}
            {formData.eventType === 'task' && (
              <div className={`flex items-center gap-4 py-3 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                <CheckCircle2 className={`h-5 w-5 ${isDark ? 'text-white' : 'text-gray-500'}`} />
                <span className={`text-sm ${isDark ? 'text-white' : 'text-gray-600'}`}>
                  Frist hinzufügen
                </span>
              </div>
            )}

            {/* Event only: Attendees Row */}
            {formData.eventType === 'event' && (
              <div className={`flex items-start gap-4 py-3 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                <Users className={`h-5 w-5 mt-1 ${isDark ? 'text-white' : 'text-gray-500'}`} />
                <div className="flex-1">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.attendees.map((email) => (
                      <span
                        key={email}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
                          isDark ? 'bg-[#3c4043] text-white' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {email}
                        <button
                          onClick={() => removeAttendee(email)}
                          className="ml-1 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="email"
                    value={attendeeInput}
                    onChange={(e) => setAttendeeInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAttendee())}
                    onBlur={addAttendee}
                    placeholder="Gäste hinzufügen"
                    className={`w-full py-1 text-sm focus:outline-none ${
                      isDark 
                        ? 'bg-transparent text-white placeholder-gray-500' 
                        : 'bg-transparent text-gray-800 placeholder-gray-400'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Event only: Video Meeting Row */}
            {formData.eventType === 'event' && (
              <button
                onClick={() => setFormData({ ...formData, isVideoMeeting: !formData.isVideoMeeting })}
                className={`flex items-center gap-4 py-3 w-full text-left ${isDark ? 'text-white' : 'text-gray-700'}`}
              >
                <Video className={`h-5 w-5 ${formData.isVideoMeeting ? 'text-teal-500' : isDark ? 'text-white' : 'text-gray-500'}`} />
                <span className={formData.isVideoMeeting ? 'text-teal-500' : ''}>
                  {formData.isVideoMeeting ? 'Taskilo Meet-Videokonferenz hinzugefügt' : 'Taskilo Meet-Videokonferenz hinzufügen'}
                </span>
              </button>
            )}

            {/* Event only: Location Row */}
            {formData.eventType === 'event' && (
              <div className={`flex items-start gap-4 py-3 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                <MapPin className={`h-5 w-5 mt-1 ${isDark ? 'text-white' : 'text-gray-500'}`} />
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Ort hinzufügen"
                  className={`flex-1 py-1 text-sm focus:outline-none ${
                    isDark 
                      ? 'bg-transparent text-white placeholder-gray-500' 
                      : 'bg-transparent text-gray-800 placeholder-gray-400'
                  }`}
                />
              </div>
            )}

            {/* Description Row - only for event and task, not schedule */}
            {formData.eventType !== 'schedule' && (
              <div className={`flex items-start gap-4 py-3 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                <AlignLeft className={`h-5 w-5 mt-1 ${isDark ? 'text-white' : 'text-gray-500'}`} />
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Beschreibung hinzufügen"
                  rows={formData.eventType === 'task' ? 4 : 2}
                  className={`flex-1 py-2 px-3 text-sm focus:outline-none resize-none rounded-lg ${
                    formData.eventType === 'task'
                      ? isDark 
                        ? 'bg-[#3c4043] text-white placeholder-gray-400' 
                        : 'bg-gray-100 text-gray-800 placeholder-gray-500'
                      : isDark 
                        ? 'bg-transparent text-white placeholder-gray-500' 
                        : 'bg-transparent text-gray-800 placeholder-gray-400'
                  }`}
                />
              </div>
            )}

            {/* Task: Meine Aufgaben Dropdown */}
            {formData.eventType === 'task' && (
              <div className={`flex items-start gap-4 py-3 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                <List className={`h-5 w-5 mt-1 ${isDark ? 'text-white' : 'text-gray-500'}`} />
                <button
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${
                    isDark 
                      ? 'bg-[#3c4043] text-white' 
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  Meine Aufgaben
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Calendar Selection Row - different for events vs tasks vs schedule */}
            {formData.eventType === 'event' && (
              <div className={`flex items-start gap-4 py-3 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                <CalendarIcon className={`h-5 w-5 mt-1 ${isDark ? 'text-white' : 'text-gray-500'}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{userEmail.split('@')[0]}</span>
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: formData.color }}
                    />
                  </div>
                  <div className={`text-sm mt-1 ${isDark ? 'text-white' : 'text-gray-500'}`}>
                    Beschäftigt - Standardsichtbarkeit - {formData.reminder} Minuten vorher benachr...
                  </div>
                </div>
              </div>
            )}

            {/* Task Footer Info */}
            {formData.eventType === 'task' && (
              <div className={`flex items-start gap-4 py-3 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                <CalendarIcon className={`h-5 w-5 mt-1 ${isDark ? 'text-white' : 'text-gray-500'}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{userEmail.split('@')[0]}</span>
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: formData.color }}
                    />
                  </div>
                  <div className={`text-sm mt-1 ${isDark ? 'text-white' : 'text-gray-500'}`}>
                    Verfügbar - Vertraulich
                  </div>
                </div>
              </div>
            )}

            {/* Schedule: Calendar Footer */}
            {formData.eventType === 'schedule' && (
              <div className={`flex items-center gap-4 py-3 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                <CalendarIcon className={`h-5 w-5 ${isDark ? 'text-white' : 'text-gray-500'}`} />
                <span className="text-sm">{userEmail.split('@')[0]}</span>
              </div>
            )}

            {/* Color Selection */}
            {showMoreOptions && (
              <div className={`flex items-center gap-4 py-3 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                <div className={`h-5 w-5 ${isDark ? 'text-white' : 'text-gray-500'}`} />
                <div className="flex gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        formData.color === color.value ? 'ring-2 ring-offset-2 ring-teal-500 scale-110' : ''
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Reminder */}
            {showMoreOptions && (
              <div className={`flex items-start gap-4 py-3 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                <Bell className={`h-5 w-5 mt-1 ${isDark ? 'text-white' : 'text-gray-500'}`} />
                <select
                  value={formData.reminder}
                  onChange={(e) => setFormData({ ...formData, reminder: parseInt(e.target.value) })}
                  className={`flex-1 py-1 text-sm rounded ${
                    isDark 
                      ? 'bg-[#3c4043] text-white border-none' 
                      : 'bg-gray-100 text-gray-800 border-none'
                  }`}
                >
                  <option value={5}>5 Minuten vorher</option>
                  <option value={10}>10 Minuten vorher</option>
                  <option value={15}>15 Minuten vorher</option>
                  <option value={30}>30 Minuten vorher</option>
                  <option value={60}>1 Stunde vorher</option>
                  <option value={1440}>1 Tag vorher</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Footer - different for schedule */}
        <div className={`flex items-center justify-between px-4 py-3 border-t ${
          isDark ? 'border-gray-600 bg-[#303134]' : 'border-gray-200 bg-gray-50'
        }`}>
          {formData.eventType !== 'schedule' ? (
            <>
              <button
                onClick={() => setShowExtendedModal(true)}
                className={`text-sm font-medium ${
                  isDark ? 'text-teal-400 hover:text-teal-300' : 'text-teal-600 hover:text-teal-700'
                }`}
              >
                Weitere Optionen
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formData.title.trim() || isLoading}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  !formData.title.trim() || isLoading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-teal-100 text-teal-700 hover:bg-teal-200 dark:bg-teal-900/50 dark:text-teal-300 dark:hover:bg-teal-900/70'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Speichern...
                  </span>
                ) : (
                  'Speichern'
                )}
              </button>
            </>
          ) : (
            <div className="flex-1 flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={!formData.title.trim() || isLoading}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  !formData.title.trim() || isLoading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-teal-100 text-teal-700 hover:bg-teal-200 dark:bg-teal-900/50 dark:text-teal-300 dark:hover:bg-teal-900/70'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Einrichten...
                  </span>
                ) : (
                  'Terminplan einrichten'
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Extended Event Modal */}
      <ExtendedEventModal
        isOpen={showExtendedModal}
        onClose={() => setShowExtendedModal(false)}
        onSave={(data) => {
          onSave(data);
          setShowExtendedModal(false);
        }}
        formData={formData}
        setFormData={setFormData}
        userEmail={userEmail}
        isLoading={isLoading}
      />
    </div>
  );
}
