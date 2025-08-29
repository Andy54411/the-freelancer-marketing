'use client';

import React, { useState, useEffect } from 'react';
import { FiAlertTriangle, FiClock, FiDollarSign, FiStar } from 'react-icons/fi';

interface OrderData {
  id: string;
  status: string;
  jobDateFrom?: string;
  jobDateTo?: string;
  priceInCents: number;
  providerId: string;
  customerId: string;
}

interface ProviderStornoWarningProps {
  order: OrderData;
  companyUid: string;
}

interface StornoRisk {
  isOverdue: boolean;
  hoursOverdue: number;
  customerCanCancelWithRefund: boolean;
  estimatedPenalty: number;
  riskLevel: 'none' | 'warning' | 'critical';
}

export default function ProviderStornoWarning({ order, companyUid }: ProviderStornoWarningProps) {
  const [stornoRisk, setStornoRisk] = useState<StornoRisk | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calculateStornoRisk();
  }, [order.id]);

  const calculateStornoRisk = () => {
    if (!order.jobDateTo) {
      setLoading(false);
      return;
    }

    const now = new Date();
    const deadline = new Date(order.jobDateTo);
    deadline.setHours(23, 59, 59, 999); // Ende des Ausführungstages

    const diffMs = now.getTime() - deadline.getTime();
    const hoursOverdue = Math.floor(diffMs / (1000 * 60 * 60));
    const isOverdue = hoursOverdue > 0;

    // Berechne geschätzte Strafgebühr (wird normalerweise von Company Settings bestimmt)
    const estimatedPenalty = isOverdue ? Math.min(order.priceInCents * 0.1, 5000) : 0; // 10% oder max €50

    const risk: StornoRisk = {
      isOverdue,
      hoursOverdue: Math.max(0, hoursOverdue),
      customerCanCancelWithRefund: isOverdue,
      estimatedPenalty,
      riskLevel: isOverdue ? (hoursOverdue > 48 ? 'critical' : 'warning') : 'none',
    };

    setStornoRisk(risk);
    setLoading(false);
  };

  if (loading || !stornoRisk || stornoRisk.riskLevel === 'none') {
    return null;
  }

  return (
    <div
      className={`border-2 rounded-lg p-4 ${
        stornoRisk.riskLevel === 'critical'
          ? 'bg-red-50 border-red-300'
          : 'bg-yellow-50 border-yellow-300'
      }`}
    >
      <div className="flex items-start gap-3">
        <FiAlertTriangle
          className={`h-6 w-6 mt-1 flex-shrink-0 ${
            stornoRisk.riskLevel === 'critical' ? 'text-red-600' : 'text-yellow-600'
          }`}
        />
        <div className="flex-1">
          <h3
            className={`font-bold text-lg mb-2 ${
              stornoRisk.riskLevel === 'critical' ? 'text-red-800' : 'text-yellow-800'
            }`}
          >
            {stornoRisk.riskLevel === 'critical' ? (
              <>🚨 KRITISCH: Deadline deutlich überschritten!</>
            ) : (
              <>⚠️ WARNUNG: Deadline überschritten!</>
            )}
          </h3>

          <div
            className={`mb-3 ${
              stornoRisk.riskLevel === 'critical' ? 'text-red-700' : 'text-yellow-700'
            }`}
          >
            <p className="mb-2">
              <strong>
                Das Ausführungsdatum wurde um {stornoRisk.hoursOverdue} Stunden überschritten.
              </strong>
            </p>
            <p>
              Der Kunde hat jetzt das <strong>Recht auf Stornierung</strong> und kann eine
              vollständige Rückerstattung verlangen. Dies würde bedeuten:
            </p>
          </div>

          {/* Finanzielle Auswirkungen */}
          <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <FiDollarSign className="h-4 w-4" />
              Finanzielle Auswirkungen bei Kunde-Stornierung:
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-red-600">❌ Verlust der Auszahlung:</span>
                <span className="font-bold text-red-600">
                  -€{(order.priceInCents / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-600">💸 Geschätzte Strafgebühr:</span>
                <span className="font-bold text-red-600">
                  -€{(stornoRisk.estimatedPenalty / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-orange-600">📉 Auswirkung auf Bewertung:</span>
                <span className="font-bold text-orange-600">Negative Bewertung</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between">
                <span className="font-semibold text-red-800">Gesamtverlust:</span>
                <span className="font-bold text-red-800">
                  -€{((order.priceInCents + stornoRisk.estimatedPenalty) / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Empfohlene Aktionen */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
              <FiClock className="h-4 w-4" />
              Empfohlene Sofortmaßnahmen:
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>
                • <strong>Kontaktieren Sie den Kunden SOFORT</strong> und erklären Sie die Situation
              </li>
              <li>• Bieten Sie einen konkreten neuen Termin an (innerhalb 24h)</li>
              <li>• Entschuldigen Sie sich proaktiv für die Verzögerung</li>
              <li>• Erwägen Sie eine Kulanzleistung (z.B. kostenlose Zusatzstunde)</li>
              <li>
                • Falls der Service nicht mehr möglich ist: Stornieren Sie selbst über den Support
              </li>
            </ul>
          </div>

          {/* Scoring-Warnung */}
          <div className="bg-orange-50 rounded-lg p-3 mt-3 border border-orange-200">
            <h5 className="font-medium text-orange-800 mb-1 flex items-center gap-2">
              <FiStar className="h-4 w-4" />
              Provider-Scoring Auswirkung:
            </h5>
            <p className="text-sm text-orange-700">
              Diese Verspätung wird in Ihrem Provider-Score erfasst. Zu viele solcher Vorfälle
              können zu einer temporären Sperrung Ihres Accounts führen.
            </p>
          </div>

          {/* Contact Support Button */}
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => window.open('/support', '_blank')}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Support kontaktieren
            </button>
            <button
              onClick={() =>
                (window.location.href = `mailto:support@taskilo.de?subject=Verspätung Auftrag ${order.id}&body=Hallo Support-Team,%0A%0Aich habe eine Verspätung bei Auftrag ${order.id} und benötige Hilfe.%0A%0AVielen Dank`)
              }
              className="flex-1 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              E-Mail schreiben
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
