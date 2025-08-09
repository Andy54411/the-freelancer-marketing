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
  const [authDebugging, setAuthDebugging] = useState(false);
  const [authDebugResult, setAuthDebugResult] = useState<any>(null);

  // Verfügbare Test-Modi
  const testModes = [
    { value: 'all', label: 'Alle Tests', description: 'Vollständige Test-Suite' },
    { value: 'status', label: 'Service Status', description: 'Grundlegende Service-Checks' },
    { value: 'auth', label: 'Authentifizierung', description: 'OAuth & Token Tests' },
    { value: 'customers', label: 'Kunden-Zugriff', description: 'Account & Customer Tests' },
    { value: 'campaigns', label: 'Kampagnen', description: 'Campaign Management Tests' },
    { value: 'metrics', label: 'Metriken', description: 'Performance Data Tests' },
  ];

  // LIVE AUTH DEBUGGER - SOFORT SEHEN WAS SCHIEFGEHT!
  const debugAuthFlow = async () => {
    setAuthDebugging(true);
    setAuthDebugResult(null);
    addLog('🔥 STARTE LIVE AUTH DEBUGGING...');

    try {
      // 1. Test Auth Route
      addLog('📡 1. Teste Auth Route...');
      const authResponse = await fetch(`/api/google-ads/auth?companyId=${companyId}`);
      const authData = await authResponse.json();

      addLog(`   ✅ Auth Response: ${JSON.stringify(authData, null, 2)}`);

      // 2. Test Status Route
      addLog('📡 2. Teste Status Route...');
      const statusResponse = await fetch(`/api/google-ads/status?companyId=${companyId}`);
      const statusData = await statusResponse.json();

      addLog(`   ✅ Status Response: ${JSON.stringify(statusData, null, 2)}`);

      // 3. Test Real Customers
      addLog('📡 3. Teste Customer Access...');
      const realTestResponse = await fetch(
        `/api/google-ads/real-test?companyId=${companyId}&test=customers`
      );
      const realTestData = await realTestResponse.json();

      addLog(`   📊 Real Test Response: ${JSON.stringify(realTestData, null, 2)}`);

      // 4. Analysiere das Problem
      addLog('🔍 4. PROBLEMANALYSE:');
      if (realTestData.configValidation?.isExpired) {
        addLog('   🔴 PROBLEM GEFUNDEN: TOKEN IST ABGELAUFEN!');
        addLog(`   ⏰ Token expired at: ${realTestData.configValidation.tokenExpiry}`);
        addLog('   💡 LÖSUNG: Neue OAuth-Autorisierung erforderlich');
        addLog(`   🔗 AUTH URL: ${authData.authUrl}`);
      } else if (!realTestData.configValidation?.hasRefreshToken) {
        addLog('   🔴 PROBLEM GEFUNDEN: KEIN REFRESH TOKEN!');
        addLog('   💡 LÖSUNG: Erstmalige OAuth-Autorisierung erforderlich');
      } else {
        addLog('   ❓ UNBEKANNTES PROBLEM - Siehe Details oben');
      }

      setAuthDebugResult({
        auth: authData,
        status: statusData,
        realTest: realTestData,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      addLog(`🔥 AUTH DEBUG FEHLER: ${error.message}`);
      addLog(`📋 Stack: ${error.stack}`);
    } finally {
      setAuthDebugging(false);
    }
  };

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
        addLog(`═══════════════════════════════════════════════════════════════════`);
        addLog(`📋 DETAILLIERTE FEHLERANALYSE:`);
        addLog(`═══════════════════════════════════════════════════════════════════`);

        // Zeige EXTREM detaillierte Fehler-Infos für jeden fehlgeschlagenen Test
        Object.entries(results.results || {}).forEach(([testName, result]: [string, any]) => {
          if (!result.success) {
            addLog(`🔴 FEHLER IN TEST: ${testName.toUpperCase()}`);
            addLog(`─────────────────────────────────────────────────────────────────`);

            // Hauptfehler
            const errorDetails = result.error || 'Unbekannter Fehler';
            addLog(`� FEHLERMELDUNG: ${errorDetails}`);

            // HTTP Status wenn vorhanden
            if (result.data?.statusCode) {
              addLog(`📊 HTTP STATUS CODE: ${result.data.statusCode}`);
            }

            // Response Headers wenn vorhanden
            if (result.data?.headers) {
              addLog(`📧 RESPONSE HEADERS: ${JSON.stringify(result.data.headers, null, 2)}`);
            }

            // Vollständige API Response
            if (result.data?.response) {
              addLog(`📨 VOLLSTÄNDIGE API RESPONSE:`);
              addLog(JSON.stringify(result.data.response, null, 2));
            }

            // Request Details wenn vorhanden
            if (result.data?.request) {
              addLog(`📤 REQUEST DETAILS:`);
              addLog(JSON.stringify(result.data.request, null, 2));
            }

            // Stack Trace wenn vorhanden
            if (result.data?.stack) {
              addLog(`🔍 STACK TRACE:`);
              addLog(result.data.stack);
            }

            // Zusätzliche Debugging-Infos
            if (result.data?.debug) {
              addLog(`🐛 DEBUG INFORMATIONEN:`);
              addLog(JSON.stringify(result.data.debug, null, 2));
            }

            // OAuth/Auth spezifische Fehler
            if (testName.includes('auth') || testName.includes('Auth')) {
              addLog(`🔐 AUTH-SPEZIFISCHE DIAGNOSE:`);
              addLog(`   - Prüfe Google Ads OAuth Tokens in Firebase`);
              addLog(`   - Validiere Client ID und Client Secret`);
              addLog(`   - Überprüfe Redirect URIs in Google Console`);
              addLog(`   - Teste Refresh Token Validity`);
            }

            // Customer Access spezifische Fehler
            if (testName.includes('customer') || testName.includes('Customer')) {
              addLog(`👥 CUSTOMER-ACCESS DIAGNOSE:`);
              addLog(`   - Prüfe Google Ads Account Verknüpfung`);
              addLog(`   - Validiere Customer ID Format`);
              addLog(`   - Überprüfe Account Permissions`);
              addLog(`   - Teste Manager Account Zugriff`);
            }

            addLog(`═══════════════════════════════════════════════════════════════════`);
          }
        });

        // Zeige allgemeine Fehler-Summary
        if (results.summary?.errors && results.summary.errors.length > 0) {
          addLog(`📋 ZUSÄTZLICHE SYSTEM-FEHLER:`);
          results.summary.errors.forEach((error: string, index: number) => {
            addLog(`   ${index + 1}. ⚠️ ${error}`);
          });
        }

        // Zeige Lösungsvorschläge
        addLog(`💡 LÖSUNGSVORSCHLÄGE:`);
        addLog(`   1. Prüfe Google Ads OAuth Status in Settings Tab`);
        addLog(`   2. Erneuere Tokens über Re-Authentication`);
        addLog(`   3. Validiere Environment Variables`);
        addLog(`   4. Teste mit neuer OAuth-Verbindung`);
        addLog(`═══════════════════════════════════════════════════════════════════`);
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

                {/* LIVE AUTH DEBUGGER BUTTON */}
                <Button
                  onClick={debugAuthFlow}
                  disabled={authDebugging}
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700"
                >
                  {authDebugging ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 mr-2" />
                  )}
                  {authDebugging ? 'Auth Debug läuft...' : 'AUTH PROBLEM DEBUGGEN!'}
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

          {/* AUTH DEBUG RESULTS - SOFORTIGE PROBLEMANALYSE */}
          {authDebugResult && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-red-800">
                  <AlertTriangle className="w-5 h-5" />
                  <span>LIVE AUTH DEBUG ERGEBNISSE</span>
                </CardTitle>
                <CardDescription className="text-red-700">
                  Detaillierte Analyse des Authentifizierungsproblems
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Token Status */}
                {authDebugResult.realTest?.configValidation && (
                  <div className="bg-white p-4 rounded border">
                    <h4 className="font-bold text-red-800 mb-2">🔐 TOKEN STATUS:</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Refresh Token:</span>
                        <span
                          className={
                            authDebugResult.realTest.configValidation.hasRefreshToken
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                        >
                          {authDebugResult.realTest.configValidation.hasRefreshToken
                            ? '✅ Vorhanden'
                            : '❌ Fehlt'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Access Token:</span>
                        <span
                          className={
                            authDebugResult.realTest.configValidation.hasAccessToken
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                        >
                          {authDebugResult.realTest.configValidation.hasAccessToken
                            ? '✅ Vorhanden'
                            : '❌ Fehlt'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Token Expiry:</span>
                        <span className="font-mono text-xs">
                          {authDebugResult.realTest.configValidation.tokenExpiry}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Token Status:</span>
                        <span
                          className={
                            !authDebugResult.realTest.configValidation.isExpired
                              ? 'text-green-600'
                              : 'text-red-600 font-bold'
                          }
                        >
                          {!authDebugResult.realTest.configValidation.isExpired
                            ? '✅ Gültig'
                            : '🔴 ABGELAUFEN!'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Problem & Lösung */}
                <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
                  <h4 className="font-bold text-yellow-800 mb-2">💡 PROBLEM & LÖSUNG:</h4>
                  {authDebugResult.realTest?.configValidation?.isExpired ? (
                    <div className="space-y-2">
                      <p className="text-yellow-800 font-medium">
                        🔴 PROBLEM: OAuth Token ist abgelaufen!
                      </p>
                      <p className="text-yellow-700 text-sm">
                        Der Refresh Token ist expired und kann keine neuen Access Tokens generieren.
                      </p>
                      <div className="mt-3">
                        <p className="text-yellow-800 font-medium">
                          ✅ LÖSUNG: Neue OAuth-Autorisierung
                        </p>
                        {authDebugResult.auth?.authUrl && (
                          <div className="mt-2 p-3 bg-white rounded border">
                            <p className="text-sm text-gray-700 mb-2">
                              Klicke auf diesen Link für neue Autorisierung:
                            </p>
                            <a
                              href={authDebugResult.auth.authUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline text-xs break-all"
                            >
                              {authDebugResult.auth.authUrl}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-yellow-800">
                      Analyse läuft... Prüfe Debug Console für Details.
                    </p>
                  )}
                </div>

                {/* Raw Debug Data */}
                <details className="bg-white p-4 rounded border">
                  <summary className="font-medium text-gray-800 cursor-pointer">
                    🔍 Vollständige Debug-Daten anzeigen
                  </summary>
                  <pre className="mt-2 text-xs bg-gray-50 p-3 rounded overflow-auto max-h-96">
                    {JSON.stringify(authDebugResult, null, 2)}
                  </pre>
                </details>
              </CardContent>
            </Card>
          )}

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

                      {/* Error Details - VIEL detaillierter */}
                      {result.error && (
                        <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded">
                          <h4 className="font-bold text-red-800 mb-2 flex items-center">
                            <XCircle className="w-4 h-4 mr-2" />
                            DETAILLIERTE FEHLERANALYSE:
                          </h4>

                          {/* Hauptfehler */}
                          <div className="mb-3">
                            <p className="text-sm font-medium text-red-700 mb-1">
                              💥 Fehlermeldung:
                            </p>
                            <p className="text-sm text-red-700 bg-red-100 p-2 rounded font-mono">
                              {typeof result.error === 'string'
                                ? result.error
                                : JSON.stringify(result.error)}
                            </p>
                          </div>

                          {/* HTTP Status wenn vorhanden */}
                          {result.data?.statusCode && (
                            <div className="mb-3">
                              <p className="text-sm font-medium text-red-700 mb-1">
                                📊 HTTP Status Code:
                              </p>
                              <p className="text-sm text-red-700 bg-red-100 p-2 rounded font-mono">
                                {result.data.statusCode}
                              </p>
                            </div>
                          )}

                          {/* Response Headers */}
                          {result.data?.headers && (
                            <div className="mb-3">
                              <p className="text-sm font-medium text-red-700 mb-1">
                                📧 Response Headers:
                              </p>
                              <pre className="text-xs text-red-700 bg-red-100 p-2 rounded font-mono overflow-auto max-h-32">
                                {JSON.stringify(result.data.headers, null, 2)}
                              </pre>
                            </div>
                          )}

                          {/* Vollständige API Response */}
                          {result.data?.response && (
                            <div className="mb-3">
                              <p className="text-sm font-medium text-red-700 mb-1">
                                📨 Vollständige API Response:
                              </p>
                              <pre className="text-xs text-red-700 bg-red-100 p-2 rounded font-mono overflow-auto max-h-40">
                                {JSON.stringify(result.data.response, null, 2)}
                              </pre>
                            </div>
                          )}

                          {/* Request Details */}
                          {result.data?.request && (
                            <div className="mb-3">
                              <p className="text-sm font-medium text-red-700 mb-1">
                                📤 Request Details:
                              </p>
                              <pre className="text-xs text-red-700 bg-red-100 p-2 rounded font-mono overflow-auto max-h-32">
                                {JSON.stringify(result.data.request, null, 2)}
                              </pre>
                            </div>
                          )}

                          {/* Stack Trace */}
                          {result.data?.stack && (
                            <div className="mb-3">
                              <p className="text-sm font-medium text-red-700 mb-1">
                                🔍 Stack Trace:
                              </p>
                              <pre className="text-xs text-red-700 bg-red-100 p-2 rounded font-mono overflow-auto max-h-32">
                                {result.data.stack}
                              </pre>
                            </div>
                          )}

                          {/* Debug Info */}
                          {result.data?.debug && (
                            <div className="mb-3">
                              <p className="text-sm font-medium text-red-700 mb-1">
                                🐛 Debug Informationen:
                              </p>
                              <pre className="text-xs text-red-700 bg-red-100 p-2 rounded font-mono overflow-auto max-h-32">
                                {JSON.stringify(result.data.debug, null, 2)}
                              </pre>
                            </div>
                          )}

                          {/* Test-spezifische Lösungsvorschläge */}
                          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                            <p className="text-sm font-medium text-yellow-800 mb-2">
                              💡 Lösungsvorschläge für {testName}:
                            </p>
                            <ul className="text-sm text-yellow-700 space-y-1">
                              {testName.includes('auth') && (
                                <>
                                  <li>• Prüfe Google Ads OAuth Tokens in Firebase</li>
                                  <li>• Validiere Client ID und Client Secret in Environment</li>
                                  <li>• Überprüfe Redirect URIs in Google Console</li>
                                  <li>• Teste Refresh Token Validity</li>
                                </>
                              )}
                              {testName.includes('customer') && (
                                <>
                                  <li>• Prüfe Google Ads Account Verknüpfung</li>
                                  <li>• Validiere Customer ID Format</li>
                                  <li>• Überprüfe Account Permissions</li>
                                  <li>• Teste Manager Account Zugriff</li>
                                </>
                              )}
                              {testName.includes('campaign') && (
                                <>
                                  <li>• Überprüfe Campaign Access Rights</li>
                                  <li>• Validiere Campaign IDs</li>
                                  <li>• Teste Campaign Query Syntax</li>
                                  <li>• Prüfe Account Status</li>
                                </>
                              )}
                              <li>• Erneuere OAuth-Verbindung über Settings</li>
                              <li>• Prüfe API Rate Limits</li>
                              <li>• Kontaktiere Support mit diesen Details</li>
                            </ul>
                          </div>
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
