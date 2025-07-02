import { db } from "@/firebase/server"; // Korrekt: Server-Instanz verwenden
import AiConfigForm from "./AiConfigForm";

type ChatbotConfig = {
    persona: string;
    context: string;
    faqs: any[];
    rules: string[];
};

async function getChatbotConfig(): Promise<ChatbotConfig> {
    try {
        const docRef = db.collection('chatbot_config').doc('knowledge_base');
        const configDoc = await docRef.get();

        if (!configDoc.exists) {
            // Fallback mit leeren Werten, falls das Dokument noch nicht existiert
            return { persona: '', context: '', faqs: [], rules: [] };
        }
        return configDoc.data() as ChatbotConfig;
    } catch (error) {
        console.error("Fehler beim Laden der Chatbot-Konfiguration:", error);
        // Im Fehlerfall leere Daten zurückgeben, um die Seite nicht abstürzen zu lassen
        return { persona: '', context: '', faqs: [], rules: [] };
    }
}

export default async function AiConfigPage() {
    const config = await getChatbotConfig();

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Gemini KI Konfiguration</h1>
            <p className="text-gray-600 mb-6">Bearbeite hier die Wissensdatenbank und die Verhaltensregeln für den Chatbot.</p>

            <AiConfigForm config={config} />
        </div>
    );
}