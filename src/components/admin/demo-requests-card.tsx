'use client';

import React, { useEffect, useState } from 'react';
import { Clock, Mail, Building2, Phone, Calendar, CheckCircle, AlertCircle, X, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DemoRequest {
  id: string;
  name: string;
  email: string;
  company: string;
  phone?: string;
  preferredDate?: string;
  message?: string;
  status: 'neu' | 'in_bearbeitung' | 'zugewiesen' | 'abgeschlossen';
  assignedTo?: string | null;
  createdAt: string;
  updatedAt: string;
  priority: 'niedrig' | 'normal' | 'hoch';
}

interface SupportMitarbeiter {
  id: string;
  email: string;
  name: string;
}

export function DemoRequestsCard() {
  const [requests, setRequests] = useState<DemoRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<DemoRequest | null>(null);
  const [assignTo, setAssignTo] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [supportMitarbeiter, setSupportMitarbeiter] = useState<SupportMitarbeiter[]>([]);

  useEffect(() => {
    loadRequests();
    loadSupportMitarbeiter();
    // Auto-refresh alle 30 Sekunden
    const interval = setInterval(loadRequests, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSupportMitarbeiter = async () => {
    try {
      const response = await fetch('/api/admin/users?role=support');
      if (response.ok) {
        const data = await response.json();
        setSupportMitarbeiter(data.users || []);
      }
    } catch (err) {
      console.error('Fehler beim Laden der Support-Mitarbeiter:', err);
    }
  };

  const loadRequests = async () => {
    try {
      const response = await fetch('/api/demo-requests');
      if (!response.ok) throw new Error('Fehler beim Laden');
      const data = await response.json();
      setRequests(data.requests || []);
      setError(null);
    } catch (err) {
      setError('Fehler beim Laden der Anfragen');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'neu': return 'bg-blue-100 text-blue-800';
      case 'in_bearbeitung': return 'bg-yellow-100 text-yellow-800';
      case 'zugewiesen': return 'bg-purple-100 text-purple-800';
      case 'abgeschlossen': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'hoch': return 'text-red-600';
      case 'normal': return 'text-yellow-600';
      case 'niedrig': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'neu': return <AlertCircle className="w-4 h-4" />;
      case 'abgeschlossen': return <CheckCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleAssign = async () => {
    if (!selectedRequest || !assignTo.trim()) return;

    setIsAssigning(true);
    try {
      const response = await fetch(`/api/demo-requests/${selectedRequest.id}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedTo: assignTo,
          status: 'zugewiesen',
        }),
      });

      if (!response.ok) throw new Error('Zuweisung fehlgeschlagen');

      // Anfragen neu laden
      await loadRequests();
      setSelectedRequest(null);
      setAssignTo('');
    } catch (err) {
      alert('Fehler beim Zuweisen: ' + (err instanceof Error ? err.message : 'Unbekannter Fehler'));
    } finally {
      setIsAssigning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Mail className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Demo-Anfragen</h3>
              <p className="text-sm text-gray-500">{requests.length} Anfragen insgesamt</p>
            </div>
          </div>
          <button
            onClick={loadRequests}
            className="px-4 py-2 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
          >
            Aktualisieren
          </button>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {requests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Mail className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Keine Demo-Anfragen vorhanden</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request, index) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-gray-900">{request.name}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(request.status)}
                          {request.status.replace('_', ' ')}
                        </span>
                      </span>
                      {request.priority !== 'normal' && (
                        <span className={`text-xs font-medium ${getPriorityColor(request.priority)}`}>
                          ! {request.priority}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span>{request.company}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span>{request.email}</span>
                      </div>
                      {request.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span>{request.phone}</span>
                        </div>
                      )}
                      {request.preferredDate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>Wunschtermin: {new Date(request.preferredDate).toLocaleDateString('de-DE')}</span>
                        </div>
                      )}
                    </div>
                    {request.message && (
                      <p className="mt-2 text-sm text-gray-600 italic">
                        &quot;{request.message}&quot;
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>Erstellt: {formatDate(request.createdAt)}</span>
                  </div>
                  <button
                    onClick={() => setSelectedRequest(request)}
                    className="px-3 py-1.5 text-xs font-medium text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                  >
                    Zuweisen →
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Zuweisungs-Modal */}
      <AnimatePresence>
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-white/30">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Demo-Anfrage zuweisen</h3>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900">{selectedRequest.name}</p>
                <p className="text-sm text-gray-600">{selectedRequest.company}</p>
                <p className="text-sm text-gray-600">{selectedRequest.email}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Support-Mitarbeiter auswählen
                </label>
                {supportMitarbeiter.length > 0 ? (
                  <select
                    value={assignTo}
                    onChange={(e) => setAssignTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="">-- Mitarbeiter wählen --</option>
                    {supportMitarbeiter.map((mitarbeiter) => (
                      <option key={mitarbeiter.id} value={mitarbeiter.email}>
                        {mitarbeiter.name} ({mitarbeiter.email})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="email"
                    value={assignTo}
                    onChange={(e) => setAssignTo(e.target.value)}
                    placeholder="mitarbeiter@taskilo.de"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedRequest(null)}
                  disabled={isAssigning}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleAssign}
                  disabled={isAssigning || !assignTo.trim()}
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                >
                  {isAssigning ? 'Wird zugewiesen...' : 'Zuweisen'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
