'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { updateConfig, type FormState } from './actions';

type AiConfigFormProps = {
    config: {
        persona: string;
        context: string;
        faqs: any[];
        rules: string[];
    };
};

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
    const [state, formAction] = useActionState(updateConfig, initialState);

    const faqsString = JSON.stringify(config.faqs || [], null, 2);
    const rulesString = (config.rules || []).join('\n');

    return (
        <form action={formAction} className="space-y-6 bg-white p-6 rounded-lg shadow">
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

            {state.message && (
                <p className={`text-sm font-bold ${state.isError ? 'text-red-600' : 'text-green-600'}`}>{state.message}</p>
            )}

            <SubmitButton />
        </form>
    );
}