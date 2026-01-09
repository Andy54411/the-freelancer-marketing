'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { FiMapPin, FiLoader } from 'react-icons/fi';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';

import AddressForm from './AddressForm';
import {
  SavedAddress,
  UserProfileData,
  AnbieterDetails,
  ApiAnbieter,
} from '@/types/types';

import { SEARCH_API_URL } from '@/lib/constants';
import CompanyCard from './CompanyCard';
import CompanyProfileDetail from './CompanyProfileDetail';

const libraries: 'places'[] = ['places'];

interface OrderAddressSelectionProps {
  userProfile: UserProfileData;
  useSavedAddress: 'new' | string;
  setUseSavedAddress: (value: 'new' | string) => void;
  newAddressDetails: SavedAddress | null;
  setNewAddressDetails: (address: SavedAddress | null) => void;
  selectedSubcategory: string | null;
  onProviderSelect: (provider: AnbieterDetails | null) => void;
  onOpenDatePicker: (provider: AnbieterDetails) => void;
  preselectedProvider?: AnbieterDetails | null;
}

const OrderAddressSelection: React.FC<OrderAddressSelectionProps> = ({
  userProfile,
  useSavedAddress,
  setUseSavedAddress,
  newAddressDetails,
  setNewAddressDetails,
  selectedSubcategory,
  onProviderSelect,
  onOpenDatePicker,
  preselectedProvider,
}) => {
  const { isLoaded: isMapsLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_Maps_API_KEY!,
    libraries,
  });
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [companyProfiles, setCompanyProfiles] = useState<AnbieterDetails[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AnbieterDetails | null>(null); // Provider-State für interne Zwecke
  const [error, setError] = useState<string | null>(null);
  const [expandedStates, setExpandedStates] = useState<{ [key: string]: boolean }>({});
  const [detailedProvider, setDetailedProvider] = useState<AnbieterDetails | null>(null);

  const activePostalCode = useMemo(() => {
    if (useSavedAddress === 'new') return newAddressDetails?.postal_code || null;
    return (
      userProfile.savedAddresses?.find(addr => addr.id === useSavedAddress)?.postal_code || null
    );
  }, [useSavedAddress, newAddressDetails, userProfile.savedAddresses]);

  const fetchCompanyProfiles = useCallback(
    async (postalCode: string, subcategory: string) => {
      setLoadingProfiles(true);
      setSelectedProvider(null); // Setzt den internen State zurück
      onProviderSelect(null); // Informiert CreateOrderModal, dass kein Provider ausgewählt ist
      setError(null);
      setExpandedStates({});
      try {
        const apiUrl = `${SEARCH_API_URL}?postalCode=${postalCode}&selectedSubcategory=${encodeURIComponent(subcategory)}`;

        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`API-Fehler ${res.status}`);

        const data: ApiAnbieter[] = await res.json();

        const formattedData: AnbieterDetails[] = data.map(apiProvider => ({
          id: apiProvider.id,
          companyName: apiProvider.companyName || apiProvider.firmenname || 'Unbekannter Anbieter',
          profilePictureURL: apiProvider.profilePictureURL || apiProvider.profilbildUrl,
          hourlyRate: apiProvider.hourlyRate,
          description: apiProvider.description,
          stripeAccountId: apiProvider.stripeAccountId,
        }));
        setCompanyProfiles(formattedData);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Fehler beim Laden der Anbieter.');
        setCompanyProfiles([]);
      } finally {
        setLoadingProfiles(false);
      }
    },
    [onProviderSelect]
  );

  useEffect(() => {
    if (preselectedProvider) {
      // Wenn ein Provider vorausgewählt ist, verwende diesen direkt
      setCompanyProfiles([preselectedProvider]);
      setSelectedProvider(preselectedProvider);
      onProviderSelect(preselectedProvider);
      setLoadingProfiles(false);
      return;
    } else if (activePostalCode && selectedSubcategory) {
      // Nur suchen wenn kein Provider vorausgewählt ist
      const timer = setTimeout(
        () => fetchCompanyProfiles(activePostalCode, selectedSubcategory!),
        500
      );
      return () => clearTimeout(timer);
    } else {
      setCompanyProfiles([]);
      return;
    }
  }, [
    activePostalCode,
    selectedSubcategory,
    fetchCompanyProfiles,
    preselectedProvider,
    onProviderSelect,
  ]);

  const handleToggleDescription = (companyId: string) => {
    setExpandedStates(prev => ({ ...prev, [companyId]: !prev[companyId] }));
  };

  const handleProviderSelect = (provider: AnbieterDetails) => {
    // <--- NEU
    setSelectedProvider(provider); // Setzt den internen State
    onProviderSelect(provider); // Informiert CreateOrderModal über die Auswahl
  };

  const onLoadAutocomplete = useCallback(
    (autocompleteInstance: google.maps.places.Autocomplete) => {
      setAutocomplete(autocompleteInstance);
    },
    []
  );

  const onPlaceChangedAutocomplete = () => {
    if (!autocomplete) return;
    const place = autocomplete.getPlace();
    const newAddress: Partial<SavedAddress> = { country: 'DE', isDefault: false };
    let street = '',
      streetNumber = '';
    place.address_components?.forEach(c => {
      if (c.types.includes('street_number')) streetNumber = c.long_name;
      if (c.types.includes('route')) street = c.long_name;
      if (c.types.includes('locality')) newAddress.city = c.long_name;
      if (c.types.includes('postal_code')) newAddress.postal_code = c.long_name;
      if (c.types.includes('country')) newAddress.country = c.short_name;
    });
    newAddress.line1 = `${street} ${streetNumber}`.trim();
    newAddress.name =
      place.name && !place.types?.includes('street_address')
        ? place.name
        : `Neue Adresse ${Date.now()}`;
    setNewAddressDetails({ id: `addr_new_${Date.now()}`, ...newAddress } as SavedAddress);
  };

  const handleCancelNewAddress = useCallback(() => {
    const firstSavedAddressId = userProfile.savedAddresses?.[0]?.id;
    if (firstSavedAddressId) {
      setUseSavedAddress(firstSavedAddressId);
    }
  }, [userProfile.savedAddresses, setUseSavedAddress]);

  return (
    <>
      <div className="p-4 border rounded-md bg-gray-50">
        <h4 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
          <FiMapPin className="mr-2" /> 3. Ort des Tasks *
        </h4>

        {userProfile.savedAddresses && userProfile.savedAddresses.length > 0 ? (
          <div className="mb-4 space-y-2">
            {userProfile.savedAddresses.map(addr => (
              <label key={addr.id} className="flex items-center text-gray-700 cursor-pointer">
                <Input
                  type="radio"
                  name="jobAddress"
                  value={addr.id}
                  checked={useSavedAddress === addr.id}
                  onChange={() => {
                    setUseSavedAddress(addr.id);
                    setNewAddressDetails(null);
                  }}
                  className="h-4 w-4 text-[#14ad9f] border-gray-300 focus:ring-[#14ad9f]"
                />
                <span className="ml-2">
                  {addr.name} ({addr.line1}, {addr.postal_code} {addr.city})
                </span>
              </label>
            ))}
            <label className="flex items-center text-gray-700 cursor-pointer">
              <Input
                type="radio"
                name="jobAddress"
                value="new"
                checked={useSavedAddress === 'new'}
                onChange={() => setUseSavedAddress('new')}
                className="h-4 w-4 text-[#14ad9f] border-gray-300 focus:ring-[#14ad9f]"
              />
              <span className="ml-2">Neue Adresse eingeben</span>
            </label>
          </div>
        ) : (
          <div className="mb-4">
            <p className="text-sm text-gray-600">Bitte geben Sie eine neue Adresse ein.</p>
          </div>
        )}

        {useSavedAddress === 'new' && (
          <div className="mt-4 border-t pt-4 space-y-4">
            {isMapsLoaded && (
              <div>
                <Label htmlFor="google-address-autocomplete">Adresse mit Google suchen</Label>
                <Autocomplete
                  onLoad={onLoadAutocomplete}
                  onPlaceChanged={onPlaceChangedAutocomplete}
                >
                  <Input
                    id="google-address-autocomplete"
                    type="text"
                    placeholder="Straße, PLZ, Ort..."
                    className="w-full mt-1"
                  />
                </Autocomplete>
              </div>
            )}
            <div className="text-center text-sm text-gray-500">oder manuell ausfüllen:</div>
            <AddressForm
              initialData={newAddressDetails || undefined}
              onChange={setNewAddressDetails}
              onCancel={handleCancelNewAddress}
            />
          </div>
        )}
      </div>

      {activePostalCode && selectedSubcategory && (
        <div className="p-4 border-t mt-4">
          <h4 className="text-lg font-semibold text-gray-700 mb-4">4. Wähle einen Tasker aus</h4>

          {loadingProfiles && (
            <div className="flex items-center justify-center py-4">
              <FiLoader className="animate-spin mr-2" />
              Lade verfügbare Tasker...
            </div>
          )}

          {error && <p className="text-sm text-red-500 text-center py-4">{error}</p>}

          {!loadingProfiles && !error && companyProfiles.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              Für diese Postleitzahl wurden keine Tasker gefunden.
            </p>
          )}

          {!loadingProfiles && companyProfiles.length > 0 && (
            <div className="space-y-4 max-h-112 overflow-y-auto p-1">
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
