'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { FiMapPin, FiLoader } from 'react-icons/fi';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';

import { SavedAddress, UserProfileData, AnbieterDetails, ApiAnbieter, RatingInfo } from '@/types/types';

import { SEARCH_API_URL } from '@/lib/constants';
import CompanyCard from './CompanyCard';
import CompanyProfileDetail from './CompanyProfileDetail';

const libraries: ("places")[] = ['places'];

interface OrderAddressSelectionProps {
    userProfile: UserProfileData;
    useSavedAddress: 'new' | string;
    setUseSavedAddress: (value: 'new' | string) => void;
    newAddressDetails: SavedAddress | null;
    setNewAddressDetails: (address: SavedAddress | null) => void;
    selectedSubcategory: string | null;
    onProviderSelect: (provider: AnbieterDetails | null) => void;
    onOpenDatePicker: (provider: AnbieterDetails) => void;
}

const OrderAddressSelection: React.FC<OrderAddressSelectionProps> = ({
    userProfile, useSavedAddress, setUseSavedAddress, newAddressDetails, setNewAddressDetails,
    selectedSubcategory, onProviderSelect, onOpenDatePicker
}) => {
    const { isLoaded: isMapsLoaded } = useJsApiLoader({ googleMapsApiKey: process.env.NEXT_PUBLIC_Maps_API_KEY!, libraries });
    const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
    const [companyProfiles, setCompanyProfiles] = useState<AnbieterDetails[]>([]);
    const [loadingProfiles, setLoadingProfiles] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<AnbieterDetails | null>(null); // Provider-State für interne Zwecke
    const [error, setError] = useState<string | null>(null);
    const [expandedStates, setExpandedStates] = useState<{ [key: string]: boolean }>({});
    const [detailedProvider, setDetailedProvider] = useState<AnbieterDetails | null>(null);

    const activePostalCode = useMemo(() => {
        if (useSavedAddress === 'new') return newAddressDetails?.postal_code || null;
        return userProfile.savedAddresses?.find(addr => addr.id === useSavedAddress)?.postal_code || null;
    }, [useSavedAddress, newAddressDetails, userProfile.savedAddresses]);

    const fetchCompanyProfiles = useCallback(async (postalCode: string, subcategory: string) => {
        setLoadingProfiles(true);
        setSelectedProvider(null); // Setzt den internen State zurück
        onProviderSelect(null);    // Informiert CreateOrderModal, dass kein Provider ausgewählt ist
        setError(null);
        setExpandedStates({});
        try {
            let apiUrl = `${SEARCH_API_URL}?postalCode=${postalCode}&selectedSubcategory=${encodeURIComponent(subcategory)}`;

            // KORREKTUR: Im Entwicklungsmodus die Emulator-URL dynamisch und mit der korrekten Region erstellen.
            // Dies behebt den 404/CORS-Fehler, da die Funktion in 'europe-west1' und nicht 'us-central1' läuft.
            if (process.env.NODE_ENV === 'development') {
                const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
                const region = 'europe-west1'; // Die Region Ihrer Funktion
                const functionName = 'searchCompanyProfiles';
                apiUrl = `http://127.0.0.1:5001/${projectId}/${region}/${functionName}?postalCode=${postalCode}&selectedSubcategory=${encodeURIComponent(subcategory)}`;
            }

            const res = await fetch(apiUrl);
            if (!res.ok) throw new Error(`API-Fehler ${res.status}`);

            const data: ApiAnbieter[] = await res.json();

            console.log("DEBUG OrderAddressSelection: API-Antwort für Anbieterprofile (raw data):", data);

            const formattedData: AnbieterDetails[] = data.map(apiProvider => ({
                id: apiProvider.id,
                companyName: apiProvider.companyName || apiProvider.firmenname || 'Unbekannter Anbieter',
                profilePictureURL: apiProvider.profilePictureURL || apiProvider.profilbildUrl,
                hourlyRate: apiProvider.hourlyRate,
                description: apiProvider.description,
                stripeAccountId: apiProvider.stripeAccountId
            }));
            setCompanyProfiles(formattedData);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Fehler beim Laden der Anbieter.');
            setCompanyProfiles([]);
        } finally {
            setLoadingProfiles(false);
        }
    }, [onProviderSelect]);

    useEffect(() => {
        if (activePostalCode && selectedSubcategory) {
            const timer = setTimeout(() => fetchCompanyProfiles(activePostalCode, selectedSubcategory!), 500);
            return () => clearTimeout(timer);
        } else {
            setCompanyProfiles([]);
        }
    }, [activePostalCode, selectedSubcategory, fetchCompanyProfiles]);

    const handleToggleDescription = (companyId: string) => {
        setExpandedStates(prev => ({ ...prev, [companyId]: !prev[companyId] }));
    };

    const handleProviderSelect = (provider: AnbieterDetails) => {
        console.log("DEBUG OrderAddressSelection: Provider ausgewählt:", provider); // <--- NEU
        setSelectedProvider(provider); // Setzt den internen State
        onProviderSelect(provider); // Informiert CreateOrderModal über die Auswahl
    };

    const onLoadAutocomplete = useCallback((autocompleteInstance: google.maps.places.Autocomplete) => { setAutocomplete(autocompleteInstance); }, []);

    const onPlaceChangedAutocomplete = () => {
        if (!autocomplete) return;
        const place = autocomplete.getPlace();
        const newAddress: Partial<SavedAddress> = { country: 'DE', isDefault: false };
        let street = '', streetNumber = '';
        place.address_components?.forEach(c => {
            if (c.types.includes('street_number')) streetNumber = c.long_name;
            if (c.types.includes('route')) street = c.long_name;
            if (c.types.includes('locality')) newAddress.city = c.long_name;
            if (c.types.includes('postal_code')) newAddress.postal_code = c.long_name;
            if (c.types.includes('country')) newAddress.country = c.short_name;
        });
        newAddress.line1 = `${street} ${streetNumber}`.trim();
        newAddress.name = place.name && !place.types?.includes('street_address') ? place.name : `Neue Adresse ${Date.now()}`;
        setNewAddressDetails({ id: `addr_new_${Date.now()}`, ...newAddress } as SavedAddress);
    };

    return (
        <>
            <div className="p-6">
                <div className="flex items-center mb-6">
                    <div className="w-10 h-10 bg-[#14ad9f] text-white rounded-full flex items-center justify-center font-bold mr-4">2</div>
                    <h4 className="text-xl font-semibold text-gray-800">Ort des Auftrags</h4>
                </div>
                
                {userProfile.savedAddresses && userProfile.savedAddresses.length > 0 ? (
                    <div className="mb-6 space-y-3">
                        <Label className="text-sm font-medium text-gray-700">Gespeicherte Adressen wählen:</Label>
                        {userProfile.savedAddresses.map(addr => (
                            <label key={addr.id} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                                <Input 
                                    type="radio" 
                                    name="jobAddress" 
                                    value={addr.id} 
                                    checked={useSavedAddress === addr.id} 
                                    onChange={() => { setUseSavedAddress(addr.id); setNewAddressDetails(null); }} 
                                    className="h-4 w-4 text-[#14ad9f] border-gray-300 focus:ring-[#14ad9f] mr-3" 
                                />
                                <div className="flex-1">
                                    <span className="font-medium text-gray-900">{addr.name}</span>
                                    <p className="text-sm text-gray-600">{addr.line1}, {addr.postal_code} {addr.city}</p>
                                </div>
                            </label>
                        ))}
                        <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                            <Input 
                                type="radio" 
                                name="jobAddress" 
                                value="new" 
                                checked={useSavedAddress === 'new'} 
                                onChange={() => setUseSavedAddress('new')} 
                                className="h-4 w-4 text-[#14ad9f] border-gray-300 focus:ring-[#14ad9f] mr-3" 
                            />
                            <span className="font-medium text-gray-900">Neue Adresse eingeben</span>
                        </label>
                    </div>
                ) : (
                    <div className="mb-6">
                        <p className="text-sm text-gray-600 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            Sie haben noch keine gespeicherten Adressen. Bitte geben Sie eine neue Adresse ein.
                        </p>
                    </div>
                )}
                
                {useSavedAddress === 'new' && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        {isMapsLoaded && (
                            <div>
                                <Label htmlFor="google-address-autocomplete" className="text-sm font-medium text-gray-700 mb-2 block">
                                    Adresse suchen
                                </Label>
                                <Autocomplete onLoad={onLoadAutocomplete} onPlaceChanged={onPlaceChangedAutocomplete}>
                                    <Input 
                                        id="google-address-autocomplete" 
                                        type="text" 
                                        placeholder="Straße, PLZ, Ort eingeben..." 
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:border-[#14ad9f] focus:ring-2 focus:ring-[#14ad9f]/20 transition-colors" 
                                    />
                                </Autocomplete>
                                <p className="text-xs text-gray-500 mt-2">Tippen Sie eine Adresse ein und wählen Sie aus den Vorschlägen</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {activePostalCode && selectedSubcategory && (
                <div className="border-t border-gray-200 p-6">
                    <div className="flex items-center mb-6">
                        <div className="w-10 h-10 bg-[#14ad9f] text-white rounded-full flex items-center justify-center font-bold mr-4">3</div>
                        <h4 className="text-xl font-semibold text-gray-800">Wähle einen Tasker aus</h4>
                    </div>
                    
                    {loadingProfiles && (
                        <div className="flex items-center justify-center py-12 bg-gray-50 rounded-lg">
                            <FiLoader className="animate-spin mr-3 text-[#14ad9f] text-xl" />
                            <span className="text-gray-600">Lade verfügbare Tasker...</span>
                        </div>
                    )}
                    
                    {error && (
                        <div className="text-center py-8">
                            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg inline-block">
                                {error}
                            </div>
                        </div>
                    )}
                    
                    {!loadingProfiles && !error && companyProfiles.length === 0 && (
                        <div className="text-center py-12 bg-gray-50 rounded-lg">
                            <FiMapPin className="text-4xl text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 font-medium">Für diese Postleitzahl wurden keine Tasker gefunden.</p>
                            <p className="text-sm text-gray-500 mt-2">Versuchen Sie eine andere Adresse oder Kategorie.</p>
                        </div>
                    )}
                    
                    {!loadingProfiles && companyProfiles.length > 0 && (
                        <div className="space-y-4 max-h-[32rem] overflow-y-auto p-1">
                            {companyProfiles.map(provider => (
                                <CompanyCard
                                    key={provider.id}
                                    company={provider}
                                    ratingInfo={undefined}
                                    isExpanded={!!expandedStates[provider.id]}
                                    onToggleDescription={() => handleToggleDescription(provider.id)}
                                    onSelectProvider={() => handleProviderSelect(provider)}
                                    onShowProfile={() => setDetailedProvider(provider)}
                                    onOpenDatePicker={() => onOpenDatePicker(provider)}
                                    isSelected={selectedProvider?.id === provider.id}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {detailedProvider && (
                <CompanyProfileDetail
                    company={detailedProvider}
                    ratingInfo={undefined}
                    onClose={() => setDetailedProvider(null)}
                />
            )}
        </>
    );
};

export default OrderAddressSelection;