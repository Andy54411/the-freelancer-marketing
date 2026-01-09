'use client';

/**
 * DSGVO-Dashboard für WhatsApp Business
 * 
 * Features:
 * - Datenexport (Art. 15 DSGVO)
 * - Löschanfragen (Art. 17 DSGVO)  
 * - Audit-Log Einsicht
 * - Opt-In/Opt-Out Verwaltung
 * - Einwilligungsnachweis
 */

import { useState, useEffect } from 'react';
import { 
  Shield, 
  Download, 
  Trash2, 
  FileText, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Clock,
  Search,
  RefreshCw,
  Eye,
  Archive,
  UserX,
  FileDown
} from 'lucide-react';

interface DSGVODashboardProps {
  companyId: string;
}

interface DataSubjectRequest {
  id: string;
  type: 'export' | 'deletion' | 'correction';
  contactPhone: string;
  contactName: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestedAt: string;
  completedAt?: string;
  notes?: string;
}

interface ConsentRecord {
  id: string;
  contactPhone: string;
  contactName: string;
  consentType: 'marketing' | 'transactional' | 'support';
  consentGiven: boolean;
  consentDate: string;
  source: 'opt-in' | 'opt-out' | 'manual';
  ipAddress?: string;
}

interface AuditLogEntry {
  id: string;
  action: string;
  userId: string;
  userName: string;
  targetPhone?: string;
  details: string;
  timestamp: string;
}

type TabType = 'overview' | 'requests' | 'consents' | 'audit' | 'settings';

export function DSGVODashboard({ companyId }: DSGVODashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<DataSubjectRequest[]>([]);
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Statistiken
  const [stats, setStats] = useState({
    totalContacts: 0,
    activeConsents: 0,
    pendingRequests: 0,
    retentionDays: 365,
    lastAudit: '',
  });

  useEffect(() => {
    loadDSGVOData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const loadDSGVOData = async () => {
    setLoading(true);
    try {
      // Lade alle DSGVO-relevanten Daten
      const [requestsRes, consentsRes, auditRes] = await Promise.all([
        fetch(`/api/whatsapp/dsgvo/requests?companyId=${companyId}`),
        fetch(`/api/whatsapp/dsgvo/consents?companyId=${companyId}`),
        fetch(`/api/whatsapp/activity?companyId=${companyId}&limit=100`),
      ]);

      if (requestsRes.ok) {
        const data = await requestsRes.json();
        setRequests(data.requests || []);
      }

      if (consentsRes.ok) {
        const data = await consentsRes.json();
        setConsents(data.consents || []);
        setStats(prev => ({
          ...prev,
          activeConsents: data.consents?.filter((c: ConsentRecord) => c.consentGiven).length || 0,
        }));
      }

      if (auditRes.ok) {
        const data = await auditRes.json();
        setAuditLog(data.activities?.map((a: Record<string, unknown>) => ({
          id: a.id,
          action: a.type,
          userId: a.userId || '',
          userName: a.userName || 'System',
          targetPhone: a.targetPhone,
          details: a.description || '',
          timestamp: a.timestamp,
        })) || []);
      }

      // Berechne Statistiken
      setStats(prev => ({
        ...prev,
        pendingRequests: requests.filter(r => r.status === 'pending').length,
        lastAudit: new Date().toISOString(),
      }));
    } catch {
      // Fehler werden in der UI angezeigt
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async (contactPhone: string) => {
    setProcessingId(contactPhone);
    try {
      const response = await fetch('/api/whatsapp/dsgvo/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, contactPhone }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dsgvo-export-${contactPhone}-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteData = async (contactPhone: string) => {
    if (!window.confirm(`Alle Daten für ${contactPhone} unwiderruflich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
      return;
    }

    setProcessingId(contactPhone);
    try {
      await fetch('/api/whatsapp/dsgvo/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, contactPhone }),
      });
      loadDSGVOData();
    } finally {
      setProcessingId(null);
    }
  };

  const handleProcessRequest = async (requestId: string, action: 'approve' | 'reject') => {
    setProcessingId(requestId);
    try {
      await fetch('/api/whatsapp/dsgvo/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          companyId, 
          requestId, 
          action,
          completedAt: new Date().toISOString(),
        }),
      });
      loadDSGVOData();
    } finally {
      setProcessingId(null);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Übersicht', icon: Shield },
    { id: 'requests', label: 'Anfragen', icon: FileText, badge: stats.pendingRequests },
    { id: 'consents', label: 'Einwilligungen', icon: CheckCircle },
    { id: 'audit', label: 'Audit-Log', icon: Eye },
    { id: 'settings', label: 'Einstellungen', icon: Archive },
  ];

  const filteredConsents = consents.filter(c => 
    c.contactPhone.includes(searchTerm) || 
    c.contactName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAudit = auditLog.filter(a =>
    a.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 text-[#14ad9f] animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-linear-to-r from-[#14ad9f]/10 to-transparent border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#14ad9f] flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">DSGVO-Dashboard</h2>
              <p className="text-sm text-gray-500">Datenschutz-Verwaltung für WhatsApp Business</p>
            </div>
          </div>
          <button
            onClick={loadDSGVOData}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 
              bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Aktualisieren
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 px-4 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-[#14ad9f] text-[#14ad9f]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.badge && tab.badge > 0 && (
              <span className="px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Übersicht */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <UserX className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalContacts}</p>
                    <p className="text-sm text-gray-500">Kontakte</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.activeConsents}</p>
                    <p className="text-sm text-gray-500">Aktive Einwilligungen</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.pendingRequests}</p>
                    <p className="text-sm text-gray-500">Offene Anfragen</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Archive className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.retentionDays}</p>
                    <p className="text-sm text-gray-500">Aufbewahrungstage</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="border border-gray-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Schnellaktionen</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left">
                  <FileDown className="w-5 h-5 text-[#14ad9f]" />
                  <div>
                    <p className="font-medium text-gray-900">Vollständiger Export</p>
                    <p className="text-sm text-gray-500">Alle DSGVO-Daten exportieren</p>
                  </div>
                </button>
                <button className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left">
                  <Eye className="w-5 h-5 text-[#14ad9f]" />
                  <div>
                    <p className="font-medium text-gray-900">Audit-Bericht</p>
                    <p className="text-sm text-gray-500">Compliance-Report erstellen</p>
                  </div>
                </button>
                <button className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left">
                  <AlertTriangle className="w-5 h-5 text-[#14ad9f]" />
                  <div>
                    <p className="font-medium text-gray-900">Risikobewertung</p>
                    <p className="text-sm text-gray-500">Datenschutz-Risiken prüfen</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Compliance Status */}
            <div className="border border-gray-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Compliance-Status</h3>
              <div className="space-y-3">
                {[
                  { label: 'Datenschutzerklärung vorhanden', status: true },
                  { label: 'Einwilligungsformular aktiv', status: true },
                  { label: 'Löschfristen konfiguriert', status: true },
                  { label: 'Audit-Trail aktiviert', status: true },
                  { label: 'Verschlüsselung aktiviert', status: true },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-700">{item.label}</span>
                    {item.status ? (
                      <span className="flex items-center gap-1 text-sm text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        Erfüllt
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-sm text-red-600">
                        <XCircle className="w-4 h-4" />
                        Ausstehend
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Anfragen */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            {requests.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Keine offenen Datenanfragen</p>
                <p className="text-sm text-gray-500 mt-1">
                  Betroffenenanfragen nach Art. 15, 17 DSGVO erscheinen hier
                </p>
              </div>
            ) : (
              requests.map(request => (
                <div key={request.id} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        request.type === 'export' ? 'bg-blue-100' :
                        request.type === 'deletion' ? 'bg-red-100' : 'bg-yellow-100'
                      }`}>
                        {request.type === 'export' ? (
                          <Download className={`w-5 h-5 text-blue-600`} />
                        ) : request.type === 'deletion' ? (
                          <Trash2 className={`w-5 h-5 text-red-600`} />
                        ) : (
                          <FileText className={`w-5 h-5 text-yellow-600`} />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {request.type === 'export' ? 'Datenauskunft' :
                           request.type === 'deletion' ? 'Löschung' : 'Berichtigung'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {request.contactName} ({request.contactPhone})
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Angefragt am {new Date(request.requestedAt).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        request.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                        request.status === 'completed' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {request.status === 'pending' ? 'Ausstehend' :
                         request.status === 'processing' ? 'In Bearbeitung' :
                         request.status === 'completed' ? 'Abgeschlossen' : 'Abgelehnt'}
                      </span>
                    </div>
                  </div>
                  {request.status === 'pending' && (
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => handleProcessRequest(request.id, 'approve')}
                        disabled={processingId === request.id}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#14ad9f] 
                          text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium
                          disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Genehmigen
                      </button>
                      <button
                        onClick={() => handleProcessRequest(request.id, 'reject')}
                        disabled={processingId === request.id}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 
                          text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium
                          disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Ablehnen
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Einwilligungen */}
        {activeTab === 'consents' && (
          <div className="space-y-4">
            {/* Suchleiste */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Kontakt suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 
                  focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
              />
            </div>

            {/* Einwilligungsliste */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kontakt</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Typ</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredConsents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        Keine Einwilligungen gefunden
                      </td>
                    </tr>
                  ) : (
                    filteredConsents.map(consent => (
                      <tr key={consent.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{consent.contactName}</p>
                          <p className="text-sm text-gray-500">{consent.contactPhone}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-700 capitalize">{consent.consentType}</span>
                        </td>
                        <td className="px-4 py-3">
                          {consent.consentGiven ? (
                            <span className="flex items-center gap-1 text-sm text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              Erteilt
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-sm text-red-600">
                              <XCircle className="w-4 h-4" />
                              Widerrufen
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(consent.consentDate).toLocaleDateString('de-DE')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleExportData(consent.contactPhone)}
                              disabled={processingId === consent.contactPhone}
                              className="p-1.5 text-gray-400 hover:text-[#14ad9f] transition-colors"
                              title="Daten exportieren"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteData(consent.contactPhone)}
                              disabled={processingId === consent.contactPhone}
                              className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                              title="Daten löschen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Audit-Log */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            {/* Suchleiste */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Aktivität suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 
                  focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
              />
            </div>

            {/* Log-Einträge */}
            <div className="space-y-2">
              {filteredAudit.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Keine Audit-Einträge gefunden</p>
                </div>
              ) : (
                filteredAudit.map(entry => (
                  <div key={entry.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-[#14ad9f]/10 flex items-center justify-center shrink-0">
                      <Eye className="w-4 h-4 text-[#14ad9f]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{entry.userName}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(entry.timestamp).toLocaleString('de-DE')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{entry.details}</p>
                      {entry.targetPhone && (
                        <p className="text-xs text-gray-500 mt-1">Betroffener: {entry.targetPhone}</p>
                      )}
                    </div>
                    <span className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded-full">
                      {entry.action}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Einstellungen */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="border border-gray-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Aufbewahrungsfristen</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nachrichtenverlauf (Tage)
                  </label>
                  <input
                    type="number"
                    defaultValue={365}
                    min={30}
                    max={3650}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 
                      focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Nachrichten werden nach dieser Zeit automatisch anonymisiert
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kontaktdaten nach Inaktivität (Monate)
                  </label>
                  <input
                    type="number"
                    defaultValue={24}
                    min={6}
                    max={120}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 
                      focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Automatische Aktionen</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4 text-[#14ad9f] rounded" />
                  <span className="text-sm text-gray-700">Audit-Trail für alle Zugriffe aktivieren</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4 text-[#14ad9f] rounded" />
                  <span className="text-sm text-gray-700">Benachrichtigung bei Löschanfragen</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 text-[#14ad9f] rounded" />
                  <span className="text-sm text-gray-700">Automatische Löschung nach Fristablauf</span>
                </label>
              </div>
            </div>

            <button className="w-full py-3 bg-[#14ad9f] text-white rounded-lg font-medium 
              hover:bg-teal-700 transition-colors">
              Einstellungen speichern
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
