import { FiLoader } from 'react-icons/fi';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Loading() {
  const { t } = useLanguage();

  return (
    <div className="flex justify-center items-center h-32">
      <FiLoader className="animate-spin text-2xl" />
      <span className="ml-2">{t('status.loading')}</span>
    </div>
  );
}
