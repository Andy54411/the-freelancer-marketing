'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { BankConnection, BankImportSettings } from '@/types';
import { FinAPIService } from '@/lib/finapi';
import { Upload, Download, Settings, RefreshCw, CheckCircle, AlertTriangle, Clock, Plus } from 'lucide-react';

export default function BankingImportPage() {
  const params = useParams();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [importSettings, setImportSettings] = useState<BankImportSettings>({
    automaticSync: true,
    syncFrequency: 'DAILY',
    categorizeTransactions: true,
    reconcileAutomatically: false,
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  // Autorisierung prüfen
  if (!user || user.uid !== uid) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Zugriff verweigert</h2>
          <p className="text-gray-600">Sie sind nicht berechtigt, diese Seite zu sehen.</p>
        </div>
      </div>
    );
  }

  // finAPI Service initialisieren
  const finAPIService = new FinAPIService();

  const loadConnections = async () => {
    try {
      setLoading(true);
      // Mock data for demonstration
      setConnections([
        {
          id: 'conn_001',
          bankName: 'Deutsche Bank AG',
          connectionStatus: 'CONNECTED',
          lastSync: '2025-08-02T10:30:00Z',
          accountIds: ['acc_001', 'acc_002'],
        },
        {
          id: 'conn_002',
          bankName: 'Sparkasse München',
          connectionStatus: 'CONNECTED',
          lastSync: '2025-08-02T09:15:00Z',
          accountIds: ['acc_003'],
        },
        {
          id: 'conn_003',
          bankName: 'Commerzbank AG',
          connectionStatus: 'ERROR',
          lastSync: '2025-08-01T14:20:00Z',
          accountIds: ['acc_004'],
          errorMessage: 'Verbindung fehlgeschlagen - Bitte Zugangsdaten überprüfen',
        },
      ]);
    } catch (error) {
      console.error('Fehler beim Laden der Verbindungen:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncConnection = async (connectionId: string) => {
    setSyncing(connectionId);
    try {
      // Simulate sync operation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update connection status
      setConnections(prev => prev.map(conn => 
        conn.id === connectionId 
          ? { ...conn, lastSync: new Date().toISOString(), connectionStatus: 'CONNECTED' as const }
          : conn
      ));
    } catch (error) {
      console.error('Sync-Fehler:', error);
    } finally {
      setSyncing(null);
    }
  };

  useEffect(() => {
    loadConnections();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'ERROR':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'DISCONNECTED':
        return <Clock className="h-5 w-5 text-gray-400" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return 'Verbunden';
      case 'ERROR':
        return 'Fehler';
      case 'DISCONNECTED':
        return 'Getrennt';
      default:
        return 'Unbekannt';
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-[#14ad9f] mx-auto mb-4" />
          <p className="text-gray-600">Verbindungen werden geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Banking Import</h1>
            <p className="text-gray-600 mt-1">Verwalten Sie Ihre Bankverbindungen und Datenimport</p>
          </div>
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#14ad9f] hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]">
            <Plus className="h-4 w-4 mr-2" />
            Neue Verbindung
          </button>
        </div>
      </div>

      {/* Import Settings */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Import-Einstellungen</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                id="automaticSync"
                type="checkbox"
                checked={importSettings.automaticSync}
                onChange={(e) => setImportSettings(prev => ({ ...prev, automaticSync: e.target.checked }))}
                className="h-4 w-4 text-[#14ad9f] focus:ring-[#14ad9f] border-gray-300 rounded"
              />
              <label htmlFor="automaticSync" className="ml-2 block text-sm text-gray-900">
                Automatische Synchronisation
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                id="categorizeTransactions"
                type="checkbox"
                checked={importSettings.categorizeTransactions}
                onChange={(e) => setImportSettings(prev => ({ ...prev, categorizeTransactions: e.target.checked }))}
                className="h-4 w-4 text-[#14ad9f] focus:ring-[#14ad9f] border-gray-300 rounded"
              />
              <label htmlFor="categorizeTransactions" className="ml-2 block text-sm text-gray-900">
                Transaktionen automatisch kategorisieren
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="reconcileAutomatically"
                type="checkbox"
                checked={importSettings.reconcileAutomatically}
                onChange={(e) => setImportSettings(prev => ({ ...prev, reconcileAutomatically: e.target.checked }))}
                className="h-4 w-4 text-[#14ad9f] focus:ring-[#14ad9f] border-gray-300 rounded"
              />
              <label htmlFor="reconcileAutomatically" className="ml-2 block text-sm text-gray-900">
                Automatischer Abgleich
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="syncFrequency" className="block text-sm font-medium text-gray-700 mb-2">
              Synchronisationsfrequenz
            </label>
            <select
              id="syncFrequency"
              value={importSettings.syncFrequency}
              onChange={(e) => setImportSettings(prev => ({ ...prev, syncFrequency: e.target.value as any }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#14ad9f] focus:border-[#14ad9f]"
            >
              <option value="HOURLY">Stündlich</option>
              <option value="DAILY">Täglich</option>
              <option value="WEEKLY">Wöchentlich</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#14ad9f] hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]">
            <Settings className="h-4 w-4 mr-2" />
            Einstellungen speichern
          </button>
        </div>
      </div>

      {/* Bank Connections */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Bankverbindungen</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Übersicht über alle verbundenen Bankkonten und deren Status
          </p>
        </div>

        <ul className="divide-y divide-gray-200">
          {connections.map((connection) => (
            <li key={connection.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {getStatusIcon(connection.connectionStatus)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {connection.bankName}
                    </p>
                    <div className="flex items-center space-x-4 mt-1">
                      <p className="text-sm text-gray-500">
                        Status: {getStatusText(connection.connectionStatus)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {connection.accountIds.length} Konto{connection.accountIds.length !== 1 ? 'en' : ''}
                      </p>
                      {connection.lastSync && (
                        <p className="text-sm text-gray-500">
                          Letzter Sync: {formatDateTime(connection.lastSync)}
                        </p>
                      )}
                    </div>
                    {connection.errorMessage && (
                      <p className="text-sm text-red-600 mt-1">
                        {connection.errorMessage}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => syncConnection(connection.id)}
                    disabled={syncing === connection.id}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs leading-4 font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f] disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${syncing === connection.id ? 'animate-spin' : ''}`} />
                    {syncing === connection.id ? 'Synchronisiere...' : 'Sync'}
                  </button>
                  
                  <button className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs leading-4 font-medium rounded text-white bg-[#14ad9f] hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]">
                    <Settings className="h-3 w-3 mr-1" />
                    Einstellungen
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {connections.length === 0 && (
        <div className="text-center py-12">
          <div className="flex flex-col items-center">
            <Upload className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Bankverbindungen</h3>
            <p className="text-gray-600 mb-6">
              Fügen Sie Ihre erste Bankverbindung hinzu, um mit dem automatischen Import zu beginnen.
            </p>
            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#14ad9f] hover:bg-[#129488] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]">
              <Plus className="h-4 w-4 mr-2" />
              Erste Verbindung hinzufügen
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button className="flex items-center justify-center px-6 py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-[#14ad9f] hover:text-[#14ad9f] transition-colors">
          <Upload className="h-6 w-6 mr-3" />
          <span className="font-medium">Datei importieren</span>
        </button>
        
        <button className="flex items-center justify-center px-6 py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-[#14ad9f] hover:text-[#14ad9f] transition-colors">
          <Download className="h-6 w-6 mr-3" />
          <span className="font-medium">Export erstellen</span>
        </button>
        
        <button className="flex items-center justify-center px-6 py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-[#14ad9f] hover:text-[#14ad9f] transition-colors">
          <Settings className="h-6 w-6 mr-3" />
          <span className="font-medium">Import-Regeln</span>
        </button>
      </div>
    </div>
  );
}
