// ✅ Google Ads Debug & Test Component
// Umfassende Test-Suite für Client Library Integration

'use client';

import React, { useState, useEffect } from 'react';
import {
  Bug,
  Play,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Terminal,
  Download,
  Copy,
  Trash2,
  Settings,
  Database,
  Link as LinkIcon,
  Users,
  BarChart3,
  Target,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface GoogleAdsDebugProps {
  companyId: string;
  initialTest?: string;
  testMode: string;
}

interface TestResult {
  test: string;
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
}

interface TestSuite {
  testStarted: string;
  testCompleted?: string;
  companyId: string;
  testMode: string;
  results: Record<string, TestResult>;
  summary: {
    total: number;
    passed: number;
    failed: number;
    successRate: number;
  };
  duration?: number;
}

export function GoogleAdsDebug({ companyId, initialTest, testMode }: GoogleAdsDebugProps) {
  const [testResults, setTestResults] = useState<TestSuite | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTestMode, setSelectedTestMode] = useState(testMode);
  const [logs, setLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('tests');

  // Verfügbare Test-Modi
  const testModes = [
    { value: 'all', label: 'Alle Tests', description: 'Vollständige Test-Suite' },
    { value: 'status', label: 'Service Status', description: 'Grundlegende Service-Checks' },
    { value: 'auth', label: 'Authentifizierung', description: 'OAuth & Token Tests' },
    { value: 'customers', label: 'Kunden-Zugriff', description: 'Account & Customer Tests' },
    { value: 'campaigns', label: 'Kampagnen', description: 'Campaign Management Tests' },
    { value: 'metrics', label: 'Metriken', description: 'Performance Data Tests' },
  ];

  // Test-Suite ausführen
  const runTests = async (mode: string = selectedTestMode) => {
    setIsRunning(true);
    setTestResults(null);
    setLogs([]);
    addLog(`🚀 Starte Google Ads Client Library Tests (Modus: ${mode})`);

    try {
      const response = await fetch(
        `/api/google-ads/test-all?companyId=${encodeURIComponent(companyId)}&mode=${encodeURIComponent(mode)}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const results = await response.json();

      // Sanitize results to avoid serialization issues
      const sanitizedResults = {
        ...results,
        results: Object.fromEntries(
          Object.entries(results.results || {}).map(([key, value]: [string, any]) => [
            key,
            {
              test: value.test || 'Unknown Test',
              success: Boolean(value.success),
              data: value.data ? JSON.parse(JSON.stringify(value.data)) : null,
              error:
                typeof value.error === 'string'
                  ? value.error
                  : value.error?.message || 'Unknown error',
              duration: typeof value.duration === 'number' ? value.duration : undefined,
            },
          ])
        ),
      };

      setTestResults(sanitizedResults);
      addLog(
        `✅ Tests abgeschlossen: ${results.summary.passed}/${results.summary.total} erfolgreich`
      );

      if (results.summary.failed > 0) {
        addLog(`❌ ${results.summary.failed} Tests fehlgeschlagen`);
      }
    } catch (error: any) {
      addLog(`🔥 Fehler beim Ausführen der Tests: ${error.message}`);
      console.error('Test execution error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  // Einzelnen Test ausführen
  const runSingleTest = async (testName: string) => {
    setIsRunning(true);
    addLog(`🧪 Führe Einzeltest aus: ${testName}`);

    try {
      const response = await fetch(
        `/api/google-ads/test-all?companyId=${encodeURIComponent(companyId)}&mode=${encodeURIComponent(testName)}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const results = await response.json();

      // Update nur den spezifischen Test in den Ergebnissen
      if (testResults && results.results) {
        const updatedResults = { ...testResults };
        Object.entries(results.results).forEach(([key, value]: [string, any]) => {
          updatedResults.results[key] = {
            test: value.test || 'Unknown Test',
            success: Boolean(value.success),
            data: value.data ? JSON.parse(JSON.stringify(value.data)) : null,
            error:
              typeof value.error === 'string'
                ? value.error
                : value.error?.message || 'Unknown error',
            duration: typeof value.duration === 'number' ? value.duration : undefined,
          };
        });
        setTestResults(updatedResults);
      }

      addLog(`✅ Einzeltest ${testName} abgeschlossen`);
    } catch (error: any) {
      addLog(`❌ Einzeltest ${testName} fehlgeschlagen: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Log-Eintrag hinzufügen
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // Test-Ergebnisse exportieren
  const exportResults = () => {
    if (!testResults) return;

    const data = JSON.stringify(testResults, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `google-ads-tests-${companyId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Logs exportieren
  const exportLogs = () => {
    const logData = logs.join('\n');
    const blob = new Blob([logData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `google-ads-debug-logs-${companyId}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Logs kopieren
  const copyLogs = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    addLog('📋 Logs in Zwischenablage kopiert');
  };

  // Logs löschen
  const clearLogs = () => {
    setLogs([]);
  };

  // Status-Icon für Test-Ergebnis
  const getStatusIcon = (result: TestResult) => {
    if (result.success) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  // Automatischen Test bei Mount ausführen
  useEffect(() => {
    if (initialTest && typeof initialTest === 'string' && companyId) {
      runSingleTest(initialTest);
    }
  }, [initialTest, companyId]);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tests">Test Suite</TabsTrigger>
          <TabsTrigger value="console">Debug Console</TabsTrigger>
          <TabsTrigger value="tools">Debug Tools</TabsTrigger>
        </TabsList>

        {/* Test Suite Tab */}
        <TabsContent value="tests" className="space-y-6">
          {/* Test Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bug className="w-5 h-5" />
                <span>Google Ads Client Library Test Suite</span>
              </CardTitle>
              <CardDescription>Umfassende Tests für alle Google Ads API-Funktionen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <Select value={selectedTestMode} onValueChange={setSelectedTestMode}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Test-Modus auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {testModes.map(mode => (
                      <SelectItem key={mode.value} value={mode.value}>
                        <div>
                          <div className="font-medium">{mode.label}</div>
                          <div className="text-sm text-gray-600">{mode.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  onClick={() => runTests(selectedTestMode)}
                  disabled={isRunning}
                  className="bg-[#14ad9f] hover:bg-[#129488]"
                >
                  {isRunning ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  {isRunning ? 'Tests laufen...' : 'Tests starten'}
                </Button>

                {testResults && (
                  <Button variant="outline" onClick={exportResults}>
                    <Download className="w-4 h-4 mr-2" />
                    Ergebnisse exportieren
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Test Results */}
          {testResults && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Test-Ergebnisse</span>
                  <Badge
                    variant={testResults.summary.successRate >= 70 ? 'default' : 'destructive'}
                    className={
                      testResults.summary.successRate >= 70
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }
                  >
                    {testResults.summary.passed}/{testResults.summary.total} erfolgreich (
                    {testResults.summary.successRate}%)
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Test-Suite ausgeführt am {new Date(testResults.testStarted).toLocaleString()}
                  {testResults.duration && ` • Dauer: ${testResults.duration}ms`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(testResults.results).map(([testName, result]) => (
                    <div key={testName} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(result)}
                          <h3 className="font-medium">{result.test}</h3>
                        </div>
                        <div className="flex items-center space-x-2">
                          {result.duration && (
                            <span className="text-sm text-gray-600">{result.duration}ms</span>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => runSingleTest(testName)}
                            disabled={isRunning}
                          >
                            <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
                          </Button>
                        </div>
                      </div>

                      {/* Test Data */}
                      {result.data && typeof result.data === 'object' && (
                        <div className="mt-3">
                          <details className="group">
                            <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
                              Test-Daten anzeigen ({Object.keys(result.data).length} Eigenschaften)
                            </summary>
                            <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-auto max-h-40">
                              {JSON.stringify(result.data, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}

                      {/* Error Details */}
                      {result.error && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                          <h4 className="font-medium text-red-800 mb-1">Fehler:</h4>
                          <p className="text-sm text-red-700">
                            {typeof result.error === 'string' ? result.error : 'Unbekannter Fehler'}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Individual Test Buttons */}
          <Card>
            <CardHeader>
              <CardTitle>Einzeltests</CardTitle>
              <CardDescription>Führen Sie spezifische Tests einzeln aus</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {[
                  { key: 'status', label: 'Service Status', icon: Settings },
                  { key: 'auth', label: 'OAuth Test', icon: LinkIcon },
                  { key: 'customers', label: 'Kunden-Zugriff', icon: Users },
                  { key: 'campaigns', label: 'Kampagnen', icon: Target },
                  { key: 'metrics', label: 'Metriken', icon: BarChart3 },
                  { key: 'connection', label: 'Verbindung', icon: Database },
                ].map(test => (
                  <Button
                    key={test.key}
                    variant="outline"
                    size="sm"
                    onClick={() => runSingleTest(test.key)}
                    disabled={isRunning}
                    className="flex items-center space-x-2"
                  >
                    <test.icon className="w-4 h-4" />
                    <span>{test.label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Debug Console Tab */}
        <TabsContent value="console" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Terminal className="w-5 h-5" />
                  <span>Debug Console</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyLogs}
                    disabled={logs.length === 0}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Kopieren
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportLogs}
                    disabled={logs.length === 0}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exportieren
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearLogs}
                    disabled={logs.length === 0}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Löschen
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>Live-Debug-Ausgabe der Test-Ausführung</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-96 overflow-auto">
                {logs.length > 0 ? (
                  logs.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500">
                    Debug-Ausgabe erscheint hier nach Test-Ausführung...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Debug Tools Tab */}
        <TabsContent value="tools" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Debug Tools</CardTitle>
              <CardDescription>Zusätzliche Tools für Debugging und Fehlerbehebung</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    addLog('🔄 Lade Verbindungsstatus...');
                    runSingleTest('status');
                  }}
                  disabled={isRunning}
                >
                  <Database className="w-4 h-4 mr-2" />
                  Verbindung prüfen
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    addLog('🔐 Teste Authentifizierung...');
                    runSingleTest('auth');
                  }}
                  disabled={isRunning}
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Auth testen
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    addLog('👥 Lade Kunden-Konten...');
                    runSingleTest('customers');
                  }}
                  disabled={isRunning}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Konten laden
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    addLog('🎯 Teste Kampagnen-Zugriff...');
                    runSingleTest('campaigns');
                  }}
                  disabled={isRunning}
                >
                  <Target className="w-4 h-4 mr-2" />
                  Kampagnen testen
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    addLog('📊 Lade Performance-Metriken...');
                    runSingleTest('metrics');
                  }}
                  disabled={isRunning}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Metriken laden
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    addLog('🧪 Führe komplette Test-Suite aus...');
                    runTests('all');
                  }}
                  disabled={isRunning}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
                  Volltest
                </Button>
              </div>

              {/* Debug Information */}
              <div className="space-y-4">
                <h3 className="font-medium">System-Informationen</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 border rounded">
                    <div className="text-sm font-medium text-gray-600">Company ID</div>
                    <div className="font-mono text-sm">{companyId}</div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="text-sm font-medium text-gray-600">Test-Modus</div>
                    <div className="font-mono text-sm">{selectedTestMode}</div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="text-sm font-medium text-gray-600">Client Library</div>
                    <div className="font-mono text-sm">google-ads-api v17</div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="text-sm font-medium text-gray-600">Timestamp</div>
                    <div className="font-mono text-sm">{new Date().toISOString()}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
