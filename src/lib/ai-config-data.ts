import { db } from '@/firebase/server';

export type AiConfig = {
  persona: string;
  context: string;
  faqs: any[];
  rules: string[];
  coreProcesses?: string[];
  moderationRules?: string[];
  moderationEnabled?: boolean;
  autoEscalation?: boolean;
  suspiciousWordsThreshold?: number;
};

/**
 * Fetches the AI configuration data directly from Firestore.
 * This is the server-side equivalent of the /api/ai-config route.
 */
export async function getAiConfigData(): Promise<AiConfig> {
  const docRef = db.collection('chatbot_config').doc('knowledge_base');
  const configDoc = await docRef.get();

  if (!configDoc.exists) {
    return { persona: '', context: '', faqs: [], rules: [], coreProcesses: [] };
  }

  return configDoc.data() as AiConfig;
}
