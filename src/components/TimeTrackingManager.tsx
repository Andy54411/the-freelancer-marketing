// /Users/andystaudinger/Tasko/src/components/TimeTrackingManager.tsx

'use client';

import React, { useState, useEffect } from 'react';
import {
  FiPlus,
  FiEdit3,
  FiTrash2,
  FiClock,
  FiCalendar,
  FiUser,
} from 'react-icons/fi';
import { db, auth } from '@/firebase/clients';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useAlertHelpers } from '@/components/ui/AlertProvider';

interface TimeEntry {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  description: string;
  category: 'original' | 'additional';
  status: 'logged' | 'submitted' | 'approved' | 'rejected' | 'paid';
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
  isCustomerView?: boolean; // NEU: Unterscheidung zwischen Kunden- und Anbieter-Ansicht
}

export default function TimeTrackingManager({
  orderId,
  customerName: _customerName,
  originalPlannedHours,
  hourlyRate,
  onTimeSubmitted,
  isCustomerView: _isCustomerView = false,
}: TimeTrackingManagerProps) {
  const [_user, setUser] = useState<User | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [showAllEntries, setShowAllEntries] = useState(false);
  const [providerName, setProviderName] = useState<string>('Lädt...');
  const [userRole, setUserRole] = useState<'customer' | 'provider' | null>(null);
  const [_orderData, setOrderData] = useState<any>(null);
  const [_submitting, _setSubmitting] = useState(false);
  const { showSuccess, showError } = useAlertHelpers();

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
        determineUserRole(currentUser.uid, orderId);
        loadProviderData(currentUser.uid);
        loadTimeTracking();
      }
    });

    return () => unsubscribe();
  }, [orderId]);

  const loadProviderData = async (userId: string) => {
    try {
      // Versuche zuerst companies collection
      const companyDoc = await getDoc(doc(db, 'companies', userId));
      if (companyDoc.exists()) {
        const companyData = companyDoc.data();
        setProviderName(companyData.companyName || companyData.name || 'Unbekannter Anbieter');
        return;
      }

      // Fallback: users collection
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const name = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
        setProviderName(name || 'Unbekannter Benutzer');
        return;
      }

      setProviderName('Unbekannter Nutzer');
    } catch {
      setProviderName('Fehler beim Laden');
    }
  };

  // 🆕 B2B/B2C ORDER DETECTION FUNCTION
  const checkIfB2BOrder = async (orderId: string): Promise<boolean> => {
    try {
      const orderDoc = await getDoc(doc(db, 'auftraege', orderId));
      if (!orderDoc.exists()) {
        return false; // Fallback zu B2C
      }

      const orderData = orderDoc.data();

      // 1. EXPLICIT PAYMENT TYPE CHECK
      const paymentType = orderData.paymentType || '';
      if (paymentType === 'b2c_fixed_price') {
        return false;
      }
      if (paymentType === 'b2b_hourly' || paymentType === 'b2b_project') {
        return true;
      }

      // 2. CUSTOMER TYPE CHECK
      const customerType = orderData.customerType || '';
      if (customerType === 'privat' || customerType === 'private') {
        return false;
      }
      if (customerType === 'business' || customerType === 'unternehmen') {
        return true;
      }

      // 3. COMPANY NAME CHECK
      if (orderData.customerCompanyName && orderData.customerCompanyName.trim() !== '') {
        return true;
      }

      // 4. ORDER VALUE THRESHOLD (> 500€)
      const totalAmount = orderData.totalAmountPaidByBuyerInCents || 0;
      if (totalAmount > 50000) {
        // > 500€

        return true;
      }

      // 5. SERVICE CATEGORY CHECK
      const category = orderData.selectedSubcategory || '';
      const b2bCategories = [
        'Consulting',
        'Software Development',
        'Marketing Services',
        'Business Strategy',
        'Project Management',
        'IT Services',
        'Accounting Services',
      ];

      if (b2bCategories.some(b2bCat => category.toLowerCase().includes(b2bCat.toLowerCase()))) {
        return true;
      }

      // 6. EXPLICIT B2B MARKERS
      if (orderData.businessType === 'B2B' || orderData.isBusinessOrder === true) {
        return true;
      }

      return false; // Default: B2C
    } catch {
      return false; // Fallback zu B2C bei Fehlern
    }
  };

  const determineUserRole = async (userId: string, orderId: string) => {
    try {
      const orderDoc = await getDoc(doc(db, 'auftraege', orderId));
      if (!orderDoc.exists()) {
        return null;
      }

      const orderData = orderDoc.data();
      setOrderData(orderData);

      if (userId === orderData.customerFirebaseUid) {
        setUserRole('customer');
        return 'customer';
      } else if (userId === orderData.selectedAnbieterId) {
        setUserRole('provider');
        return 'provider';
      } else {
        setUserRole(null);
        return null;
      }
    } catch {
      setUserRole(null);
      return null;
    }
  };

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
            // Erweiterte Status-Mapping-Logik
            let mappedStatus: 'logged' | 'submitted' | 'approved' | 'rejected' | 'paid' = 'logged';

            // Status mapping priority: paid > approved > rejected > submitted > logged
            if (
              entry.status === 'paid' ||
              entry.status === 'platform_released' ||
              entry.status === 'transferred' ||
              entry.platformHoldStatus === 'transferred' ||
              entry.paymentStatus === 'paid' ||
              entry.paymentStatus === 'transferred'
            ) {
              mappedStatus = 'paid';
            } else if (entry.status === 'customer_approved' || entry.status === 'approved') {
              mappedStatus = 'approved';
            } else if (entry.status === 'customer_rejected' || entry.status === 'rejected') {
              mappedStatus = 'rejected';
            } else if (entry.status === 'submitted' || entry.status === 'pending_approval') {
              mappedStatus = 'submitted';
            } else {
              // Default to 'logged' for any other status (including 'draft', 'logged', etc.)
              mappedStatus = 'logged';
            }

            entries.push({
              id: entry.id || `entry-${index}`,
              date: entry.date || '',
              startTime: entry.startTime || '',
              endTime: entry.endTime || '',
              hours: entry.hours || 0,
              description: entry.description || '',
              category: entry.category || 'original',
              status: mappedStatus,
              billableAmount: entry.billableAmount || 0,
              travelCost: entry.travelCost || 0,
              travelTime: entry.travelTime || false,
              notes: entry.notes || '',
            });
          });
        } else {
        }

        setTimeEntries(entries);
      } else {
      }
    } catch {
      // Silent error handling
    } finally {
      setLoading(false);
    }
  };

  const _fixExistingTimeEntries = async () => {
    try {
      const orderDoc = await getDoc(doc(db, 'auftraege', orderId));
      if (!orderDoc.exists()) return;

      const orderData = orderDoc.data();
      const timeEntries = orderData.timeTracking?.timeEntries || [];
      const originalPlannedHours = orderData.timeTracking?.originalPlannedHours || 8;

      let cumulativeHours = 0;
      let hasChanges = false;

      // Sortiere Einträge nach Erstellungsdatum
      const sortedEntries = [...timeEntries].sort(
        (a, b) =>
          new Date(a.createdAt?.toDate() || a.createdAt).getTime() -
          new Date(b.createdAt?.toDate() || b.createdAt).getTime()
      );

      sortedEntries.forEach((entry, _index) => {
        const previousCategory = entry.category;
        const entryHours = entry.hours || 0;

        // KORREKTE KATEGORISIERUNG: Alles über geplante Stunden ist "additional"
        if (cumulativeHours + entryHours <= originalPlannedHours) {
          entry.category = 'original';
        } else if (cumulativeHours < originalPlannedHours) {
          // Dieser Eintrag überschreitet die geplanten Stunden → additional
          entry.category = 'additional';
        } else {
          // Alle weiteren Stunden sind additional
          entry.category = 'additional';
        }

        if (previousCategory !== entry.category) {
          hasChanges = true;
        }

        cumulativeHours += entryHours;
      });

      if (hasChanges) {
        // Aktualisiere in Firebase
        await updateDoc(doc(db, 'auftraege', orderId), {
          'timeTracking.timeEntries': sortedEntries,
          'timeTracking.lastUpdated': new Date(),
        });

        showSuccess('Kategorien korrigiert', `${timeEntries.length} Einträge aktualisiert`);

        // Lade TimeTracking neu
        await loadTimeTracking();
      } else {
        showSuccess('Kategorien überprüft', 'Alle Einträge sind bereits korrekt kategorisiert');
      }
    } catch {
      showError('Fehler beim Korrigieren', 'Kategorien konnten nicht aktualisiert werden');
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

    if (!_user) return;

    try {
      // Dynamischer Import des TimeTracker
      const { TimeTracker } = await import('@/lib/timeTracker');

      // 🆕 B2B/B2C DETECTION: Prüfe Order-Typ vor Kategorie-Bestimmung
      const isB2BOrder = await checkIfB2BOrder(orderId);

      // Berechne Kategorie basierend auf B2B/B2C und bereits erfassten Stunden
      const currentOriginalHours = timeEntries
        .filter(entry => entry.category === 'original')
        .reduce((sum, entry) => sum + entry.hours, 0);

      const remainingOriginalHours = Math.max(0, originalPlannedHours - currentOriginalHours);

      let category: 'original' | 'additional' = 'original';
      let originalHours = 0;
      let additionalHours = 0;

      // 🆕 EINHEITLICHE LOGIC FÜR B2C UND B2B
      // WICHTIG: Sowohl B2C als auch B2B verwenden die GLEICHE Original/Additional-Logik!
      // B2C: Grundauftrag (8h) bereits bezahlt → zusätzliche Stunden brauchen Freigabe
      // B2B: Geplante Stunden (8h) vereinbart → zusätzliche Stunden brauchen Freigabe

      if (remainingOriginalHours >= formData.hours) {
        // Alle Stunden sind noch als "original" verfügbar
        category = 'original';
        originalHours = formData.hours;
      } else if (remainingOriginalHours > 0) {
        // Split zwischen original und additional
        originalHours = remainingOriginalHours;
        additionalHours = formData.hours - remainingOriginalHours;
        category = 'additional'; // Hauptkategorie ist additional, da mehr zusätzlich
      } else {
        // Alle Stunden sind additional
        category = 'additional';
        additionalHours = formData.hours;
      }

      const _orderType = isB2BOrder ? 'B2B' : 'B2C';

      // Erstelle Zeiteintrag-Objekt
      const timeEntry = {
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        hours: formData.hours,
        description: formData.description,
        notes: formData.notes,
        travelTime: formData.travelTime,
        travelCost: formData.travelCost,
        isBreakTime: formData.isBreakTime,
        breakMinutes: formData.breakMinutes,
        category: category,
      };

      // Falls wir split benötigen, erstelle zwei Einträge
      if (originalHours > 0 && additionalHours > 0) {
        // Erstelle original-Eintrag
        const originalEntry = {
          ...timeEntry,
          hours: originalHours,
          category: 'original' as const,
          description: `${formData.description} (Geplante Stunden)`,
        };

        // Erstelle additional-Eintrag
        const additionalEntry = {
          ...timeEntry,
          hours: additionalHours,
          category: 'additional' as const,
          description: `${formData.description} (Zusätzliche Stunden)`,
        };

        // Beide Einträge speichern
        const result1 = await TimeTracker.logTimeEntry(orderId, originalEntry);
        const result2 = await TimeTracker.logTimeEntry(orderId, additionalEntry);

        if (result1 && result2) {
          showSuccess(
            'Zeit erfolgreich gespeichert',
            `${originalHours}h geplant + ${additionalHours}h zusätzlich`
          );
        } else {
          throw new Error('Fehler beim Speichern der Zeiteinträge');
        }
      } else {
        // Einzelner Eintrag
        const result = await TimeTracker.logTimeEntry(orderId, timeEntry);

        if (result) {
          showSuccess(
            'Zeit erfolgreich gespeichert',
            `${formData.hours}h ${category === 'original' ? 'geplant' : 'zusätzlich'}`
          );
        } else {
          throw new Error('Fehler beim Speichern der Zeiteintragung');
        }
      }

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

      // Force reload data nach kurzer Verzögerung
      setTimeout(async () => {
        await loadTimeTracking();
        if (onTimeSubmitted) {
          onTimeSubmitted();
        }
      }, 500);
    } catch (err) {
      showError(
        'Fehler beim Speichern',
        err instanceof Error ? err.message : 'Unbekannter Fehler'
      );
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

  const handleDeleteTimeEntry = async (entryId: string) => {
    if (!orderId) return;

    try {
      const orderDoc = doc(db, 'auftraege', orderId);
      const orderSnap = await getDoc(orderDoc);

      if (!orderSnap.exists()) {
        return;
      }

      const orderData = orderSnap.data();
      const currentTimeEntries = orderData.timeTracking?.timeEntries || [];

      // Entferne den Eintrag
      const updatedTimeEntries = currentTimeEntries.filter((entry: any) => entry.id !== entryId);

      // Berechne neue Summen
      const newTotalLoggedHours = updatedTimeEntries.reduce(
        (sum: number, entry: any) => sum + (entry.hours || 0),
        0
      );
      const newTotalBilledHours = updatedTimeEntries
        .filter((entry: any) => ['approved', 'paid'].includes(entry.status))
        .reduce((sum: number, entry: any) => sum + (entry.hours || 0), 0);
      const newTotalApprovedHours = updatedTimeEntries
        .filter((entry: any) => entry.status === 'approved')
        .reduce((sum: number, entry: any) => sum + (entry.hours || 0), 0);

      // Update Firestore mit neuen Summen
      await updateDoc(orderDoc, {
        'timeTracking.timeEntries': updatedTimeEntries,
        'timeTracking.totalLoggedHours': newTotalLoggedHours,
        'timeTracking.totalBilledHours': newTotalBilledHours,
        'timeTracking.totalApprovedHours': newTotalApprovedHours,
        'timeTracking.lastUpdated': serverTimestamp(),
      });

      // Reload data
      if (loadTimeTracking) {
        loadTimeTracking();
      }
    } catch {
      // Silent error handling
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
      .filter(entry => entry.status === 'approved' || entry.status === 'paid')
      .reduce((sum, entry) => sum + entry.hours, 0),
    totalRevenue: timeEntries.reduce((sum, entry) => {
      // Debug: Log entry for revenue calculation

      // Berechne Revenue für alle Einträge mit billableAmount, unabhängig vom Status
      if (entry.billableAmount && entry.billableAmount > 0) {
        return sum + entry.billableAmount / 100; // Convert from cents to euros
      }

      // Fallback: Für approved/paid ohne billableAmount verwende Stunden * Rate
      if ((entry.status === 'approved' || entry.status === 'paid') && entry.hours > 0) {
        return sum + entry.hours * hourlyRate;
      }

      return sum;
    }, 0),
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
      {/* Kompakter Header ohne große Überschrift */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-linear-to-r from-[#14ad9f]/10 to-teal-50 px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-[#14ad9f] rounded-lg shadow-lg">
                <FiClock className="text-white" size={20} />
              </div>
              <div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <FiUser size={16} />
                    <span className="font-medium">{providerName}</span>
                  </div>
                  <div className="text-gray-400">•</div>
                  <div className="text-gray-600">
                    <span className="font-medium text-blue-600">
                      {!originalPlannedHours || isNaN(originalPlannedHours)
                        ? '0'
                        : originalPlannedHours.toFixed(1)}
                      h
                    </span>{' '}
                    geplant
                  </div>
                  <div className="text-gray-400">•</div>
                  <div className="text-gray-600">
                    <span className="font-medium text-green-600">
                      {!hourlyRate || isNaN(hourlyRate) ? '50' : hourlyRate.toFixed(0)}€/h
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* NUR ANBIETER KÖNNEN ZEIT HINZUFÜGEN */}
              {userRole === 'provider' && (
                <button
                  onClick={() => {
                    setShowAddForm(true);
                    setEditingEntry(null);
                  }}
                  className="flex items-center gap-2 px-5 py-3 bg-[#14ad9f] text-white rounded-lg hover:bg-taskilo-hover transition-colors shadow-md hover:shadow-lg font-medium"
                >
                  <FiPlus size={18} />
                  Zeit hinzufügen
                </button>
              )}
            </div>
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
                    entry.status === 'paid'
                      ? 'border-emerald-200 bg-emerald-50'
                      : entry.status === 'approved'
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
                            entry.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : entry.status === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : entry.status === 'submitted'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : entry.status === 'rejected'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {entry.status === 'paid'
                            ? 'Bezahlt'
                            : entry.status === 'approved'
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
                          onClick={() => entry.id && handleDeleteTimeEntry(entry.id)}
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
                    className="inline-flex items-center gap-2 px-4 py-2 text-[#14ad9f] hover:text-taskilo-hover hover:bg-[#14ad9f]/5 rounded-lg transition-colors font-medium"
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
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
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
                    className="flex-1 px-4 py-3 bg-[#14ad9f] text-white rounded-lg hover:bg-taskilo-hover transition-colors font-medium"
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
