/**
 * WhatsApp Automation Page
 * 
 * Verwaltung von Automatisierungen: Geschäftszeiten, Keywords, Abwesenheit
 * Verwendet die wiederverwendbaren Komponenten
 */
'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Clock, Zap, Calendar, Save, AlertCircle, Loader2, MessageSquare } from 'lucide-react';
import { BusinessHoursEditor } from '@/components/whatsapp/automation/BusinessHoursEditor';
import { KeywordTriggers } from '@/components/whatsapp/automation/KeywordTriggers';
import { AbsenceEditor } from '@/components/whatsapp/automation/AbsenceEditor';
import { toast } from 'sonner';

// Types für BusinessHoursEditor
interface TimeSlot {
  start: string;
  end: string;
}

interface DaySchedule {
  enabled: boolean;
  slots: TimeSlot[];
}

interface BusinessHoursData {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

// Types für KeywordTriggers
interface KeywordTrigger {
  id: string;
  keywords: string[];
  response: string;
  matchType: 'exact' | 'contains' | 'startsWith';
  isActive: boolean;
  priority: number;
}

// Types für AbsenceEditor
interface AbsenceSettings {
  isEnabled: boolean;
  message: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  useSchedule: boolean;
}

// Default-Werte für die Komponenten
const defaultBusinessHours: BusinessHoursData = {
  monday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
  tuesday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
  wednesday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
  thursday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
  friday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
  saturday: { enabled: false, slots: [] },
  sunday: { enabled: false, slots: [] },
};

const defaultAbsenceSettings: AbsenceSettings = {
  isEnabled: false,
  message: 'Vielen Dank für Ihre Nachricht. Ich bin derzeit abwesend und melde mich schnellstmöglich zurück.',
  useSchedule: false,
};

export default function AutomationPage() {
  const params = useParams();
  const companyId = params.uid as string;

  const [activeTab, setActiveTab] = React.useState<'hours' | 'keywords' | 'absence'>('hours');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSavingHours, setIsSavingHours] = React.useState(false);
  const [isSavingAbsence, setIsSavingAbsence] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Business Hours State
  const [businessHours, setBusinessHours] = React.useState<BusinessHoursData>(defaultBusinessHours);
  const [outsideMessage, setOutsideMessage] = React.useState('Vielen Dank für Ihre Nachricht! Wir sind derzeit nicht erreichbar.');

  // Keywords State
  const [keywords, setKeywords] = React.useState<KeywordTrigger[]>([]);

  // Absence State
  const [absence, setAbsence] = React.useState<AbsenceSettings>(defaultAbsenceSettings);

  // Konvertierfunktion: Legacy API → neues Format
  const convertLegacyHours = (legacy: {
    days: Record<string, { enabled: boolean; openTime?: string; closeTime?: string }>;
    outsideHoursMessage?: string;
  }): BusinessHoursData => {
    const result: BusinessHoursData = { ...defaultBusinessHours };
    const dayKeys: (keyof BusinessHoursData)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    dayKeys.forEach(day => {
      const legacyDay = legacy.days[day];
      if (legacyDay) {
        result[day] = {
          enabled: legacyDay.enabled,
          slots: legacyDay.enabled && legacyDay.openTime && legacyDay.closeTime
            ? [{ start: legacyDay.openTime, end: legacyDay.closeTime }]
            : [],
        };
      }
    });
    
    return result;
  };

  // Konvertierfunktion: neues Format → Legacy API
  const convertToLegacyHours = (hours: BusinessHoursData): Record<string, { enabled: boolean; openTime?: string; closeTime?: string }> => {
    const result: Record<string, { enabled: boolean; openTime?: string; closeTime?: string }> = {};
    const dayKeys: (keyof BusinessHoursData)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    dayKeys.forEach(day => {
      const dayData = hours[day];
      result[day] = {
        enabled: dayData.enabled,
        openTime: dayData.slots[0]?.start,
        closeTime: dayData.slots[0]?.end,
      };
    });
    
    return result;
  };

  // Konvertierfunktion: Legacy Keywords → neues Format
  const convertLegacyKeywords = (legacy: Array<{
    id: string;
    keywords: string[];
    matchType: string;
    response: { content: string };
    enabled: boolean;
    priority: number;
  }>): KeywordTrigger[] => {
    return legacy.map(item => ({
      id: item.id,
      keywords: item.keywords,
      response: item.response.content,
      matchType: (['exact', 'contains', 'startsWith'].includes(item.matchType) 
        ? item.matchType 
        : 'contains') as 'exact' | 'contains' | 'startsWith',
      isActive: item.enabled,
      priority: item.priority,
    }));
  };

  // Konvertierfunktion: Legacy Absence → neues Format
  const convertLegacyAbsence = (legacy: {
    enabled: boolean;
    message: string;
    startDate?: string;
    endDate?: string;
  }): AbsenceSettings => ({
    isEnabled: legacy.enabled,
    message: legacy.message,
    startDate: legacy.startDate,
    endDate: legacy.endDate,
    useSchedule: !!(legacy.startDate || legacy.endDate),
  });

  // Daten laden
  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [hoursRes, keywordsRes, absenceRes] = await Promise.all([
        fetch(`/api/whatsapp/business-hours?companyId=${companyId}`),
        fetch(`/api/whatsapp/keyword-triggers?companyId=${companyId}`),
        fetch(`/api/whatsapp/absence?companyId=${companyId}`),
      ]);

      const [hoursData, keywordsData, absenceData] = await Promise.all([
        hoursRes.json(),
        keywordsRes.json(),
        absenceRes.json(),
      ]);

      if (hoursData.success && hoursData.businessHours) {
        setBusinessHours(convertLegacyHours(hoursData.businessHours));
        if (hoursData.businessHours.outsideHoursMessage) {
          setOutsideMessage(hoursData.businessHours.outsideHoursMessage);
        }
      }
      
      if (keywordsData.success && keywordsData.triggers) {
        setKeywords(convertLegacyKeywords(keywordsData.triggers));
      }
      
      if (absenceData.success && absenceData.absence) {
        setAbsence(convertLegacyAbsence(absenceData.absence));
      }
    } catch {
      setError('Fehler beim Laden der Einstellungen');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Geschäftszeiten speichern
  const saveBusinessHours = async () => {
    setIsSavingHours(true);
    try {
      const response = await fetch('/api/whatsapp/business-hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          days: convertToLegacyHours(businessHours),
          outsideHoursMessage: outsideMessage,
          timezone: 'Europe/Berlin',
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Geschäftszeiten gespeichert');
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Speichern');
    } finally {
      setIsSavingHours(false);
    }
  };

  // Abwesenheit speichern
  const saveAbsence = async () => {
    setIsSavingAbsence(true);
    try {
      const response = await fetch('/api/whatsapp/absence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          enabled: absence.isEnabled,
          message: absence.message,
          startDate: absence.startDate,
          endDate: absence.endDate,
          type: 'custom',
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Abwesenheit gespeichert');
      } else {
        throw new Error(data.error);
      }
    } catch {
      toast.error('Fehler beim Speichern');
    } finally {
      setIsSavingAbsence(false);
    }
  };

  // Keyword hinzufügen
  const handleAddKeyword = async (trigger: Omit<KeywordTrigger, 'id'>) => {
    try {
      const response = await fetch('/api/whatsapp/keyword-triggers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          trigger: {
            keywords: trigger.keywords,
            matchType: trigger.matchType,
            caseSensitive: false,
            response: { type: 'text', content: trigger.response },
            enabled: trigger.isActive,
            priority: trigger.priority,
          },
        }),
      });
      const data = await response.json();
      if (data.success) {
        loadData();
        toast.success('Keyword-Trigger erstellt');
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Erstellen');
    }
  };

  // Keyword aktualisieren
  const handleUpdateKeyword = async (id: string, updates: Partial<KeywordTrigger>) => {
    const existingTrigger = keywords.find(k => k.id === id);
    if (!existingTrigger) return;

    try {
      const response = await fetch('/api/whatsapp/keyword-triggers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          trigger: {
            id,
            keywords: updates.keywords ?? existingTrigger.keywords,
            matchType: updates.matchType ?? existingTrigger.matchType,
            caseSensitive: false,
            response: { type: 'text', content: updates.response ?? existingTrigger.response },
            enabled: updates.isActive ?? existingTrigger.isActive,
            priority: updates.priority ?? existingTrigger.priority,
          },
        }),
      });
      const data = await response.json();
      if (data.success) {
        loadData();
        toast.success('Keyword-Trigger aktualisiert');
      }
    } catch {
      toast.error('Fehler beim Aktualisieren');
    }
  };

  // Keyword löschen
  const handleDeleteKeyword = async (id: string) => {
    if (!confirm('Trigger wirklich löschen?')) return;
    
    try {
      const response = await fetch(`/api/whatsapp/keyword-triggers?companyId=${companyId}&triggerId=${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setKeywords(keywords.filter(k => k.id !== id));
        toast.success('Trigger gelöscht');
      }
    } catch {
      toast.error('Fehler beim Löschen');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-[#14ad9f] to-teal-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <MessageSquare className="h-8 w-8 text-white" />
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-[#14ad9f] mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600">Automatisierungen werden geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">WhatsApp Automatisierung</h1>
        <p className="text-gray-500 mb-6">Richte automatische Antworten und Geschäftszeiten ein</p>

      {/* Fehlermeldung */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('hours')}
          className={`px-4 py-2 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'hours'
              ? 'border-[#14ad9f] text-[#14ad9f]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          Geschäftszeiten
        </button>
        <button
          onClick={() => setActiveTab('keywords')}
          className={`px-4 py-2 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'keywords'
              ? 'border-[#14ad9f] text-[#14ad9f]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Zap className="w-4 h-4" />
          Keyword-Trigger
        </button>
        <button
          onClick={() => setActiveTab('absence')}
          className={`px-4 py-2 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'absence'
              ? 'border-[#14ad9f] text-[#14ad9f]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Abwesenheit
        </button>
      </div>

      {/* Business Hours Tab */}
      {activeTab === 'hours' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Öffnungszeiten</h2>
            
            <BusinessHoursEditor
              value={businessHours}
              onChange={setBusinessHours}
            />

            <div className="mt-6 pt-6 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nachricht außerhalb der Geschäftszeiten
              </label>
              <textarea
                value={outsideMessage}
                onChange={(e) => setOutsideMessage(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/20"
              />
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={saveBusinessHours}
                disabled={isSavingHours}
                className="px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-teal-600 flex items-center gap-2 disabled:opacity-50"
              >
                {isSavingHours ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keywords Tab */}
      {activeTab === 'keywords' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <KeywordTriggers
            triggers={keywords}
            onAdd={handleAddKeyword}
            onUpdate={handleUpdateKeyword}
            onDelete={handleDeleteKeyword}
          />
        </div>
      )}

      {/* Absence Tab */}
      {activeTab === 'absence' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <AbsenceEditor
            value={absence}
            onChange={setAbsence}
            onSave={saveAbsence}
            isSaving={isSavingAbsence}
          />
        </div>
      )}
      </div>
    </div>
  );
}
