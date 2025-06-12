// src/app/dashboard/user/[uid]/components/AddressForm.tsx
import React, { useState, useEffect } from 'react';
import { FiSave, FiXCircle, FiAlertCircle } from 'react-icons/fi';




// Definieren Sie das SavedAddress Interface (sollte global oder in Typen-Datei definiert sein)
interface SavedAddress {
    id: string;
    name: string; // Z.B. "Zuhause", "Büro"
    line1: string;
    line2?: string;
    city: string;
    postal_code: string;
    country: string; // ISO 3166-1 alpha-2 code, z.B. 'DE'
    isDefault?: boolean;
    type?: 'billing' | 'shipping' | 'other';
}

interface AddressFormProps {
    initialData?: SavedAddress | null; // Für Bearbeiten
    onSave: (address: SavedAddress) => void;
    onCancel: () => void;
}

export default function AddressForm({ initialData, onSave, onCancel }: AddressFormProps) {
    const [name, setName] = useState(initialData?.name || '');
    const [line1, setLine1] = useState(initialData?.line1 || '');
    const [line2, setLine2] = useState(initialData?.line2 || '');
    const [city, setCity] = useState(initialData?.city || '');
    const [postalCode, setPostalCode] = useState(initialData?.postal_code || '');
    const [country, setCountry] = useState(initialData?.country || 'DE'); // Standard auf DE
    const [isDefault, setIsDefault] = useState(initialData?.isDefault || false);
    const [type, setType] = useState<SavedAddress['type']>(initialData?.type || 'billing');
    const [validationError, setValidationError] = useState<string | null>(null);

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        setValidationError(null);

        if (!name.trim() || !line1.trim() || !city.trim() || !postalCode.trim() || !country.trim()) {
            setValidationError("Alle mit * markierten Felder sind Pflichtfelder.");
            return;
        }
        if (country.trim().length !== 2) {
            setValidationError("Ländercode muss 2 Buchstaben haben (z.B. DE).");
            return;
        }

        const savedAddress: SavedAddress = {
            id: initialData?.id || `addr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, // Neue ID oder bestehende
            name: name.trim(),
            line1: line1.trim(),
            line2: line2.trim() || undefined, // Leerstring zu undefined, wenn optional
            city: city.trim(),
            postal_code: postalCode.trim(),
            country: country.trim().toUpperCase(), // Immer Großbuchstaben für Ländercode
            isDefault,
            type,
        };
        onSave(savedAddress);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
            {validationError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-sm flex items-center">
                    <FiAlertCircle className="mr-2" />
                    {validationError}
                </div>
            )}

            <div>
                <label htmlFor="addressName" className="block text-sm font-medium text-gray-700">Name der Adresse (z.B. Zuhause, Büro) *</label>
                <input
                    type="text"
                    id="addressName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-gray-900 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                />
            </div>
            <div>
                <label htmlFor="line1" className="block text-sm font-medium text-gray-700">Straße und Hausnummer *</label>
                <input
                    type="text"
                    id="line1"
                    value={line1}
                    onChange={(e) => setLine1(e.target.value)}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-gray-900 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                />
            </div>
            <div>
                <label htmlFor="line2" className="block text-sm font-medium text-gray-700">Adresszusatz (optional)</label>
                <input
                    type="text"
                    id="line2"
                    value={line2}
                    onChange={(e) => setLine2(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-gray-900 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">Postleitzahl *</label>
                    <input
                        type="text"
                        id="postalCode"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-gray-900 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                    />
                </div>
                <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700">Ort *</label>
                    <input
                        type="text"
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-gray-900 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                    />
                </div>
            </div>
            <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700">Land (z.B. DE) *</label>
                <input
                    type="text"
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    required
                    maxLength={2}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-gray-900 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                />
            </div>
            <div className="flex items-center">
                <input
                    id="isDefault"
                    name="isDefault"
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="h-4 w-4 text-[#14ad9f] focus:ring-[#14ad9f] border-gray-300 rounded"
                />
                <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-900">Als Standardadresse festlegen</label>
            </div>
            <div>
                <label htmlFor="addressType" className="block text-sm font-medium text-gray-700">Adresstyp</label>
                <select
                    id="addressType"
                    name="addressType"
                    value={type}
                    onChange={(e) => setType(e.target.value as SavedAddress['type'])}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-gray-900 focus:ring-[#14ad9f] focus:border-[#14ad9f]"
                >
                    <option value="billing">Rechnungsadresse</option>
                    <option value="shipping">Lieferadresse</option>
                    <option value="other">Sonstiges</option>
                </select>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
                >
                    <FiXCircle className="inline mr-1" /> Abbrechen
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 bg-[#14ad9f] border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-[#129a8f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14ad9f]"
                >
                    <FiSave className="inline mr-1" /> Speichern
                </button>
            </div>
        </form>
    );
}