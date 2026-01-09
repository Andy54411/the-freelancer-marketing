'use client';

import { useState } from 'react';
import {
  Clock,
  Calendar,
  Send,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface MessageSchedulerProps {
  companyId: string;
  recipientPhone: string;
  recipientName?: string;
  initialMessage?: string;
  onScheduled?: (scheduledAt: Date) => void;
  onClose?: () => void;
}

export default function MessageScheduler({
  companyId,
  recipientPhone,
  recipientName,
  initialMessage = '',
  onScheduled,
  onClose,
}: MessageSchedulerProps) {
  const [message, setMessage] = useState(initialMessage);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [success, setSuccess] = useState(false);

  // Schnellauswahl-Optionen
  const quickOptions = [
    { label: 'In 1 Stunde', hours: 1 },
    { label: 'In 3 Stunden', hours: 3 },
    { label: 'Morgen 9:00', tomorrow: true, time: '09:00' },
    { label: 'Morgen 14:00', tomorrow: true, time: '14:00' },
  ];

  const handleQuickSelect = (option: { hours?: number; tomorrow?: boolean; time?: string }) => {
    const now = new Date();

    if (option.hours) {
      const scheduled = new Date(now.getTime() + option.hours * 60 * 60 * 1000);
      setScheduledDate(scheduled.toISOString().split('T')[0]);
      setScheduledTime(scheduled.toTimeString().slice(0, 5));
    } else if (option.tomorrow && option.time) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      setScheduledDate(tomorrow.toISOString().split('T')[0]);
      setScheduledTime(option.time);
    }
  };

  const handleSchedule = async () => {
    if (!message.trim()) {
      toast.error('Bitte geben Sie eine Nachricht ein');
      return;
    }

    if (!scheduledDate || !scheduledTime) {
      toast.error('Bitte wählen Sie Datum und Uhrzeit');
      return;
    }

    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`);
    
    if (scheduledAt <= new Date()) {
      toast.error('Der Zeitpunkt muss in der Zukunft liegen');
      return;
    }

    try {
      setScheduling(true);

      const response = await fetch('/api/whatsapp/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          recipientPhone,
          recipientName,
          message: message.trim(),
          scheduledAt: scheduledAt.toISOString(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        onScheduled?.(scheduledAt);
        toast.success(`Nachricht geplant für ${scheduledAt.toLocaleString('de-DE')}`);
        
        // Schließe nach 2 Sekunden
        setTimeout(() => {
          onClose?.();
        }, 2000);
      } else {
        throw new Error(data.error || 'Unbekannter Fehler');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      toast.error(`Fehler beim Planen: ${errorMessage}`);
    } finally {
      setScheduling(false);
    }
  };

  // Mindestdatum ist heute
  const minDate = new Date().toISOString().split('T')[0];

  if (success) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Nachricht geplant</h3>
        <p className="text-gray-500">
          Die Nachricht wird am{' '}
          <strong>{new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString('de-DE')}</strong>{' '}
          gesendet.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#14ad9f]" />
          <span className="font-medium text-gray-900">Nachricht planen</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Empfänger */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>An:</span>
          <span className="font-medium text-gray-900">
            {recipientName || recipientPhone}
          </span>
        </div>

        {/* Nachricht */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Nachricht
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={4}
            placeholder="Ihre Nachricht eingeben..."
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none resize-none"
          />
        </div>

        {/* Schnellauswahl */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Schnellauswahl
          </label>
          <div className="flex flex-wrap gap-2">
            {quickOptions.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickSelect(option)}
                className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-[#14ad9f]/10 hover:text-[#14ad9f] rounded-full transition-colors"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Datum und Zeit */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              <Calendar className="w-3.5 h-3.5 inline mr-1" />
              Datum
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={e => setScheduledDate(e.target.value)}
              min={minDate}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              <Clock className="w-3.5 h-3.5 inline mr-1" />
              Uhrzeit
            </label>
            <input
              type="time"
              value={scheduledTime}
              onChange={e => setScheduledTime(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
            />
          </div>
        </div>

        {/* Hinweis */}
        {scheduledDate && scheduledTime && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Die Nachricht wird am{' '}
              <strong>
                {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString('de-DE', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </strong>{' '}
              gesendet.
            </span>
          </div>
        )}

        {/* Aktionen */}
        <div className="flex items-center gap-3 pt-2">
          {onClose && (
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
            >
              Abbrechen
            </button>
          )}
          <button
            onClick={handleSchedule}
            disabled={scheduling || !message.trim() || !scheduledDate || !scheduledTime}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#14ad9f] text-white rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {scheduling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Plane...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Nachricht planen
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
