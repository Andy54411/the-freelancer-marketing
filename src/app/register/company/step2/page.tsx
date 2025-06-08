"use client";

import React, { useState, useEffect, useRef, useCallback, AnimationEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useJsApiLoader, GoogleMap, Marker, Circle, Autocomplete } from '@react-google-maps/api';
import ProgressBar from '@/components/ProgressBar';
import PopupModal from '@/app/register/company/step4/components/PopupModal';
import { FiX, FiInfo } from 'react-icons/fi';
import { useRegistration } from '@/contexts/Registration-Context';
// import { PAGE_LOG, PAGE_WARN } from '@/app/auftrag/get-started/[unterkategorie]/adresse/components/lib/constants';

const STEP2_PAGE_LOG = "[Register Company Step2 LOG]";

const steps = [
  "Über Sie",
  "Firmensitz & Einsatzgebiet",
  "Qualifikationen",
  "Profil anlegen",
  "Bezahlmethode"
];

const libraries = ['places'] as unknown as ("places")[];

const containerStyle = {
  width: '100%',
  height: '400px',
};

export default function Step2CompanyPage() {
  const router = useRouter();
  const registration = useRegistration();

  const [localCompanyName, setLocalCompanyName] = useState(registration.companyName || '');
  const [localFullStreetDisplay, setLocalFullStreetDisplay] = useState(
    `${registration.companyStreet || ''}${registration.companyHouseNumber ? ' ' + registration.companyHouseNumber : ''}`.trim()
  );
  const [localPostalCode, setLocalPostalCode] = useState(registration.companyPostalCode || '');
  const [localCity, setLocalCity] = useState(registration.companyCity || '');
  const [localCountry, setLocalCountry] = useState(registration.companyCountry || 'DE');
  const [localRadiusKm, setLocalRadiusKm] = useState(registration.radiusKm ?? 30);
  const [localLat, setLocalLat] = useState(registration.lat);
  const [localLng, setLocalLng] = useState(registration.lng);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_Maps_API_KEY!,
    libraries,
  });

  useEffect(() => {
    console.log(STEP2_PAGE_LOG, "Komponente geladen. Initialer Context für Firma:", {
      companyName: registration.companyName,
      companyStreet: registration.companyStreet,
      companyHouseNumber: registration.companyHouseNumber,
      companyPostalCode: registration.companyPostalCode,
      companyCity: registration.companyCity,
      companyCountry: registration.companyCountry,
      lat: registration.lat,
      lng: registration.lng,
      radiusKm: registration.radiusKm
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLocalCompanyName(registration.companyName || '');
    setLocalFullStreetDisplay(`${registration.companyStreet || ''}${registration.companyHouseNumber ? ' ' + registration.companyHouseNumber : ''}`.trim());
    setLocalPostalCode(registration.companyPostalCode || '');
    setLocalCity(registration.companyCity || '');
    setLocalCountry(registration.companyCountry || 'DE');
    setLocalRadiusKm(registration.radiusKm ?? 30);
    setLocalLat(registration.lat);
    setLocalLng(registration.lng);
  }, [
    registration.companyName, registration.companyStreet, registration.companyHouseNumber,
    registration.companyPostalCode, registration.companyCity, registration.companyCountry,
    registration.radiusKm, registration.lat, registration.lng
  ]);

  const onLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
    console.log(STEP2_PAGE_LOG, "Google Maps Autocomplete geladen.");
  }, []);

  const onPlaceChanged = () => {
    console.log(STEP2_PAGE_LOG, "onPlaceChanged getriggert.");
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      console.log(STEP2_PAGE_LOG, "Google Place Result:", place);
      if (place && place.address_components) {
        const components = place.address_components;
        let streetName = ''; let streetNum = ''; let foundCity = '';
        let foundPostalCode = ''; let countryISO = '';

        components.forEach(c => {
          if (c.types.includes('route')) streetName = c.long_name;
          if (c.types.includes('street_number')) streetNum = c.long_name;
          if (c.types.includes('postal_code')) foundPostalCode = c.long_name;
          if (c.types.includes('locality')) foundCity = c.long_name;
          else if (c.types.includes('postal_town') && !foundCity) foundCity = c.long_name;
          else if (c.types.includes('sublocality') && !foundCity) foundCity = c.long_name;
          else if (c.types.includes('administrative_area_level_3') && !foundCity) foundCity = c.long_name;
          if (c.types.includes('country')) countryISO = c.short_name;
        });

        const fullStreet = streetNum ? `${streetName} ${streetNum}` : streetName;
        setLocalFullStreetDisplay(fullStreet.trim());
        setLocalPostalCode(foundPostalCode);
        setLocalCity(foundCity);
        setLocalCountry(countryISO || 'DE');

        console.log(STEP2_PAGE_LOG, "Werte aus Autocomplete (onPlaceChanged):", { streetName, streetNum, fullStreet, foundCity, foundPostalCode, countryISO });

        registration.setCompanyStreet(streetName.trim());
        registration.setCompanyHouseNumber(streetNum.trim());
        registration.setCompanyPostalCode(foundPostalCode);
        registration.setCompanyCity(foundCity);
        registration.setCompanyCountry(countryISO || null);

        if (place.geometry && place.geometry.location) {
          const newLat = place.geometry.location.lat();
          const newLng = place.geometry.location.lng();
          setLocalLat(newLat); setLocalLng(newLng);
          registration.setLat(newLat); registration.setLng(newLng);
          console.log(STEP2_PAGE_LOG, "Koordinaten gesetzt (onPlaceChanged):", { lat: newLat, lng: newLng });
        } else {
          setLocalLat(null); setLocalLng(null);
          registration.setLat(null); registration.setLng(null);
        }
      } else {
        console.warn(STEP2_PAGE_LOG, "Kein valider Ort im Autocomplete-Ergebnis (onPlaceChanged).");
      }
    }
  };

  const handleAutofillSync = (
    event: AnimationEvent<HTMLInputElement>,
    contextSetter: (value: string) => void,
    localSetter?: React.Dispatch<React.SetStateAction<string>> // Optional für lokalen State
  ) => {
    if (event.animationName === 'onAutofillStart' || event.animationName.includes('AutoFill')) {
      const inputElement = event.target as HTMLInputElement;
      setTimeout(() => {
        const autofilledValue = inputElement.value;
        console.log(STEP2_PAGE_LOG, `Autofill-Event '${event.animationName}' auf Feld '${inputElement.id}', Wert: '${autofilledValue}'`);
        if (typeof contextSetter === 'function') {
          contextSetter(autofilledValue);
        }
        if (typeof localSetter === 'function') {
          localSetter(autofilledValue);
        }
      }, 0);
    }
  };

  const handleFullStreetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalFullStreetDisplay(value);
    const parts = value.trim().split(/\s+/);
    let hn = ""; let streetVal = value.trim();
    if (parts.length > 1) {
      const lastPart = parts[parts.length - 1];
      if (/\d/.test(lastPart)) { hn = lastPart; streetVal = parts.slice(0, -1).join(" "); }
    }
    registration.setCompanyStreet(streetVal);
    registration.setCompanyHouseNumber(hn);
  };

  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalCompanyName(value);
    registration.setCompanyName(value);
  }
  const handlePostalCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalPostalCode(value);
    registration.setCompanyPostalCode(value);
  }
  const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalCity(value);
    registration.setCompanyCity(value);
  }
  const handleCountryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const countryValue = e.target.value.toUpperCase();
    setLocalCountry(countryValue);
    registration.setCompanyCountry(countryValue);
  }
  const handleRadiusKmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setLocalRadiusKm(val);
    registration.setRadiusKm(val > 0 ? val : null);
  }

  const handleNext = () => {
    console.log(STEP2_PAGE_LOG, "handleNext aufgerufen. Context für Firmenadresse vor Navigation:", {
      name: registration.companyName, street: registration.companyStreet, hn: registration.companyHouseNumber,
      plz: registration.companyPostalCode, city: registration.companyCity, country: registration.companyCountry,
      lat: registration.lat, lng: registration.lng, radius: registration.radiusKm
    });

    if (!registration.companyName?.trim() ||
      !registration.companyStreet?.trim() ||
      !registration.companyPostalCode?.trim() ||
      !registration.companyCity?.trim() ||
      !registration.companyCountry?.trim() ||
      (registration.companyCountry?.length !== 2)
    ) {
      let errorMsg = "Bitte füllen Sie alle erforderlichen Felder aus (Firmenname, Adresse, PLZ, Stadt, Land).";
      if (registration.companyCountry && registration.companyCountry.length !== 2) {
        errorMsg = "Das Land muss als zweistelliger ISO-Code angegeben werden (z.B. DE).";
      }
      alert(errorMsg);
      return;
    }
    if ((registration.radiusKm ?? 0) <= 0) {
      alert("Bitte geben Sie einen gültigen Radius (größer als 0) an.");
      return;
    }
    router.push('/register/company/step3');
  };

  const isFormValid = () =>
    !!localCompanyName?.trim() &&
    !!localFullStreetDisplay?.trim() &&
    !!localPostalCode?.trim() &&
    !!localCity?.trim() &&
    !!localCountry?.trim() && localCountry.length === 2 &&
    (localRadiusKm ?? 0) > 0;

  if (!isLoaded) return <div className="flex items-center justify-center min-h-screen"><p>Lade Google Maps...</p></div>;

  const mapCenterLat = localLat ?? 51.1657;
  const mapCenterLng = localLng ?? 10.4515;
  const currentRadiusKmForMap = localRadiusKm ?? 0;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-blue-100 to-teal-200 p-6">
      <div className="w-full max-w-7xl mb-6 flex justify-end px-6">
        <button onClick={() => router.push('/')} className="text-[#14ad9f] text-lg flex items-center">
          <span className="mr-2">Abbrechen</span> <FiX />
        </button>
      </div>
      <div className="w-full max-w-7xl mb-6"> <ProgressBar currentStep={2} totalSteps={5} /> </div>
      <div className="w-full max-w-7xl mb-6 flex justify-between items-center px-6">
        <p className="text-lg text-[#14ad9f] font-semibold">Schritt 2/5: Firmensitz & Einsatzgebiet</p>
        <div className="flex items-center">
          <button onClick={() => setIsModalOpen(true)} className="text-sm text-[#14ad9f] hover:underline mr-2">
            Schritte anzeigen
          </button>
          <FiInfo className="text-[#14ad9f] text-xl" />
        </div>
      </div>

      <div className="max-w-md w-full bg-white p-4 rounded-lg shadow-lg space-y-6">
        <form onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
          <div>
            <label htmlFor="companyName" className="block text-[#14ad9f] font-semibold mb-2">Firmenname</label>
            <input
              type="text" id="companyName" value={localCompanyName}
              onChange={handleCompanyNameChange}
              onAnimationStart={(e) => handleAutofillSync(e, registration.setCompanyName, setLocalCompanyName)}
              required
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#14ad9f]"
            />
          </div>
          <div>
            <label htmlFor="address" className="block text-[#14ad9f] font-semibold mb-2">Adresse (Straße und Hausnummer)</label>
            <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}
              options={{ componentRestrictions: { country: ["de", "at", "ch"] }, fields: ["address_components", "geometry", "formatted_address", "name"] }}
            >
              <input
                type="text" id="address" value={localFullStreetDisplay}
                onChange={handleFullStreetChange}
                required
                placeholder="Vollständige Adresse eingeben"
                className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#14ad9f]"
              />
            </Autocomplete>
          </div>
          <div>
            <label htmlFor="postalCode" className="block text-[#14ad9f] font-semibold mb-2">Postleitzahl</label>
            <input
              type="text" id="postalCode" value={localPostalCode}
              onChange={handlePostalCodeChange}
              onAnimationStart={(e) => handleAutofillSync(e, registration.setCompanyPostalCode, setLocalPostalCode)}
              required
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#14ad9f]"
            />
          </div>
          <div>
            <label htmlFor="city" className="block text-[#14ad9f] font-semibold mb-2">Stadt</label>
            <input
              type="text" id="city" value={localCity}
              onChange={handleCityChange}
              onAnimationStart={(e) => handleAutofillSync(e, registration.setCompanyCity, setLocalCity)}
              required
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#14ad9f]"
            />
          </div>
          <div>
            <label htmlFor="country" className="block text-[#14ad9f] font-semibold mb-2">Land</label>
            <input
              type="text" id="country" value={localCountry}
              onChange={handleCountryChange}
              onAnimationStart={(e) =>
                handleAutofillSync(
                  e,
                  (val) => typeof val === 'string' ? registration.setCompanyCountry(val.toUpperCase()) : undefined,
                  (val) => typeof val === 'string' ? setLocalCountry(val.toUpperCase()) : undefined
                )
              }
              required maxLength={2} placeholder="z.B. DE"
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#14ad9f]"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="radiusKm" className="block text-[#14ad9f] font-semibold mb-2">
              Einzugsgebiet Radius (km)
            </label>
            <input
              type="number" id="radiusKm"
              value={localRadiusKm}
              onChange={handleRadiusKmChange}
              min={1} max={200}
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#14ad9f]"
            />
          </div>

          {isLoaded && (
            <div style={containerStyle} className="mb-4 rounded-md overflow-hidden">
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={{ lat: mapCenterLat, lng: mapCenterLng }}
                zoom={(typeof localLat === 'number' && typeof localLng === 'number') ? 10 : 6}
              >
                {typeof localLat === 'number' && typeof localLng === 'number' && (
                  <Marker position={{ lat: localLat, lng: localLng }} />
                )}
                {typeof localLat === 'number' && typeof localLng === 'number' && typeof currentRadiusKmForMap === 'number' && currentRadiusKmForMap > 0 && (
                  <Circle
                    center={{ lat: localLat, lng: localLng }}
                    radius={currentRadiusKmForMap * 1000}
                    options={{
                      fillColor: '#14ad9f', fillOpacity: 0.2, strokeColor: '#14ad9f',
                      strokeOpacity: 0.7, strokeWeight: 2, clickable: false,
                      draggable: false, editable: false, visible: true, zIndex: 1,
                    }}
                  />
                )}
              </GoogleMap>
            </div>
          )}

          <div className="flex justify-center">
            <button
              type="submit"
              disabled={!isFormValid()}
              className="w-full bg-[#14ad9f] text-white py-3 rounded-md hover:bg-teal-700 disabled:bg-gray-400"
            >
              Weiter zu Schritt 3
            </button>
          </div>
        </form>
      </div>

      <PopupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        steps={steps}
      />
    </div>
  );
}