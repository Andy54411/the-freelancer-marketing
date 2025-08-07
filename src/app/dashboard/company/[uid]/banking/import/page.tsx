'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  Download, 
  Settings, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  ArrowLeft,
  FileText,
  Activity,
  Building2
} from 'lucide-react';

interface BankConnection {
  id: string;
  bankName: string;
  status: 'connected' | 'error' | 'pending';
  accountCount: number;
  lastSync?: any;
}

interface ImportSettings {
  automaticSync: boolean;
  syncFrequency: 'HOURLY' | 'DAILY' | 'WEEKLY';
  categorizeTransactions: boolean;
  reconcileAutomatically: boolean;
}

export default function BankingImportPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = typeof params?.uid === 'string' ? params.uid : '';

  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [importSettings, setImportSettings] = useState<ImportSettings>({
    automaticSync: true,
    syncFrequency: 'DAILY',
    categorizeTransactions: true,
    reconcileAutomatically: false,
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [importingTransactions, setImportingTransactions] = useState(false);

  const loadBankConnections = useCallback(async () => {
    try {
      setLoading(true);
      console.log('📊 Loading banking data for import page:', uid);

      const response = await fetch(`/api/banking/stored-data?userId=${encodeURIComponent(uid)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load banking data: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📊 Banking data response:', data);

      if (data.success) {
        const transformedConnections: BankConnection[] = data.connections.map((conn: any) => ({
          id: conn.id,
          bankName: conn.bankName,
          status: conn.status === 'ready' ? 'connected' : conn.status === 'pending' ? 'pending' : 'error',
          accountCount: data.stats.totalAccounts || conn.accountsCount || 0,
          lastSync: conn.lastSync,
        }));

        setConnections(transformedConnections);
        console.log('✅ Banking connections loaded for import:', transformedConnections.length);
      } else {
        console.log('ℹ️ No stored banking data found');
        setConnections([]);
      }
    } catch (error) {
      console.error('Error loading banking data:', error);
      setConnections([]);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  const loadImportSettings = useCallback(async () => {
    try {
      console.log('⚙️ Loading import settings for user:', uid);

      const response = await fetch(`/api/banking/import-settings?userId=${encodeURIComponent(uid)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('⚙️ Import settings response:', data);

        if (data.success && data.settings) {
          setImportSettings(data.settings);
          console.log('✅ Import settings loaded successfully');
        }
      } else {
        console.log('ℹ️ Using default import settings');
      }
    } catch (error) {
      console.error('Error loading import settings:', error);
      console.log('ℹ️ Using default import settings');
    }
  }, [uid]);

  useEffect(() => {
    if (user && user.uid === uid) {
      loadBankConnections();
      loadImportSettings();
    }
  }, [user, uid, loadBankConnections, loadImportSettings]);

  const categorizeTransactions = useCallback(async (connectionId: string) => {
    try {
      const response = await fetch('/api/finapi/categorize-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.uid,
          connectionId: connectionId,
          credentialType: 'sandbox'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('✅ Transactions categorized successfully:', data.categorizedCount);
        }
      }
    } catch (error) {
      console.error('❌ Error categorizing transactions:', error);
    }
  }, [user?.uid]);

  const syncConnection = useCallback(async (connectionId: string) => {
    setSyncing(connectionId);
    try {
      console.log('🔄 Starting real sync for connection:', connectionId);
      console.log('⚙️ Applying import settings to finAPI:', importSettings);
      
      const response = await fetch('/api/finapi/sync-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.uid,
          connectionId: connectionId,
          credentialType: 'sandbox',
          importSettings: importSettings // Einstellungen an finAPI senden
        }),
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Update connection status with real data
        setConnections(prev => prev.map(conn => 
          conn.id === connectionId 
            ? { 
                ...conn, 
                lastSync: new Date().toISOString(), 
                status: 'connected' as const,
                accountCount: data.accountCount || conn.accountCount
              }
            : conn
        ));
        
        console.log('✅ Real sync successful for connection:', connectionId);
        console.log('📊 Synced accounts:', data.accountCount);
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (error) {
      console.error('❌ Real sync error:', error);
      // Update connection with error status
      setConnections(prev => prev.map(conn => 
        conn.id === connectionId 
          ? { ...conn, status: 'error' as const }
          : conn
      ));
    } finally {
      setSyncing(null);
    }
  }, [user?.uid, importSettings]);

  const triggerAutomaticSync = useCallback(async () => {
    if (!importSettings.automaticSync || connections.length === 0) {
      return;
    }

    console.log('🔄 Triggering automatic sync based on settings:', importSettings.syncFrequency);
    console.log('⚙️ Auto-sync will apply settings:', {
      categorizeTransactions: importSettings.categorizeTransactions,
      reconcileAutomatically: importSettings.reconcileAutomatically
    });
    
    // Only sync if last sync was long enough ago based on frequency
    const now = new Date();
    for (const connection of connections) {
      if (connection.status === 'connected' && connection.lastSync) {
        const lastSync = new Date(connection.lastSync);
        let shouldSync = false;

        switch (importSettings.syncFrequency) {
          case 'HOURLY':
            shouldSync = now.getTime() - lastSync.getTime() > 60 * 60 * 1000; // 1 hour
            break;
          case 'DAILY':
            shouldSync = now.getTime() - lastSync.getTime() > 24 * 60 * 60 * 1000; // 24 hours
            break;
          case 'WEEKLY':
            shouldSync = now.getTime() - lastSync.getTime() > 7 * 24 * 60 * 60 * 1000; // 1 week
            break;
        }

        if (shouldSync) {
          console.log(`🔄 Auto-syncing connection: ${connection.bankName}`);
          await syncConnection(connection.id); // syncConnection verwendet bereits importSettings
          
          // Additional categorization if enabled (finAPI wird das auch automatisch machen)
          if (importSettings.categorizeTransactions) {
            console.log(`🏷️ Auto-categorizing transactions for: ${connection.bankName}`);
            await categorizeTransactions(connection.id);
          }
        }
      }
    }
  }, [importSettings, connections, syncConnection, categorizeTransactions]);

  // Auto-sync based on settings
  useEffect(() => {
    if (!importSettings.automaticSync || connections.length === 0) {
      return;
    }

    const syncInterval = setInterval(() => {
      triggerAutomaticSync();
    }, getIntervalMs(importSettings.syncFrequency));

    return () => clearInterval(syncInterval);
  }, [importSettings, connections, triggerAutomaticSync]);

  const getIntervalMs = (frequency: string) => {
    switch (frequency) {
      case 'HOURLY':
        return 60 * 60 * 1000; // 1 hour
      case 'DAILY':
        return 24 * 60 * 60 * 1000; // 24 hours  
      case 'WEEKLY':
        return 7 * 24 * 60 * 60 * 1000; // 1 week
      default:
        return 24 * 60 * 60 * 1000; // Default to daily
    }
  };

  const importTransactions = async () => {
    setImportingTransactions(true);
    try {
      console.log('📥 Starting real transaction import for all connections');
      console.log('⚙️ Applying import settings to finAPI import:', importSettings);
      
      const response = await fetch('/api/finapi/import-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.uid,
          credentialType: 'sandbox',
          importSettings: importSettings, // Einstellungen für finAPI Import
        }),
      });

      if (!response.ok) {
        throw new Error(`Import failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Real transaction import successful:', data.imported);
        console.log('📊 Imported transactions count:', data.transactionCount);
        // Reload connections to update sync status
        await loadBankConnections();
      } else {
        throw new Error(data.error || 'Transaction import failed');
      }
    } catch (error) {
      console.error('❌ Real import error:', error);
    } finally {
      setImportingTransactions(false);
    }
  };

  const saveSettings = async () => {
    setSettingsSaving(true);
    setSettingsSaved(false);
    try {
      console.log('💾 Saving import settings:', importSettings);
      
      const response = await fetch('/api/banking/import-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.uid,
          settings: importSettings,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save settings: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Import settings saved successfully');
        setSettingsSaved(true);
        
        // Auto-hide success message after 3 seconds
        setTimeout(() => {
          setSettingsSaved(false);
        }, 3000);
      } else {
        throw new Error(data.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('❌ Error saving settings:', error);
      alert('Fehler beim Speichern der Einstellungen: ' + (error as Error).message);
    } finally {
      setSettingsSaving(false);
    }
  };

  const goBack = () => {
    router.push(`/dashboard/company/${uid}/banking`);
  };

  // Authorization check
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-[#14ad9f]" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Verbunden';
      case 'error':
        return 'Fehler';
      case 'pending':
        return 'Ausstehend';
      default:
        return 'Unbekannt';
    }
  };

  const formatLastSync = (timestamp?: any) => {
    if (!timestamp) return 'Nie';

    if (timestamp && typeof timestamp === 'object' && timestamp._seconds) {
      const date = new Date(timestamp._seconds * 1000);
      return date.toLocaleString('de-DE');
    }

    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Ungültiges Datum';

    return date.toLocaleString('de-DE');
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

        <div className="mt-6 flex justify-between">
          <button 
            onClick={importTransactions}
            disabled={importingTransactions || connections.length === 0}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {importingTransactions ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {importingTransactions ? 'Importiere...' : 'Alle Transaktionen importieren'}
          </button>
          
          <button 
            onClick={saveSettings}
            disabled={settingsSaving}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f] disabled:opacity-50 ${
              settingsSaved 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-[#14ad9f] hover:bg-[#129488]'
            }`}
          >
            {settingsSaving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : settingsSaved ? (
              <CheckCircle className="h-4 w-4 mr-2" />
            ) : (
              <Settings className="h-4 w-4 mr-2" />
            )}
            {settingsSaving ? 'Speichere...' : settingsSaved ? 'Gespeichert!' : 'Einstellungen speichern'}
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
                    {getStatusIcon(connection.status)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {connection.bankName}
                    </p>
                    <div className="flex items-center space-x-4 mt-1">
                      <p className="text-sm text-gray-500">
                        Status: {getStatusText(connection.status)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {connection.accountCount} Konto{connection.accountCount !== 1 ? 'en' : ''}
                      </p>
                      {connection.lastSync && (
                        <p className="text-sm text-gray-500">
                          Letzter Sync: {formatLastSync(connection.lastSync)}
                        </p>
                      )}
                    </div>
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
            <p className="text-gray-600 text-sm mt-2">
              Verwenden Sie &ldquo;Banking → Verbinden&rdquo; um neue Bankverbindungen hinzuzufügen.
            </p>
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
