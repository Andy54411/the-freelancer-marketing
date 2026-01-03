'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Shield, Users, MessageSquare, Video, Lock } from 'lucide-react';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';
import { MeetingSettings } from './CreateEventModal';

interface MeetingSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: MeetingSettings) => void;
  settings: MeetingSettings;
  meetingCode?: string;
  organizerEmail: string;
}

const DEFAULT_SETTINGS: MeetingSettings = {
  coOrganizers: [],
  hostMustJoinFirst: false,
  allowScreenShare: true,
  allowReactions: true,
  allowChat: true,
  waitingRoom: true,
  accessType: 'trusted',
  allowGuestsWithLink: true,
};

export function MeetingSettingsModal({
  isOpen,
  onClose,
  onSave,
  settings,
  meetingCode,
  organizerEmail,
}: MeetingSettingsModalProps) {
  const { isDark } = useWebmailTheme();
  const [localSettings, setLocalSettings] = useState<MeetingSettings>(settings || DEFAULT_SETTINGS);
  const [coOrganizerInput, setCoOrganizerInput] = useState('');
  const [activeTab, setActiveTab] = useState<'host' | 'guests'>('host');

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings || DEFAULT_SETTINGS);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const addCoOrganizer = () => {
    if (coOrganizerInput.trim() && coOrganizerInput.includes('@')) {
      setLocalSettings({
        ...localSettings,
        coOrganizers: [...localSettings.coOrganizers, coOrganizerInput.trim()],
      });
      setCoOrganizerInput('');
    }
  };

  const removeCoOrganizer = (email: string) => {
    setLocalSettings({
      ...localSettings,
      coOrganizers: localSettings.coOrganizers.filter((e) => e !== email),
    });
  };

  const ToggleSwitch = ({ 
    checked, 
    onChange, 
    disabled = false,
    label,
  }: { 
    checked: boolean; 
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    label: string;
  }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked 
          ? 'bg-teal-500' 
          : isDark ? 'bg-gray-600' : 'bg-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      <div className={`relative w-full max-w-xl rounded-lg shadow-2xl ${
        isDark ? 'bg-[#202124]' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-teal-500 flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Taskilo Meet
              </div>
              <h2 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Optionen für Videoanruf
              </h2>
              {meetingCode && (
                <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {meetingCode}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={() => setActiveTab('host')}
            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 relative ${
              activeTab === 'host'
                ? isDark ? 'text-teal-400' : 'text-teal-600'
                : isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Lock className="w-4 h-4" />
            Steuerelemente für den Organisator
            {activeTab === 'host' && (
              <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${isDark ? 'bg-teal-400' : 'bg-teal-600'}`} />
            )}
          </button>
          <button
            onClick={() => setActiveTab('guests')}
            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 relative ${
              activeTab === 'guests'
                ? isDark ? 'text-teal-400' : 'text-teal-600'
                : isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="w-4 h-4" />
            Gäste
            {activeTab === 'guests' && (
              <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${isDark ? 'bg-teal-400' : 'bg-teal-600'}`} />
            )}
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {activeTab === 'host' ? (
            <div className="space-y-6">
              {/* Besprechungsmoderation */}
              <div>
                <h3 className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Besprechungsmoderation
                </h3>
                
                {/* Co-Organisatoren */}
                <div className={`p-4 rounded-lg mb-4 ${isDark ? 'bg-[#303134]' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Co-Organisatoren
                    </div>
                    <Shield className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  </div>
                  <p className={`text-xs mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Co-Organisatoren können Meeting-Einstellungen ändern und Teilnehmer verwalten
                  </p>
                  
                  {/* Co-Organizer Input */}
                  <div className="flex gap-2 mb-2">
                    <input
                      type="email"
                      value={coOrganizerInput}
                      onChange={(e) => setCoOrganizerInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addCoOrganizer()}
                      placeholder="E-Mail-Adresse eingeben"
                      className={`flex-1 px-3 py-2 rounded-md text-sm ${
                        isDark 
                          ? 'bg-[#3c4043] text-white placeholder-gray-500 border-gray-600' 
                          : 'bg-white text-gray-800 placeholder-gray-400 border-gray-300'
                      } border focus:outline-none focus:ring-2 focus:ring-teal-500`}
                    />
                    <button
                      onClick={addCoOrganizer}
                      className="px-3 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Co-Organizer List */}
                  {localSettings.coOrganizers.length > 0 && (
                    <div className="space-y-1">
                      {localSettings.coOrganizers.map((email) => (
                        <div
                          key={email}
                          className={`flex items-center justify-between px-2 py-1 rounded ${
                            isDark ? 'bg-[#3c4043]' : 'bg-gray-100'
                          }`}
                        >
                          <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            {email}
                          </span>
                          <button
                            onClick={() => removeCoOrganizer(email)}
                            className={`p-1 rounded ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200'}`}
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Beitragenden erlauben */}
              <div>
                <h3 className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Beitragenden erlauben
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Bildschirm teilen
                    </span>
                    <ToggleSwitch
                      checked={localSettings.allowScreenShare}
                      onChange={(checked) => setLocalSettings({ ...localSettings, allowScreenShare: checked })}
                      label="Bildschirm teilen erlauben"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Reaktionen senden
                    </span>
                    <ToggleSwitch
                      checked={localSettings.allowReactions}
                      onChange={(checked) => setLocalSettings({ ...localSettings, allowReactions: checked })}
                      label="Reaktionen senden erlauben"
                    />
                  </div>
                </div>
              </div>

              {/* Chatmoderation */}
              <div>
                <h3 className={`text-sm font-medium mb-3 flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <MessageSquare className="w-4 h-4" />
                  Chatmoderation
                </h3>
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Teilnehmer Nachrichten senden lassen
                    </span>
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      Wenn aktiviert, können alle Teilnehmer Nachrichten senden
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={localSettings.allowChat}
                    onChange={(checked) => setLocalSettings({ ...localSettings, allowChat: checked })}
                    label="Chat erlauben"
                  />
                </div>
              </div>

              {/* Zugriff auf die Besprechung */}
              <div>
                <h3 className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Zugriff auf die Besprechung
                </h3>
                
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Organisator muss vor allen anderen beitreten
                    </span>
                  </div>
                  <ToggleSwitch
                    checked={localSettings.hostMustJoinFirst}
                    onChange={(checked) => setLocalSettings({ ...localSettings, hostMustJoinFirst: checked })}
                    label="Organisator muss zuerst beitreten"
                  />
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Warteraum aktivieren
                    </span>
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      Teilnehmer müssen vom Organisator zugelassen werden
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={localSettings.waitingRoom}
                    onChange={(checked) => setLocalSettings({ ...localSettings, waitingRoom: checked })}
                    label="Warteraum aktivieren"
                  />
                </div>

                <div className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Zugang zur Videokonferenz
                </div>
                <div className="space-y-2">
                  <label className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer ${
                    localSettings.accessType === 'open' 
                      ? isDark ? 'bg-teal-500/20 border border-teal-500' : 'bg-teal-50 border border-teal-500'
                      : isDark ? 'bg-[#303134] hover:bg-[#3c4043]' : 'bg-gray-50 hover:bg-gray-100'
                  }`}>
                    <input
                      type="radio"
                      name="accessType"
                      value="open"
                      checked={localSettings.accessType === 'open'}
                      onChange={() => setLocalSettings({ ...localSettings, accessType: 'open' })}
                      className="mt-1 text-teal-500"
                    />
                    <div>
                      <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Offen
                      </div>
                      <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Niemand muss eine Teilnahmeanfrage stellen. Alle können beitreten.
                      </div>
                    </div>
                  </label>
                  
                  <label className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer ${
                    localSettings.accessType === 'trusted' 
                      ? isDark ? 'bg-teal-500/20 border border-teal-500' : 'bg-teal-50 border border-teal-500'
                      : isDark ? 'bg-[#303134] hover:bg-[#3c4043]' : 'bg-gray-50 hover:bg-gray-100'
                  }`}>
                    <input
                      type="radio"
                      name="accessType"
                      value="trusted"
                      checked={localSettings.accessType === 'trusted'}
                      onChange={() => setLocalSettings({ ...localSettings, accessType: 'trusted' })}
                      className="mt-1 text-teal-500"
                    />
                    <div>
                      <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Vertrauenswürdig
                      </div>
                      <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Eingeladene Personen können direkt beitreten. Andere müssen anfragen.
                      </div>
                    </div>
                  </label>
                  
                  <label className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer ${
                    localSettings.accessType === 'restricted' 
                      ? isDark ? 'bg-teal-500/20 border border-teal-500' : 'bg-teal-50 border border-teal-500'
                      : isDark ? 'bg-[#303134] hover:bg-[#3c4043]' : 'bg-gray-50 hover:bg-gray-100'
                  }`}>
                    <input
                      type="radio"
                      name="accessType"
                      value="restricted"
                      checked={localSettings.accessType === 'restricted'}
                      onChange={() => setLocalSettings({ ...localSettings, accessType: 'restricted' })}
                      className="mt-1 text-teal-500"
                    />
                    <div>
                      <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Eingeschränkt
                      </div>
                      <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Nur eingeladene Personen können beitreten. Kein Zugang über Link.
                      </div>
                    </div>
                  </label>
                </div>

                {localSettings.accessType === 'trusted' && (
                  <div className={`mt-3 flex items-center gap-2 p-2 rounded ${isDark ? 'bg-[#303134]' : 'bg-gray-50'}`}>
                    <input
                      type="checkbox"
                      id="allowGuestsWithLink"
                      checked={localSettings.allowGuestsWithLink}
                      onChange={(e) => setLocalSettings({ ...localSettings, allowGuestsWithLink: e.target.checked })}
                      className="text-teal-500"
                    />
                    <label htmlFor="allowGuestsWithLink" className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Jeder mit einem Besprechungslink kann eine Teilnahmeanfrage stellen
                    </label>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Gäste-Einstellungen werden hier angezeigt, sobald Teilnehmer hinzugefügt wurden.
              </p>
              <div className={`p-4 rounded-lg ${isDark ? 'bg-[#303134]' : 'bg-gray-50'}`}>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Fügen Sie im Hauptformular Teilnehmer hinzu, um deren Berechtigungen zu verwalten.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              <div>Alle Organisatoren und Co-Organisatoren können diese Einstellungen ändern</div>
              <div>Organisator: {organizerEmail}</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  isDark ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-teal-500 text-white rounded-md text-sm font-medium hover:bg-teal-600"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
