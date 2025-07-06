'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { updateConfig, type FormState } from './actions'; // Assuming actions.ts is correct
import type { AiConfig } from '@/lib/ai-config-data'; // Import the new type

type AiConfigFormProps = { config: AiConfig };

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
            {pending ? 'Speichern...' : 'Konfiguration Speichern'}
        </button>
    );
}

export default function AiConfigForm({ config }: AiConfigFormProps) {
    const initialState: FormState = { message: '', isError: false };
    const [state, setState] = useState<FormState>(initialState);

    const faqsString = JSON.stringify(config.faqs || [], null, 2);
    const rulesString = (config.rules || []).join('\n');
    const coreProcessesString = (config.coreProcesses || []).join('\n');

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const result = await updateConfig(state, formData);
        setState(result);
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
            <div>
                <label htmlFor="persona" className="block text-sm font-medium text-gray-700">Persona</label>
                <input type="text" name="persona" id="persona" defaultValue={config.persona} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                <p className="mt-2 text-xs text-gray-500">Beschreibe, wer der Chatbot ist (z.B. "Du bist Tasko-GPT, ein freundlicher und kompetenter Support-Assistent...").</p>
            </div>

            <div>
                <label htmlFor="context" className="block text-sm font-medium text-gray-700">Kontext</label>
                <textarea name="context" id="context" rows={4} defaultValue={config.context} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                <p className="mt-2 text-xs text-gray-500">Grundlegende Informationen über Tasko, die der Bot kennen muss.</p>
            </div>

            <div>
                <label htmlFor="faqs" className="block text-sm font-medium text-gray-700">Häufig gestellte Fragen (FAQs) - im JSON-Format</label>
                <textarea name="faqs" id="faqs" rows={10} defaultValue={faqsString} className="font-mono mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                <p className="mt-2 text-xs text-gray-500">Füge FAQs als Array von Objekten hinzu, z.B. <code>{'[{"q": "Frage?", "a": "Antwort."}]'}</code>.</p>
            </div>

            <div>
                <label htmlFor="rules" className="block text-sm font-medium text-gray-700">Regeln</label>
                <textarea name="rules" id="rules" rows={5} defaultValue={rulesString} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                <p className="mt-2 text-xs text-gray-500">Eine Regel pro Zeile. Diese Regeln definieren das Verhalten des Bots (z.B. "Antworte immer auf Deutsch.").</p>
            </div>

            <div>
                <label htmlFor="coreProcesses" className="block text-sm font-medium text-gray-700">Kernprozesse (Handlungsanweisungen)</label>
                <textarea name="coreProcesses" id="coreProcesses" rows={8} defaultValue={coreProcessesString} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                <p className="mt-2 text-xs text-gray-500">Eine Anweisung pro Zeile. Beschreibe, wie der Bot bei spezifischen Anfragen (z.B. Stornierung) reagieren soll.</p>
            </div>

            <SubmitButton />
            {state.isError && <p className="text-red-600 mt-2">{state.message}</p>}
            {!state.isError && state.message && <p className="text-green-600 mt-2">{state.message}</p>}
        </form>
    );
}