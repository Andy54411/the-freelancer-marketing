// src/app/dashboard/user/[uid]/components/CreateOrderModal.tsx
'use client';

import React, { useState } from 'react';
import { FiLoader, FiCheckCircle } from 'react-icons/fi';
import { User } from 'firebase/auth';

// FEHLER BEHOBEN: Interfaces aus der zentralen Typendatei importieren
import { SavedPaymentMethod, SavedAddress, UserProfileData, OrderListItem } from '@/types/dashboard'; // <-- HIER IST DIE WICHTIGE ÄNDERUNG

interface CreateOrderModalProps {
  onClose: () => void;
  currentUser: User;
  userProfile: UserProfileData;
}

const CreateOrderModal: React.FC<CreateOrderModalProps> = ({ onClose, currentUser, userProfile }) => {
  // ... (restlicher Code bleibt gleich)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Beispiel: Nur eine Dummy-Verzögerung
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSuccess(true);
      setError(null); // Fehler bei Erfolg löschen

    } catch (err: any) {
      console.error("Fehler beim Erstellen des Schnell-Auftrags:", err);
      setError(err.message || "Ein unbekannter Fehler ist aufgetreten.");
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Ihre Auftragsdetails</h3>

      <form onSubmit={handleFormSubmit} className="space-y-4">
        <p className="text-gray-600">Formularfelder kommen hier hin...</p>
        <p className="text-gray-600">Verwenden Sie currentUser und userProfile für gespeicherte Daten.</p>

        {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
        {success && <p className="text-green-500 text-sm mt-4 flex items-center"><FiCheckCircle className="mr-2" /> Auftrag erfolgreich erstellt!</p>}

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition"
            disabled={loading}
          >
            Abbrechen
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-[#14ad9f] text-white rounded-md hover:bg-[#129a8f] transition disabled:opacity-50"
            disabled={loading || success}
          >
            {loading ? <FiLoader className="animate-spin mr-2" /> : 'Auftrag erstellen'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateOrderModal;