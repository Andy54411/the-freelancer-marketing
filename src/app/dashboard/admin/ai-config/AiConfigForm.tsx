'use client';

import { useState } from 'react';
import type { AiConfig } from '@/lib/ai-config-data'; // Import the new type

type AiConfigFormProps = { config: AiConfig };

type FormState = {
    message: string;
    isError: boolean;
};

function SubmitButton({ isSubmitting }: { isSubmitting: boolean }) {
    return (
        <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
            {isSubmitting ? 'Speichern...' : 'Konfiguration Speichern'}
        </button>
    );
}

export default function AiConfigForm({ config }: AiConfigFormProps) {
    const initialState: FormState = { message: '', isError: false };
    const [state, setState] = useState<FormState>(initialState);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const faqsString = JSON.stringify(config.faqs || [], null, 2);
    const rulesString = (config.rules || []).join('\n');
    const coreProcessesString = (config.coreProcesses || []).join('\n');

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsSubmitting(true);
        try {
            const formData = new FormData(event.currentTarget);

            // Daten aus dem Formular extrahieren
            const persona = formData.get('persona') as string;
            const context = formData.get('context') as string;
            const faqsString = formData.get('faqs') as string;
            const rulesString = formData.get('rules') as string;
            const coreProcessesString = formData.get('coreProcesses') as string;

            let faqs;
            try {
                faqs = JSON.parse(faqsString);
                if (!Array.isArray(faqs)) throw new Error("FAQs müssen ein gültiges JSON-Array sein.");
            } catch (e) {
                setState({ message: 'Fehler: Die FAQs sind kein gültiges JSON-Format.', isError: true });
                return;
            }

            const rules = rulesString.split('\n').map(rule => rule.trim()).filter(Boolean);
            const coreProcesses = coreProcessesString.split('\n').map(process => process.trim()).filter(Boolean);

            // API-Aufruf
            const response = await fetch('/api/ai-config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ persona, context, faqs, rules, coreProcesses })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            setState({ message: "Konfiguration erfolgreich gespeichert!", isError: false });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten.';
            setState({ message: `Fehler beim Speichern: ${errorMessage}`, isError: true });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
            <div>
                <label htmlFor="persona" className="block text-sm font-medium text-gray-700">Persona</label>
                <input type="text" name="persona" id="persona" defaultValue={config.persona} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                <p className="mt-2 text-xs text-gray-500">Beschreibe, wer der Chatbot ist (z.B. &ldquo;Du bist Taskilo-GPT, ein freundlicher und kompetenter Support-Assistent...&rdquo;).</p>
            </div>

            <div>
                <label htmlFor="context" className="block text-sm font-medium text-gray-700">Kontext</label>
                <textarea name="context" id="context" rows={4} defaultValue={config.context} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                <p className="mt-2 text-xs text-gray-500">Grundlegende Informationen über Taskilo, die der Bot kennen muss.</p>
            </div>

            <div>
                <label htmlFor="faqs" className="block text-sm font-medium text-gray-700">Häufig gestellte Fragen (FAQs) - im JSON-Format</label>
                <textarea name="faqs" id="faqs" rows={10} defaultValue={faqsString} className="font-mono mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                <p className="mt-2 text-xs text-gray-500">Füge FAQs als Array von Objekten hinzu, z.B. <code>{'[{"q": "Frage?", "a": "Antwort."}]'}</code>.</p>
            </div>

            <div>
                <label htmlFor="rules" className="block text-sm font-medium text-gray-700">Regeln</label>
                <textarea name="rules" id="rules" rows={5} defaultValue={rulesString} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                <p className="mt-2 text-xs text-gray-500">Eine Regel pro Zeile. Diese Regeln definieren das Verhalten des Bots (z.B. &ldquo;Antworte immer auf Deutsch.&rdquo;).</p>
            </div>

            <div>
                <label htmlFor="coreProcesses" className="block text-sm font-medium text-gray-700">Kernprozesse (Handlungsanweisungen)</label>
                <textarea name="coreProcesses" id="coreProcesses" rows={8} defaultValue={coreProcessesString} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                <p className="mt-2 text-xs text-gray-500">Eine Anweisung pro Zeile. Beschreibe, wie der Bot bei spezifischen Anfragen (z.B. Stornierung) reagieren soll.</p>
            </div>

            <SubmitButton isSubmitting={isSubmitting} />
            {state.isError && <p className="text-red-600 mt-2">{state.message}</p>}
            {!state.isError && state.message && <p className="text-green-600 mt-2">{state.message}</p>}
        </form>
    );
}