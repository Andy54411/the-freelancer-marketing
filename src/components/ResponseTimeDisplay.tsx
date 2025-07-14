'use client';

import { useState, useEffect } from 'react';
import { Clock, CheckCircle, AlertTriangle, XCircle, TrendingUp } from 'lucide-react';
import { ResponseTimeTracker, ResponseTimeStats } from '@/lib/responseTimeTracker';

interface ResponseTimeDisplayProps {
  providerId: string;
  guaranteeHours?: number;
  showDetailed?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function ResponseTimeDisplay({
  providerId,
  guaranteeHours = 24,
  showDetailed = false,
  size = 'md',
}: ResponseTimeDisplayProps) {
  const [stats, setStats] = useState<ResponseTimeStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [providerId]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const responseStats = await ResponseTimeTracker.getProviderResponseTimeStats(providerId);
      setStats(responseStats);
    } catch (error) {
      console.error('Error loading response time stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (!stats) return <Clock className="w-4 h-4 text-gray-400" />;

    const complianceRate = stats.guaranteeComplianceRate;

    if (complianceRate >= 95) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    } else if (complianceRate >= 85) {
      return <CheckCircle className="w-4 h-4 text-yellow-600" />;
    } else if (complianceRate >= 70) {
      return <AlertTriangle className="w-4 h-4 text-orange-600" />;
    } else {
      return <XCircle className="w-4 h-4 text-red-600" />;
    }
  };

  const getStatusColor = () => {
    if (!stats) return 'text-gray-500';
    return ResponseTimeTracker.getResponseTimeColor(stats.guaranteeComplianceRate);
  };

  const getStatusText = () => {
    if (!stats) return 'Keine Daten';
    return ResponseTimeTracker.getResponseTimeDescription(stats.guaranteeComplianceRate);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 animate-pulse">
        <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
        <div className="w-20 h-4 bg-gray-300 rounded"></div>
      </div>
    );
  }

  // Kompakte Anzeige für Karten
  if (!showDetailed) {
    return (
      <div className="flex items-center gap-2">
        {getStatusIcon()}
        <span className={`text-${size === 'sm' ? 'xs' : 'sm'} font-medium ${getStatusColor()}`}>
          {stats ? (
            <>
              {ResponseTimeTracker.formatResponseTime(stats.averageResponseTimeHours)} ⌀
              <span className="text-gray-500 ml-1">
                ({stats.guaranteeComplianceRate.toFixed(0)}%)
              </span>
            </>
          ) : (
            'Keine Daten'
          )}
        </span>
      </div>
    );
  }

  // Detaillierte Anzeige für Profile
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-3 mb-4">
        <Clock className="w-5 h-5 text-[#14ad9f]" />
        <h3 className="font-semibold text-gray-900 dark:text-white">Antwortzeit-Garantie</h3>
      </div>

      <div className="space-y-4">
        {/* Garantie */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Garantie</span>
          <span className="font-medium text-gray-900 dark:text-white">
            max. {guaranteeHours} Stunden
          </span>
        </div>

        {stats && (
          <>
            {/* Durchschnittliche Antwortzeit */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Durchschnitt</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {ResponseTimeTracker.formatResponseTime(stats.averageResponseTimeHours)}
              </span>
            </div>

            {/* Einhaltungsrate */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Einhaltungsrate</span>
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                <span className={`font-medium ${getStatusColor()}`}>
                  {stats.guaranteeComplianceRate.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Status-Beschreibung */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Bewertung</span>
              <span className={`font-medium ${getStatusColor()}`}>{getStatusText()}</span>
            </div>

            {/* Statistiken */}
            <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {stats.responsesWithinGuarantee}
                  </div>
                  <div className="text-xs text-gray-500">Pünktlich</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {stats.totalMessages}
                  </div>
                  <div className="text-xs text-gray-500">Gesamt (30T)</div>
                </div>
              </div>
            </div>

            {/* Fortschrittsbalken */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Garantie-Einhaltung</span>
                <span>{stats.guaranteeComplianceRate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    stats.guaranteeComplianceRate >= 95
                      ? 'bg-green-500'
                      : stats.guaranteeComplianceRate >= 85
                        ? 'bg-yellow-500'
                        : stats.guaranteeComplianceRate >= 70
                          ? 'bg-orange-500'
                          : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(stats.guaranteeComplianceRate, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Trend-Indikator */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <TrendingUp className="w-3 h-3" />
              <span>Basiert auf {stats.totalMessages} Nachrichten der letzten 30 Tage</span>
            </div>
          </>
        )}

        {!stats && (
          <div className="text-center py-4">
            <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Noch keine Antwortzeit-Daten verfügbar</p>
            <p className="text-xs text-gray-400 mt-1">
              Statistiken werden nach den ersten Nachrichten angezeigt
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Vereinfachte Badge-Komponente für Listen
export function ResponseTimeBadge({
  providerId,
  guaranteeHours = 24,
}: {
  providerId: string;
  guaranteeHours?: number;
}) {
  const [stats, setStats] = useState<ResponseTimeStats | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      const responseStats = await ResponseTimeTracker.getProviderResponseTimeStats(providerId);
      setStats(responseStats);
    };
    loadStats();
  }, [providerId]);

  if (!stats) {
    return (
      <div className="inline-flex items-center gap-1 text-xs text-gray-500">
        <Clock className="w-3 h-3" />
        <span>~{guaranteeHours}h</span>
      </div>
    );
  }

  const complianceRate = stats.guaranteeComplianceRate;
  const badgeColor =
    complianceRate >= 95
      ? 'bg-green-100 text-green-800'
      : complianceRate >= 85
        ? 'bg-yellow-100 text-yellow-800'
        : complianceRate >= 70
          ? 'bg-orange-100 text-orange-800'
          : 'bg-red-100 text-red-800';

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badgeColor}`}
    >
      <Clock className="w-3 h-3" />
      <span>{ResponseTimeTracker.formatResponseTime(stats.averageResponseTimeHours)}</span>
      <span className="text-xs opacity-75">({complianceRate.toFixed(0)}%)</span>
    </div>
  );
}
