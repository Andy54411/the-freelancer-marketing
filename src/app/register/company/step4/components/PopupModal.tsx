// /Users/andystaudinger/taskilo/src/app/register/company/step4/components/PopupModal.tsx
'use client';

import React, { useEffect, ReactNode } from 'react';
import { FiX, FiCheck } from 'react-icons/fi'; // FiCheck hinzugefügt für Schritt-Icons

interface PopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  steps: string[]; // Die Liste der Schritte
  children?: ReactNode; // Optional: falls Sie benutzerdefinierten Inhalt im Modal haben möchten
}

const PopupModal: React.FC<PopupModalProps> = ({ isOpen, onClose, steps }) => {
  // useEffect zur Steuerung des Body-Scrollens
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'; // Scrollen des Body deaktivieren
    } else {
      document.body.style.overflow = ''; // Scrollen des Body wieder aktivieren
    }

    // Cleanup-Funktion: Stellt sicher, dass overflow beim Unmounten zurückgesetzt wird
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]); // Abhängigkeit von isOpen

  if (!isOpen) return null;

  return (
    // Overlay für den Hintergrund des Modals (mit Weichzeichner)
    <div className="fixed inset-0 bg-trasparent bg-opacity-30 backdrop-blur-md flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-sm border border-gray-200 relative">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Registrierung abschließen</h2>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors duration-200"
          >
            <FiX className="text-2xl" />
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center">
              {/* Beispiel für Schritt-Indikator: Aktueller Schritt (hier 4) wäre hervorgehoben */}
              {index < 4 ? ( // Annahme: Schritt 4 ist der aktuelle, index 3
                <FiCheck className="text-green-500 text-xl mr-2" />
              ) : (
                <div className="text-gray-400 text-xl mr-2">●</div>
              )}
              <p className="text-base sm:text-lg text-gray-700">{`${index + 1}. ${step}`}</p>
            </div>
          ))}
        </div>
        <div className="flex justify-center mt-6">
          <button
            onClick={onClose}
            className="py-2 px-6 bg-teal-500 text-white font-semibold rounded-full hover:bg-teal-600 transition-colors duration-200"
          >
            Verstanden
          </button>
        </div>
      </div>
    </div>
  );
};

export default PopupModal;