// z.B. unter src/app/dashboard/user/[uid]/components/Modal.tsx

'use client';

import React, { ReactNode } from 'react';
import { FiX } from 'react-icons/fi';

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
            className="fixed inset-0 z-50 flex items-center justify-center bg-transparent bg-opacity-50 backdrop-blur-sm"
            onClick={onClose}
        >
            {/* Der eigentliche Modal-Container: Weiße Karte mit Schatten und abgerundeten Ecken */}
            <div
                className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl m-4"
                onClick={handleContentClick}
            >
                {/* Header des Modals */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors"
                        aria-label="Modal schließen"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                {/* Der Inhaltsbereich, der von anderen Komponenten befüllt wird */}
                <div className="p-1">  {/* Padding wurde von 6 auf 1 reduziert */}
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;