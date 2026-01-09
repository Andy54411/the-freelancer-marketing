'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Video, 
  MapPin, 
  Bell,
  Loader2,
  Plus,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  Strikethrough,
} from 'lucide-react';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';
import { EventFormData, MeetingSettings } from './CreateEventModal';
import { MeetingSettingsModal } from './MeetingSettingsModal';
import useModernMaps from '@/hooks/useModernMaps';

interface ExtendedEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: EventFormData) => void;
  formData: EventFormData;
  setFormData: (data: EventFormData) => void;
  userEmail: string;
  isLoading?: boolean;
}

const COLORS = [
  { id: 'teal', value: '#0d9488', label: 'Teal' },
  { id: 'blue', value: '#3b82f6', label: 'Blau' },
  { id: 'purple', value: '#8b5cf6', label: 'Violett' },
  { id: 'orange', value: '#f59e0b', label: 'Orange' },
  { id: 'red', value: '#ef4444', label: 'Rot' },
  { id: 'green', value: '#22c55e', label: 'Grün' },
  { id: 'pink', value: '#ec4899', label: 'Pink' },
  { id: 'cyan', value: '#06b6d4', label: 'Cyan' },
  { id: 'amber', value: '#d97706', label: 'Bernstein' },
  { id: 'indigo', value: '#6366f1', label: 'Indigo' },
];

const REMINDER_OPTIONS = [
  { value: 0, label: 'Keine Benachrichtigung' },
  { value: 5, label: '5 Minuten vorher' },
  { value: 10, label: '10 Minuten vorher' },
  { value: 15, label: '15 Minuten vorher' },
  { value: 30, label: '30 Minuten vorher' },
  { value: 60, label: '1 Stunde vorher' },
  { value: 120, label: '2 Stunden vorher' },
  { value: 1440, label: '1 Tag vorher' },
  { value: 2880, label: '2 Tage vorher' },
  { value: 10080, label: '1 Woche vorher' },
];

const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'Einmalig' },
  { value: 'daily', label: 'Täglich' },
  { value: 'weekly', label: 'Wöchentlich' },
  { value: 'monthly', label: 'Monatlich' },
  { value: 'yearly', label: 'Jährlich' },
  { value: 'weekdays', label: 'Jeden Werktag (Mo-Fr)' },
];

export function ExtendedEventModal({
  isOpen,
  onClose,
  onSave,
  formData,
  setFormData,
  userEmail,
  isLoading = false,
}: ExtendedEventModalProps) {
  const { isDark } = useWebmailTheme();
  const { createAutocomplete, isLoaded: mapsLoaded } = useModernMaps();
  const locationInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'findTime'>('details');
  const [attendeeInput, setAttendeeInput] = useState('');
  const [reminders, setReminders] = useState<number[]>([formData.reminder]);
  const [isMeetingLoading, setIsMeetingLoading] = useState(false);
  const [showMeetingSettings, setShowMeetingSettings] = useState(false);

  // Default Meeting Settings
  const defaultMeetingSettings: MeetingSettings = {
    coOrganizers: [],
    hostMustJoinFirst: false,
    allowScreenShare: true,
    allowReactions: true,
    allowChat: true,
    waitingRoom: true,
    accessType: 'trusted',
    allowGuestsWithLink: true,
  };

  useEffect(() => {
    if (isOpen) {
      setReminders([formData.reminder]);
    }
  }, [isOpen, formData.reminder]);

  // Google Places Autocomplete für Location
  useEffect(() => {
    if (isOpen && mapsLoaded && locationInputRef.current && createAutocomplete) {
      const cleanup = createAutocomplete(locationInputRef.current, {
        onPlaceSelected: (place) => {
          if (place.address) {
            setFormData({ ...formData, location: place.address });
          }
        },
      });
      return cleanup;
    }
    return undefined;
  }, [isOpen, mapsLoaded, createAutocomplete, formData, setFormData]);

  // Meeting-Raum erstellen
  const handleAddMeeting = async () => {
    setIsMeetingLoading(true);
    try {
      const currentSettings = formData.meetingSettings || defaultMeetingSettings;
      
      const response = await fetch('/api/webmail/meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          userId: userEmail,
          name: formData.title || 'Taskilo Meeting',
          type: 'scheduled',
          settings: {
            allowGuests: currentSettings.accessType === 'open',
            waitingRoom: currentSettings.waitingRoom,
            allowScreenShare: currentSettings.allowScreenShare,
            allowChat: currentSettings.allowChat,
          },
          metadata: { 
            source: 'webmail',
            coOrganizers: currentSettings.coOrganizers,
          },
        }),
      });

      const data = await response.json();

      if (data.success && data.room) {
        setFormData({
          ...formData,
          isVideoMeeting: true,
          videoMeetingUrl: data.room.url,
          meetingCode: data.room.code,
          meetingSettings: currentSettings,
        });
      }
    } finally {
      setIsMeetingLoading(false);
    }
  };

  // Meeting-Einstellungen speichern und an API senden
  const handleSaveMeetingSettings = async (settings: MeetingSettings) => {
    // Lokal speichern
    setFormData({
      ...formData,
      meetingSettings: settings,
    });

    // Wenn ein Meeting existiert, Einstellungen an API senden
    if (formData.meetingCode) {
      try {
        await fetch('/api/webmail/meeting', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'updateSettings',
            code: formData.meetingCode,
            userId: userEmail,
            settings: {
              allowGuests: settings.accessType === 'open',
              waitingRoom: settings.waitingRoom,
              allowScreenShare: settings.allowScreenShare,
              allowChat: settings.allowChat,
            },
            coOrganizers: settings.coOrganizers,
          }),
        });
      } catch {
        // Fehler ignorieren - Einstellungen sind lokal gespeichert
      }
    }
  };

  // Meeting-Raum entfernen
  const handleRemoveMeeting = async () => {
    if (formData.meetingCode) {
      setIsMeetingLoading(true);
      try {
        await fetch('/api/webmail/meeting', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'end',
            code: formData.meetingCode,
            userId: userEmail,
          }),
        });
      } finally {
        setIsMeetingLoading(false);
      }
    }

    setFormData({
      ...formData,
      isVideoMeeting: false,
      videoMeetingUrl: undefined,
      meetingCode: undefined,
      meetingSettings: undefined,
    });
  };

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      return;
    }
    // Erste Erinnerung als Haupt-Reminder speichern
    setFormData({ ...formData, reminder: reminders[0] || 30 });
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

  const addReminder = () => {
    if (reminders.length < 5) {
      setReminders([...reminders, 30]);
    }
  };

  const removeReminder = (index: number) => {
    setReminders(reminders.filter((_, i) => i !== index));
  };

  const updateReminder = (index: number, value: number) => {
    const newReminders = [...reminders];
    newReminders[index] = value;
    setReminders(newReminders);
  };

  const _formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50" 
        onClick={onClose}
      />
      
      {/* Modal - Breiter und ohne Vollbild-Höhe */}
      <div 
        className={`relative w-full max-w-7xl mx-4 rounded-lg shadow-2xl overflow-hidden ${
          isDark ? 'bg-[#202124]' : 'bg-white'
        }`}
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-2 border-b ${
          isDark ? 'border-gray-700 bg-[#202124]' : 'border-gray-200 bg-white'
        }`}>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-full ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
          >
            <X className="w-5 h-5" />
          </button>
          
          {/* Titel Input */}
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Titel hinzufügen"
            className={`flex-1 mx-4 text-xl font-normal focus:outline-none ${
              isDark 
                ? 'bg-transparent text-white placeholder-gray-500' 
                : 'bg-transparent text-gray-800 placeholder-gray-400'
            }`}
          />
          
          <button
            onClick={handleSubmit}
            disabled={!formData.title.trim() || isLoading}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              !formData.title.trim() || isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-teal-500 text-white hover:bg-teal-600'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </span>
            ) : (
              'Speichern'
            )}
          </button>
        </div>

        {/* Date/Time Bar - kompakter */}
        <div className={`px-4 py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            {/* Start Date */}
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className={`px-2 py-1.5 rounded text-sm ${
                isDark 
                  ? 'bg-[#3c4043] text-white border-gray-600' 
                  : 'bg-gray-100 text-gray-800 border-gray-300'
              }`}
            />
            
            {/* Start Time */}
            {!formData.allDay && (
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className={`px-2 py-1.5 rounded text-sm ${
                  isDark 
                    ? 'bg-[#3c4043] text-white border-gray-600' 
                    : 'bg-gray-100 text-gray-800 border-gray-300'
                }`}
              />
            )}
            
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>bis</span>
            
            {/* End Date */}
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className={`px-2 py-1.5 rounded text-sm ${
                isDark 
                  ? 'bg-[#3c4043] text-white border-gray-600' 
                  : 'bg-gray-100 text-gray-800 border-gray-300'
              }`}
            />
            
            {/* End Time */}
            {!formData.allDay && (
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className={`px-2 py-1.5 rounded text-sm ${
                  isDark 
                    ? 'bg-[#3c4043] text-white border-gray-600' 
                    : 'bg-gray-100 text-gray-800 border-gray-300'
                }`}
              />
            )}
            
            {/* Timezone */}
            <button className={`text-sm ${isDark ? 'text-teal-400 hover:text-teal-300' : 'text-teal-600 hover:text-teal-700'}`}>
              Zeitzone
            </button>
            
            {/* All Day & Recurrence - in gleicher Zeile */}
            <div className="flex items-center gap-3 ml-2">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allDay}
                  onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                />
                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Ganztägig</span>
              </label>
              
              <select
                value={formData.isRecurring ? 'weekly' : 'none'}
                onChange={(e) => setFormData({ ...formData, isRecurring: e.target.value !== 'none' })}
                className={`px-2 py-1 rounded text-sm ${
                  isDark 
                    ? 'bg-[#3c4043] text-white border-gray-600' 
                    : 'bg-gray-100 text-gray-800 border-gray-300'
                }`}
              >
                {RECURRENCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Content - Two Columns wie Google Calendar - 50/50 */}
        <div className="grid grid-cols-1 md:grid-cols-2 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 160px)' }}>
          
          {/* LEFT COLUMN - Termindetails und Zeitpunkt finden (50%) */}
          <div className={`border-r ${isDark ? 'border-gray-700 bg-[#202124]' : 'border-gray-200 bg-white'}`}>
            <h2 className={`text-base font-medium px-4 pt-4 pb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              Termindetails und Zeitpunkt finden
            </h2>
            
            {/* Tabs innerhalb der linken Spalte */}
            <div className={`flex border-b mx-4 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={() => setActiveTab('details')}
                className={`px-4 py-2 text-sm font-medium relative ${
                  activeTab === 'details'
                    ? isDark ? 'text-teal-400' : 'text-teal-600'
                    : isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Termindetails
                {activeTab === 'details' && (
                  <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${isDark ? 'bg-teal-400' : 'bg-teal-600'}`} />
                )}
              </button>
              <button
                onClick={() => setActiveTab('findTime')}
                className={`px-4 py-2 text-sm font-medium relative ${
                  activeTab === 'findTime'
                    ? isDark ? 'text-teal-400' : 'text-teal-600'
                    : isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Zeitpunkt finden
                {activeTab === 'findTime' && (
                  <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${isDark ? 'bg-teal-400' : 'bg-teal-600'}`} />
                )}
              </button>
            </div>
            
            {/* Tab Content */}
            <div className="p-4">
              {activeTab === 'details' ? (
                <div className="space-y-4">
                  {/* Video Meeting - Google Calendar Style */}
                  <div className="flex items-start gap-4">
                    <Video className={`w-5 h-5 mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                    <div className="flex-1">
                      {!formData.isVideoMeeting ? (
                        /* Button zum Hinzufügen */
                        <button
                          onClick={handleAddMeeting}
                          disabled={isMeetingLoading}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                            isDark ? 'bg-[#3c4043] text-gray-300 hover:bg-[#4c5053]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          } ${isMeetingLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {isMeetingLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                          Taskilo Meet-Videokonferenz hinzufügen
                        </button>
                      ) : (
                        /* Meeting hinzugefügt - Google Style Card */
                        <div className={`rounded-lg border ${isDark ? 'border-gray-600 bg-[#303134]' : 'border-gray-200 bg-gray-50'}`}>
                          <div className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {/* Taskilo Meet Logo */}
                                <div className="w-10 h-10 rounded-lg bg-teal-500 flex items-center justify-center">
                                  <Video className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                  <a 
                                    href={formData.videoMeetingUrl || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`text-sm font-medium ${isDark ? 'text-teal-400 hover:text-teal-300' : 'text-teal-600 hover:text-teal-700'}`}
                                  >
                                    Mit Taskilo Meet teilnehmen
                                  </a>
                                  <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {formData.meetingCode ? `meet.taskilo.de/${formData.meetingCode}` : 'meet.taskilo.de'} · Bis zu 200 Gäste
                                  </div>
                                </div>
                              </div>
                              
                              {/* Action Buttons */}
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setShowMeetingSettings(true)}
                                  className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-200 text-gray-600'}`}
                                  title="Optionen für Videoanruf"
                                >
                                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                                  </svg>
                                </button>
                                <button
                                  onClick={() => {
                                    if (formData.videoMeetingUrl) {
                                      navigator.clipboard.writeText(formData.videoMeetingUrl);
                                    }
                                  }}
                                  className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-200 text-gray-600'}`}
                                  title="Konferenzinformationen kopieren"
                                >
                                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                                  </svg>
                                </button>
                                <button
                                  onClick={handleRemoveMeeting}
                                  disabled={isMeetingLoading}
                                  className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-200 text-gray-600'} ${isMeetingLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  title="Konferenz entfernen"
                                >
                                  {isMeetingLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <X className="w-5 h-5" />}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Location with Google Places Autocomplete */}
                  <div className="flex items-center gap-4">
                    <MapPin className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                    <input
                      ref={locationInputRef}
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Ort hinzufügen"
                      className={`flex-1 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                        isDark 
                          ? 'bg-[#3c4043] text-white placeholder-gray-500' 
                          : 'bg-gray-100 text-gray-800 placeholder-gray-400'
                      }`}
                    />
                  </div>

                  {/* Reminders */}
                  <div className="flex items-start gap-4">
                    <Bell className={`w-5 h-5 mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                    <div className="flex-1 space-y-2">
                      {reminders.map((reminder, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <select
                            value={reminder}
                            onChange={(e) => updateReminder(index, parseInt(e.target.value))}
                            className={`flex-1 px-3 py-2 rounded-md text-sm ${
                              isDark 
                                ? 'bg-[#3c4043] text-white border-gray-600' 
                                : 'bg-gray-100 text-gray-800 border-gray-300'
                            }`}
                          >
                            {REMINDER_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          {reminders.length > 1 && (
                            <button
                              onClick={() => removeReminder(index)}
                              className={`p-1 rounded ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={addReminder}
                        className={`text-sm ${isDark ? 'text-teal-400 hover:text-teal-300' : 'text-teal-600 hover:text-teal-700'}`}
                      >
                        Benachrichtigung hinzufügen
                      </button>
                    </div>
                  </div>

                  {/* Calendar Selection with Color Dropdown */}
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-5 h-5 rounded-full" 
                      style={{ backgroundColor: formData.color }}
                    />
                    <div className="flex items-center gap-3">
                      <span className={`text-sm ${isDark ? 'text-white' : 'text-gray-800'}`}>
                        {userEmail.split('@')[0]}
                      </span>
                      
                      {/* Color Dropdown */}
                      <select
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className={`px-3 py-2 rounded-md text-sm ${
                          isDark 
                            ? 'bg-[#3c4043] text-white border-gray-600' 
                            : 'bg-gray-100 text-gray-800 border-gray-300'
                        }`}
                        style={{ 
                          borderLeft: `4px solid ${formData.color}`,
                        }}
                      >
                        {COLORS.map((color) => (
                          <option key={color.id} value={color.value}>
                            {color.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Status & Visibility */}
                  <div className="flex items-center gap-4">
                    <div className="w-5 h-5" />
                    <div className="flex gap-3">
                      <select
                        className={`px-3 py-2 rounded-md text-sm ${
                          isDark 
                            ? 'bg-[#3c4043] text-white border-gray-600' 
                            : 'bg-gray-100 text-gray-800 border-gray-300'
                        }`}
                      >
                        <option value="busy">Beschäftigt</option>
                        <option value="free">Verfügbar</option>
                      </select>
                      
                      <select
                        value={formData.visibility}
                        onChange={(e) => setFormData({ ...formData, visibility: e.target.value as 'default' | 'public' | 'private' })}
                        className={`px-3 py-2 rounded-md text-sm ${
                          isDark 
                            ? 'bg-[#3c4043] text-white border-gray-600' 
                            : 'bg-gray-100 text-gray-800 border-gray-300'
                        }`}
                      >
                        <option value="default">Standardsichtbarkeit</option>
                        <option value="public">Öffentlich</option>
                        <option value="private">Privat</option>
                      </select>
                    </div>
                  </div>

                  {/* Description with Rich Text Toolbar */}
                  <div className="flex items-start gap-4">
                    <div className="w-5 h-5" />
                    <div className="flex-1">
                      {/* Toolbar */}
                      <div className={`flex items-center gap-1 mb-2 p-1 rounded-md ${
                        isDark ? 'bg-[#3c4043]' : 'bg-gray-100'
                      }`}>
                        <button className={`p-1.5 rounded ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-200 text-gray-600'}`}>
                          <Bold className="w-4 h-4" />
                        </button>
                        <button className={`p-1.5 rounded ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-200 text-gray-600'}`}>
                          <Italic className="w-4 h-4" />
                        </button>
                        <button className={`p-1.5 rounded ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-200 text-gray-600'}`}>
                          <Underline className="w-4 h-4" />
                        </button>
                        <button className={`p-1.5 rounded ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-200 text-gray-600'}`}>
                          <Strikethrough className="w-4 h-4" />
                        </button>
                        <div className={`w-px h-5 mx-1 ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />
                        <button className={`p-1.5 rounded ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-200 text-gray-600'}`}>
                          <List className="w-4 h-4" />
                        </button>
                        <button className={`p-1.5 rounded ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-200 text-gray-600'}`}>
                          <ListOrdered className="w-4 h-4" />
                        </button>
                        <div className={`w-px h-5 mx-1 ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />
                        <button className={`p-1.5 rounded ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-200 text-gray-600'}`}>
                          <Link2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* Textarea */}
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Beschreibung hinzufügen"
                        rows={4}
                        className={`w-full p-3 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                          isDark 
                            ? 'bg-[#3c4043] text-white placeholder-gray-500' 
                            : 'bg-gray-100 text-gray-800 placeholder-gray-400'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Find Time Tab - Placeholder */
                <div className="flex items-center justify-center h-48">
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Zeitpunkt finden - Funktion kommt bald
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN - Gäste und Räume (50%) */}
          <div className={`p-4 ${isDark ? 'bg-[#303134]' : 'bg-gray-50'}`}>
            <h2 className={`text-base font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              Gäste und Räume
            </h2>
            
            {/* Add Guest Input */}
            <div className="flex items-center gap-2 mb-4">
              <input
                type="email"
                value={attendeeInput}
                onChange={(e) => setAttendeeInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addAttendee()}
                placeholder="Gäste hinzufügen"
                className={`flex-1 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  isDark 
                    ? 'bg-[#3c4043] text-white placeholder-gray-500' 
                    : 'bg-white text-gray-800 placeholder-gray-400 border border-gray-300'
                }`}
              />
              <button
                onClick={addAttendee}
                className={`p-2 rounded-md ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-200 text-gray-600'}`}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            
            {/* Guest List */}
            <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
              {formData.attendees.map((email) => (
                <div 
                  key={email}
                  className={`flex items-center justify-between px-3 py-2 rounded-md ${
                    isDark ? 'bg-[#3c4043]' : 'bg-white border border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white text-sm font-medium">
                      {email.charAt(0).toUpperCase()}
                    </div>
                    <span className={`text-sm truncate max-w-40 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                      {email}
                    </span>
                  </div>
                  <button
                    onClick={() => removeAttendee(email)}
                    className={`p-1 rounded ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              {formData.attendees.length === 0 && (
                <p className={`text-sm py-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Noch keine Gäste hinzugefügt
                </p>
              )}
            </div>
            
            {/* Guest Permissions */}
            <div className={`border-t pt-4 ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
              <h4 className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Berechtigungen für Gäste
              </h4>
              
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                  />
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Termin bearbeiten
                  </span>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                  />
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Gäste einladen
                  </span>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                  />
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Gästeliste anzeigen
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Meeting Settings Modal */}
      <MeetingSettingsModal
        isOpen={showMeetingSettings}
        onClose={() => setShowMeetingSettings(false)}
        onSave={handleSaveMeetingSettings}
        settings={formData.meetingSettings || defaultMeetingSettings}
        meetingCode={formData.meetingCode}
        organizerEmail={userEmail}
      />
    </div>
  );
}
