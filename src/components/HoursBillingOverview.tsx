'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FiClock, FiCheckCircle, FiAlertCircle, FiCalendar, FiInfo, FiCheck } from 'react-icons/fi';
import { TimeTracker } from '@/lib/timeTracker';

interface TimeEntry {
  id: string;
  date: string;
  description: string;
  hours: number;
  category: 'original' | 'additional';
  status: string;
  billableAmount?: number;
  paidAt?: string;
  paymentIntentId?: string;
  travelCost?: number;
  billingStatus?: string;
}

interface HoursOverviewData {
  originalPlannedHours: number;
  totalLoggedHours: number;
  totalApprovedHours: number;
  totalBilledHours: number;
  hourlyRate: number;
  originalJobPrice: number;
  timeEntries: TimeEntry[];
  approvalRequests: Array<Record<string, unknown>>;
}

interface HoursBillingOverviewProps {
  orderId: string;
  className?: string;
  onPaymentRequest?: () => void; // NEU: Callback für Bezahlung
}

export default function HoursBillingOverview({
  orderId,
  className = '',
  onPaymentRequest,
}: HoursBillingOverviewProps) {
  const [data, setData] = useState<HoursOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<
    'paid' | 'pending' | 'logged' | 'original' | null
  >(null);
  const [approving, setApproving] = useState(false);

  const fetchHoursData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Import TimeTracker dynamisch
      const { TimeTracker } = await import('@/lib/timeTracker');
      const orderDetails = await TimeTracker.getOrderDetails(orderId);

      if (!orderDetails) {
        throw new Error('Auftragsdaten nicht gefunden');
      }

      const timeTracking = orderDetails.timeTracking;
      const hoursData: HoursOverviewData = {
        originalPlannedHours: timeTracking?.originalPlannedHours || 24,
        totalLoggedHours: timeTracking?.totalLoggedHours || 0,
        totalApprovedHours: timeTracking?.totalApprovedHours || 0,
        totalBilledHours: timeTracking?.totalBilledHours || 0,
        hourlyRate: timeTracking?.hourlyRate || 12300,
        originalJobPrice: orderDetails.originalJobPriceInCents || 98400,
        timeEntries: timeTracking?.timeEntries || [],
        approvalRequests: orderDetails.approvalRequests || [],
      };

      setData(hoursData);
    } catch (err) {
      console.error('Error fetching hours data:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Stundendaten');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  // Funktion zur Freigabe von geloggten zusätzlichen Stunden
  const handleApproveLoggedHours = async () => {
    if (!data) return;

    setApproving(true);
    try {
      const result = await TimeTracker.approveLoggedAdditionalHours(orderId);

      if (result.success) {
        // Daten neu laden
        await fetchHoursData();
        // Success message wird automatisch durch UI-Update gezeigt
      } else {
        setError(result.message);
      }
    } catch (error) {
      console.error('Error approving logged hours:', error);
      setError('Fehler bei der Freigabe der Stunden');
    } finally {
      setApproving(false);
    }
  };

  useEffect(() => {
    fetchHoursData();
  }, [fetchHoursData]);

  if (loading) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <div className="text-red-600 flex items-center">
          <FiAlertCircle className="mr-2" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Kategorisiere die Zeiteinträge
  const originalEntries = data.timeEntries.filter(entry => entry.category === 'original');
  const paidAdditionalEntries = data.timeEntries.filter(
    entry => entry.category === 'additional' && entry.status === 'transferred'
  );
  const pendingAdditionalEntries = data.timeEntries.filter(
    entry =>
      entry.category === 'additional' &&
      (entry.status === 'billing_pending' || entry.status === 'customer_approved')
  );

  // Separate Behandlung für "logged" Status UND andere Status die zur Freigabe bereit sind
  const loggedAdditionalEntries = data.timeEntries.filter(
    entry =>
      entry.category === 'additional' &&
      (entry.status === 'logged' || entry.status === 'submitted' || entry.status === 'pending')
  );

  // DEBUG: Console-Log für Debugging der Zeit-Einträge
  console.log('[HoursBillingOverview] DEBUG Zeit-Einträge:', {
    totalEntries: data.timeEntries.length,
    allStatuses: data.timeEntries.map(e => ({
      id: e.id,
      category: e.category,
      status: e.status,
      hours: e.hours,
    })),
    loggedAdditionalEntries: loggedAdditionalEntries.length,
    loggedAdditionalHours: loggedAdditionalEntries.reduce((sum, entry) => sum + entry.hours, 0),
  });

  // Berechne Summen
  const paidAdditionalHours = paidAdditionalEntries.reduce((sum, entry) => sum + entry.hours, 0);
  const paidAdditionalAmount = paidAdditionalEntries.reduce(
    (sum, entry) => sum + (entry.billableAmount || 0),
    0
  );

  // NUR genehmigte Stunden sind zur Bezahlung bereit
  const pendingAdditionalHours = pendingAdditionalEntries.reduce(
    (sum, entry) => sum + entry.hours,
    0
  );
  const pendingAdditionalAmount = pendingAdditionalEntries.reduce((sum, entry) => {
    // Verwende billableAmount falls vorhanden, sonst berechne aus Stundensatz
    if (entry.billableAmount) {
      return sum + entry.billableAmount;
    } else {
      // Berechne Betrag aus Stunden * Stundensatz + Reisekosten
      const baseAmount = entry.hours * data.hourlyRate;
      const travelCost = entry.travelCost || 0;
      return sum + baseAmount + travelCost;
    }
  }, 0);

  // Nur zur Information: Noch nicht genehmigte Stunden
  const loggedAdditionalHours = loggedAdditionalEntries.reduce(
    (sum, entry) => sum + entry.hours,
    0
  );
  const loggedAdditionalAmount = loggedAdditionalEntries.reduce((sum, entry) => {
    if (entry.billableAmount) {
      return sum + entry.billableAmount;
    } else {
      const baseAmount = entry.hours * data.hourlyRate;
      const travelCost = entry.travelCost || 0;
      return sum + baseAmount + travelCost;
    }
  }, 0);

  const formatCurrency = (cents: number) => `€${(cents / 100).toFixed(2)}`;

  const formatDate = (dateInput: string | Date | { toDate?: () => Date; seconds?: number }) => {
    try {
      let date: Date;

      if (typeof dateInput === 'string') {
        date = new Date(dateInput);
      } else if (dateInput instanceof Date) {
        date = dateInput;
      } else if (dateInput && typeof dateInput === 'object') {
        // Firebase Timestamp
        if (typeof dateInput.toDate === 'function') {
          date = dateInput.toDate();
        } else if (typeof dateInput.seconds === 'number') {
          date = new Date(dateInput.seconds * 1000);
        } else {
          date = new Date();
        }
      } else {
        date = new Date();
      }

      return date.toLocaleDateString('de-DE');
    } catch (error) {
      console.warn('Error formatting date:', dateInput, error);
      return 'Unbekanntes Datum';
    }
  };

  return (
    <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
      <h2 className="text-2xl font-semibold text-gray-700 mb-6 flex items-center">
        <FiClock className="mr-3 text-[#14ad9f]" />
        Stundenabrechnung & Zahlungsübersicht
      </h2>

      {/* Übersicht-Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Original-Auftrag */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <FiCheckCircle className="text-blue-600 text-xl" />
            <span className="text-xs font-medium text-blue-600 bg-blue-200 px-2 py-1 rounded">
              GRUNDAUFTRAG
            </span>
          </div>
          <h3 className="font-semibold text-blue-900">Original geplant</h3>
          <p className="text-2xl font-bold text-blue-800">{data.originalPlannedHours}h</p>
          <p className="text-sm text-blue-600">
            {formatCurrency(data.originalJobPrice)} ✅ bezahlt
          </p>
        </div>

        {/* Bezahlte zusätzliche Stunden */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <FiCheckCircle className="text-green-600 text-xl" />
            <span className="text-xs font-medium text-green-600 bg-green-200 px-2 py-1 rounded">
              BEZAHLT
            </span>
          </div>
          <h3 className="font-semibold text-green-900">Zusätzlich bezahlt</h3>
          <p className="text-2xl font-bold text-green-800">{paidAdditionalHours}h</p>
          <p className="text-sm text-green-600">
            {formatCurrency(paidAdditionalAmount)} ✅ bezahlt
          </p>
        </div>

        {/* Offene Zahlungen (genehmigte Stunden) */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <FiAlertCircle className="text-orange-600 text-xl" />
            <span className="text-xs font-medium text-orange-600 bg-orange-200 px-2 py-1 rounded">
              OFFEN
            </span>
          </div>
          <h3 className="font-semibold text-orange-900">Zahlung ausstehend</h3>
          <p className="text-2xl font-bold text-orange-800">{pendingAdditionalHours}h</p>
          <p className="text-sm text-orange-600">
            {formatCurrency(pendingAdditionalAmount)} ⏳ offen
          </p>
        </div>

        {/* Geloggte Stunden (zur Freigabe) */}
        {loggedAdditionalHours > 0 && (
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <FiClock className="text-purple-600 text-xl" />
              <span className="text-xs font-medium text-purple-600 bg-purple-200 px-2 py-1 rounded">
                FREIGABE
              </span>
            </div>
            <h3 className="font-semibold text-purple-900">Zur Freigabe</h3>
            <p className="text-2xl font-bold text-purple-800">{loggedAdditionalHours}h</p>
            <p className="text-sm text-purple-600">
              {formatCurrency(loggedAdditionalAmount)} 🔄 freigeben
            </p>
          </div>
        )}
      </div>

      {/* Gesamtübersicht */}
      <div className="bg-gradient-to-r from-[#14ad9f] to-[#0f8b7a] text-white rounded-lg p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-sm opacity-90">Geloggte Stunden</p>
            <p className="text-2xl font-bold">{data.totalLoggedHours}h</p>
          </div>
          <div>
            <p className="text-sm opacity-90">Geplant war</p>
            <p className="text-2xl font-bold">{data.originalPlannedHours}h</p>
          </div>
          <div>
            <p className="text-sm opacity-90">Zusätzlich</p>
            <p className="text-2xl font-bold">
              +{data.totalLoggedHours - data.originalPlannedHours}h
            </p>
          </div>
          <div>
            <p className="text-sm opacity-90">Gesamtkosten</p>
            <p className="text-2xl font-bold">
              {formatCurrency(
                data.originalJobPrice +
                  paidAdditionalAmount +
                  pendingAdditionalAmount +
                  loggedAdditionalAmount
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Detaillierte Aufschlüsselung */}
      <div className="space-y-4">
        {/* Bezahlte zusätzliche Stunden */}
        {paidAdditionalEntries.length > 0 && (
          <div className="border border-green-200 rounded-lg">
            <button
              onClick={() => setExpandedSection(expandedSection === 'paid' ? null : 'paid')}
              className="w-full p-4 text-left bg-green-50 hover:bg-green-100 rounded-lg flex items-center justify-between"
            >
              <div className="flex items-center">
                <FiCheckCircle className="mr-3 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-900">
                    Bezahlte zusätzliche Stunden ({paidAdditionalHours}h)
                  </h3>
                  <p className="text-sm text-green-600">
                    {formatCurrency(paidAdditionalAmount)} bereits bezahlt
                  </p>
                </div>
              </div>
              <FiInfo className="text-green-600" />
            </button>
            {expandedSection === 'paid' && (
              <div className="p-4 space-y-3">
                {paidAdditionalEntries.map(entry => (
                  <div key={entry.id} className="bg-white p-3 rounded border border-green-100">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{entry.description}</p>
                        <p className="text-sm text-gray-600 flex items-center">
                          <FiCalendar className="mr-1" />
                          {formatDate(entry.date)} • {entry.hours}h
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-700">
                          {formatCurrency(entry.billableAmount || 0)}
                        </p>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          ✅ Bezahlt
                        </span>
                      </div>
                    </div>
                    {entry.travelCost && entry.travelCost > 0 && (
                      <p className="text-xs text-gray-500">
                        inkl. Anfahrt: {formatCurrency(entry.travelCost)}
                      </p>
                    )}
                    {entry.paidAt && (
                      <p className="text-xs text-gray-500">
                        Bezahlt am: {formatDate(entry.paidAt)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Geloggte zusätzliche Stunden (zur Freigabe) */}
        {loggedAdditionalEntries.length > 0 && (
          <div className="border border-purple-200 rounded-lg">
            <button
              onClick={() => setExpandedSection(expandedSection === 'logged' ? null : 'logged')}
              className="w-full p-4 text-left bg-purple-50 hover:bg-purple-100 rounded-lg flex items-center justify-between"
            >
              <div className="flex items-center">
                <FiClock className="mr-3 text-purple-600" />
                <div>
                  <h3 className="font-semibold text-purple-900">
                    Stunden zur Freigabe ({loggedAdditionalHours}h)
                  </h3>
                  <p className="text-sm text-purple-600">
                    {formatCurrency(loggedAdditionalAmount)} freigeben nötig
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-sm bg-purple-200 text-purple-800 px-3 py-1 rounded-full mr-2">
                  FREIGABE ERFORDERLICH
                </span>
                <FiInfo className="text-purple-600" />
              </div>
            </button>
            {expandedSection === 'logged' && (
              <div className="p-4 space-y-3">
                {loggedAdditionalEntries.map(entry => (
                  <div key={entry.id} className="bg-white p-3 rounded border border-purple-100">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{entry.description}</p>
                        <p className="text-sm text-gray-600 flex items-center">
                          <FiCalendar className="mr-1" />
                          {formatDate(entry.date)} • {entry.hours}h
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-purple-700">
                          {formatCurrency(entry.billableAmount || 0)}
                        </p>
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                          🔄 Zur Freigabe
                        </span>
                      </div>
                    </div>
                    {entry.travelCost && entry.travelCost > 0 && (
                      <p className="text-xs text-gray-500">
                        inkl. Anfahrt: {formatCurrency(entry.travelCost)}
                      </p>
                    )}
                  </div>
                ))}
                <div className="mt-4 p-3 bg-purple-50 rounded border border-purple-200">
                  <p className="text-sm text-purple-800 font-medium mb-2">
                    ✋ Diese Stunden wurden geloggt und benötigen Ihre Freigabe
                  </p>
                  <p className="text-xs text-purple-600 mb-3">
                    Nach der Freigabe können Sie diese Stunden bezahlen.
                  </p>
                  <button
                    onClick={handleApproveLoggedHours}
                    disabled={approving}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {approving ? (
                      <>
                        <FiClock className="animate-spin mr-2" />
                        Freigabe läuft...
                      </>
                    ) : (
                      <>
                        <FiCheck className="mr-2" />
                        {loggedAdditionalHours}h für {formatCurrency(loggedAdditionalAmount)}{' '}
                        freigeben
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Offene zusätzliche Stunden */}
        {pendingAdditionalEntries.length > 0 && (
          <div className="border border-orange-200 rounded-lg">
            <button
              onClick={() => setExpandedSection(expandedSection === 'pending' ? null : 'pending')}
              className="w-full p-4 text-left bg-orange-50 hover:bg-orange-100 rounded-lg flex items-center justify-between"
            >
              <div className="flex items-center">
                <FiAlertCircle className="mr-3 text-orange-600" />
                <div>
                  <h3 className="font-semibold text-orange-900">
                    Offene Zahlungen ({pendingAdditionalHours}h)
                  </h3>
                  <p className="text-sm text-orange-600">
                    {formatCurrency(pendingAdditionalAmount)} zu bezahlen
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-sm bg-orange-200 text-orange-800 px-3 py-1 rounded-full mr-2">
                  ZAHLUNG ERFORDERLICH
                </span>
                <FiInfo className="text-orange-600" />
              </div>
            </button>
            {expandedSection === 'pending' && (
              <div className="p-4 space-y-3">
                {pendingAdditionalEntries.map(entry => (
                  <div key={entry.id} className="bg-white p-3 rounded border border-orange-100">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{entry.description}</p>
                        <p className="text-sm text-gray-600 flex items-center">
                          <FiCalendar className="mr-1" />
                          {formatDate(entry.date)} • {entry.hours}h
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-orange-700">
                          {formatCurrency(entry.billableAmount || 0)}
                        </p>
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                          ⏳ Ausstehend
                        </span>
                      </div>
                    </div>
                    {entry.travelCost && entry.travelCost > 0 && (
                      <p className="text-xs text-gray-500">
                        inkl. Anfahrt: {formatCurrency(entry.travelCost)}
                      </p>
                    )}
                  </div>
                ))}
                <div className="mt-4 p-3 bg-orange-50 rounded border border-orange-200">
                  <p className="text-sm text-orange-800 font-medium">
                    💰 Verwenden Sie den &quot;Zusätzliche Stunden bezahlen&quot; Button unten, um
                    diese Stunden zu bezahlen.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Original-Stunden */}
        <div className="border border-blue-200 rounded-lg">
          <button
            onClick={() => setExpandedSection(expandedSection === 'original' ? null : 'original')}
            className="w-full p-4 text-left bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center justify-between"
          >
            <div className="flex items-center">
              <FiCheckCircle className="mr-3 text-blue-600" />
              <div>
                <h3 className="font-semibold text-blue-900">
                  Original geplante Stunden ({data.originalPlannedHours}h)
                </h3>
                <p className="text-sm text-blue-600">
                  {formatCurrency(data.originalJobPrice)} im Grundauftrag enthalten
                </p>
              </div>
            </div>
            <FiInfo className="text-blue-600" />
          </button>
          {expandedSection === 'original' && (
            <div className="p-4 space-y-3">
              {originalEntries.map(entry => (
                <div key={entry.id} className="bg-white p-3 rounded border border-blue-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{entry.description}</p>
                      <p className="text-sm text-gray-600 flex items-center">
                        <FiCalendar className="mr-1" />
                        {formatDate(entry.date)} • {entry.hours}h
                      </p>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      Im Grundpreis enthalten
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Zahlung/Freigabe erforderlich Hinweis */}
      {(pendingAdditionalEntries.length > 0 || loggedAdditionalEntries.length > 0) && (
        <div className="mt-6 p-4 bg-gradient-to-r from-orange-100 to-red-100 border border-orange-300 rounded-lg">
          <div className="flex items-center mb-2">
            <FiAlertCircle className="mr-2 text-orange-600 text-xl" />
            <h3 className="font-semibold text-orange-900">
              {pendingAdditionalHours > 0 && loggedAdditionalHours > 0
                ? 'Freigabe und Zahlung erforderlich!'
                : pendingAdditionalHours > 0
                  ? 'Sofortige Zahlung erforderlich!'
                  : 'Freigabe erforderlich!'}
            </h3>
          </div>

          {loggedAdditionalHours > 0 && (
            <p className="text-orange-800 mb-2">
              <strong>{loggedAdditionalHours}h</strong> zusätzliche Stunden sind geloggt und
              benötigen Ihre Freigabe!
            </p>
          )}

          {pendingAdditionalHours > 0 && (
            <p className="text-orange-800 mb-3">
              <strong>{pendingAdditionalHours}h</strong> zusätzliche Stunden sind genehmigt und
              müssen JETZT bezahlt werden!
            </p>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <p>
                <strong>Geplant:</strong> {data.originalPlannedHours}h
              </p>
              <p>
                <strong>Gesamt geloggt:</strong> {data.totalLoggedHours}h
              </p>
            </div>
            <div>
              <p>
                <strong>Status:</strong>{' '}
                <span className="text-red-600 font-semibold">
                  {loggedAdditionalHours > 0 && pendingAdditionalHours > 0
                    ? 'FREIGABE & BEZAHLUNG'
                    : pendingAdditionalHours > 0
                      ? 'BEZAHLUNG ERFORDERLICH'
                      : 'FREIGABE ERFORDERLICH'}
                  !
                </span>
              </p>
              <p>
                <strong>Gesamtkosten:</strong>{' '}
                <span className="text-red-600 font-bold">
                  {formatCurrency(
                    data.originalJobPrice +
                      paidAdditionalAmount +
                      pendingAdditionalAmount +
                      loggedAdditionalAmount
                  )}
                </span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {/* Freigabe-Button für geloggte Stunden */}
            {loggedAdditionalHours > 0 && (
              <button
                onClick={handleApproveLoggedHours}
                disabled={approving}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {approving ? (
                  <>
                    <FiClock className="animate-spin text-xl" />
                    <div className="text-left">
                      <div className="text-lg font-bold">FREIGABE LÄUFT...</div>
                      <div className="text-sm opacity-90">Bitte warten</div>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-xl">🔄</span>
                    <div className="text-left">
                      <div className="text-lg font-bold">{loggedAdditionalHours}h FREIGEBEN</div>
                      <div className="text-sm opacity-90">
                        {formatCurrency(loggedAdditionalAmount)} zur Freigabe
                      </div>
                    </div>
                  </>
                )}
              </button>
            )}

            {/* Bezahl-Button für genehmigte Stunden */}
            {onPaymentRequest && pendingAdditionalHours > 0 && (
              <button
                onClick={onPaymentRequest}
                className="bg-[#14ad9f] hover:bg-[#129488] text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <span className="text-xl">💳</span>
                <div className="text-left">
                  <div className="text-lg font-bold">
                    {formatCurrency(pendingAdditionalAmount)} JETZT BEZAHLEN
                  </div>
                  <div className="text-sm opacity-90">
                    {pendingAdditionalHours}h zusätzliche Stunden
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
