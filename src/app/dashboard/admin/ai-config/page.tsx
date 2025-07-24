'use client';

import { useState, useEffect, Suspense } from 'react';
import { FiLoader, FiSave } from 'react-icons/fi';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface AiConfig {
  persona: string;
  context: string;
  faqs: any[];
  rules: string[];
  coreProcesses: string[];
  moderationRules?: string[];
  moderationEnabled?: boolean;
  autoEscalation?: boolean;
  suspiciousWordsThreshold?: number;
}

function AiConfigContent() {
  const [config, setConfig] = useState<AiConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/ai-config');
      if (!response.ok) {
        throw new Error(`Fehler beim Laden der Konfiguration: ${response.status}`);
      }
      const data = await response.json();
      setConfig(data);
    } catch (err) {
      console.error('Fehler beim Laden der AI-Konfiguration:', err);
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData(e.currentTarget);
      const persona = formData.get('persona') as string;
      const context = formData.get('context') as string;
      const faqsString = formData.get('faqs') as string;
      const rulesString = formData.get('rules') as string;
      const coreProcessesString = formData.get('coreProcesses') as string;
      const moderationRulesString = formData.get('moderationRules') as string;
      const moderationEnabled = formData.get('moderationEnabled') === 'on';
      const autoEscalation = formData.get('autoEscalation') === 'on';
      const suspiciousWordsThreshold =
        parseInt(formData.get('suspiciousWordsThreshold') as string) || 3;

      let faqs;
      try {
        faqs = JSON.parse(faqsString);
        if (!Array.isArray(faqs)) throw new Error('FAQs müssen ein gültiges JSON-Array sein.');
      } catch (e) {
        setError('Fehler: Die FAQs sind kein gültiges JSON-Format.');
        return;
      }

      const rules = rulesString
        .split('\n')
        .map(rule => rule.trim())
        .filter(Boolean);
      const coreProcesses = coreProcessesString
        .split('\n')
        .map(process => process.trim())
        .filter(Boolean);
      const moderationRules = moderationRulesString
        .split('\n')
        .map(rule => rule.trim())
        .filter(Boolean);

      const response = await fetch('/api/ai-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          persona,
          context,
          faqs,
          rules,
          coreProcesses,
          moderationRules,
          moderationEnabled,
          autoEscalation,
          suspiciousWordsThreshold,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Ein unbekannter Fehler ist aufgetreten.';
      setError(`Fehler beim Speichern: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FiLoader className="animate-spin text-2xl mr-2" />
        <span>Lade Konfiguration...</span>
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <strong>Fehler:</strong> {error}
        <button onClick={fetchConfig} className="ml-4 underline hover:no-underline">
          Erneut versuchen
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Gemini KI Konfiguration</h1>
        <p className="text-gray-600 mb-6">
          Bearbeite hier die Wissensdatenbank, Verhaltensregeln und Chat-Moderation für den Chatbot.
        </p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Fehler:</strong> {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <strong>Erfolg:</strong> Konfiguration erfolgreich gespeichert!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
        <div>
          <label htmlFor="persona" className="block text-sm font-medium text-gray-700 mb-2">
            Persona
          </label>
          <input
            type="text"
            name="persona"
            id="persona"
            defaultValue={config?.persona || ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Du bist Taskilo-GPT, ein freundlicher und kompetenter Support-Assistent..."
          />
          <p className="mt-1 text-xs text-gray-500">
            Beschreibe, wer der Chatbot ist und wie er sich verhalten soll.
          </p>
        </div>

        <div>
          <label htmlFor="context" className="block text-sm font-medium text-gray-700 mb-2">
            Kontext
          </label>
          <textarea
            name="context"
            id="context"
            rows={4}
            defaultValue={config?.context || ''}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Taskilo ist eine Plattform für..."
          />
          <p className="mt-1 text-xs text-gray-500">
            Erkläre den Kontext und die Hauptfunktionen von Taskilo.
          </p>
        </div>

        <div>
          <label htmlFor="faqs" className="block text-sm font-medium text-gray-700 mb-2">
            FAQs (JSON-Format)
          </label>
          <textarea
            name="faqs"
            id="faqs"
            rows={8}
            defaultValue={JSON.stringify(config?.faqs || [], null, 2)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
            placeholder='[{"question": "Wie funktioniert Taskilo?", "answer": "Taskilo verbindet..."}]'
          />
          <p className="mt-1 text-xs text-gray-500">
            Häufig gestellte Fragen als JSON-Array mit &quot;question&quot; und &quot;answer&quot;
            Feldern.
          </p>
        </div>

        <div>
          <label htmlFor="rules" className="block text-sm font-medium text-gray-700 mb-2">
            Regeln (eine pro Zeile)
          </label>
          <textarea
            name="rules"
            id="rules"
            rows={6}
            defaultValue={(config?.rules || []).join('\n')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Sei immer höflich und hilfsbereit&#10;Antworte auf Deutsch&#10;Keine persönlichen Daten preisgeben"
          />
          <p className="mt-1 text-xs text-gray-500">
            Verhaltensregeln für den Chatbot, eine Regel pro Zeile.
          </p>
        </div>

        <div>
          <label htmlFor="coreProcesses" className="block text-sm font-medium text-gray-700 mb-2">
            Kernprozesse (eine pro Zeile)
          </label>
          <textarea
            name="coreProcesses"
            id="coreProcesses"
            rows={4}
            defaultValue={(config?.coreProcesses || []).join('\n')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Auftrag erstellen&#10;Anbieter finden&#10;Zahlung abwickeln"
          />
          <p className="mt-1 text-xs text-gray-500">
            Wichtige Geschäftsprozesse, die der Chatbot erklären kann.
          </p>
        </div>

        {/* Moderation Configuration Section */}
        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">🛡️ KI-Chat-Moderation</h2>
          <p className="text-gray-600 mb-4">
            Konfiguriere die automatische Inhalts-Moderation für alle Chat-Nachrichten.
          </p>

          <div className="space-y-4">
            {/* Moderation Enable/Disable */}
            <div className="flex items-center">
              <input
                type="checkbox"
                name="moderationEnabled"
                id="moderationEnabled"
                defaultChecked={config?.moderationEnabled ?? false}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="moderationEnabled" className="ml-2 block text-sm text-gray-900">
                KI-Moderation aktivieren
              </label>
            </div>

            {/* Auto Escalation */}
            <div className="flex items-center">
              <input
                type="checkbox"
                name="autoEscalation"
                id="autoEscalation"
                defaultChecked={config?.autoEscalation ?? true}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="autoEscalation" className="ml-2 block text-sm text-gray-900">
                Automatische Eskalation an Support bei kritischen Verstößen
              </label>
            </div>

            {/* Suspicious Words Threshold */}
            <div>
              <label
                htmlFor="suspiciousWordsThreshold"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Verdächtige Wörter Schwellenwert
              </label>
              <input
                type="number"
                name="suspiciousWordsThreshold"
                id="suspiciousWordsThreshold"
                min="1"
                max="10"
                defaultValue={config?.suspiciousWordsThreshold || 3}
                className="w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Anzahl verdächtiger Begriffe, ab der eine Nachricht automatisch überprüft wird.
              </p>
            </div>

            {/* Moderation Rules */}
            <div>
              <label
                htmlFor="moderationRules"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Moderations-Regeln (eine pro Zeile)
              </label>
              <textarea
                name="moderationRules"
                id="moderationRules"
                rows={8}
                defaultValue={(
                  config?.moderationRules || [
                    'Keine Weitergabe von persönlichen Kontaktdaten (E-Mail, Telefon, Adresse)',
                    'Keine beleidigenden oder diskriminierenden Inhalte',
                    'Keine Spam oder wiederholte unerwünschte Nachrichten',
                    'Keine illegalen Angebote oder Aktivitäten',
                    'Keine Umgehung der Plattform-Gebühren',
                    'Respektvolle und professionelle Kommunikation',
                    'Keine falschen oder irreführenden Informationen',
                    'Keine sexuellen oder expliziten Inhalte',
                  ]
                ).join('\n')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Regel 1&#10;Regel 2&#10;..."
              />
              <p className="mt-1 text-xs text-gray-500">
                Spezifische Regeln für die KI-Moderation. Jede Regel in einer neuen Zeile.
              </p>
            </div>

            {/* Moderation Status Info */}
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Moderation Status: {config?.moderationEnabled ? '✅ Aktiv' : '❌ Inaktiv'}
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      Die KI-Moderation analysiert alle Chat-Nachrichten in Echtzeit und flaggt
                      Verstöße gegen die Plattform-Regeln. Bei kritischen Verstößen werden
                      Nachrichten automatisch blockiert und an das Support-Team weitergeleitet.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <FiLoader className="animate-spin mr-2" />
                Speichern...
              </>
            ) : (
              <>
                <FiSave className="mr-2" />
                Konfiguration Speichern
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AiConfigPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-32">
          <FiLoader className="animate-spin text-2xl" />
          <span className="ml-2">Lade Konfiguration...</span>
        </div>
      }
    >
      <AiConfigContent />
    </Suspense>
  );
}
