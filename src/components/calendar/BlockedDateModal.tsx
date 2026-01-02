/**
 * BlockedDateModal - Modal zum Blockieren/Freigeben von Tagen
 */

'use client';

import React, { useState } from 'react';
import { X, Calendar, Lock, Unlock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';

interface BlockedDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  companyId: string;
  isBlocked: boolean;
  blockedReason?: string;
  blockedDateId?: string;
  onSuccess: () => void;
}

export function BlockedDateModal({
  isOpen,
  onClose,
  date,
  companyId,
  isBlocked,
  blockedReason,
  blockedDateId,
  onSuccess
}: BlockedDateModalProps) {
  const { firebaseUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Formularfelder
  const [reason, setReason] = useState(blockedReason || '');
  const [endDate, setEndDate] = useState<string>('');
  const [isRange, setIsRange] = useState(false);

  const dateStr = format(date, 'yyyy-MM-dd');
  const displayDate = format(date, 'EEEE, d. MMMM yyyy', { locale: de });

  const handleBlock = async () => {
    if (!firebaseUser) return;
    
    setLoading(true);
    setError(null);

    try {
      const idToken = await firebaseUser.getIdToken();
      
      const response = await fetch(`/api/companies/${companyId}/availability/blocked-dates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          date: dateStr,
          endDate: isRange && endDate ? endDate : undefined,
          reason: reason || 'Nicht verfügbar',
          blockType: 'full_day'
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Blockieren');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async () => {
    if (!firebaseUser) return;
    
    setLoading(true);
    setError(null);

    try {
      const idToken = await firebaseUser.getIdToken();
      
      const params = blockedDateId 
        ? `dateId=${blockedDateId}` 
        : `date=${dateStr}`;
      
      const response = await fetch(
        `/api/companies/${companyId}/availability/blocked-dates?${params}`, 
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Freigeben');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isBlocked ? 'bg-red-100' : 'bg-teal-100'}`}>
              {isBlocked ? (
                <Lock className="w-5 h-5 text-red-600" />
              ) : (
                <Calendar className="w-5 h-5 text-teal-600" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isBlocked ? 'Tag freigeben' : 'Tag blockieren'}
              </h2>
              <p className="text-sm text-gray-500">{displayDate}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Fehleranzeige */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {isBlocked ? (
          // Freigeben-Ansicht
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                Dieser Tag ist aktuell blockiert{blockedReason ? `:` : '.'}
              </p>
              {blockedReason && (
                <p className="text-sm font-medium text-gray-900 mt-1">{blockedReason}</p>
              )}
            </div>

            <p className="text-sm text-gray-600">
              Möchten Sie diesen Tag wieder für Buchungen freigeben?
            </p>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleUnblock}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Unlock className="w-4 h-4" />
                )}
                Freigeben
              </button>
            </div>
          </div>
        ) : (
          // Blockieren-Ansicht
          <div className="space-y-4">
            {/* Grund */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grund (optional)
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="">Grund auswählen...</option>
                <option value="Urlaub">Urlaub</option>
                <option value="Krankheit">Krankheit</option>
                <option value="Betriebsferien">Betriebsferien</option>
                <option value="Feiertag">Feiertag</option>
                <option value="Privat">Privat</option>
                <option value="Schulung">Schulung</option>
                <option value="Wartung">Wartung</option>
                <option value="Sonstiges">Sonstiges</option>
              </select>
            </div>

            {/* Datumsbereich */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isRange"
                checked={isRange}
                onChange={(e) => setIsRange(e.target.checked)}
                className="w-4 h-4 text-teal-500 rounded focus:ring-teal-500"
              />
              <label htmlFor="isRange" className="text-sm text-gray-700">
                Mehrere Tage blockieren
              </label>
            </div>

            {isRange && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bis einschließlich
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={dateStr}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleBlock}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                Blockieren
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
