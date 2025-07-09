// src/components/Modal.tsx
'use client';

import React, { ReactNode } from 'react';
import { X as FiX } from 'lucide-react';

interface ModalProps {
    onClose: () => void;
    children: ReactNode;
    title: string;
}

const Modal: React.FC<ModalProps> = ({ onClose, children, title }) => {
    // Verhindert, dass ein Klick im Modal das Modal schließt
    const handleContentClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    return (
        // Der Overlay: Füllt den ganzen Bildschirm, hat einen halb-transparenten
        // Hintergrund und den gewünschten "Blur"-Effekt.
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-transparent bg-opacity-50 backdrop-blur-sm p-4" // p-4 hinzugefügt für etwas Abstand zum Rand
            onClick={onClose}
        >
            {/* Der eigentliche Modal-Container: Weiße Karte mit Schatten und abgerundeten Ecken */}
            <div
                className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-xl flex flex-col max-h-[90vh]" // max-h-[90vh] hinzugefügt
                onClick={handleContentClick}
            >
                {/* Header des Modals */}
                <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 shrink-0"> {/* shrink-0 hinzugefügt */}
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 break-words">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
                        aria-label="Modal schließen"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                {/* Der Inhaltsbereich, der von anderen Komponenten befüllt wird */}
                <div className="p-4 md:p-6 flex-grow overflow-y-auto"> {/* overflow-y-auto und flex-grow hier */}
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
