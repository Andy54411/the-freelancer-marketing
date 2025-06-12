// src/components/Modal.tsx
import React, { FC, ReactNode, useEffect, useRef } from 'react';
import { FiX } from 'react-icons/fi';

interface ModalProps {
    children: ReactNode;
    onClose: () => void;
    title?: string;
}

const Modal: FC<ModalProps> = ({ children, onClose, title }) => {
    const modalRef = useRef<HTMLDivElement>(null);

    // Schließen bei Klick außerhalb des Modals
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    // Schließen bei ESC-Taste
    useEffect(() => {
        const handleEscapeKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscapeKey);
        return () => {
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div
                ref={modalRef}
                className="relative bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
                {/* Modal Header */}
                <div className="flex justify-between items-center p-5 border-b border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-800">
                        {title || 'Modal'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-800 p-2 rounded-full hover:bg-gray-100 transition-colors"
                        aria-label="Schließen"
                    >
                        <FiX size={24} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-5">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;