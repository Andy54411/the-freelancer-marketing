// /Users/andystaudinger/Tasko/src/components/TimeTrackingManager.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit3, FiTrash2, FiClock, FiCalendar, FiUser } from 'react-icons/fi';
import { db } from '@/firebase/clients';
import { doc, getDoc } from 'firebase/firestore';
import { auth } from '@/firebase/clients';
import { onAuthStateChanged, User } from 'firebase/auth';

interface TimeEntry {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  description: string;
  category: 'original' | 'additional';
  status: 'logged' | 'submitted' | 'approved' | 'rejected';
  billableAmount?: number;
  travelCost?: number;
  travelTime?: boolean;
  notes?: string;
}

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
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [showAllEntries, setShowAllEntries] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '17:00',
    hours: 8,
    description: '',
    notes: '',
    travelTime: false,
    travelCost: 0,
    isBreakTime: false,
    breakMinutes: 0,
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

      // Lade Auftragsdaten direkt aus Firebase
      const orderDoc = await getDoc(doc(db, 'auftraege', orderId));
      if (orderDoc.exists()) {
        const orderData = orderDoc.data();
        const entries: TimeEntry[] = [];

        // Lade TimeTracking-Einträge aus dem Auftrag
        if (orderData.timeTracking?.timeEntries) {
          orderData.timeTracking.timeEntries.forEach((entry: any, index: number) => {
            entries.push({
              id: entry.id || `entry-${index}`,
              date: entry.date || '',
              startTime: entry.startTime || '',
              endTime: entry.endTime || '',
              hours: entry.hours || 0,
              description: entry.description || '',
              category: entry.category || 'original',
              status:
                entry.status === 'customer_approved'
                  ? 'approved'
                  : entry.status === 'customer_rejected'
                    ? 'rejected'
                    : entry.status === 'submitted'
                      ? 'submitted'
                      : 'logged',
              billableAmount: entry.billableAmount || 0,
              travelCost: entry.travelCost || 0,
              travelTime: entry.travelTime || false,
              notes: entry.notes || '',
            });
          });
        }

        setTimeEntries(entries);
      }
    } catch (error) {
      console.error('Error loading time tracking:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeCalculation = () => {
    if (formData.startTime && formData.endTime) {
      const start = new Date(`2000-01-01T${formData.startTime}:00`);
      const end = new Date(`2000-01-01T${formData.endTime}:00`);
      const diffMs = end.getTime() - start.getTime();
      let hours = Math.max(0, diffMs / (1000 * 60 * 60));

      // Pausenzeit abziehen falls aktiviert
      if (formData.isBreakTime && formData.breakMinutes > 0) {
        hours = Math.max(0, hours - formData.breakMinutes / 60);
      }

      setFormData(prev => ({ ...prev, hours: hours }));
    }
  };

  const handleSubmitTimeEntry = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    try {
      // Einfache Zeiteintragung - nur Demo für jetzt
      alert('Zeiteintragung würde gespeichert werden');

      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '17:00',
        hours: 8,
        description: '',
        notes: '',
        travelTime: false,
        travelCost: 0,
        isBreakTime: false,
        breakMinutes: 0,
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
      notes: entry.notes || '',
      travelTime: entry.travelTime || false,
      travelCost: entry.travelCost || 0,
      isBreakTime: false,
      breakMinutes: 0,
    });
    setShowAddForm(true);
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Zeiteintragung wirklich löschen?')) return;

    try {
      alert('Zeiteintragung würde gelöscht werden');
      await loadTimeTracking();
    } catch (error) {
      console.error('Error deleting time entry:', error);
      alert('Fehler beim Löschen der Zeiteintragung');
    }
  };

  // Berechne einfache Zusammenfassung
  const summary = {
    totalHours: timeEntries.reduce((sum, entry) => sum + entry.hours, 0),
    originalHours: timeEntries
      .filter(entry => entry.category === 'original')
      .reduce((sum, entry) => sum + entry.hours, 0),
    additionalHours: timeEntries
      .filter(entry => entry.category === 'additional')
      .reduce((sum, entry) => sum + entry.hours, 0),
    approvedHours: timeEntries
      .filter(entry => entry.status === 'approved')
      .reduce((sum, entry) => sum + entry.hours, 0),
    totalRevenue: timeEntries
      .filter(entry => entry.status === 'approved')
      .reduce((sum, entry) => sum + entry.hours * hourlyRate, 0),
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14ad9f] mx-auto"></div>
        <p className="mt-4 text-gray-600">Lade Zeiterfassung...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Card - Ähnlich wie "user angebot" Design */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-[#14ad9f]/10 to-teal-50 px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#14ad9f] rounded-xl shadow-lg">
                <FiClock className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Zeiterfassung</h2>
                <div className="flex items-center gap-4 mt-1">
                  <div className="flex items-center gap-2 text-gray-600">
                    <FiUser size={16} />
                    <span className="font-medium">{customerName}</span>
                  </div>
                  <div className="text-gray-400">•</div>
                  <div className="text-gray-600">
                    <span className="font-medium text-blue-600">{originalPlannedHours}h</span>{' '}
                    geplant
                  </div>
                  <div className="text-gray-400">•</div>
                  <div className="text-gray-600">
                    <span className="font-medium text-green-600">{hourlyRate}€/h</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setShowAddForm(true);
                setEditingEntry(null);
              }}
              className="flex items-center gap-2 px-5 py-3 bg-[#14ad9f] text-white rounded-lg hover:bg-[#129488] transition-colors shadow-md hover:shadow-lg font-medium"
            >
              <FiPlus size={18} />
              Zeit hinzufügen
            </button>
          </div>
        </div>

        {/* Statistik Cards */}
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {summary.totalHours.toFixed(1)}h
              </div>
              <div className="text-sm text-gray-600">Gesamt</div>
            </div>

            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 text-center">
              <div className="text-2xl font-bold text-blue-700 mb-1">
                {summary.originalHours.toFixed(1)}h
              </div>
              <div className="text-sm text-blue-600">Geplant</div>
            </div>

            <div className="bg-orange-50 rounded-lg border border-orange-200 p-4 text-center">
              <div className="text-2xl font-bold text-orange-700 mb-1">
                {summary.additionalHours.toFixed(1)}h
              </div>
              <div className="text-sm text-orange-600">Zusätzlich</div>
            </div>

            <div className="bg-green-50 rounded-lg border border-green-200 p-4 text-center">
              <div className="text-2xl font-bold text-green-700 mb-1">
                {summary.totalRevenue.toFixed(0)}€
              </div>
              <div className="text-sm text-green-600">Umsatz</div>
            </div>
          </div>
        </div>
      </div>

      {/* Zeiteinträge */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Zeiteinträge</h3>
        </div>

        <div className="p-6">
          {timeEntries.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiCalendar className="text-gray-400" size={24} />
              </div>
              <p className="text-gray-500 text-lg">Noch keine Zeiteinträge vorhanden</p>
              <p className="text-gray-400 text-sm mt-1">Fügen Sie Ihre erste Arbeitszeit hinzu</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Zeige nur die ersten 5 Einträge oder alle, je nach showAllEntries */}
              {(showAllEntries ? timeEntries : timeEntries.slice(0, 5)).map(entry => (
                <div
                  key={entry.id}
                  className={`p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                    entry.status === 'approved'
                      ? 'border-green-200 bg-green-50'
                      : entry.status === 'submitted'
                        ? 'border-yellow-200 bg-yellow-50'
                        : entry.status === 'rejected'
                          ? 'border-red-200 bg-red-50'
                          : entry.category === 'additional'
                            ? 'border-orange-200 bg-orange-50'
                            : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-gray-900">{entry.date}</span>
                        <span className="text-gray-500">
                          {entry.startTime} - {entry.endTime}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            entry.category === 'additional'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {entry.category === 'additional' ? 'Zusätzlich' : 'Geplant'}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            entry.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : entry.status === 'submitted'
                                ? 'bg-yellow-100 text-yellow-800'
                                : entry.status === 'rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {entry.status === 'approved'
                            ? 'Freigegeben'
                            : entry.status === 'submitted'
                              ? 'Eingereicht'
                              : entry.status === 'rejected'
                                ? 'Abgelehnt'
                                : 'Erfasst'}
                        </span>
                      </div>

                      <p className="text-gray-700 mb-2">{entry.description}</p>

                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-medium text-gray-900">
                          {entry.hours.toFixed(1)} Stunden
                        </span>
                        {entry.billableAmount && entry.billableAmount > 0 && (
                          <span className="text-green-600 font-medium">
                            +{(entry.billableAmount / 100).toFixed(2)}€
                          </span>
                        )}
                        {entry.travelCost && entry.travelCost > 0 && (
                          <span className="text-blue-600">
                            +{(entry.travelCost / 100).toFixed(2)}€ Anfahrt
                          </span>
                        )}
                      </div>

                      {entry.notes && (
                        <p className="text-sm text-gray-500 mt-2 italic">{entry.notes}</p>
                      )}
                    </div>

                    {/* Actions nur bei "logged" Status */}
                    {entry.status === 'logged' && (
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleEditEntry(entry)}
                          className="p-2 text-gray-400 hover:text-[#14ad9f] transition-colors"
                          title="Bearbeiten"
                        >
                          <FiEdit3 size={16} />
                        </button>
                        <button
                          onClick={() => entry.id && handleDeleteEntry(entry.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Löschen"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* "Mehr anzeigen" / "Weniger anzeigen" Button */}
              {timeEntries.length > 5 && (
                <div className="text-center pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setShowAllEntries(!showAllEntries)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-[#14ad9f] hover:text-[#129488] hover:bg-[#14ad9f]/5 rounded-lg transition-colors font-medium"
                  >
                    {showAllEntries ? (
                      <>
                        Weniger anzeigen
                        <svg
                          className="w-4 h-4 rotate-180"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </>
                    ) : (
                      <>
                        Alle {timeEntries.length} Einträge anzeigen
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                {editingEntry ? 'Zeiteintragung bearbeiten' : 'Neue Zeiteintragung'}
              </h3>

              <form onSubmit={handleSubmitTimeEntry} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Datum</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] transition-colors"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Startzeit
                    </label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={e => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                      onBlur={handleTimeCalculation}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Endzeit</label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={e => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                      onBlur={handleTimeCalculation}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stunden (berechnet)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.hours}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, hours: parseFloat(e.target.value) || 0 }))
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] transition-colors"
                    required
                  />
                </div>

                {/* Pausenzeit */}
                <div>
                  <label className="flex items-center gap-3">
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
                      className="w-full mt-3 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] transition-colors"
                      placeholder="Pausenzeit in Minuten"
                    />
                  )}
                </div>

                {/* Anfahrt */}
                <div>
                  <label className="flex items-center gap-3">
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
                    <span className="text-sm font-medium text-gray-700">
                      Anfahrtskosten hinzufügen
                    </span>
                  </label>
                  {formData.travelTime && (
                    <div className="mt-3">
                      <div className="relative">
                        <input
                          type="number"
                          value={formData.travelCost / 100}
                          onChange={e =>
                            setFormData(prev => ({
                              ...prev,
                              travelCost: Math.round((parseFloat(e.target.value) || 0) * 100),
                            }))
                          }
                          step="0.01"
                          min="0"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] transition-colors pr-12"
                          placeholder="Anfahrtskosten"
                        />
                        <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                          €
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Kategorie-Anzeige */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kategorie (automatisch berechnet)
                  </label>
                  <div className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50">
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
                  <p className="text-xs text-gray-500 mt-2">
                    Das System kategorisiert automatisch basierend auf den geplanten{' '}
                    {originalPlannedHours}h
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Beschreibung
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] transition-colors"
                    placeholder="Was wurde gemacht?"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notizen (optional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-[#14ad9f] transition-colors"
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
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-[#14ad9f] text-white rounded-lg hover:bg-[#129488] transition-colors font-medium"
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
