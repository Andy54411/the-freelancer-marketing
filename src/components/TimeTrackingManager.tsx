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
    travelCost: 0, // Anfahrtskosten in Cent
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
        travelCost: formData.travelTime ? formData.travelCost : 0,
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
        travelCost: 0,
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
      travelCost: entry.travelCost || 0,
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
    escrowAuthorizedHours: timeEntries
      .filter(entry => entry.status === 'platform_held')
      .reduce((sum, entry) => sum + entry.hours, 0),
    paidHours: timeEntries
      .filter(entry => entry.platformHoldStatus === 'transferred')
      .reduce((sum, entry) => sum + entry.hours, 0),
    // Anfahrtskosten-Tracking
    totalTravelCosts: timeEntries
      .filter(entry => entry.travelTime && entry.travelCost)
      .reduce((sum, entry) => sum + (entry.travelCost || 0), 0),
    approvedTravelCosts: timeEntries
      .filter(entry => entry.status === 'customer_approved' && entry.travelTime && entry.travelCost)
      .reduce((sum, entry) => sum + (entry.travelCost || 0), 0),
    paidTravelCosts: timeEntries
      .filter(
        entry => entry.platformHoldStatus === 'transferred' && entry.travelTime && entry.travelCost
      )
      .reduce((sum, entry) => sum + (entry.travelCost || 0), 0),
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
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-[#14ad9f]/5 to-teal-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-[#14ad9f] rounded-lg">
                <FiClock className="text-white" size={20} />
              </div>
              Zeiterfassung - {customerName}
            </h3>
            <p className="text-sm text-gray-600 mt-1 ml-11">
              Geplant: <span className="font-semibold text-blue-600">{originalPlannedHours}h</span>{' '}
              • Stundensatz: <span className="font-semibold text-green-600">{hourlyRate}€/h</span>
            </p>
          </div>

          <button
            onClick={() => {
              setShowAddForm(true);
              setEditingEntry(null);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#14ad9f] text-white rounded-lg hover:bg-[#129488] transition-colors shadow-md hover:shadow-lg font-medium"
          >
            <FiPlus size={18} />
            Zeit hinzufügen
          </button>
        </div>
      </div>

      {/* Statistik Cards */}
      <div className="p-6 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {/* Gesamt Stunden */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {summary.totalHours.toFixed(1)}
              </div>
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                Gesamt Stunden
              </div>
            </div>
          </div>

          {/* Geplante Stunden */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-shadow p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-700 mb-1">
                {summary.originalHours.toFixed(1)}
              </div>
              <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">
                Geplante Stunden
              </div>
            </div>
          </div>

          {/* Zusätzliche Stunden */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200 shadow-sm hover:shadow-md transition-shadow p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-700 mb-1">
                {summary.additionalHours.toFixed(1)}
              </div>
              <div className="text-xs text-orange-600 font-medium uppercase tracking-wide">
                Zusätzliche Stunden
              </div>
            </div>
          </div>

          {/* Warten auf Freigabe */}
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl border border-yellow-200 shadow-sm hover:shadow-md transition-shadow p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-700 mb-1">
                {summary.pendingApproval.toFixed(1)}
              </div>
              <div className="text-xs text-yellow-600 font-medium uppercase tracking-wide">
                Warten auf Freigabe
              </div>
            </div>
          </div>

          {/* Freigegeben */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 shadow-sm hover:shadow-md transition-shadow p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700 mb-1">
                {summary.approvedHours.toFixed(1)}
              </div>
              <div className="text-xs text-green-600 font-medium uppercase tracking-wide">
                Freigegeben
              </div>
            </div>
          </div>

          {/* Platform Hold */}
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl border border-indigo-200 shadow-sm hover:shadow-md transition-shadow p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-700 mb-1">
                {summary.escrowAuthorizedHours.toFixed(1)}
              </div>
              <div className="text-xs text-indigo-600 font-medium uppercase tracking-wide">
                Platform Hold
              </div>
            </div>
          </div>

          {/* Bezahlt */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 shadow-sm hover:shadow-md transition-shadow p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-700 mb-1">
                {summary.paidHours.toFixed(1)}
              </div>
              <div className="text-xs text-purple-600 font-medium uppercase tracking-wide flex items-center justify-center gap-1">
                <span>💰</span> Bezahlt
              </div>
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Anfahrtskosten-Übersicht */}
          {summary.totalTravelCosts > 0 && (
            <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <span className="text-amber-600 text-lg">🚗</span>
                </div>
                <div>
                  <h4 className="font-semibold text-amber-800 mb-1">Anfahrtskosten</h4>
                  <div className="text-sm text-amber-700 space-y-1">
                    <div>
                      Gesamt:{' '}
                      <span className="font-semibold">
                        {(summary.totalTravelCosts / 100).toFixed(2)}€
                      </span>
                    </div>
                    {summary.approvedTravelCosts > 0 && (
                      <div>
                        Genehmigt:{' '}
                        <span className="font-semibold">
                          {(summary.approvedTravelCosts / 100).toFixed(2)}€
                        </span>
                      </div>
                    )}
                    {summary.paidTravelCosts > 0 && (
                      <div className="text-purple-700">
                        ✅ Bezahlt:{' '}
                        <span className="font-semibold">
                          {(summary.paidTravelCosts / 100).toFixed(2)}€
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Platform Hold System Erklärung */}
          <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-blue-600 text-lg">💰</span>
              </div>
              <div>
                <h4 className="font-semibold text-blue-800 mb-1">Platform Hold System</h4>
                <p className="text-sm text-blue-700 leading-relaxed">
                  Zusätzliche Stunden werden zuerst vom Kunden bezahlt und sicher auf unserem
                  Platform Account gehalten. Das Geld wird erst nach beidseitiger Projektabnahme
                  automatisch an die Firma übertragen.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Zeiteinträge */}
      <div className="p-6">
        {timeEntries.length === 0 ? (
          <div className="text-center py-12">
            <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <FiClock className="text-gray-400" size={24} />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Noch keine Zeiteinträge</h3>
            <p className="text-gray-500 mb-6">
              Fügen Sie die erste Zeiteintragung hinzu, um zu beginnen.
            </p>
            <button
              onClick={() => {
                setShowAddForm(true);
                setEditingEntry(null);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-[#129488] transition-colors font-medium"
            >
              <FiPlus size={16} />
              Erste Zeiteintragung erstellen
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {timeEntries
              .sort((a, b) => {
                // Sortiere nach Datum (neueste zuerst), dann nach Erstellungszeit
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);

                if (dateA.getTime() !== dateB.getTime()) {
                  return dateB.getTime() - dateA.getTime(); // Neueste zuerst
                }

                // Bei gleichem Datum: nach Erstellungszeit sortieren (neueste zuerst)
                const createdA = a.createdAt.seconds * 1000;
                const createdB = b.createdAt.seconds * 1000;
                return createdB - createdA;
              })
              .map(entry => (
                <div
                  key={entry.id}
                  className={`bg-white rounded-xl border-2 shadow-sm hover:shadow-md transition-all overflow-hidden ${
                    // Priorisiere bezahlte/übertragene Status
                    entry.platformHoldStatus === 'transferred'
                      ? 'border-purple-300 shadow-purple-100'
                      : entry.status === 'platform_released'
                        ? 'border-green-300 shadow-green-100'
                        : entry.status === 'customer_approved'
                          ? 'border-green-200'
                          : entry.status === 'submitted'
                            ? 'border-yellow-200'
                            : entry.status === 'customer_rejected'
                              ? 'border-red-200'
                              : entry.category === 'additional'
                                ? 'border-orange-200'
                                : 'border-gray-200'
                  }`}
                >
                  {/* Status Bar */}
                  <div
                    className={`h-1 w-full ${
                      entry.platformHoldStatus === 'transferred'
                        ? 'bg-gradient-to-r from-purple-400 to-purple-600'
                        : entry.status === 'customer_approved'
                          ? 'bg-gradient-to-r from-green-400 to-green-600'
                          : entry.status === 'submitted'
                            ? 'bg-gradient-to-r from-yellow-400 to-yellow-600'
                            : entry.status === 'customer_rejected'
                              ? 'bg-gradient-to-r from-red-400 to-red-600'
                              : entry.category === 'additional'
                                ? 'bg-gradient-to-r from-orange-400 to-orange-600'
                                : 'bg-gradient-to-r from-blue-400 to-blue-600'
                    }`}
                  />

                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Header mit Datum und Zeit */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="font-semibold text-gray-900 text-lg">
                            {new Date(entry.date).toLocaleDateString('de-DE', {
                              weekday: 'short',
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </div>
                          <div className="text-gray-500 font-medium">
                            {entry.startTime} - {entry.endTime}
                          </div>

                          {/* Kategorie Badge */}
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
                              entry.category === 'additional'
                                ? 'bg-orange-100 text-orange-800 border border-orange-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}
                          >
                            {entry.category === 'additional' ? 'Zusätzlich' : 'Geplant'}
                          </span>

                          {/* Status Badge */}
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              entry.platformHoldStatus === 'transferred'
                                ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                : entry.status === 'customer_approved'
                                  ? 'bg-green-100 text-green-800 border border-green-200'
                                  : entry.status === 'submitted'
                                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                    : entry.status === 'customer_rejected'
                                      ? 'bg-red-100 text-red-800 border border-red-200'
                                      : entry.status === 'platform_held'
                                        ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                        : entry.status === 'platform_released'
                                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                          : 'bg-gray-100 text-gray-800 border border-gray-200'
                            }`}
                          >
                            {entry.platformHoldStatus === 'transferred'
                              ? '💰 Bezahlt & Übertragen'
                              : entry.status === 'customer_approved'
                                ? 'Freigegeben'
                                : entry.status === 'submitted'
                                  ? 'Eingereicht'
                                  : entry.status === 'customer_rejected'
                                    ? 'Abgelehnt'
                                    : entry.status === 'platform_held'
                                      ? 'Platform Hold (Gehalten)'
                                      : entry.status === 'platform_released'
                                        ? 'Platform Hold Freigegeben'
                                        : 'Erfasst'}
                          </span>
                        </div>

                        {/* Beschreibung */}
                        <p className="text-gray-700 mb-3 font-medium">{entry.description}</p>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                          {/* Arbeitszeit */}
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-blue-100 rounded-lg">
                              <FiClock className="text-blue-600" size={14} />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{entry.hours}h</div>
                              {entry.isBreakTime && (
                                <div className="text-gray-500 text-xs">
                                  inkl. {entry.breakMinutes}min Pause
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Anfahrtskosten */}
                          {entry.travelTime && entry.travelCost && entry.travelCost > 0 && (
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-amber-100 rounded-lg">
                                <span className="text-amber-600 text-sm">🚗</span>
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">
                                  {(entry.travelCost / 100).toFixed(2)}€ Anfahrt
                                </div>
                                <div className="text-gray-500 text-xs">Zusätzliche Kosten</div>
                              </div>
                            </div>
                          )}

                          {/* Bezahlung */}
                          {entry.billableAmount && (
                            <div className="flex items-center gap-2">
                              <div
                                className={`p-1.5 rounded-lg ${
                                  entry.platformHoldStatus === 'transferred'
                                    ? 'bg-purple-100'
                                    : 'bg-green-100'
                                }`}
                              >
                                <span
                                  className={
                                    entry.platformHoldStatus === 'transferred'
                                      ? 'text-purple-600'
                                      : 'text-green-600'
                                  }
                                >
                                  💰
                                </span>
                              </div>
                              <div>
                                <div
                                  className={`font-semibold ${
                                    entry.platformHoldStatus === 'transferred'
                                      ? 'text-purple-700'
                                      : 'text-green-700'
                                  }`}
                                >
                                  {entry.platformHoldStatus === 'transferred' ? '✅ ' : '+'}
                                  {(entry.billableAmount / 100).toFixed(2)}€
                                </div>
                                <div className="text-gray-500 text-xs">
                                  {entry.platformHoldStatus === 'held' && 'Platform Hold'}
                                  {entry.platformHoldStatus === 'transferred' &&
                                    `Übertragen am ${
                                      entry.transferredAt
                                        ? typeof entry.transferredAt === 'string'
                                          ? new Date(entry.transferredAt).toLocaleDateString(
                                              'de-DE'
                                            )
                                          : new Date(
                                              entry.transferredAt.seconds * 1000
                                            ).toLocaleDateString('de-DE')
                                        : 'N/A'
                                    }`}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Notizen */}
                        {entry.notes && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">{entry.notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      {entry.status === 'logged' && (
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleEditEntry(entry)}
                            className="p-2 text-gray-400 hover:text-[#14ad9f] hover:bg-gray-100 rounded-lg transition-colors"
                            title="Bearbeiten"
                          >
                            <FiEdit3 size={16} />
                          </button>
                          <button
                            onClick={() => entry.id && handleDeleteEntry(entry.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Löschen"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
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
                    <div className="mt-2">
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14ad9f] pr-8"
                          placeholder="Anfahrtskosten"
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                          €
                        </span>
                      </div>
                    </div>
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
