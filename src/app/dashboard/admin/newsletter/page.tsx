'use client';

import { useState, useEffect } from 'react';
import { Mail, Users, FileText, Send, Settings, Download, Upload, RefreshCw } from 'lucide-react';

interface Subscriber {
  timestamp: string;
  email: string;
  name: string;
  preferences: string[];
  status: string;
  source: string;
}

interface NewsletterTemplate {
  id: string;
  name: string;
  subject: string;
  variables: string[];
}

export default function NewsletterManager() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [templates, setTemplates] = useState<NewsletterTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'subscribers' | 'templates' | 'send' | 'settings'>(
    'subscribers'
  );

  // Newsletter-Form State
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customSubject, setCustomSubject] = useState('');
  const [templateVariables, setTemplateVariables] = useState<{ [key: string]: string }>({});
  const [customContent, setCustomContent] = useState('');
  const [useCustomContent, setUseCustomContent] = useState(false);

  useEffect(() => {
    // Authentifizierungsstatus aus localStorage laden
    const token = localStorage.getItem('google_workspace_access_token');
    const refresh = localStorage.getItem('google_workspace_refresh_token');

    if (token) {
      setAccessToken(token);
      setRefreshToken(refresh);
      setIsAuthenticated(true);
      loadTemplates();
      loadSubscribers();
    }
  }, []);

  const authenticateGoogleWorkspace = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/google-workspace');
      const data = await response.json();

      if (data.success) {
        window.open(data.authUrl, '_blank');
        // Nach der Authentifizierung müsste der Benutzer den Code manuell eingeben
        // In einer vollständigen Implementierung würde dies über ein Popup oder Callback funktionieren
      }
    } catch (error) {
      console.error('Authentifizierungsfehler:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthCode = async (code: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/google-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (data.success) {
        setAccessToken(data.accessToken);
        setRefreshToken(data.refreshToken);
        setIsAuthenticated(true);

        // Token in localStorage speichern
        localStorage.setItem('google_workspace_access_token', data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem('google_workspace_refresh_token', data.refreshToken);
        }

        loadTemplates();
        loadSubscribers();
      }
    } catch (error) {
      console.error('Token-Austausch Fehler:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSubscribers = async () => {
    if (!accessToken) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/newsletter/subscribers?accessToken=${accessToken}&refreshToken=${refreshToken || ''}`
      );
      const data = await response.json();

      if (data.success) {
        setSubscribers(data.subscribers);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Abonnenten:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/newsletter/send');
      const data = await response.json();

      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Templates:', error);
    }
  };

  const addSubscriber = async (email: string, name?: string) => {
    if (!accessToken) return;

    try {
      setLoading(true);
      const response = await fetch('/api/newsletter/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subscribe',
          email,
          name,
          accessToken,
          refreshToken,
        }),
      });

      const data = await response.json();

      if (data.success) {
        await loadSubscribers();
      }
    } catch (error) {
      console.error('Fehler beim Hinzufügen des Abonnenten:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendNewsletter = async () => {
    if (!accessToken || subscribers.length === 0) return;

    try {
      setLoading(true);

      const recipients = subscribers.filter(sub => sub.status === 'Aktiv').map(sub => sub.email);

      const payload: any = {
        accessToken,
        refreshToken,
        recipients,
        subject: customSubject,
      };

      if (useCustomContent) {
        payload.customContent = customContent;
      } else {
        payload.templateId = selectedTemplate;
        payload.variables = templateVariables;
      }

      const response = await fetch('/api/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        alert(`Newsletter erfolgreich an ${recipients.length} Empfänger gesendet!`);
        // Formular zurücksetzen
        setSelectedTemplate('');
        setCustomSubject('');
        setTemplateVariables({});
        setCustomContent('');
      } else {
        alert('Fehler beim Versenden des Newsletters: ' + data.error);
      }
    } catch (error) {
      console.error('Fehler beim Versenden des Newsletters:', error);
      alert('Fehler beim Versenden des Newsletters');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <Mail className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Google Workspace Newsletter-Manager
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Verbinden Sie sich mit Google Workspace, um Newsletter über Gmail zu versenden und
            Abonnenten in Google Sheets zu verwalten.
          </p>

          <button
            onClick={authenticateGoogleWorkspace}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin inline mr-2" />
            ) : (
              <Settings className="w-5 h-5 inline mr-2" />
            )}
            Mit Google Workspace verbinden
          </button>

          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              Nach der Authentifizierung erhalten Sie einen Code. Geben Sie diesen hier ein:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Authorization Code"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    const code = (e.target as HTMLInputElement).value;
                    if (code) handleAuthCode(code);
                  }
                }}
              />
              <button
                onClick={() => {
                  const input = document.querySelector(
                    'input[placeholder="Authorization Code"]'
                  ) as HTMLInputElement;
                  const code = input?.value;
                  if (code) handleAuthCode(code);
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Verbinden
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Newsletter-Manager</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Verwalten Sie Newsletter über Google Workspace
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'subscribers', label: 'Abonnenten', icon: Users },
              { id: 'templates', label: 'Templates', icon: FileText },
              { id: 'send', label: 'Newsletter senden', icon: Send },
              { id: 'settings', label: 'Einstellungen', icon: Settings },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`py-4 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Abonnenten Tab */}
          {activeTab === 'subscribers' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Newsletter-Abonnenten</h2>
                <div className="flex gap-2">
                  <button
                    onClick={loadSubscribers}
                    disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 inline mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Aktualisieren
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{subscribers.length}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Gesamt Abonnenten</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {subscribers.filter(s => s.status === 'Aktiv').length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Aktive Abonnenten</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600">
                    {subscribers.filter(s => s.source === 'Website').length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Von Website</div>
                </div>
              </div>

              {/* Abonnenten-Tabelle */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        E-Mail
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Quelle
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Angemeldet
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {subscribers.map((subscriber, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {subscriber.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {subscriber.name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              subscriber.status === 'Aktiv'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {subscriber.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {subscriber.source}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(subscriber.timestamp).toLocaleDateString('de-DE')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {subscribers.length === 0 && !loading && (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Noch keine Abonnenten vorhanden</p>
                </div>
              )}
            </div>
          )}

          {/* Newsletter senden Tab */}
          {activeTab === 'send' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Newsletter senden</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Content-Quelle
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={!useCustomContent}
                          onChange={() => setUseCustomContent(false)}
                          className="mr-2"
                        />
                        Template verwenden
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={useCustomContent}
                          onChange={() => setUseCustomContent(true)}
                          className="mr-2"
                        />
                        Eigener Inhalt
                      </label>
                    </div>
                  </div>

                  {!useCustomContent && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Template auswählen
                      </label>
                      <select
                        value={selectedTemplate}
                        onChange={e => setSelectedTemplate(e.target.value)}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg"
                      >
                        <option value="">Template wählen...</option>
                        {templates.map(template => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Betreff
                    </label>
                    <input
                      type="text"
                      value={customSubject}
                      onChange={e => setCustomSubject(e.target.value)}
                      placeholder="Newsletter-Betreff"
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                      Versand-Übersicht
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-200">
                      Empfänger: {subscribers.filter(s => s.status === 'Aktiv').length} aktive
                      Abonnenten
                    </p>
                  </div>
                </div>
              </div>

              {useCustomContent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    HTML-Inhalt
                  </label>
                  <textarea
                    value={customContent}
                    onChange={e => setCustomContent(e.target.value)}
                    rows={12}
                    placeholder="HTML-Inhalt des Newsletters..."
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg"
                  />
                </div>
              )}

              {selectedTemplate && !useCustomContent && (
                <div>
                  <h3 className="text-md font-medium mb-4">Template-Variablen</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates
                      .find(t => t.id === selectedTemplate)
                      ?.variables.map(variable => (
                        <div key={variable}>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {variable}
                          </label>
                          <input
                            type="text"
                            value={templateVariables[variable] || ''}
                            onChange={e =>
                              setTemplateVariables(prev => ({
                                ...prev,
                                [variable]: e.target.value,
                              }))
                            }
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                          />
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={sendNewsletter}
                  disabled={loading || subscribers.filter(s => s.status === 'Aktiv').length === 0}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? (
                    <RefreshCw className="w-5 h-5 animate-spin inline mr-2" />
                  ) : (
                    <Send className="w-5 h-5 inline mr-2" />
                  )}
                  Newsletter senden
                </button>
              </div>
            </div>
          )}

          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Newsletter-Templates</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {templates.map(template => (
                  <div
                    key={template.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                  >
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                      {template.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                      Betreff: {template.subject}
                    </p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {template.variables.map(variable => (
                        <span
                          key={variable}
                          className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded"
                        >
                          {variable}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Einstellungen Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Einstellungen</h2>

              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div>
                    <h3 className="font-medium text-red-900 dark:text-red-100">
                      Google Workspace-Verbindung trennen
                    </h3>
                    <p className="text-sm text-red-700 dark:text-red-200">
                      Trennt die Verbindung zu Ihrem Google Workspace-Account
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      localStorage.removeItem('google_workspace_access_token');
                      localStorage.removeItem('google_workspace_refresh_token');
                      setIsAuthenticated(false);
                      setAccessToken(null);
                      setRefreshToken(null);
                    }}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                  >
                    Trennen
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
