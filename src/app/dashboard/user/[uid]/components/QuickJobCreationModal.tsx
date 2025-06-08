// src/app/dashboard/user/[uid]/components/QuickJobCreationModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { FiX, FiArrowLeft } from 'react-icons/fi';
import { useRegistration } from '@/components/Registration-Context';

import { CategorySelectionStep } from './CategorySelectionStep'; // Oder './QuickJobCreationSteps/CategorySelectionStep' je nach tatsächlichem Pfad

interface QuickJobCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialCategory?: string;
    initialSubcategory?: string;
}

type JobCreationStep =
    | 'categorySelection'
    | 'addressInput'
    | 'dateTimeAndDescription'
    | 'anbieterMatching'
    | 'confirmation'
    | 'payment';

export function QuickJobCreationModal({ isOpen, onClose, initialCategory, initialSubcategory }: QuickJobCreationModalProps) {
    const [currentStep, setCurrentStep] = useState<JobCreationStep>('categorySelection');
    const registration = useRegistration();

    useEffect(() => {
        if (!isOpen) {
            // Nur zurücksetzen, wenn der aktuelle Schritt NICHT der Startschritt ist
            // Dies vermeidet einen unnötigen Render, wenn currentStep bereits 'categorySelection' ist
            if (currentStep !== 'categorySelection') {
                setCurrentStep('categorySelection');
            }

            // Prüfe, ob der Kontext Daten enthält, bevor ein Reset ausgelöst wird
            // Dadurch werden unnötige Updates verhindert, wenn der Kontext bereits im Initialzustand ist
            if (registration.selectedCategory || registration.description || registration.jobPostalCode) { // Füge hier weitere wichtige Felder hinzu
                registration.resetRegistrationData();
            }
        } else {
            // Wenn das Modal geöffnet wird und initialCategory/Subcategory gesetzt sind
            if (initialCategory && initialSubcategory && currentStep === 'categorySelection') {
                // Überprüfe, ob der Kontext bereits diese Werte hat, um unnötige Updates zu vermeiden
                if (registration.selectedCategory !== initialCategory || registration.selectedSubcategory !== initialSubcategory) {
                    registration.setSelectedCategory(initialCategory);
                    registration.setSelectedSubcategory(initialSubcategory);
                }
                // Springe nur zum nächsten Schritt, wenn diese Werte neu gesetzt oder bereits übereinstimmen
                // und der aktuelle Schritt noch der initiale ist
                if (registration.selectedCategory === initialCategory && registration.selectedSubcategory === initialSubcategory) {
                    setCurrentStep('addressInput'); // Beispiel: Springe direkt zur Adresseingabe
                }
            }
        }
    }, [isOpen, registration, currentStep, initialCategory, initialSubcategory]); // Füge initialCategory/Subcategory zu Abhängigkeiten hinzu

    if (!isOpen) return null;

    const handleNextStep = () => {
        switch (currentStep) {
            case 'categorySelection':
                setCurrentStep('addressInput');
                break;
            case 'addressInput':
                setCurrentStep('dateTimeAndDescription');
                break;
            case 'dateTimeAndDescription':
                setCurrentStep('anbieterMatching');
                break;
            case 'anbieterMatching':
                setCurrentStep('confirmation');
                break;
            case 'confirmation':
                setCurrentStep('payment');
                break;
            case 'payment':
                onClose();
                break;
            default:
                onClose();
        }
    };

    const handlePreviousStep = () => {
        switch (currentStep) {
            case 'addressInput':
                setCurrentStep('categorySelection');
                break;
            case 'dateTimeAndDescription':
                setCurrentStep('addressInput');
                break;
            case 'anbieterMatching':
                setCurrentStep('dateTimeAndDescription');
                break;
            case 'confirmation':
                setCurrentStep('anbieterMatching');
                break;
            case 'payment':
                setCurrentStep('confirmation');
                break;
            default:
                onClose();
        }
    };

    const getStepTitle = (step: JobCreationStep) => {
        switch (step) {
            case 'categorySelection': return '1. Service auswählen';
            case 'addressInput': return '2. Adresse eingeben';
            case 'dateTimeAndDescription': return '3. Datum & Details';
            case 'anbieterMatching': return '4. Anbieter finden';
            case 'confirmation': return '5. Auftrag prüfen';
            case 'payment': return '6. Zahlung abschließen';
            default: return 'Neuer Auftrag';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden relative flex flex-col">
                {/* Modal Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center">
                        {currentStep !== 'categorySelection' && (
                            <button
                                onClick={handlePreviousStep}
                                className="mr-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                                aria-label="Zurück zum vorherigen Schritt"
                            >
                                <FiArrowLeft className="text-2xl" />
                            </button>
                        )}
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{getStepTitle(currentStep)}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        aria-label="Modal schließen"
                    >
                        <FiX className="text-3xl" />
                    </button>
                </div>

                {/* Modal Body - Hier wird der aktuelle Schritt gerendert */}
                <div className="p-6 flex-grow overflow-y-auto">
                    {currentStep === 'categorySelection' && (
                        <CategorySelectionStep onNext={handleNextStep} />
                    )}
                    {currentStep === 'addressInput' && (
                        <div>
                            <h3 className="text-xl font-semibold mb-3">Adresse eingeben</h3>
                            <p>Hier kommt die Adress-Autovervollständigung.</p>
                            <button onClick={handleNextStep} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">Weiter</button>
                        </div>
                    )}
                    {currentStep === 'dateTimeAndDescription' && (
                        <div>
                            <h3 className="text-xl font-semibold mb-3">Datum, Uhrzeit & Beschreibung</h3>
                            <p>Hier kommen die Datumsauswahl und das Beschreibungsfeld.</p>
                            <button onClick={handleNextStep} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">Weiter</button>
                        </div>
                    )}
                    {currentStep === 'anbieterMatching' && (
                        <div>
                            <h3 className="text-xl font-semibold mb-3">Anbieter finden</h3>
                            <p>Hier kommt die Logik zur Anzeige und Auswahl von Anbietern.</p>
                            <button onClick={handleNextStep} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">Weiter</button>
                        </div>
                    )}
                    {currentStep === 'confirmation' && (
                        <div>
                            <h3 className="text-xl font-semibold mb-3">Auftrag prüfen</h3>
                            <p>Hier kommt die Zusammenfassung des Auftrags.</p>
                            <button onClick={handleNextStep} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">Zur Zahlung</button>
                        </div>
                    )}
                    {currentStep === 'payment' && (
                        <div>
                            <h3 className="text-xl font-semibold mb-3">Zahlung abschließen</h3>
                            <p>Hier kommt das Stripe Checkout Formular rein.</p>
                            {/* Nach erfolgreicher Zahlung Modal schließen */}
                            <button onClick={onClose} className="mt-4 px-4 py-2 bg-green-500 text-white rounded">Zahlung erfolgreich!</button>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}