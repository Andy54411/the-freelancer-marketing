// /Users/andystaudinger/Tasko/src/components/TimeTrackingManager.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit3, FiTrash2, FiClock, FiCheck, FiX } from 'react-icons/fi';
import { TimeEntry, OrderTimeTracking, TimeTrackingStats } from '@/types/timeTracking';
import { TimeTracker } from '@/lib/timeTracker';
import { auth } from '@/firebase/clients';
import { onAuthStateChanged, User } from 'firebase/auth';

interface TimeTrackingManagerProps {
  orderId: string;
  customerName: string;
  originalPlannedHours: number;
  hourlyRate: number;
  onTimeSubmitted?: () => void;
}

export default function TimeTrackingManager({
  orderId,
  customerName,
  originalPlannedHours,
  hourlyRate,
  onTimeSubmitted,
}: TimeTrackingManagerProps) {
  const [user, setUser] = useState<User | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [orderTracking, setOrderTracking] = useState<OrderTimeTracking | null>(null);
  const [stats, setStats] = useState<TimeTrackingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '17:00',
    hours: 8,
    description: '',
    isBreakTime: false,
    breakMinutes: 30,
    travelTime: false,
    travelMinutes: 0,
    notes: '',
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
      if (currentUser) {
        loadTimeTracking();
      }
    });

    return () => unsubscribe();
  }, [orderId]);

  const loadTimeTracking = async () => {
    try {
      setLoading(true);

      // Lade Time Entries
      const entries = await TimeTracker.getTimeEntriesForOrder(orderId);
      setTimeEntries(entries);

      // Lade Order Tracking (falls vorhanden)
      // In echter Implementierung würde das aus der DB geladen

      // Lade Provider Stats
      if (user) {
        const providerStats = await TimeTracker.getProviderTimeTrackingStats(user.uid);
        setStats(providerStats);
      }
    } catch (error) {
      console.error('Error loading time tracking:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeCalculation = () => {
    if (formData.startTime && formData.endTime) {
      const calculatedHours = TimeTracker.calculateHoursFromTime(
        formData.startTime,
        formData.endTime,
        formData.isBreakTime ? formData.breakMinutes : 0,
        formData.travelTime ? formData.travelMinutes : 0
      );
      setFormData(prev => ({ ...prev, hours: calculatedHours }));
    }
  };

  const handleSubmitTimeEntry = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    try {
      // INTELLIGENTE KATEGORISIERUNG: Berechne automatisch ob "original" oder "additional"
      const currentOriginalHours = timeEntries
        .filter(entry => entry.category === 'original')
        .reduce((sum, entry) => sum + entry.hours, 0);

      const remainingOriginalHours = Math.max(0, originalPlannedHours - currentOriginalHours);

      // Automatische Kategorisierung basierend auf verbleibenden geplanten Stunden
      let autoCategory: 'original' | 'additional';
      if (remainingOriginalHours >= formData.hours) {
        // Genug geplante Stunden verfügbar
        autoCategory = 'original';
      } else {
        // Überschreitet geplante Stunden - wird als zusätzlich kategorisiert
        autoCategory = 'additional';
      }

      const entryData = {
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        hours: formData.hours,
        description: formData.description,
        category: autoCategory, // Verwende automatische Kategorisierung statt Benutzer-Auswahl
        isBreakTime: formData.isBreakTime,
        breakMinutes: formData.isBreakTime ? formData.breakMinutes : 0,
        travelTime: formData.travelTime,
        travelMinutes: formData.travelTime ? formData.travelMinutes : 0,
        notes: formData.notes,
      };

      if (editingEntry && editingEntry.id) {
        await TimeTracker.updateTimeEntry(orderId, editingEntry.id, entryData);
      } else {
        await TimeTracker.logTimeEntry(orderId, entryData);
      }

      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '17:00',
        hours: 8,
        description: '',
        isBreakTime: false,
        breakMinutes: 30,
        travelTime: false,
        travelMinutes: 0,
        notes: '',
      });
      setShowAddForm(false);
      setEditingEntry(null);

      // Reload data
      await loadTimeTracking();

      if (onTimeSubmitted) {
        onTimeSubmitted();
      }
    } catch (error) {
      console.error('Error submitting time entry:', error);
      alert('Fehler beim Speichern der Zeiteintragung');
    }
  };

  const handleEditEntry = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setFormData({
      date: entry.date,
      startTime: entry.startTime,
      endTime: entry.endTime || '',
      hours: entry.hours,
      description: entry.description,
      isBreakTime: entry.isBreakTime || false,
      breakMinutes: entry.breakMinutes || 0,
      travelTime: entry.travelTime || false,
      travelMinutes: entry.travelMinutes || 0,
      notes: entry.notes || '',
    });
    setShowAddForm(true);
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Zeiteintragung wirklich löschen?')) return;

    try {
      await TimeTracker.deleteTimeEntry(orderId, entryId);
      await loadTimeTracking();
    } catch (error) {
      console.error('Error deleting time entry:', error);
      alert('Fehler beim Löschen der Zeiteintragung');
    }
  };

  // Berechne Zusammenfassung
  const summary = {
    totalHours: timeEntries.reduce((sum, entry) => sum + entry.hours, 0),
    originalHours: timeEntries
      .filter(entry => entry.category === 'original')
      .reduce((sum, entry) => sum + entry.hours, 0),
    additionalHours: timeEntries
      .filter(entry => entry.category === 'additional')
      .reduce((sum, entry) => sum + entry.hours, 0),
    pendingApproval: timeEntries
      .filter(entry => entry.status === 'submitted')
      .reduce((sum, entry) => sum + entry.hours, 0),
    approvedHours: timeEntries
      .filter(entry => entry.status === 'customer_approved')
      .reduce((sum, entry) => sum + entry.hours, 0),
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f] mx-auto"></div>
        <p className="mt-2 text-gray-600">Lade Zeiterfassung...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FiClock className="text-[#14ad9f]" />
              Zeiterfassung - {customerName}
            </h3>
            <p className="text-sm text-gray-600">
              Geplant: {originalPlannedHours}h • Stundensatz: {hourlyRate}€/h
            </p>
          </div>

          <button
            onClick={() => {
              setShowAddForm(true);
              setEditingEntry(null);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#14ad9f] text-white rounded-md hover:bg-[#129488] transition-colors"
          >
            <FiPlus size={16} />
            Zeit hinzufügen
          </button>
        </div>
      </div>

      {/* Zusammenfassung */}
      <div className="p-6 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{summary.totalHours.toFixed(1)}</div>
            <div className="text-sm text-gray-600">Gesamt Stunden</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {summary.originalHours.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">Geplante Stunden</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {summary.additionalHours.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">Zusätzliche Stunden</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {summary.pendingApproval.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">Warten auf Freigabe</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {summary.approvedHours.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">Freigegeben</div>
          </div>
        </div>
      </div>

      {/* Zeiteinträge */}
      <div className="p-6">
        {timeEntries.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            Noch keine Zeiteinträge vorhanden. Fügen Sie die erste Zeiteintragung hinzu.
          </p>
        ) : (
          <div className="space-y-3">
            {timeEntries.map(entry => (
              <div
                key={entry.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  entry.status === 'customer_approved'
                    ? 'border-green-200 bg-green-50'
                    : entry.status === 'submitted'
                      ? 'border-yellow-200 bg-yellow-50'
                      : entry.status === 'customer_rejected'
                        ? 'border-red-200 bg-red-50'
                        : entry.category === 'additional'
                          ? 'border-orange-200 bg-orange-50'
                          : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{entry.date}</span>
                      <span className="text-gray-500">
                        {entry.startTime} - {entry.endTime}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          entry.category === 'additional'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {entry.category === 'additional' ? 'Zusätzlich' : 'Geplant'}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          entry.status === 'customer_approved'
                            ? 'bg-green-100 text-green-800'
                            : entry.status === 'submitted'
                              ? 'bg-yellow-100 text-yellow-800'
                              : entry.status === 'customer_rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {entry.status === 'customer_approved'
                          ? 'Freigegeben'
                          : entry.status === 'submitted'
                            ? 'Eingereicht'
                            : entry.status === 'customer_rejected'
                              ? 'Abgelehnt'
                              : 'Erfasst'}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-1">{entry.description}</p>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">{entry.hours}h</span>
                      {entry.isBreakTime && <span> (inkl. {entry.breakMinutes}min Pause)</span>}
                      {entry.travelTime && <span> (inkl. {entry.travelMinutes}min Anfahrt)</span>}
                      {entry.billableAmount && (
                        <span className="ml-2 text-green-600 font-medium">
                          +{(entry.billableAmount / 100).toFixed(2)}€
                        </span>
                      )}
                    </div>
                    {entry.notes && <p className="text-sm text-gray-500 mt-1">{entry.notes}</p>}
                  </div>

                  {entry.status === 'logged' && (
                    <div className="flex items-center gap-1 ml-4">
                      <button
                        onClick={() => handleEditEntry(entry)}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <FiEdit3 size={16} />
                      </button>
                      <button
                        onClick={() => entry.id && handleDeleteEntry(entry.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingEntry ? 'Zeiteintragung bearbeiten' : 'Neue Zeiteintragung'}
              </h3>

              <form onSubmit={handleSubmitTimeEntry} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Startzeit
                    </label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={e => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                      onBlur={handleTimeCalculation}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Endzeit</label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={e => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                      onBlur={handleTimeCalculation}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stunden (berechnet)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.hours}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, hours: parseFloat(e.target.value) || 0 }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
                    required
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isBreakTime}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          isBreakTime: e.target.checked,
                        }))
                      }
                      className="rounded border-gray-300 text-[#14ad9f] focus:ring-[#14ad9f]"
                    />
                    <span className="text-sm font-medium text-gray-700">Pausenzeit abziehen</span>
                  </label>
                  {formData.isBreakTime && (
                    <input
                      type="number"
                      value={formData.breakMinutes}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          breakMinutes: parseInt(e.target.value) || 0,
                        }))
                      }
                      onBlur={handleTimeCalculation}
                      className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
                      placeholder="Pausenzeit in Minuten"
                    />
                  )}
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.travelTime}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          travelTime: e.target.checked,
                        }))
                      }
                      className="rounded border-gray-300 text-[#14ad9f] focus:ring-[#14ad9f]"
                    />
                    <span className="text-sm font-medium text-gray-700">Anfahrt hinzufügen</span>
                  </label>
                  {formData.travelTime && (
                    <input
                      type="number"
                      value={formData.travelMinutes}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          travelMinutes: parseInt(e.target.value) || 0,
                        }))
                      }
                      onBlur={handleTimeCalculation}
                      className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
                      placeholder="Anfahrtsdauer in Minuten"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kategorie (automatisch berechnet)
                  </label>
                  <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50">
                    {(() => {
                      const currentOriginalHours = timeEntries
                        .filter(entry => entry.category === 'original')
                        .reduce((sum, entry) => sum + entry.hours, 0);

                      const remainingOriginalHours = Math.max(
                        0,
                        originalPlannedHours - currentOriginalHours
                      );

                      if (remainingOriginalHours >= formData.hours) {
                        return (
                          <span className="flex items-center gap-2 text-blue-700">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            Geplante Stunden ({remainingOriginalHours.toFixed(1)}h verfügbar)
                          </span>
                        );
                      } else {
                        const additionalHours = formData.hours - remainingOriginalHours;
                        return (
                          <span className="flex items-center gap-2 text-orange-700">
                            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                            Zusätzliche Stunden (
                            {remainingOriginalHours > 0
                              ? `${remainingOriginalHours.toFixed(1)}h geplant + ${additionalHours.toFixed(1)}h zusätzlich`
                              : `${formData.hours.toFixed(1)}h zusätzlich`}
                            )
                          </span>
                        );
                      }
                    })()}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Das System kategorisiert automatisch basierend auf den geplanten{' '}
                    {originalPlannedHours}h
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Beschreibung
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
                    placeholder="Was wurde gemacht?"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notizen (optional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f]"
                    placeholder="Zusätzliche Informationen..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingEntry(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-[#14ad9f] text-white rounded-md hover:bg-[#129488] transition-colors"
                  >
                    {editingEntry ? 'Aktualisieren' : 'Hinzufügen'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
