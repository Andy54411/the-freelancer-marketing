'use client';

import { usePathname } from 'next/navigation';
import Chatbot from '@/components/Chatbot';

export default function ConditionalChatbot() {
  const pathname = usePathname();

  // Liste der Pfade, wo Chatbot NICHT angezeigt werden soll
  const hiddenChatbotPaths = [
    '/login',
    '/register',
    '/dashboard',
    '/admin',
    '/staff',
    '/onboarding',
  ];

  // Prüfe ob aktueller Pfad Chatbot verstecken soll
  const shouldHideChatbot = hiddenChatbotPaths.some(path => pathname?.startsWith(path));

  // Zeige Chatbot nur wenn er nicht versteckt werden soll
  if (shouldHideChatbot) {
    return null;
  }

  return <Chatbot />;
}
