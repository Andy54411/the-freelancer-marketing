// Test-Seite für Gemini API Integration
// Nur für Entwicklung und Testing

'use client';

import React, { useState } from 'react';
import { FiRefreshCw, FiCheckCircle, FiAlertCircle, FiExternalLink } from 'react-icons/fi';

export default function GeminiTestPage() {
  const [blogContent, setBlogContent] = useState<any>(null);
  const [syncData, setSyncData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'sync'>('content');

  const fetchBlogContent = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/gemini/blog-content');
      const data = await response.json();
      setBlogContent(data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const fetchSyncData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/gemini/sync-blog');
      const data = await response.json();
      setSyncData(data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <FiExternalLink className="mr-2 text-[#14ad9f]" />
                Gemini API Integration Test
              </h1>
              <p className="text-gray-600 mt-2">
                Test-Interface für die Gemini Support-AI Integration mit Taskilo Blog-Inhalten
              </p>
            </div>
            <div className="text-sm text-gray-500">
              <p>API Endpunkte:</p>
              <p>• /api/gemini/blog-content</p>
              <p>• /api/gemini/sync-blog</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('content')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'content'
                    ? 'border-[#14ad9f] text-[#14ad9f]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Blog Content API
              </button>
              <button
                onClick={() => setActiveTab('sync')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'sync'
                    ? 'border-[#14ad9f] text-[#14ad9f]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Sync Blog API
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Blog Content Tab */}
            {activeTab === 'content' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Blog Content API</h2>
                    <p className="text-gray-600">Strukturierte Taskilo-Informationen für Gemini</p>
                  </div>
                  <button
                    onClick={fetchBlogContent}
                    disabled={loading}
                    className="flex items-center px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-taskilo-hover disabled:opacity-50 transition-colors"
                  >
                    <FiRefreshCw className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Lädt...' : 'API Testen'}
                  </button>
                </div>

                {blogContent && (
                  <div className="space-y-4">
                    {/* Status */}
                    <div className="flex items-center space-x-2">
                      {blogContent.success ? (
                        <FiCheckCircle className="text-green-500" />
                      ) : (
                        <FiAlertCircle className="text-red-500" />
                      )}
                      <span className={blogContent.success ? 'text-green-700' : 'text-red-700'}>
                        {blogContent.success ? 'API erfolgreich' : 'API Fehler'}
                      </span>
                      <span className="text-gray-500 text-sm">
                        • {blogContent.content?.lastUpdated || 'Kein Timestamp'}
                      </span>
                    </div>

                    {/* Content Preview */}
                    {blogContent.content && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-medium text-gray-900 mb-2">Inhalt Vorschau:</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p>
                              <strong>Platform:</strong> {blogContent.content.platform?.name}
                            </p>
                            <p>
                              <strong>Typ:</strong> {blogContent.content.platform?.type}
                            </p>
                            <p>
                              <strong>Services:</strong>{' '}
                              {Object.keys(blogContent.content.serviceCategories || {}).length}{' '}
                              Kategorien
                            </p>
                          </div>
                          <div>
                            <p>
                              <strong>Zahlungen:</strong>{' '}
                              {blogContent.content.paymentSystem?.provider}
                            </p>
                            <p>
                              <strong>Support:</strong>{' '}
                              {blogContent.content.support?.email?.address}
                            </p>
                            <p>
                              <strong>Links:</strong>{' '}
                              {Object.keys(blogContent.content.importantLinks || {}).length}{' '}
                              verfügbar
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Raw JSON */}
                    <details className="border border-gray-200 rounded-lg">
                      <summary className="p-3 bg-gray-100 cursor-pointer font-medium">
                        Raw JSON Response anzeigen
                      </summary>
                      <pre className="p-4 text-xs overflow-auto bg-gray-50 max-h-96">
                        {JSON.stringify(blogContent, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            )}

            {/* Sync Blog Tab */}
            {activeTab === 'sync' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Sync Blog API</h2>
                    <p className="text-gray-600">Automatische Synchronisation der Live-Website</p>
                  </div>
                  <button
                    onClick={fetchSyncData}
                    disabled={loading}
                    className="flex items-center px-4 py-2 bg-[#14ad9f] text-white rounded-lg hover:bg-taskilo-hover disabled:opacity-50 transition-colors"
                  >
                    <FiRefreshCw className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Synchronisiert...' : 'Sync Testen'}
                  </button>
                </div>

                {syncData && (
                  <div className="space-y-4">
                    {/* Status */}
                    <div className="flex items-center space-x-2">
                      {syncData.success ? (
                        <FiCheckCircle className="text-green-500" />
                      ) : (
                        <FiAlertCircle className="text-red-500" />
                      )}
                      <span className={syncData.success ? 'text-green-700' : 'text-red-700'}>
                        {syncData.success ? 'Synchronisation erfolgreich' : 'Sync Fehler'}
                      </span>
                      <span className="text-gray-500 text-sm">
                        • {syncData.knowledgeBase?.lastSync || 'Kein Timestamp'}
                      </span>
                    </div>

                    {/* Sync Results */}
                    {syncData.knowledgeBase?.syncInfo && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-medium text-gray-900 mb-2">Synchronisation Details:</h3>
                        <div className="space-y-2 text-sm">
                          {Object.entries(syncData.knowledgeBase.syncInfo.results).map(
                            ([url, result]: [string, any]) => (
                              <div key={url} className="flex items-center justify-between">
                                <span className="truncate">{url}</span>
                                <span
                                  className={`px-2 py-1 rounded text-xs ${
                                    result.status === 'success'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {result.status}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {/* Business Model Info */}
                    {syncData.knowledgeBase?.businessModel && (
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h3 className="font-medium text-blue-900 mb-2">
                          Business Model Erkennung:
                        </h3>
                        <p className="text-blue-800 text-sm">
                          <strong>Typ:</strong> {syncData.knowledgeBase.businessModel.type}
                          <br />
                          <strong>B2C:</strong>{' '}
                          {syncData.knowledgeBase.businessModel.targetMarkets.b2c}
                          <br />
                          <strong>B2B:</strong>{' '}
                          {syncData.knowledgeBase.businessModel.targetMarkets.b2b}
                        </p>
                      </div>
                    )}

                    {/* Raw JSON */}
                    <details className="border border-gray-200 rounded-lg">
                      <summary className="p-3 bg-gray-100 cursor-pointer font-medium">
                        Raw Sync Response anzeigen
                      </summary>
                      <pre className="p-4 text-xs overflow-auto bg-gray-50 max-h-96">
                        {JSON.stringify(syncData, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <h3 className="font-medium text-gray-900 mb-2">Gemini Integration Anweisungen:</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>
              • <strong>API URL:</strong> https://taskilo.de/api/gemini/blog-content
            </p>
            <p>
              • <strong>Methode:</strong> GET Request
            </p>
            <p>
              • <strong>Update Frequenz:</strong> Alle 6 Stunden oder bei Content-Updates
            </p>
            <p>
              • <strong>Verwendung:</strong> Basierend auf diesen strukturierten Daten kann Gemini
              präzise Support-Antworten geben
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
