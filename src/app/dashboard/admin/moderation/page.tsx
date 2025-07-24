'use client';

import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Shield,
  Eye,
  Clock,
  User,
  MessageCircle,
  CheckCircle,
  XCircle,
  Filter,
} from 'lucide-react';

interface ModerationLog {
  id: string;
  chatId: string;
  senderId: string;
  message: string;
  moderationResult: {
    isViolation: boolean;
    severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
    violatedRules: number[];
    reason: string;
    confidence: number;
    action: 'allow' | 'flag' | 'block' | 'escalate';
    suggestedResponse?: string;
  };
  timestamp: any;
  reviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: any;
}

export default function ModerationDashboard() {
  const [logs, setLogs] = useState<ModerationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed'>('all');
  const [severityFilter, setSeverityFilter] = useState<
    'all' | 'low' | 'medium' | 'high' | 'critical'
  >('all');

  // Load moderation logs
  const loadLogs = async () => {
    try {
      setLoading(true);

      // Hier würde normalerweise eine API-Route zum Laden der Moderation-Logs aufgerufen
      // Für jetzt simulieren wir Dummy-Daten
      const dummyLogs: ModerationLog[] = [
        {
          id: '1',
          chatId: 'chat_123',
          senderId: 'user_456',
          message: 'Hier ist meine E-Mail: test@example.com - kontaktier mich direkt!',
          moderationResult: {
            isViolation: true,
            severity: 'high',
            violatedRules: [1],
            reason: 'Kontaktdaten (E-Mail) erkannt',
            confidence: 95,
            action: 'block',
            suggestedResponse: 'Die Weitergabe von Kontaktdaten ist nicht gestattet.',
          },
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          reviewed: false,
        },
        {
          id: '2',
          chatId: 'chat_789',
          senderId: 'user_101',
          message: 'Du bist ein totaler Idiot!',
          moderationResult: {
            isViolation: true,
            severity: 'medium',
            violatedRules: [2],
            reason: 'Beleidigende Sprache erkannt',
            confidence: 88,
            action: 'flag',
          },
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
          reviewed: true,
          reviewedBy: 'admin_123',
          reviewedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        },
        {
          id: '3',
          chatId: 'chat_456',
          senderId: 'user_789',
          message: 'Lass uns das außerhalb der Plattform regeln, dann sparen wir uns die Gebühren.',
          moderationResult: {
            isViolation: true,
            severity: 'high',
            violatedRules: [5],
            reason: 'Versuch der Plattform-Umgehung erkannt',
            confidence: 92,
            action: 'escalate',
          },
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
          reviewed: false,
        },
      ];

      setLogs(dummyLogs);
    } catch (error) {
      console.error('Fehler beim Laden der Moderation-Logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mark log as reviewed
  const markAsReviewed = async (logId: string) => {
    try {
      // Hier würde normalerweise eine API-Route aufgerufen werden
      setLogs(prev =>
        prev.map(log =>
          log.id === logId
            ? {
                ...log,
                reviewed: true,
                reviewedBy: 'current_admin',
                reviewedAt: new Date(),
              }
            : log
        )
      );
    } catch (error) {
      console.error('Fehler beim Markieren als überprüft:', error);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const formatTimestamp = (timestamp: any) => {
    try {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      return date.toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-700 bg-red-100';
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'block':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'flag':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'escalate':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (filter === 'pending' && log.reviewed) return false;
    if (filter === 'reviewed' && !log.reviewed) return false;
    if (severityFilter !== 'all' && log.moderationResult.severity !== severityFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-4">🛡️ Moderation Dashboard</h1>
        <p className="text-gray-600 mb-6">
          Übersicht über alle KI-Moderations-Events und verdächtige Chat-Nachrichten.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center">
            <Shield className="w-8 h-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Gesamt Events</p>
              <p className="text-2xl font-bold text-gray-900">{logs.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Ausstehend</p>
              <p className="text-2xl font-bold text-gray-900">
                {logs.filter(log => !log.reviewed).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
          <div className="flex items-center">
            <XCircle className="w-8 h-8 text-red-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Blockiert</p>
              <p className="text-2xl font-bold text-gray-900">
                {logs.filter(log => log.moderationResult.action === 'block').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Überprüft</p>
              <p className="text-2xl font-bold text-gray-900">
                {logs.filter(log => log.reviewed).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={filter}
              onChange={e => setFilter(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="all">Alle</option>
              <option value="pending">Ausstehend</option>
              <option value="reviewed">Überprüft</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Schweregrad:</label>
            <select
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="all">Alle</option>
              <option value="critical">Kritisch</option>
              <option value="high">Hoch</option>
              <option value="medium">Mittel</option>
              <option value="low">Niedrig</option>
            </select>
          </div>
        </div>
      </div>

      {/* Moderation Logs */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">Keine Moderation-Events gefunden</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nachricht
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Schweregrad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktion
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Zeit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map(log => (
                  <tr key={log.id} className={!log.reviewed ? 'bg-yellow-50' : ''}>
                    <td className="px-6 py-4">
                      <div className="flex items-start">
                        <MessageCircle className="w-4 h-4 text-gray-400 mt-1 mr-2" />
                        <div>
                          <p className="text-sm text-gray-900 max-w-xs truncate">{log.message}</p>
                          <p className="text-xs text-gray-500">
                            Chat: {log.chatId} | User: {log.senderId}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {log.moderationResult.reason}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(log.moderationResult.severity)}`}
                      >
                        {log.moderationResult.severity}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {log.moderationResult.confidence}% Konfidenz
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getActionIcon(log.moderationResult.action)}
                        <span className="ml-2 text-sm text-gray-900 capitalize">
                          {log.moderationResult.action}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {formatTimestamp(log.timestamp)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.reviewed ? (
                        <div>
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Überprüft
                          </span>
                          <p className="text-xs text-gray-500 mt-1">von {log.reviewedBy}</p>
                        </div>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Ausstehend
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button className="text-blue-600 hover:text-blue-900 flex items-center">
                          <Eye className="w-4 h-4 mr-1" />
                          Details
                        </button>
                        {!log.reviewed && (
                          <button
                            onClick={() => markAsReviewed(log.id)}
                            className="text-green-600 hover:text-green-900 flex items-center"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Erledigt
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
