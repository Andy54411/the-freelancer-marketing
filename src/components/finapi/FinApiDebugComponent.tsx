'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface TestResult {
  success: boolean;
  status: string;
  [key: string]: any;
}

interface TestResults {
  tests: {
    credentials?: TestResult;
    banks?: TestResult;
    config?: TestResult;
  };
  [key: string]: any;
}

export default function FinApiDebugComponent() {
  const [testResults, setTestResults] = useState<TestResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runFinApiTest = async (testType: string = 'all') => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/finapi/test-suite?test=${testType}&credentialType=sandbox`
      );
      const data = await response.json();

      if (data.success) {
        setTestResults(data);
      } else {
        setError(data.error || 'Test failed');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status.includes('✅')) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status.includes('❌')) return <XCircle className="h-4 w-4 text-red-500" />;
    if (status.includes('🚧')) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return null;
  };

  const getStatusBadge = (status: string) => {
    if (status.includes('✅'))
      return (
        <Badge variant="default" className="bg-green-500">
          OK
        </Badge>
      );
    if (status.includes('❌')) return <Badge variant="destructive">FAILED</Badge>;
    if (status.includes('🚧')) return <Badge variant="secondary">PENDING</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🧪 finAPI SDK Service Test Suite
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => runFinApiTest('all')}
              disabled={isLoading}
              className="bg-[#14ad9f] hover:bg-[#129488]"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Alle Tests ausführen
            </Button>
            <Button
              onClick={() => runFinApiTest('credentials')}
              disabled={isLoading}
              variant="outline"
            >
              Credentials Test
            </Button>
            <Button onClick={() => runFinApiTest('banks')} disabled={isLoading} variant="outline">
              Banks API Test
            </Button>
            <Button onClick={() => runFinApiTest('config')} disabled={isLoading} variant="outline">
              Config Test
            </Button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700">
                <XCircle className="h-4 w-4" />
                <span className="font-medium">Test Fehler:</span>
              </div>
              <p className="mt-1 text-red-600">{error}</p>
            </div>
          )}

          {testResults && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-2">Test-Übersicht</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Timestamp:</strong> {testResults.timestamp}
                  </div>
                  <div>
                    <strong>Test Type:</strong> {testResults.testType}
                  </div>
                  <div>
                    <strong>Credential Type:</strong> {testResults.credentialType}
                  </div>
                </div>
              </div>

              {testResults.tests.credentials && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      {getStatusIcon(testResults.tests.credentials.status)}
                      Credentials Test
                      {getStatusBadge(testResults.tests.credentials.status)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>Success:</strong>{' '}
                        {testResults.tests.credentials.success ? 'Ja' : 'Nein'}
                      </div>
                      {testResults.tests.credentials.token && (
                        <div>
                          <strong>Token:</strong> {testResults.tests.credentials.token}
                        </div>
                      )}
                      {testResults.tests.credentials.error && (
                        <div className="text-red-600">
                          <strong>Error:</strong> {testResults.tests.credentials.error}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {testResults.tests.banks && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      {getStatusIcon(testResults.tests.banks.status)}
                      Banks API Test
                      {getStatusBadge(testResults.tests.banks.status)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>Success:</strong> {testResults.tests.banks.success ? 'Ja' : 'Nein'}
                      </div>
                      {testResults.tests.banks.banksFound && (
                        <div>
                          <strong>Banks Found:</strong> {testResults.tests.banks.banksFound}
                        </div>
                      )}
                      {testResults.tests.banks.sampleBanks && (
                        <div>
                          <strong>Sample Banks:</strong>
                          <ul className="mt-1 space-y-1">
                            {testResults.tests.banks.sampleBanks.map((bank: any, index: number) => (
                              <li key={index} className="ml-4">
                                • {bank.name} (BLZ: {bank.blz})
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {testResults.tests.banks.error && (
                        <div className="text-red-600">
                          <strong>Error:</strong> {testResults.tests.banks.error}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {testResults.tests.config && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      {getStatusIcon(testResults.tests.config.status)}
                      Config Test
                      {getStatusBadge(testResults.tests.config.status)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>SDK Service Type:</strong> {testResults.tests.config.sdkServiceType}
                      </div>
                      <div>
                        <strong>Factory Function:</strong>{' '}
                        {testResults.tests.config.factoryFunction}
                      </div>
                      <div>
                        <strong>Environment:</strong> {testResults.tests.config.environment}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">🚧 finAPI Integration Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>
                <strong>finAPI SDK Service v1.0.3:</strong> Erfolgreich migriert
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>
                <strong>Banks API:</strong> Voll funktionsfähig
              </span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span>
                <strong>User Authentication:</strong> Noch nicht implementiert
              </span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span>
                <strong>Setup Integration:</strong> Wartet auf User Auth System
              </span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Nächste Schritte:</h4>
            <ol className="text-blue-700 text-sm space-y-1">
              <li>1. User Authentication System implementieren</li>
              <li>2. finAPI User Creation über getOrCreateUser() aktivieren</li>
              <li>3. User Token Management hinzufügen</li>
              <li>4. WebForm 2.0 Integration für Bank-Verbindungen</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
