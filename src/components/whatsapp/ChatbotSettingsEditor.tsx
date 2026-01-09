'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bot,
  Clock,
  MessageSquare,
  Settings,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  CheckCircle,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { db } from '@/firebase/clients';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type {
  ChatbotSettings,
  BusinessHours,
  AutoReply,
} from '@/services/whatsapp-chatbot.service';

interface ChatbotSettingsEditorProps {
  companyId: string;
}

const WEEKDAYS = [
  { value: 0, label: 'Sonntag', short: 'So' },
  { value: 1, label: 'Montag', short: 'Mo' },
  { value: 2, label: 'Dienstag', short: 'Di' },
  { value: 3, label: 'Mittwoch', short: 'Mi' },
  { value: 4, label: 'Donnerstag', short: 'Do' },
  { value: 5, label: 'Freitag', short: 'Fr' },
  { value: 6, label: 'Samstag', short: 'Sa' },
];

const DEFAULT_SETTINGS: ChatbotSettings = {
  enabled: false,
  useTaskiloAI: true,
  businessHours: [
    { dayOfWeek: 1, isOpen: true, openTime: '09:00', closeTime: '18:00' },
    { dayOfWeek: 2, isOpen: true, openTime: '09:00', closeTime: '18:00' },
    { dayOfWeek: 3, isOpen: true, openTime: '09:00', closeTime: '18:00' },
    { dayOfWeek: 4, isOpen: true, openTime: '09:00', closeTime: '18:00' },
    { dayOfWeek: 5, isOpen: true, openTime: '09:00', closeTime: '17:00' },
    { dayOfWeek: 6, isOpen: false, openTime: '10:00', closeTime: '14:00' },
    { dayOfWeek: 0, isOpen: false, openTime: '10:00', closeTime: '14:00' },
  ],
  autoReplies: [],
  welcomeMessageEnabled: true,
  welcomeMessage: 'Hallo! Willkommen bei unserem WhatsApp-Service. Wie können wir Ihnen helfen?',
  outsideHoursMessage: 'Vielen Dank für Ihre Nachricht. Unser Team ist derzeit nicht erreichbar. Wir melden uns zu unseren Geschäftszeiten bei Ihnen.',
  escalationKeywords: ['mitarbeiter', 'mensch', 'support', 'hilfe', 'beschwerde', 'reklamation', 'dringend'],
  maxAIMessagesPerConversation: 10,
};

export default function ChatbotSettingsEditor({ companyId }: ChatbotSettingsEditorProps) {
  const [settings, setSettings] = useState<ChatbotSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'hours' | 'replies' | 'keywords'>('general');

  const loadSettings = useCallback(async () => {
    if (!companyId) return;

    try {
      setLoading(true);
      const settingsDoc = await getDoc(
        doc(db, 'companies', companyId, 'whatsapp', 'chatbotSettings')
      );

      if (settingsDoc.exists()) {
        setSettings({ ...DEFAULT_SETTINGS, ...settingsDoc.data() as ChatbotSettings });
      }
    } catch {
      setError('Einstellungen konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSettings = async () => {
    try {
      setSaving(true);
      setError(null);

      await setDoc(
        doc(db, 'companies', companyId, 'whatsapp', 'chatbotSettings'),
        settings,
        { merge: true }
      );

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setError('Einstellungen konnten nicht gespeichert werden');
    } finally {
      setSaving(false);
    }
  };

  const updateBusinessHours = (dayOfWeek: number, updates: Partial<BusinessHours>) => {
    setSettings(prev => ({
      ...prev,
      businessHours: prev.businessHours.map(h =>
        h.dayOfWeek === dayOfWeek ? { ...h, ...updates } : h
      ),
    }));
  };

  const addAutoReply = () => {
    const newReply: AutoReply = {
      id: `reply_${Date.now()}`,
      name: 'Neue Antwort',
      type: 'keyword',
      triggerKeywords: [],
      message: '',
      isActive: true,
      priority: settings.autoReplies.length,
    };

    setSettings(prev => ({
      ...prev,
      autoReplies: [...prev.autoReplies, newReply],
    }));
  };

  const updateAutoReply = (id: string, updates: Partial<AutoReply>) => {
    setSettings(prev => ({
      ...prev,
      autoReplies: prev.autoReplies.map(r =>
        r.id === id ? { ...r, ...updates } : r
      ),
    }));
  };

  const deleteAutoReply = (id: string) => {
    setSettings(prev => ({
      ...prev,
      autoReplies: prev.autoReplies.filter(r => r.id !== id),
    }));
  };

  const addEscalationKeyword = (keyword: string) => {
    if (keyword && !settings.escalationKeywords.includes(keyword.toLowerCase())) {
      setSettings(prev => ({
        ...prev,
        escalationKeywords: [...prev.escalationKeywords, keyword.toLowerCase()],
      }));
    }
  };

  const removeEscalationKeyword = (keyword: string) => {
    setSettings(prev => ({
      ...prev,
      escalationKeywords: prev.escalationKeywords.filter(k => k !== keyword),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f]" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#14ad9f]/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-[#14ad9f]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Chatbot & Automatisierung</h2>
              <p className="text-sm text-gray-500">Automatische Antworten mit Taskilo KI</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Hauptschalter */}
            <label className="flex items-center gap-2 cursor-pointer">
              <span className={`text-sm font-medium ${settings.enabled ? 'text-[#14ad9f]' : 'text-gray-500'}`}>
                {settings.enabled ? 'Aktiv' : 'Inaktiv'}
              </span>
              <button
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.enabled ? 'bg-[#14ad9f]' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>

            <button
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : saveSuccess ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{saveSuccess ? 'Gespeichert' : 'Speichern'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px px-6">
          {[
            { id: 'general', label: 'Allgemein', icon: Settings },
            { id: 'hours', label: 'Geschäftszeiten', icon: Clock },
            { id: 'replies', label: 'Auto-Antworten', icon: MessageSquare },
            { id: 'keywords', label: 'Eskalation', icon: AlertCircle },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#14ad9f] text-[#14ad9f]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {/* Allgemein Tab */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            {/* Taskilo KI */}
            <div className="p-4 bg-linear-to-r from-teal-50 to-cyan-50 rounded-xl border border-teal-100">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-linear-to-br from-[#14ad9f] to-teal-600 flex items-center justify-center shrink-0">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">Taskilo KI</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Nutzt Google Gemini für intelligente, kontextbezogene Antworten basierend auf Ihrer Wissensdatenbank.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, useTaskiloAI: !prev.useTaskiloAI }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.useTaskiloAI ? 'bg-[#14ad9f]' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.useTaskiloAI ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  {settings.useTaskiloAI && (
                    <div className="mt-3">
                      <label className="text-sm text-gray-600">Max. KI-Nachrichten pro Konversation</label>
                      <input
                        type="number"
                        value={settings.maxAIMessagesPerConversation}
                        onChange={e => setSettings(prev => ({
                          ...prev,
                          maxAIMessagesPerConversation: parseInt(e.target.value) || 10,
                        }))}
                        min={1}
                        max={50}
                        className="mt-1 w-24 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Begrüßungsnachricht */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Volume2 className="w-4 h-4" />
                  Begrüßungsnachricht
                </label>
                <button
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, welcomeMessageEnabled: !prev.welcomeMessageEnabled }))}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    settings.welcomeMessageEnabled ? 'bg-[#14ad9f]' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      settings.welcomeMessageEnabled ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <textarea
                value={settings.welcomeMessage}
                onChange={e => setSettings(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                disabled={!settings.welcomeMessageEnabled}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
                placeholder="Begrüßung für neue Konversationen..."
              />
            </div>

            {/* Außerhalb der Geschäftszeiten */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <VolumeX className="w-4 h-4" />
                Nachricht außerhalb der Geschäftszeiten
              </label>
              <textarea
                value={settings.outsideHoursMessage}
                onChange={e => setSettings(prev => ({ ...prev, outsideHoursMessage: e.target.value }))}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
                placeholder="Nachricht wenn keine Geschäftszeiten..."
              />
            </div>
          </div>
        )}

        {/* Geschäftszeiten Tab */}
        {activeTab === 'hours' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Legen Sie fest, wann automatische KI-Antworten aktiv sind. Außerhalb der Geschäftszeiten wird die definierte Abwesenheitsnachricht gesendet.
            </p>

            <div className="space-y-3">
              {WEEKDAYS.map(day => {
                const hours = settings.businessHours.find(h => h.dayOfWeek === day.value);

                return (
                  <div
                    key={day.value}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                      hours?.isOpen ? 'border-teal-200 bg-teal-50/50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="w-24">
                      <span className="font-medium text-gray-900">{day.label}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => updateBusinessHours(day.value, { isOpen: !hours?.isOpen })}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        hours?.isOpen ? 'bg-[#14ad9f]' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          hours?.isOpen ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>

                    {hours?.isOpen && (
                      <>
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={hours.openTime}
                            onChange={e => updateBusinessHours(day.value, { openTime: e.target.value })}
                            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
                          />
                          <span className="text-gray-500">bis</span>
                          <input
                            type="time"
                            value={hours.closeTime}
                            onChange={e => updateBusinessHours(day.value, { closeTime: e.target.value })}
                            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
                          />
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <span className="text-sm text-gray-500">Pause:</span>
                          <input
                            type="time"
                            value={hours.breakStart || ''}
                            onChange={e => updateBusinessHours(day.value, { breakStart: e.target.value })}
                            placeholder="--:--"
                            className="px-2 py-1 rounded border border-gray-200 text-sm w-20 focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
                          />
                          <span className="text-gray-400">-</span>
                          <input
                            type="time"
                            value={hours.breakEnd || ''}
                            onChange={e => updateBusinessHours(day.value, { breakEnd: e.target.value })}
                            placeholder="--:--"
                            className="px-2 py-1 rounded border border-gray-200 text-sm w-20 focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
                          />
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Auto-Antworten Tab */}
        {activeTab === 'replies' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">
                Definieren Sie automatische Antworten basierend auf Schlüsselwörtern oder Ereignissen.
              </p>
              <button
                onClick={addAutoReply}
                className="flex items-center gap-2 px-3 py-2 bg-[#14ad9f] text-white rounded-lg text-sm hover:bg-teal-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Neue Antwort
              </button>
            </div>

            {settings.autoReplies.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Noch keine Auto-Antworten definiert</p>
              </div>
            ) : (
              <div className="space-y-4">
                {settings.autoReplies.map(reply => (
                  <div
                    key={reply.id}
                    className="p-4 rounded-xl border border-gray-200 bg-white space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="text"
                            value={reply.name}
                            onChange={e => updateAutoReply(reply.id, { name: e.target.value })}
                            className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
                            placeholder="Name der Antwort"
                          />

                          <select
                            value={reply.type}
                            onChange={e => updateAutoReply(reply.id, { type: e.target.value as AutoReply['type'] })}
                            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
                          >
                            <option value="keyword">Keyword-basiert</option>
                            <option value="absence">Abwesenheit</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => updateAutoReply(reply.id, { isActive: !reply.isActive })}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                              reply.isActive ? 'bg-[#14ad9f]' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                reply.isActive ? 'translate-x-5' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>

                        {reply.type === 'keyword' && (
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Trigger-Keywords (kommagetrennt)</label>
                            <input
                              type="text"
                              value={reply.triggerKeywords?.join(', ') || ''}
                              onChange={e => updateAutoReply(reply.id, {
                                triggerKeywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean),
                              })}
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
                              placeholder="preis, kosten, angebot"
                            />
                          </div>
                        )}

                        {reply.type === 'absence' && (
                          <div className="flex items-center gap-4">
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block">Von</label>
                              <input
                                type="date"
                                value={reply.validFrom || ''}
                                onChange={e => updateAutoReply(reply.id, { validFrom: e.target.value })}
                                className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block">Bis</label>
                              <input
                                type="date"
                                value={reply.validUntil || ''}
                                onChange={e => updateAutoReply(reply.id, { validUntil: e.target.value })}
                                className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
                              />
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Antwortnachricht</label>
                          <textarea
                            value={reply.message}
                            onChange={e => updateAutoReply(reply.id, { message: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
                            placeholder="Die automatische Antwortnachricht..."
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => deleteAutoReply(reply.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Eskalation Tab */}
        {activeTab === 'keywords' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Bei diesen Schlüsselwörtern wird die Konversation automatisch an einen Mitarbeiter eskaliert.
            </p>

            <div className="flex flex-wrap gap-2 mb-4">
              {settings.escalationKeywords.map(keyword => (
                <span
                  key={keyword}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-sm"
                >
                  {keyword}
                  <button
                    onClick={() => removeEscalationKeyword(keyword)}
                    className="p-0.5 hover:bg-red-100 rounded-full"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Neues Keyword hinzufügen..."
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    addEscalationKeyword(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
              <button
                onClick={e => {
                  const input = (e.currentTarget.previousSibling as HTMLInputElement);
                  addEscalationKeyword(input.value);
                  input.value = '';
                }}
                className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm hover:bg-red-100 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
