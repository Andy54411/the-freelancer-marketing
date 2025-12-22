'use client';

import React, { useState, useEffect, useRef, useCallback, AnimationEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useJsApiLoader, GoogleMap, Marker, Circle, Autocomplete } from '@react-google-maps/api';
import ProgressBar from '@/components/ProgressBar';
import PopupModal from '@/app/register/company/step4/components/PopupModal';
import { useRegistration } from '@/contexts/Registration-Context';
import { motion } from 'framer-motion';
import { ArrowLeft, X, Info, Check, MapPin, Building2, Globe, Compass } from 'lucide-react';

const STEP2_PAGE_LOG = '[Register Company Step2 LOG]';

const steps = [
  'Über Sie',
  'Firmensitz & Einsatzgebiet',
  'Qualifikationen',
  'Profil anlegen',
  'Bezahlmethode',
];

const libraries = ['places'] as unknown as 'places'[];

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

  // Debug Google Maps API Key
  const googleMapsApiKey = process.env.NEXT_PUBLIC_Maps_API_KEY;

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: googleMapsApiKey!,
    libraries,
    preventGoogleFontsLoading: true,
  });

  // Debug Google Maps Loading
  if (loadError) {
  }
  if (isLoaded) {
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    setLocalCompanyName(registration.companyName || '');
    setLocalFullStreetDisplay(
      `${registration.companyStreet || ''}${registration.companyHouseNumber ? ' ' + registration.companyHouseNumber : ''}`.trim()
    );
    setLocalPostalCode(registration.companyPostalCode || '');
    setLocalCity(registration.companyCity || '');
    setLocalCountry(registration.companyCountry || 'DE');
    setLocalRadiusKm(registration.radiusKm ?? 30);
    setLocalLat(registration.lat);
    setLocalLng(registration.lng);
  }, [
    registration.companyName,
    registration.companyStreet,
    registration.companyHouseNumber,
    registration.companyPostalCode,
    registration.companyCity,
    registration.companyCountry,
    registration.radiusKm,
    registration.lat,
    registration.lng,
  ]);

  const onLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  }, []);

  const onPlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();

      if (place && place.address_components) {
        const components = place.address_components;
        let streetName = '';
        let streetNum = '';
        let foundCity = '';
        let foundPostalCode = '';
        let countryISO = '';

        components.forEach(c => {
          if (c.types.includes('route')) streetName = c.long_name;
          if (c.types.includes('street_number')) streetNum = c.long_name;
          if (c.types.includes('postal_code')) foundPostalCode = c.long_name;
          if (c.types.includes('locality')) foundCity = c.long_name;
          else if (c.types.includes('postal_town') && !foundCity) foundCity = c.long_name;
          else if (c.types.includes('sublocality') && !foundCity) foundCity = c.long_name;
          else if (c.types.includes('administrative_area_level_3') && !foundCity)
            foundCity = c.long_name;
          if (c.types.includes('country')) countryISO = c.short_name;
        });

        const fullStreet = streetNum ? `${streetName} ${streetNum}` : streetName;
        setLocalFullStreetDisplay(fullStreet.trim());
        setLocalPostalCode(foundPostalCode);
        setLocalCity(foundCity);
        setLocalCountry(countryISO || 'DE');

        registration.setCompanyStreet(streetName.trim());
        registration.setCompanyHouseNumber(streetNum.trim());
        registration.setCompanyPostalCode(foundPostalCode);
        registration.setCompanyCity(foundCity);
        registration.setCompanyCountry(countryISO || null);

        if (place.geometry && place.geometry.location) {
          const newLat = place.geometry.location.lat();
          const newLng = place.geometry.location.lng();
          setLocalLat(newLat);
          setLocalLng(newLng);
          registration.setLat(newLat);
          registration.setLng(newLng);
        } else {
          setLocalLat(null);
          setLocalLng(null);
          registration.setLat(null);
          registration.setLng(null);
        }
      } else {
      }
    }
  };

  const handleAutofillSync = (
    event: AnimationEvent<HTMLInputElement>,
    contextSetter: (value: string) => void,
    localSetter?: React.Dispatch<React.SetStateAction<string>>
  ) => {
    if (event.animationName === 'onAutofillStart' || event.animationName.includes('AutoFill')) {
      const inputElement = event.target as HTMLInputElement;
      setTimeout(() => {
        const autofilledValue = inputElement.value;

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
    let hn = '';
    let streetVal = value.trim();
    if (parts.length > 1) {
      const lastPart = parts[parts.length - 1];
      if (/\d/.test(lastPart)) {
        hn = lastPart;
        streetVal = parts.slice(0, -1).join(' ');
      }
    }
    registration.setCompanyStreet(streetVal);
    registration.setCompanyHouseNumber(hn);
  };

  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalCompanyName(value);
    registration.setCompanyName(value);
  };
  const handlePostalCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalPostalCode(value);
    registration.setCompanyPostalCode(value);
  };
  const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalCity(value);
    registration.setCompanyCity(value);
  };
  const handleCountryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const countryValue = e.target.value.toUpperCase();
    setLocalCountry(countryValue);
    registration.setCompanyCountry(countryValue);
  };
  const handleRadiusKmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setLocalRadiusKm(val);
    registration.setRadiusKm(val > 0 ? val : null);
  };

  const handleNext = () => {
    if (
      !registration.companyName?.trim() ||
      !registration.companyStreet?.trim() ||
      !registration.companyPostalCode?.trim() ||
      !registration.companyCity?.trim() ||
      !registration.companyCountry?.trim() ||
      registration.companyCountry?.length !== 2
    ) {
      let errorMsg =
        'Bitte füllen Sie alle erforderlichen Felder aus (Firmenname, Adresse, PLZ, Stadt, Land).';
      if (registration.companyCountry && registration.companyCountry.length !== 2) {
        errorMsg = 'Das Land muss als zweistelliger ISO-Code angegeben werden (z.B. DE).';
      }
      alert(errorMsg);
      return;
    }
    if ((registration.radiusKm ?? 0) <= 0) {
      alert('Bitte geben Sie einen gültigen Radius (größer als 0) an.');
      return;
    }
    router.push('/register/company/step3');
  };

  const isFormValid = () =>
    !!localCompanyName?.trim() &&
    !!localFullStreetDisplay?.trim() &&
    !!localPostalCode?.trim() &&
    !!localCity?.trim() &&
    !!localCountry?.trim() &&
    localCountry.length === 2 &&
    (localRadiusKm ?? 0) > 0;

  if (!isLoaded)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#14ad9f] mx-auto mb-4"></div>
          <p className="text-gray-600">Lade Google Maps...</p>
        </div>
      </div>
    );

  const mapCenterLat = localLat ?? 51.1657;
  const mapCenterLng = localLng ?? 10.4515;
  const currentRadiusKmForMap = localRadiusKm ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section mit Gradient */}
      <section className="relative bg-linear-to-br from-[#14ad9f] via-teal-600 to-teal-800 pt-12 pb-32">
        {/* Background Image with Teal Gradient Overlay */}
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&h=1080&fit=crop"
            alt="Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-br from-[#14ad9f]/95 via-teal-700/90 to-teal-900/95" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <Link 
              href="/register/company"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Zurück zu Schritt 1
            </Link>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
              Firmensitz & Einsatzgebiet
            </h1>
            <p className="text-lg text-white/90 max-w-2xl mx-auto">
              Wo ist Ihr Unternehmen ansässig und in welchem Umkreis sind Sie tätig?
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 pb-16 relative z-20">
        <div className="grid lg:grid-cols-5 gap-8">
          
          {/* Left Side - Map Preview */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-2 hidden lg:block"
          >
            <div className="bg-white rounded-2xl shadow-xl p-6 sticky top-24">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-[#14ad9f]" />
                Ihr Standort
              </h3>
              
              {/* Map Preview */}
              <div className="rounded-xl overflow-hidden mb-6" style={{ height: '300px' }}>
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={{ lat: mapCenterLat, lng: mapCenterLng }}
                  zoom={typeof localLat === 'number' && typeof localLng === 'number' ? 10 : 6}
                >
                  {typeof localLat === 'number' && typeof localLng === 'number' && (
                    <Marker position={{ lat: localLat, lng: localLng }} />
                  )}
                  {typeof localLat === 'number' &&
                    typeof localLng === 'number' &&
                    typeof currentRadiusKmForMap === 'number' &&
                    currentRadiusKmForMap > 0 && (
                      <Circle
                        center={{ lat: localLat, lng: localLng }}
                        radius={currentRadiusKmForMap * 1000}
                        options={{
                          fillColor: '#14ad9f',
                          fillOpacity: 0.2,
                          strokeColor: '#14ad9f',
                          strokeOpacity: 0.7,
                          strokeWeight: 2,
                          clickable: false,
                          draggable: false,
                          editable: false,
                          visible: true,
                          zIndex: 1,
                        }}
                      />
                    )}
                </GoogleMap>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-gray-600">
                  <Compass className="h-5 w-5 text-[#14ad9f]" />
                  <span>Radius: <strong>{localRadiusKm} km</strong></span>
                </div>
                {localCity && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <Building2 className="h-5 w-5 text-[#14ad9f]" />
                    <span>{localCity}</span>
                  </div>
                )}
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="text-sm text-[#14ad9f] hover:text-teal-700 flex items-center gap-2"
                  >
                    <Info className="h-4 w-4" />
                    Registrierungsschritte anzeigen
                  </button>
                </div>
                <ProgressBar currentStep={2} totalSteps={5} />
                <p className="text-sm text-gray-500 mt-2">Schritt 2 von 5</p>
              </div>
            </div>
          </motion.div>

          {/* Right Side - Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-3"
          >
            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
              {/* Mobile Progress */}
              <div className="lg:hidden mb-6">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm font-medium text-[#14ad9f]">Schritt 2 von 5</p>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="text-sm text-gray-500 hover:text-[#14ad9f] flex items-center gap-1"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </div>
                <ProgressBar currentStep={2} totalSteps={5} />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Firmendaten eingeben
              </h2>
              <p className="text-gray-600 mb-8">
                Diese Informationen helfen uns, Ihr Unternehmen zu verifizieren.
              </p>

              <form onSubmit={e => { e.preventDefault(); handleNext(); }}>
                {/* Firmenname */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="companyName">
                    Firmenname
                  </label>
                  <input
                    type="text"
                    id="companyName"
                    value={localCompanyName}
                    onChange={handleCompanyNameChange}
                    onAnimationStart={e =>
                      handleAutofillSync(e, registration.setCompanyName, setLocalCompanyName)
                    }
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent text-gray-900 bg-gray-50 transition-all"
                    placeholder="Muster GmbH"
                  />
                </div>

                {/* Adresse */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="address">
                    Adresse (Strasse und Hausnummer)
                  </label>
                  <Autocomplete
                    onLoad={onLoad}
                    onPlaceChanged={onPlaceChanged}
                    options={{
                      componentRestrictions: { country: ['de', 'at', 'ch'] },
                      fields: ['address_components', 'geometry', 'formatted_address', 'name'],
                    }}
                  >
                    <input
                      type="text"
                      id="address"
                      value={localFullStreetDisplay}
                      onChange={handleFullStreetChange}
                      required
                      placeholder="Musterstrasse 123"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent text-gray-900 bg-gray-50 transition-all"
                    />
                  </Autocomplete>
                </div>

                {/* PLZ und Stadt */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="postalCode">
                      Postleitzahl
                    </label>
                    <input
                      type="text"
                      id="postalCode"
                      value={localPostalCode}
                      onChange={handlePostalCodeChange}
                      onAnimationStart={e =>
                        handleAutofillSync(e, registration.setCompanyPostalCode, setLocalPostalCode)
                      }
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent text-gray-900 bg-gray-50 transition-all"
                      placeholder="12345"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="city">
                      Stadt
                    </label>
                    <input
                      type="text"
                      id="city"
                      value={localCity}
                      onChange={handleCityChange}
                      onAnimationStart={e =>
                        handleAutofillSync(e, registration.setCompanyCity, setLocalCity)
                      }
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent text-gray-900 bg-gray-50 transition-all"
                      placeholder="Berlin"
                    />
                  </div>
                </div>

                {/* Land und Radius */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="country">
                      Land (ISO-Code)
                    </label>
                    <input
                      type="text"
                      id="country"
                      value={localCountry}
                      onChange={handleCountryChange}
                      onAnimationStart={e =>
                        handleAutofillSync(
                          e,
                          val =>
                            typeof val === 'string'
                              ? registration.setCompanyCountry(val.toUpperCase())
                              : undefined,
                          val => (typeof val === 'string' ? setLocalCountry(val.toUpperCase()) : undefined)
                        )
                      }
                      required
                      maxLength={2}
                      placeholder="DE"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent text-gray-900 bg-gray-50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="radiusKm">
                      Einzugsgebiet (km)
                    </label>
                    <input
                      type="number"
                      id="radiusKm"
                      value={localRadiusKm}
                      onChange={handleRadiusKmChange}
                      min={1}
                      max={200}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent text-gray-900 bg-gray-50 transition-all"
                    />
                  </div>
                </div>

                {/* Mobile Map */}
                <div className="lg:hidden mb-6 rounded-xl overflow-hidden" style={{ height: '250px' }}>
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={{ lat: mapCenterLat, lng: mapCenterLng }}
                    zoom={typeof localLat === 'number' && typeof localLng === 'number' ? 10 : 6}
                  >
                    {typeof localLat === 'number' && typeof localLng === 'number' && (
                      <Marker position={{ lat: localLat, lng: localLng }} />
                    )}
                    {typeof localLat === 'number' &&
                      typeof localLng === 'number' &&
                      typeof currentRadiusKmForMap === 'number' &&
                      currentRadiusKmForMap > 0 && (
                        <Circle
                          center={{ lat: localLat, lng: localLng }}
                          radius={currentRadiusKmForMap * 1000}
                          options={{
                            fillColor: '#14ad9f',
                            fillOpacity: 0.2,
                            strokeColor: '#14ad9f',
                            strokeOpacity: 0.7,
                            strokeWeight: 2,
                            clickable: false,
                            draggable: false,
                            editable: false,
                            visible: true,
                            zIndex: 1,
                          }}
                        />
                      )}
                  </GoogleMap>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={!isFormValid()}
                  className="w-full px-6 py-4 bg-[#14ad9f] text-white font-semibold rounded-xl hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#14ad9f] focus:ring-offset-2"
                >
                  Weiter zu Schritt 3
                </button>

                {/* Back Link */}
                <p className="mt-6 text-center text-sm text-gray-600">
                  <Link href="/register/company" className="text-[#14ad9f] hover:underline font-medium">
                    Zurück zu Schritt 1
                  </Link>
                </p>
              </form>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-md"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Registrierungsschritte
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    index < 2 
                      ? 'bg-[#14ad9f] text-white' 
                      : index === 1
                        ? 'bg-[#14ad9f] text-white'
                        : 'bg-gray-100 text-gray-400'
                  }`}>
                    {index < 2 ? <Check className="h-4 w-4" /> : index + 1}
                  </div>
                  <p className={`text-base ${index <= 1 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                    {step}
                  </p>
                </div>
              ))}
            </div>
            <button
              onClick={() => setIsModalOpen(false)}
              className="w-full mt-8 py-3 bg-[#14ad9f] text-white rounded-xl hover:bg-teal-600 transition-colors font-semibold"
            >
              Verstanden
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
