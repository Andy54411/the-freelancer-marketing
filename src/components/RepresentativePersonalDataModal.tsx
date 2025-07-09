// /Users/andystaudinger/Tasko/src/components/RepresentativePersonalDataModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { X as FiX } from 'lucide-react';
import { useRegistration } from '@/contexts/Registration-Context'; // Pfad anpassen

interface RepresentativePersonalDataModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: () => void; // Callback, wenn das Modal erfolgreich abgeschickt wird
}

const countryOptions = [
    { value: "DE", label: "Deutschland" },
    { value: "AT", label: "Österreich" },
    { value: "CH", label: "Schweiz" },
];

const RepresentativePersonalDataModal: React.FC<RepresentativePersonalDataModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
}) => {
    const {
        firstName, lastName, email, phoneNumber, dateOfBirth, // Aus Step 1
        personalStreet, setPersonalStreet,
        personalHouseNumber, setPersonalHouseNumber,
        personalPostalCode, setPersonalPostalCode,
        personalCity, setPersonalCity,
        personalCountry, setPersonalCountry,
        companyStreet, companyHouseNumber, companyPostalCode, companyCity, companyCountry,

        // Aus dem Context für die erweiterte Logik holen
        isManagingDirectorOwner, // Boolean aus Step 1
        legalForm,               // String aus Step 3

        // Setter für den "alleinigen Inhaber"-Fall
        setOwnershipPercentage,

        // NEUE Felder und Setter für granulare Rollen, wenn isManagingDirectorOwner false ist
        isActualDirector, setIsActualDirector,
        isActualOwner, setIsActualOwner,
        actualOwnershipPercentage, setActualOwnershipPercentage,
        isActualExecutive, setIsActualExecutive,
        actualRepresentativeTitle, setActualRepresentativeTitle,

    } = useRegistration();

    // Lokale States für Adressfelder (bestehend)
    const [localStreet, setLocalStreet] = useState(personalStreet || '');
    const [localHouseNumber, setLocalHouseNumber] = useState(personalHouseNumber || '');
    const [localPostalCode, setLocalPostalCode] = useState(personalPostalCode || '');
    const [localCity, setLocalCity] = useState(personalCity || '');
    const [localCountryCode, setLocalCountryCode] = useState(personalCountry || 'DE');
    const [formError, setFormError] = useState<string | null>(null);

    // << NEU: Lokale States für granulare Rollen >>
    const [localIsActualDirector, setLocalIsActualDirector] = useState(isActualDirector ?? false);
    const [localIsActualOwner, setLocalIsActualOwner] = useState(isActualOwner ?? false);
    const [localActualOwnershipPercentage, setLocalActualOwnershipPercentage] = useState(actualOwnershipPercentage?.toString() || '');
    const [localIsActualExecutive, setLocalIsActualExecutive] = useState(isActualExecutive ?? false);
    const [localActualRepresentativeTitle, setLocalActualRepresentativeTitle] = useState(actualRepresentativeTitle || 'Gesetzlicher Vertreter');

    const [showOwnershipInfo, setShowOwnershipInfo] = useState(false); // Für den 100%-Hinweis

    useEffect(() => {
        if (isOpen) {
            // Adressfelder initialisieren (bestehend)
            setLocalStreet(personalStreet || '');
            setLocalHouseNumber(personalHouseNumber || '');
            setLocalPostalCode(personalPostalCode || '');
            setLocalCity(personalCity || '');
            setLocalCountryCode(personalCountry || 'DE');
            setFormError(null);

            const currentLegalFormLower = legalForm?.toLowerCase() || "";
            const isRelevantCompanyType = currentLegalFormLower.includes("gmbh") ||
                currentLegalFormLower.includes("ug") ||
                currentLegalFormLower.includes("ag");

            if (isManagingDirectorOwner && isRelevantCompanyType) {
                setShowOwnershipInfo(true); // Zeige den 100%-Hinweis
                // Setze granulare Rollen zurück/auf Standard, da "alleiniger Inhaber" gewählt wurde
                setLocalIsActualDirector(true); // Annahme: alleiniger GF ist auch Direktor
                setLocalIsActualOwner(true);    // Annahme: alleiniger Inhaber ist auch Owner
                setLocalActualOwnershipPercentage('100');
                setLocalIsActualExecutive(true); // Annahme: alleiniger GF ist auch Executive
                setLocalActualRepresentativeTitle('Geschäftsführender Gesellschafter');
            } else {
                setShowOwnershipInfo(false);
                // Initialisiere granulare Rollen aus dem Context, falls "alleiniger Inhaber" NICHT gewählt wurde
                setLocalIsActualDirector(isActualDirector ?? false);
                setLocalIsActualOwner(isActualOwner ?? false);
                setLocalActualOwnershipPercentage(actualOwnershipPercentage?.toString() || '');
                setLocalIsActualExecutive(isActualExecutive ?? false);
                setLocalActualRepresentativeTitle(actualRepresentativeTitle || 'Gesetzlicher Vertreter');
            }
        }
    }, [
        isOpen, personalStreet, personalHouseNumber, personalPostalCode, personalCity, personalCountry,
        isManagingDirectorOwner, legalForm,
        isActualDirector, isActualOwner, actualOwnershipPercentage, isActualExecutive, actualRepresentativeTitle // Dependencies für granulare Rollen
    ]);

    const handleUseCompanyAddress = () => {
        setLocalStreet(companyStreet || '');
        setLocalHouseNumber(companyHouseNumber || '');
        setLocalPostalCode(companyPostalCode || '');
        setLocalCity(companyCity || '');
        setLocalCountryCode(companyCountry || 'DE');
    };

    const handleSubmit = () => {
        // Adressvalidierung (bestehend)
        if (!localStreet.trim() || !localPostalCode.trim() || !localCity.trim() || !localCountryCode.trim()) {
            setFormError("Bitte füllen Sie alle Adressfelder des Geschäftsführers aus.");
            return;
        }
        if (localCountryCode.length !== 2) {
            setFormError("Ländercode muss 2-stellig sein (z.B. DE).");
            return;
        }

        // << NEU: Validierung für granulare Rollen, wenn isManagingDirectorOwner false ist >>
        if (!isManagingDirectorOwner) {
            if (localIsActualOwner) {
                const percentageNum = parseInt(localActualOwnershipPercentage, 10);
                if (isNaN(percentageNum) || percentageNum <= 0 || percentageNum > 100) {
                    setFormError("Bitte geben Sie einen gültigen Eigentumsanteil (1-100) an oder deaktivieren Sie 'Ist Eigentümer'.");
                    return;
                }
            }
            if (!localActualRepresentativeTitle.trim()) {
                setFormError("Bitte geben Sie einen Titel/eine Position für den Vertreter an.");
                return;
            }
        }

        setFormError(null);

        // Adressdaten im Context speichern (bestehend)
        setPersonalStreet(localStreet.trim());
        setPersonalHouseNumber(localHouseNumber.trim());
        setPersonalPostalCode(localPostalCode.trim());
        setPersonalCity(localCity.trim());
        setPersonalCountry(localCountryCode.trim().toUpperCase());

        // << NEU: Rollendaten im Context speichern >>
        const currentLegalFormLower = legalForm?.toLowerCase() || "";
        const isRelevantCompanyType = currentLegalFormLower.includes("gmbh") ||
            currentLegalFormLower.includes("ug") ||
            currentLegalFormLower.includes("ag");

        if (isManagingDirectorOwner && isRelevantCompanyType) {
            // Fall: "Alleiniger Geschäftsführer und Inhaber" für GmbH/UG/AG
            if (setOwnershipPercentage) setOwnershipPercentage(100);
            // Setze auch die granularen Rollen entsprechend (oder resette sie)
            if (setIsActualDirector) setIsActualDirector(true); // Annahme
            if (setIsActualOwner) setIsActualOwner(true);       // Annahme
            if (setActualOwnershipPercentage) setActualOwnershipPercentage(100);
            if (setIsActualExecutive) setIsActualExecutive(true); // Annahme
            if (setActualRepresentativeTitle) setActualRepresentativeTitle('Geschäftsführender Gesellschafter');
        } else if (!isManagingDirectorOwner) {
            // Fall: "Alleiniger Geschäftsführer und Inhaber" NICHT angehakt,
            // also granulare Rollen aus dem Modal verwenden.
            if (setIsActualDirector) setIsActualDirector(localIsActualDirector);
            if (setIsActualOwner) setIsActualOwner(localIsActualOwner);
            if (setActualOwnershipPercentage) {
                const percentageNum = parseInt(localActualOwnershipPercentage, 10);
                setActualOwnershipPercentage(localIsActualOwner && !isNaN(percentageNum) ? percentageNum : undefined);
            }
            if (setIsActualExecutive) setIsActualExecutive(localIsActualExecutive);
            if (setActualRepresentativeTitle) setActualRepresentativeTitle(localActualRepresentativeTitle.trim());

            // Sicherstellen, dass der 'globale' ownershipPercentage (für alleinigen Inhaber) nicht gesetzt ist
            if (setOwnershipPercentage) setOwnershipPercentage(undefined);
        } else {
            // Fall: isManagingDirectorOwner ist true, aber keine GmbH/UG/AG (oder Context-Setter fehlen)
            // Hier könnten die granularen Rollen auch auf Standardwerte/false gesetzt werden.
            if (setOwnershipPercentage) setOwnershipPercentage(undefined); // Kein spezifischer Prozentsatz für diesen Fall
            if (setIsActualDirector) setIsActualDirector(isManagingDirectorOwner ?? false);
            if (setIsActualOwner) setIsActualOwner(isManagingDirectorOwner ?? false);
            if (setActualOwnershipPercentage) setActualOwnershipPercentage(undefined);
            if (setIsActualExecutive) setIsActualExecutive(isManagingDirectorOwner ?? false);
            if (setActualRepresentativeTitle) setActualRepresentativeTitle(isManagingDirectorOwner ? 'Geschäftsführer und Inhaber' : 'Gesetzlicher Vertreter');
        }

        onSubmit();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[100] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl md:text-2xl font-semibold text-gray-800 dark:text-gray-100">
                        Persönliche Daten des Vertreters
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1 rounded-full">
                        <FiX size={24} />
                    </button>
                </div>

                {/* Bestehende Info-Box */}
                <div className="space-y-3 mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Folgende Daten wurden bereits erfasst:</p>
                    <p><strong>Name:</strong> {firstName} {lastName}</p>
                    <p><strong>E-Mail:</strong> {email}</p>
                    <p><strong>Telefon:</strong> {phoneNumber || 'N/A'}</p>
                    <p><strong>Geburtsdatum:</strong> {dateOfBirth || 'N/A (Bitte in Step 1 erfassen)'}</p>
                    {showOwnershipInfo && (
                        <p className="text-sm text-teal-700 dark:text-teal-400 mt-2">
                            <strong>Hinweis:</strong> Da Sie als alleiniger Geschäftsführer und Inhaber einer Kapitalgesellschaft (GmbH/UG/AG) agieren, werden Ihre Rollen entsprechend gesetzt und Ihr Eigentumsanteil auf 100%.
                        </p>
                    )}
                </div>

                {/* Adressfelder (bestehend) */}
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">Bitte vervollständigen Sie die Privatadresse:</p>
                <button
                    type="button"
                    onClick={handleUseCompanyAddress}
                    className="mb-4 text-sm text-[#14ad9f] hover:underline"
                >
                    Firmenadresse als Privatadresse verwenden
                </button>
                <div className="space-y-3">
                    {/* ... deine bestehenden Adressfelder ... */}
                    <div>
                        <label htmlFor="repPersonalStreet" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Straße*</label>
                        <input type="text" id="repPersonalStreet" value={localStreet} onChange={(e) => setLocalStreet(e.target.value)} required
                            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:text-white dark:border-gray-600" />
                    </div>
                    <div>
                        <label htmlFor="repPersonalHouseNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Hausnummer</label>
                        <input type="text" id="repPersonalHouseNumber" value={localHouseNumber} onChange={(e) => setLocalHouseNumber(e.target.value)}
                            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:text-white dark:border-gray-600" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="repPersonalPostalCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300">PLZ*</label>
                            <input type="text" id="repPersonalPostalCode" value={localPostalCode} onChange={(e) => setLocalPostalCode(e.target.value)} required
                                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:text-white dark:border-gray-600" />
                        </div>
                        <div>
                            <label htmlFor="repPersonalCity" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Stadt*</label>
                            <input type="text" id="repPersonalCity" value={localCity} onChange={(e) => setLocalCity(e.target.value)} required
                                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:text-white dark:border-gray-600" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="repPersonalCountry" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Land (ISO-Code)*</label>
                        <select id="repPersonalCountry" value={localCountryCode} onChange={(e) => setLocalCountryCode(e.target.value)} required
                            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:text-white dark:border-gray-600 bg-white">
                            {countryOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                </div>

                {/* << NEU: Bedingte Eingabefelder für granulare Rollen >> */}
                {!isManagingDirectorOwner && (
                    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-3">
                            Rollen dieser Person im Unternehmen:
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label htmlFor="actualTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Position / Titel dieser Person im Unternehmen*
                                </label>
                                <input
                                    type="text"
                                    id="actualTitle"
                                    value={localActualRepresentativeTitle}
                                    onChange={(e) => setLocalActualRepresentativeTitle(e.target.value)}
                                    required
                                    placeholder="z.B. Geschäftsführer, Prokurist"
                                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:text-white dark:border-gray-600" />
                            </div>
                            <label className="flex items-center">
                                <input type="checkbox" checked={localIsActualDirector}
                                    onChange={(e) => setLocalIsActualDirector(e.target.checked)}
                                    className="mr-2 h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500" />
                                <span className="text-sm text-gray-700 dark:text-gray-300">Ist offizieller Direktor / Geschäftsführer?</span>
                            </label>
                            <label className="flex items-center">
                                <input type="checkbox" checked={localIsActualExecutive}
                                    onChange={(e) => setLocalIsActualExecutive(e.target.checked)}
                                    className="mr-2 h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500" />
                                <span className="text-sm text-gray-700 dark:text-gray-300">Ist leitende Führungskraft?</span>
                            </label>
                            <label className="flex items-center">
                                <input type="checkbox" checked={localIsActualOwner}
                                    onChange={(e) => setLocalIsActualOwner(e.target.checked)}
                                    className="mr-2 h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500" />
                                <span className="text-sm text-gray-700 dark:text-gray-300">Ist wirtschaftlich Berechtigter / Eigentümer?</span>
                            </label>
                            {localIsActualOwner && (
                                <div className="ml-6 mt-2">
                                    <label htmlFor="actualOwnershipPercentage" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Eigentumsanteil in %*
                                    </label>
                                    <input
                                        type="number"
                                        id="actualOwnershipPercentage"
                                        value={localActualOwnershipPercentage}
                                        onChange={(e) => setLocalActualOwnershipPercentage(e.target.value)}
                                        required
                                        min="1" max="100"
                                        placeholder="z.B. 25"
                                        className="w-full p-2 border rounded-md dark:bg-gray-700 dark:text-white dark:border-gray-600" />
                                </div>
                            )}
                        </div>
                    </div>
                )}


                {formError && <p className="text-red-500 text-sm mt-3">{formError}</p>}

                {/* Buttons (bestehend) */}
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} type="button"
                        className="px-4 py-2 rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 transition-colors">
                        Abbrechen
                    </button>
                    <button onClick={handleSubmit} type="button"
                        className="px-4 py-2 rounded-md bg-[#14ad9f] text-white hover:bg-teal-700 transition-colors">
                        Speichern & Schließen
                    </button>
                </div>
            </div>
        </div>
    );
};
export default RepresentativePersonalDataModal;