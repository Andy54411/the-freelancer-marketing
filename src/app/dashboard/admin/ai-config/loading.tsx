import { FiLoader } from 'react-icons/fi';

export default function Loading() {
  return (
    <div className="flex justify-center items-center h-32">
      <FiLoader className="animate-spin text-2xl" />
      <span className="ml-2">Lade Konfiguration...</span>
    </div>
  );
}
