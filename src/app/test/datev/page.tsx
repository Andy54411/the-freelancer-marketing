'use client';

import { useState } from 'react';

interface ApiResult {
  name: string;
  status: 'loading' | 'success' | 'error';
  data?: any;
  error?: string;
  duration?: number;
}

export default function DatevTestPage() {
  const [companyId, setCompanyId] = useState('test');
  const [results, setResults] = useState<ApiResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const testApis = async () => {
    if (!companyId.trim()) {
      alert('Bitte Company ID eingeben');
      return;
    }

    setIsLoading(true);
    setResults([]);

    const endpoints = [
      { name: 'UserInfo API', url: `/api/datev/userinfo-test?companyId=${companyId}` },
      { name: 'Master Data API', url: `/api/datev/master-data?companyId=${companyId}` },
    ];

    const testResults: ApiResult[] = endpoints.map(api => ({
      name: api.name,
      status: 'loading',
    }));
    setResults([...testResults]);

    // Test alle APIs parallel
    const promises = endpoints.map(async (api, index) => {
      const startTime = Date.now();
      
      try {
        console.log(`🧪 [DATEV Test] Starting ${api.name}...`);
        
        const response = await fetch(api.url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          credentials: 'include', // Wichtig für HTTP-only cookies
        });

        const duration = Date.now() - startTime;
        const data = await response.json();

        testResults[index] = {
          name: api.name,
          status: response.ok ? 'success' : 'error',
          data: response.ok ? data : undefined,
          error: response.ok ? undefined : `${response.status} ${response.statusText}: ${JSON.stringify(data)}`,
          duration,
        };

        console.log(`${response.ok ? '✅' : '❌'} [DATEV Test] ${api.name} completed in ${duration}ms`);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        
        testResults[index] = {
          name: api.name,
          status: 'error',
          error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration,
        };

        console.error(`❌ [DATEV Test] ${api.name} failed:`, error);
      }

      // Update UI after each API completes
      setResults([...testResults]);
    });

    await Promise.allSettled(promises);
    setIsLoading(false);
  };

  const getStatusIcon = (status: ApiResult['status']) => {
    switch (status) {
      case 'loading': return '⏳';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  const getStatusColor = (status: ApiResult['status']) => {
    switch (status) {
      case 'loading': return 'text-yellow-600';
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          DATEV API Multi-Endpoint Test
        </h1>
        <p className="text-gray-600">
          Teste alle DATEV APIs gleichzeitig mit echten OAuth-Tokens
        </p>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg mb-6">
        <div className="flex items-center gap-4 mb-4">
          <label htmlFor="companyId" className="font-medium text-gray-700">
            Company ID:
          </label>
          <input
            id="companyId"
            type="text"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            placeholder="z.B. test, company123"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-[#14ad9f] focus:border-[#14ad9f]"
          />
          <button
            onClick={testApis}
            disabled={isLoading}
            className="px-6 py-2 bg-[#14ad9f] text-white rounded-md hover:bg-[#129488] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Testing...' : 'Test All APIs'}
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Test Ergebnisse:
          </h2>

          <div className="grid gap-6 lg:grid-cols-3">
            {results.map((result, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">
                    {getStatusIcon(result.status)}
                  </span>
                  <h3 className={`font-semibold ${getStatusColor(result.status)}`}>
                    {result.name}
                  </h3>
                  {result.duration && (
                    <span className="text-sm text-gray-500 ml-auto">
                      {result.duration}ms
                    </span>
                  )}
                </div>

                {result.status === 'loading' && (
                  <div className="text-gray-500">
                    Teste API-Endpoint...
                  </div>
                )}

                {result.status === 'success' && result.data && (
                  <div className="space-y-2">
                    <div className="text-sm text-green-600 font-medium">
                      ✅ Erfolgreich!
                    </div>
                    
                    <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
                      <h4 className="font-medium text-green-800 mb-2">Response:</h4>
                      <pre className="text-green-700 whitespace-pre-wrap overflow-x-auto max-h-32 text-xs">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {result.status === 'error' && (
                  <div className="space-y-2">
                    <div className="text-sm text-red-600 font-medium">
                      ❌ Fehler aufgetreten
                    </div>
                    
                    <div className="bg-red-50 border border-red-200 rounded p-3 text-sm">
                      <h4 className="font-medium text-red-800 mb-2">Error:</h4>
                      <pre className="text-red-700 whitespace-pre-wrap overflow-x-auto max-h-32 text-xs">
                        {result.error}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 mb-2">🔍 Was wird getestet:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li><strong>UserInfo Test API:</strong> OIDC-konforme /userinfo Endpoint (Referenz-Implementation)</li>
          <li><strong>UserInfo API:</strong> Liefert DATEV User-Informationen (funktioniert perfekt)</li>
          <li><strong>Master Data API:</strong> Multi-Endpoint Testing für Kundenstammdaten</li>
          <li><strong>Master Data API:</strong> Multi-Endpoint Testing für Master-Data-Clients</li>
        </ul>
      </div>

      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-medium text-yellow-800 mb-2">⚡ Alle APIs haben jetzt:</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>✅ <strong>X-Client-ID Header:</strong> 6111ad8e8cae82d1a805950f2ae4adc4</li>
          <li>✅ <strong>Korrekte Authorization:</strong> Bearer Token aus HTTP-only Cookie</li>
          <li>✅ <strong>User-Agent:</strong> Taskilo-DATEV-Integration/1.0</li>
          <li>✅ <strong>Accept Header:</strong> application/json</li>
        </ul>
      </div>
    </div>
  );
}
