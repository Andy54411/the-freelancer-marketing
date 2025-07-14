'use client';

import { useLanguage } from '@/contexts/LanguageContext';

interface ClientTranslationsProps {
  children: (t: (key: string) => string) => React.ReactNode;
}

export const ClientTranslations: React.FC<ClientTranslationsProps> = ({ children }) => {
  const { t } = useLanguage();
  return <>{children(t)}</>;
};
