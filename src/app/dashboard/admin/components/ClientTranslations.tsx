'use client';

interface ClientTranslationsProps {
  children: (t: (key: string) => string) => React.ReactNode;
}

// Deutsche Übersetzungen für Admin-Dashboard
const translations: Record<string, string> = {
  'admin.welcome': 'Admin Dashboard',
  'admin.companies': 'Unternehmen',
  'admin.orders': 'Aufträge',
  'admin.messages': 'Nachrichten',
  'admin.support': 'Support-Tickets',
  'admin.stats': 'Statistiken',
  'admin.loading': 'Laden...',
  'admin.error': 'Fehler beim Laden',
};

export const ClientTranslations: React.FC<ClientTranslationsProps> = ({ children }) => {
  const t = (key: string) => {
    return translations[key] || key;
  };
  return <>{children(t)}</>;
};
