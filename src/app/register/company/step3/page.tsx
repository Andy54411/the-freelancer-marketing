'use client';

import React, {
  ChangeEvent,
  Dispatch,
  SetStateAction,
  useState,
  useEffect,
  AnimationEvent,
  useCallback,
} from 'react';
import Image from 'next/image'; // Importiere next/image
import { useRouter } from 'next/navigation';
import ProgressBar from '@/components/ProgressBar';
import { FiX, FiInfo, FiLoader, FiCheckCircle, FiAlertCircle } from 'react-icons/fi'; // FiAlertCircle hinzugefügt
import PopupModal from '@/app/register/company/step4/components/PopupModal'; // Pfad prüfen
import { useRegistration } from '@/contexts/Registration-Context';
import { PAGE_LOG, PAGE_ERROR } from '@/lib/constants';

const STEP3_PAGE_LOG = '[Register Company Step3 LOG]';

const steps: string[] = [
  'Über Sie',
  'Firmensitz & Einsatzgebiet',
  'Profil & Nachweise',
  'Fähigkeiten',
  'Abschluss & Verifizierung',
];

// Konstanten für Dateigrößen
const PROFILE_ICON_TARGET_DIMENSION = 256;
const MIN_PROFILE_PIC_DIMENSION = 128;
const MAX_PROFILE_PIC_SIZE_BYTES = 512 * 1024; // 512 KB
const MAX_BUSINESS_LICENSE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_MASTER_CERT_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB
const JPEG_QUALITY = 0.85;

type TaxInputType = 'hrn' | 'taxId' | 'vatId' | null;

const germanLegalForms: string[] = [
  'Einzelunternehmen',
  'GbR (Gesellschaft bürgerlichen Rechts)',
  'OHG (Offene Handelsgesellschaft)',
  'KG (Kommanditgesellschaft)',
  'GmbH (Gesellschaft mit beschränkter Haftung)',
  'UG (haftungsbeschränkt)',
  'AG (Aktiengesellschaft)',
  'e.K. (eingetragener Kaufmann / eingetragene Kauffrau)',
  'Freiberufler',
  'Sonstige',
];

export default function Step3CompanyPage() {
  const router = useRouter();
  const registration = useRegistration(); // Hook zum Zugriff auf den Kontext
  const {
    setProfilePictureFile,
    setBusinessLicenseFile,
    setMasterCraftsmanCertificateFile,
    hourlyRate,
    legalForm, // Wert aus dem Context
    companyRegister,
    taxNumber,
    vatId,
    setHourlyRate,
    setLegalForm, // Setter für legalForm im Context
    setCompanyRegister,
    setTaxNumber,
    setVatId,
  } = registration;

  // Lokale Zustände für UI und Fehler
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [businessLicensePreview, setBusinessLicensePreview] = useState<string | null>(null);
  const [masterCraftsmanCertificatePreview, setMasterCraftsmanCertificatePreview] = useState<
    string | null
  >(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [activeTaxInput, setActiveTaxInput] = useState<TaxInputType>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // Zustand für Fehlermeldungen

  // Initialisierung und Synchronisierung mit dem Context
  useEffect(() => {
    // Bestimme das aktive Steuer-Eingabefeld basierend auf den Kontextwerten bei Initialisierung
    if (registration.companyRegister) {
      setActiveTaxInput('hrn');
    } else if (registration.taxNumber) {
      setActiveTaxInput('taxId');
    } else if (registration.vatId) {
      setActiveTaxInput('vatId');
    } else {
      setActiveTaxInput(null); // Setze zurück, wenn keine Steuer-ID im Kontext vorhanden ist
    }
  }, [
    registration.legalForm,
    registration.companyRegister,
    registration.taxNumber,
    registration.vatId,
    // Hinzugefügte Abhängigkeiten gemäß ESLint-Warnung für den Log-Teil:
    registration.hourlyRate,
    registration.profilePictureFile,
    registration.businessLicenseFile,
    registration.masterCraftsmanCertificateFile,
  ]);

  // UseEffect für Profilbild-Vorschau
  useEffect(() => {
    let objectUrl: string | null = null;
    if (registration.profilePictureFile && registration.profilePictureFile instanceof File) {
      try {
        objectUrl = URL.createObjectURL(registration.profilePictureFile);
        setProfilePicturePreview(objectUrl);
      } catch (e) {
        setProfilePicturePreview(null);
      }
    } else {
      setProfilePicturePreview(null);
    }
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [registration.profilePictureFile]);

  // UseEffect für Gewerbeschein-Vorschau
  useEffect(() => {
    let objectUrl: string | null = null;
    if (registration.businessLicenseFile && registration.businessLicenseFile instanceof File) {
      try {
        objectUrl = URL.createObjectURL(registration.businessLicenseFile);
        setBusinessLicensePreview(objectUrl);
      } catch (e) {
        setBusinessLicensePreview(null);
      }
    } else {
      setBusinessLicensePreview(null);
    }
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [registration.businessLicenseFile]);

  // UseEffect für Meisterbrief-Vorschau
  useEffect(() => {
    let objectUrl: string | null = null;
    if (
      registration.masterCraftsmanCertificateFile &&
      registration.masterCraftsmanCertificateFile instanceof File
    ) {
      try {
        objectUrl = URL.createObjectURL(registration.masterCraftsmanCertificateFile);
        setMasterCraftsmanCertificatePreview(objectUrl);
      } catch (e) {
        setMasterCraftsmanCertificatePreview(null);
      }
    } else {
      setMasterCraftsmanCertificatePreview(null);
    }
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [registration.masterCraftsmanCertificateFile]);

  // Bildverarbeitung für Profilbild
  const processProfileImage = useCallback(
    (file: File): Promise<File | null> => {
      return new Promise(resolve => {
        if (
          !file.type.startsWith('image/') ||
          (file.type !== 'image/jpeg' && file.type !== 'image/png')
        ) {
          setErrorMessage('Bitte laden Sie ein Bild im JPEG- oder PNG-Format hoch.');
          resolve(null);
          return;
        }
        setIsProcessingImage(true);
        setErrorMessage(null); // Reset error on new attempt
        const reader = new FileReader();
        reader.onload = event => {
          // event ist vom Typ ProgressEvent<FileReader>
          const img = new window.Image(); // Explizit window.Image verwenden
          img.onload = () => {
            if (img.width < MIN_PROFILE_PIC_DIMENSION || img.height < MIN_PROFILE_PIC_DIMENSION) {
              setErrorMessage(
                `Das Bild muss mindestens ${MIN_PROFILE_PIC_DIMENSION}x${MIN_PROFILE_PIC_DIMENSION} Pixel groß sein. Ihr Bild ist ${img.width}x${img.height} Pixel.`
              );
              setIsProcessingImage(false);
              resolve(null);
              return;
            }
            const canvas = document.createElement('canvas');
            let sourceX = 0,
              sourceY = 0,
              sourceWidth = img.width,
              sourceHeight = img.height;
            const targetDim = PROFILE_ICON_TARGET_DIMENSION;
            if (img.width > img.height) {
              sourceWidth = img.height;
              sourceX = (img.width - img.height) / 2;
            } else if (img.height > img.width) {
              sourceHeight = img.width;
              sourceY = (img.height - img.width) / 2;
            }
            canvas.width = targetDim;
            canvas.height = targetDim;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              setIsProcessingImage(false);
              resolve(file);
              return;
            }
            ctx.drawImage(
              img,
              sourceX,
              sourceY,
              sourceWidth,
              sourceHeight,
              0,
              0,
              targetDim,
              targetDim
            );
            canvas.toBlob(
              blob => {
                setIsProcessingImage(false);
                if (blob) {
                  const nameWithoutExtension =
                    file.name.lastIndexOf('.') > 0
                      ? file.name.substring(0, file.name.lastIndexOf('.'))
                      : file.name;
                  const newFileName = `${nameWithoutExtension}.jpg`;
                  const processedImageFile = new File([blob], newFileName, {
                    type: 'image/jpeg',
                    lastModified: Date.now(),
                  });

                  resolve(processedImageFile);
                } else {
                  resolve(file);
                }
              },
              'image/jpeg',
              JPEG_QUALITY
            );
          };
          img.onerror = () => {
            setIsProcessingImage(false);
            resolve(file);
          };
          if (event.target?.result && typeof event.target.result === 'string') {
            img.src = event.target.result;
          } else {
            setIsProcessingImage(false);
            resolve(file);
          }
        };
        reader.onerror = () => {
          setIsProcessingImage(false);
          resolve(null);
        }; // resolve(null) bei Fehler
        reader.readAsDataURL(file);
      });
    },
    [setErrorMessage, setIsProcessingImage]
  ); // Korrigierte Abhängigkeiten

  // Handler für Dateiänderungen (allgemein)
  const handleFileChange = async (
    e: ChangeEvent<HTMLInputElement>,
    fileSetter: Dispatch<SetStateAction<File | null | undefined>>,
    localPreviewSetter: Dispatch<SetStateAction<string | null>>,
    maxSizeBytes?: number,
    fileTypeForAlert?: string,
    isProfilePic: boolean = false
  ): Promise<void> => {
    const inputFile = e.target.files?.[0] || null;
    let fileToSet: File | null = inputFile;

    setErrorMessage(null); // Reset error message

    // Revoke previous object URL if exists
    localPreviewSetter(prevLocalPreviewUrl => {
      if (prevLocalPreviewUrl && typeof URL !== 'undefined' && URL.revokeObjectURL) {
        URL.revokeObjectURL(prevLocalPreviewUrl);
      }
      return null;
    });

    if (inputFile) {
      setIsProcessingImage(true);
      if (isProfilePic) {
        const processedImage = await processProfileImage(inputFile);
        if (!processedImage) {
          fileSetter(null);
          if (e.target) e.target.value = '';
          setIsProcessingImage(false);
          return;
        }
        fileToSet = processedImage;
      }

      if (maxSizeBytes && fileToSet && fileToSet.size > maxSizeBytes) {
        setErrorMessage(
          `Die Datei für "${fileTypeForAlert || 'diesen Upload'}" (${fileToSet.name}) ist zu groß (${(fileToSet.size / (1024 * 1024)).toFixed(2)}MB). Max. ${(maxSizeBytes / (1024 * 1024)).toFixed(2)}MB.`
        );
        fileSetter(null);
        if (e.target) e.target.value = '';
        setIsProcessingImage(false);
        return;
      }

      fileSetter(fileToSet); // Setze das File-Objekt in den Kontext
      if (fileToSet && typeof URL !== 'undefined' && URL.createObjectURL) {
        try {
          const newPreviewUrl = URL.createObjectURL(fileToSet);
          localPreviewSetter(newPreviewUrl);
        } catch (urlError) {
          localPreviewSetter(null);
        }
      }
      setIsProcessingImage(false);
    } else {
      fileSetter(null);
      setIsProcessingImage(false);
    }
  };

  // Hinzugefügte Funktion für Autofill-Synchronisation
  const handleAutofillSync = <T extends string | undefined>(
    event: AnimationEvent<HTMLInputElement>,
    setter: Dispatch<SetStateAction<T>>
  ) => {
    if (event.animationName === 'onAutoFillStart' && event.target instanceof HTMLInputElement) {
      // event.target.value ist immer string.
      // Wenn T string | undefined ist, ist string zuweisbar.
      // Wenn T string ist, ist string zuweisbar.
      setter(event.target.value as T);
    }
  };

  const closeModal = () => setIsModalOpen(false);

  // Validierungslogik für steuerliche Identifikation (useCallback für Optimierung)
  const validateTaxId = useCallback((): { isValid: boolean; missingFields: string[] } => {
    const isCapitalCompany =
      legalForm?.includes('GmbH') || legalForm?.includes('UG') || legalForm?.includes('AG');
    const isEK = legalForm?.includes('e.K.');
    const isUnincorporatedPartnership =
      legalForm?.includes('GbR') ||
      legalForm?.includes('OHG') ||
      legalForm?.includes('KG') ||
      legalForm?.includes('Partnerschaft');
    const isIndividual =
      legalForm?.includes('Einzelunternehmen') || legalForm?.includes('Freiberufler');

    let valid = false;
    let missing: string[] = [];

    if (isCapitalCompany || isEK) {
      // HRN ist für Kapitalgesellschaften und e.K. primär
      if (!companyRegister?.trim()) {
        missing.push('Handelsregisternummer');
      } else {
        valid = true;
      }
    }

    if (!valid) {
      // Wenn HRN nicht valid ist oder nicht primär gefordert
      if (isCapitalCompany || isUnincorporatedPartnership) {
        // Für Kapitalges. und Personenges. (ohne HRN)
        if (!taxNumber?.trim() && !vatId?.trim()) {
          missing.push('Steuernummer ODER USt-IdNr.');
        } else {
          valid = true;
        }
      } else if (isIndividual && !isEK) {
        // Einzelunternehmen / Freiberufler, die kein e.K. sind
        if (!taxNumber?.trim() && !vatId?.trim()) {
          missing.push('Steuernummer ODER USt-IdNr.');
        } else {
          valid = true;
        }
      } else {
        // Sonstige Rechtsformen oder Fallback, wenn nichts spezifisches zutrifft
        if (!companyRegister?.trim() && !taxNumber?.trim() && !vatId?.trim()) {
          missing.push('Handelsregisternummer, Steuernummer ODER USt-IdNr.');
        } else {
          valid = true;
        }
      }
    }

    missing = [...new Set(missing)]; // Duplikate entfernen
    return { isValid: valid, missingFields: missing };
  }, [legalForm, companyRegister, taxNumber, vatId]);

  // Gesamtvalidierung des Formulars (useCallback für Optimierung)
  const isFormValid = useCallback((): boolean => {
    const isProfilePicValid = !!registration.profilePictureFile; // Prüfe, ob File-Objekt existiert
    const isHourlyRateValid = !!hourlyRate && parseFloat(hourlyRate) > 0; // Stundenpreis muss > 0 sein
    const isBusinessLicenseValid = !!registration.businessLicenseFile; // Prüfe, ob File-Objekt existiert
    const isLegalFormValid = !!legalForm?.trim(); // Rechtsform muss ausgewählt sein
    const { isValid: isTaxIdValid } = validateTaxId(); // Steuerliche ID Validierung

    return (
      isProfilePicValid &&
      isHourlyRateValid &&
      isBusinessLicenseValid &&
      isLegalFormValid &&
      isTaxIdValid &&
      !isProcessingImage
    ); // Formular ist ungültig, während ein Bild verarbeitet wird
  }, [
    registration.profilePictureFile,
    hourlyRate,
    registration.businessLicenseFile,
    legalForm,
    validateTaxId,
    isProcessingImage,
  ]);

  // Handler für den "Weiter"-Klick (Formular-Submit)
  const handleNextSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Standard-Submit des Browsers verhindern

    // Überprüfe die Gültigkeit des Formulars mit der aktuellen Validierungslogik
    if (!isFormValid()) {
      const missingAlerts: string[] = [];

      // Allgemeine Pflichtfelder
      if (!registration.profilePictureFile) missingAlerts.push('Profilbild');
      if (!hourlyRate || parseFloat(hourlyRate) <= 0)
        missingAlerts.push('Stundenpreis (muss > 0 sein)');
      if (!registration.businessLicenseFile) missingAlerts.push('Gewerbeschein');
      if (!legalForm?.trim()) missingAlerts.push('Rechtsform');

      // Spezifische steuerliche Identifikation
      const { isValid: isTaxIdValid, missingFields: taxIdMissing } = validateTaxId();
      if (!isTaxIdValid) {
        if (taxIdMissing.length > 0) {
          missingAlerts.push(...taxIdMissing); // Füge spezifische Meldungen hinzu
        } else {
          // Fallback für den Fall, dass validateTaxId keine spezifischen Meldungen liefert
          missingAlerts.push('Steuerliche Identifikation');
        }
      }

      // Fehlermeldung setzen und anzeigen
      setErrorMessage(
        `Bitte füllen Sie alle erforderlichen Felder aus: ${[...new Set(missingAlerts)].join(', ')}.`
      );
      return; // Submit verhindern, da Formular ungültig ist
    }

    setErrorMessage(null); // Fehlermeldung zurücksetzen, wenn Formular gültig ist

    router.push('/register/company/step4'); // Navigiere zum nächsten Schritt
  };

  // Hilfsfunktion zur Bestimmung der CSS-Klasse für die Steuer-Input-Karten
  const getTaxInputCardClass = useCallback(
    (type: TaxInputType): string => {
      const baseClasses =
        'p-4 border-2 rounded-lg cursor-pointer text-center transition-all duration-200 hover:shadow-md flex items-center justify-center';
      const isActive = activeTaxInput === type;
      const hasValue =
        (type === 'hrn' && companyRegister) ||
        (type === 'taxId' && taxNumber) ||
        (type === 'vatId' && vatId);

      // Bestimme, ob dieses Feld erforderlich ist und fehlt
      const { isValid: isTaxIdValid, missingFields: taxIdMissing } = validateTaxId();
      const isRequiredAndMissing =
        !isTaxIdValid &&
        taxIdMissing.some(
          field =>
            (type === 'hrn' && field.includes('Handelsregisternummer')) ||
            (type === 'taxId' && field.includes('Steuernummer')) ||
            (type === 'vatId' && field.includes('USt-IdNr.')) ||
            (field.includes('Steuerliche Identifikation') &&
              (type === 'hrn' || type === 'taxId' || type === 'vatId'))
        );

      if (isActive) {
        return `${baseClasses} bg-teal-500 text-white border-teal-500 ring-2 ring-offset-2 ring-teal-500`;
      } else if (errorMessage !== null && isRequiredAndMissing && !hasValue) {
        // Zeigt Fehler an, wenn Formular eingereicht und Feld fehlt
        return `${baseClasses} bg-red-50 text-red-700 border-red-500 hover:bg-red-100`;
      } else {
        return `${baseClasses} bg-white text-gray-700 border-gray-300 hover:bg-teal-50 hover:text-teal-600 hover:border-teal-500`;
      }
    },
    [activeTaxInput, companyRegister, taxNumber, vatId, validateTaxId, errorMessage]
  ); // legalForm entfernt, da in validateTaxId enthalten

  // Hilfsfunktion zur Bestimmung der CSS-Klasse für Input-Felder (mit Fehler-Highlighting)
  const getInputFieldClass = useCallback((hasError: boolean): string => {
    return `w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${hasError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-teal-500'} text-gray-800`;
  }, []);

  // Hilfsfunktion zur Bestimmung der CSS-Klasse für Labels (mit Fehler-Highlighting)
  const getLabelClass = useCallback((hasError: boolean): string => {
    return `block text-gray-700 text-sm font-semibold mb-2 ${hasError ? 'text-red-600' : ''}`;
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br p-4 sm:p-6 font-sans">
      {isProcessingImage && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-xl flex items-center">
            <FiLoader className="animate-spin h-5 w-5 mr-3 text-teal-600" />
            <span>Bild wird verarbeitet...</span>
          </div>
        </div>
      )}
      <div className="w-full max-w-xl lg:max-w-4xl mx-auto mb-6 px-4">
        <div className="flex justify-end mb-4">
          <button
            onClick={() => router.push('/')}
            className="text-[#14ad9f] hover:text-teal-700 text-base sm:text-lg flex items-center transition-colors duration-200"
            disabled={isProcessingImage}
          >
            <span className="mr-2">Abbrechen</span> <FiX />
          </button>
        </div>
        <div className="mb-6">
          <ProgressBar currentStep={3} totalSteps={5} />
        </div>
        <div className="flex justify-between items-center mb-6">
          <p className="text-lg sm:text-xl text-teal-600 font-semibold">
            Schritt 3/5: Profil & Nachweise
          </p>
          <div className="flex items-center">
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-sm sm:text-base text-teal-600 hover:underline mr-2 cursor-pointer"
              disabled={isProcessingImage}
            >
              Schritte anzeigen
            </button>
            <FiInfo className="text-teal-600 text-xl sm:text-2xl" />
          </div>
        </div>
      </div>

      <div className="max-w-xl w-full bg-white p-6 sm:p-8 rounded-xl shadow-2xl border border-gray-200">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 text-center">
          Profil und Nachweise
        </h2>
        <p className="text-gray-600 text-center mb-8">
          Laden Sie Ihr Profilbild, Ihren Gewerbeschein und optional den Meisterbrief hoch.
        </p>

        <form className="space-y-6" onSubmit={handleNextSubmit}>
          {errorMessage && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg flex items-center mb-4">
              <FiAlertCircle className="mr-2 text-xl" />
              <p className="text-sm">{errorMessage}</p>
            </div>
          )}

          {/* Profilbild Upload */}
          <div className="text-center">
            <label
              htmlFor="profilePictureInput"
              className={`${getLabelClass(!registration.profilePictureFile && errorMessage !== null)} text-center p-2`}
            >
              Profilbild* (min. {MIN_PROFILE_PIC_DIMENSION}x{MIN_PROFILE_PIC_DIMENSION}px, max.{' '}
              {(MAX_PROFILE_PIC_SIZE_BYTES / 1024).toFixed(0)}KB, JPEG/PNG)
            </label>
            <div
              className={`mt-2 mb-4 w-24 h-24 mx-auto border-2 ${!registration.profilePictureFile && errorMessage !== null ? 'border-red-500' : 'border-teal-500'} rounded-full flex justify-center items-center bg-gray-200 overflow-hidden shadow-sm`}
            >
              {profilePicturePreview ? (
                <Image
                  src={profilePicturePreview}
                  alt="Profilbild Vorschau"
                  width={96} // w-24 -> 24*4 = 96px
                  height={96} // h-24 -> 24*4 = 96px
                  className="object-cover"
                />
              ) : (
                <span className="text-gray-400 text-sm">Vorschau</span>
              )}
            </div>
            <div className="w-64 mx-auto">
              <input
                type="file"
                onChange={e =>
                  handleFileChange(
                    e,
                    setProfilePictureFile,
                    setProfilePicturePreview,
                    MAX_PROFILE_PIC_SIZE_BYTES,
                    'Profilbild',
                    true
                  )
                }
                className="hidden"
                id="profilePictureInput"
                accept="image/jpeg, image/png"
                disabled={isProcessingImage}
              />
              <button
                type="button"
                disabled={isProcessingImage}
                className="w-full py-2 px-4 border-2 border-teal-500 rounded-lg text-teal-600 hover:bg-teal-50 disabled:opacity-50 transition-colors duration-200"
                onClick={() => {
                  const el = document.getElementById('profilePictureInput');
                  if (el) el.click();
                }}
              >
                Datei auswählen
              </button>
              {registration.profilePictureFile && (
                <p className="mt-1 text-xs text-gray-600">
                  {registration.profilePictureFile.name} (
                  {(registration.profilePictureFile.size / 1024).toFixed(2)}KB)
                </p>
              )}
            </div>
          </div>

          {/* Stundenpreis */}
          <div>
            <label
              htmlFor="hourlyRateInput"
              className={`${getLabelClass(!hourlyRate && errorMessage !== null)} text-center p-2`}
            >
              Stundenpreis (€)*
            </label>
            <input
              type="number"
              id="hourlyRateInput"
              value={hourlyRate || ''}
              onChange={e => setHourlyRate(e.target.value)}
              className={`${getInputFieldClass(!hourlyRate && errorMessage !== null)} text-center`}
              placeholder="z.B. 50"
              required // HTML5 required Attribut beibehalten
              min="1"
              disabled={isProcessingImage}
            />
          </div>

          {/* Gewerbeschein Upload */}
          <div>
            <label
              htmlFor="businessLicenseInput"
              className={`${getLabelClass(!registration.businessLicenseFile && errorMessage !== null)} text-center p-2`}
            >
              Gewerbeschein hochladen* (max.{' '}
              {(MAX_BUSINESS_LICENSE_SIZE_BYTES / (1024 * 1024)).toFixed(0)}MB)
            </label>
            <div className="w-64 mx-auto">
              <input
                type="file"
                onChange={e =>
                  handleFileChange(
                    e,
                    setBusinessLicenseFile,
                    setBusinessLicensePreview,
                    MAX_BUSINESS_LICENSE_SIZE_BYTES,
                    'Gewerbeschein',
                    false
                  )
                }
                className="hidden"
                id="businessLicenseInput"
                accept=".pdf, image/jpeg, image/png, .heic, .heif"
                disabled={isProcessingImage}
              />
              <button
                type="button"
                disabled={isProcessingImage}
                className="w-full py-2 px-4 border-2 border-teal-500 rounded-lg text-teal-600 hover:bg-teal-50 disabled:opacity-50 transition-colors duration-200"
                onClick={() => {
                  const el = document.getElementById('businessLicenseInput');
                  if (el) el.click();
                }}
              >
                Datei auswählen
              </button>
              {registration.businessLicenseFile && (
                <p className="mt-1 text-xs text-gray-600">
                  {registration.businessLicenseFile.name}
                </p>
              )}
              {businessLicensePreview && (
                <Image
                  src={businessLicensePreview}
                  alt="Gewerbeschein Vorschau"
                  width={180} // Beispielbreite
                  height={128} // max-h-32 -> 32*4 = 128px
                  objectFit="contain"
                  className="my-2 rounded border mx-auto"
                />
              )}
            </div>
          </div>

          {/* Meisterbrief Upload (optional) */}
          <div>
            <label
              htmlFor="masterCraftsmanCertificateInput"
              className="block text-gray-700 font-semibold text-center p-2"
            >
              Meisterbrief hochladen (optional, max.{' '}
              {(MAX_MASTER_CERT_SIZE_BYTES / (1024 * 1024)).toFixed(0)}MB)
            </label>
            <div className="w-64 mx-auto">
              <input
                type="file"
                onChange={e =>
                  handleFileChange(
                    e,
                    setMasterCraftsmanCertificateFile,
                    setMasterCraftsmanCertificatePreview,
                    MAX_MASTER_CERT_SIZE_BYTES,
                    'Meisterbrief',
                    false
                  )
                }
                className="hidden"
                id="masterCraftsmanCertificateInput"
                accept=".pdf, image/jpeg, image/png, .heic, .heif"
                disabled={isProcessingImage}
              />
              <button
                type="button"
                disabled={isProcessingImage}
                className="w-full py-2 px-4 border-2 border-teal-500 rounded-lg text-teal-600 hover:bg-teal-50 disabled:opacity-50 transition-colors duration-200"
                onClick={() => {
                  const el = document.getElementById('masterCraftsmanCertificateInput');
                  if (el) el.click();
                }}
              >
                Datei auswählen
              </button>
              {registration.masterCraftsmanCertificateFile && (
                <p className="mt-1 text-xs text-gray-600">
                  {registration.masterCraftsmanCertificateFile.name}
                </p>
              )}
              {masterCraftsmanCertificatePreview && (
                <Image
                  src={masterCraftsmanCertificatePreview}
                  alt="Meisterbrief Vorschau"
                  width={180} // Beispielbreite
                  height={128} // max-h-32 -> 32*4 = 128px
                  objectFit="contain"
                  className="my-2 rounded border mx-auto"
                />
              )}
            </div>
          </div>

          {/* Rechtsform Auswahl */}
          <div className="border-t border-gray-200 pt-6">
            <label
              htmlFor="legalFormInput"
              className={`${getLabelClass(!legalForm && errorMessage !== null)} text-center p-2 mb-2`}
            >
              Rechtsform Ihres Unternehmens*
            </label>
            <select
              id="legalFormInput"
              value={legalForm || ''} // Nutze legalForm direkt vom Context
              onChange={e => setLegalForm(e.target.value || null)} // Setze direkt in den Kontext
              className={`${getInputFieldClass(!legalForm && errorMessage !== null)} text-center bg-white`}
              required // HTML5 required Attribut beibehalten
              disabled={isProcessingImage}
            >
              <option value="">Bitte wählen...</option>
              {germanLegalForms.map(formType => (
                <option key={formType} value={formType}>
                  {formType}
                </option>
              ))}
            </select>
          </div>

          {/* Steuerliche Identifikation */}
          <div className="pt-4">
            <p
              className={`text-sm text-center mb-4 ${!validateTaxId().isValid && errorMessage !== null ? 'text-red-600' : 'text-gray-700'}`}
            >
              Steuerliche Identifikation:
              {legalForm &&
              (legalForm.includes('GmbH') ||
                legalForm.includes('UG') ||
                legalForm.includes('AG') ||
                legalForm.includes('e.K.'))
                ? ' Handelsregisternummer ist für Ihre Rechtsform erforderlich.'
                : ' Mindestens eine Angabe (HRN, Steuernr. oder USt-IdNr.) ist erforderlich.'}
              {/* Optional: Detailiertere Fehlermeldung, wenn ungültig */}
              {!validateTaxId().isValid &&
                errorMessage !== null &&
                validateTaxId().missingFields.length > 0 && (
                  <span className="block text-red-500 mt-1">
                    ({validateTaxId().missingFields.join(', ')})
                  </span>
                )}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div onClick={() => setActiveTaxInput('hrn')} className={getTaxInputCardClass('hrn')}>
                HRN
                {companyRegister && (
                  <FiCheckCircle className="inline-block ml-1 text-base text-green-500" />
                )}
              </div>
              <div
                onClick={() => setActiveTaxInput('taxId')}
                className={getTaxInputCardClass('taxId')}
              >
                Steuernr.
                {taxNumber && (
                  <FiCheckCircle className="inline-block ml-1 text-base text-green-500" />
                )}
              </div>
              <div
                onClick={() => setActiveTaxInput('vatId')}
                className={getTaxInputCardClass('vatId')}
              >
                USt-IdNr.
                {vatId && <FiCheckCircle className="inline-block ml-1 text-base text-green-500" />}
              </div>
            </div>
            {activeTaxInput === 'hrn' && (
              <div className="mt-2">
                <label
                  htmlFor="companyRegisterInput"
                  className="block text-teal-600 font-semibold text-center p-1"
                >
                  Handelsregisternummer eingeben
                </label>
                <input
                  type="text"
                  id="companyRegisterInput"
                  value={companyRegister || ''}
                  onChange={e => setCompanyRegister(e.target.value)}
                  onAnimationStart={(e: AnimationEvent<HTMLInputElement>) =>
                    handleAutofillSync(e, setCompanyRegister)
                  }
                  className={`${getInputFieldClass(!companyRegister && errorMessage !== null && activeTaxInput === 'hrn' && !validateTaxId().isValid)} text-center`}
                  placeholder="z.B. HRB 12345"
                  disabled={isProcessingImage}
                />
              </div>
            )}
            {activeTaxInput === 'taxId' && (
              <div className="mt-2">
                <label
                  htmlFor="taxNumberInput"
                  className="block text-teal-600 font-semibold text-center p-1"
                >
                  Steuernummer eingeben
                </label>
                <input
                  type="text"
                  id="taxNumberInput"
                  value={taxNumber || ''}
                  onChange={e => setTaxNumber(e.target.value)}
                  onAnimationStart={(e: AnimationEvent<HTMLInputElement>) =>
                    handleAutofillSync(e, setTaxNumber)
                  }
                  className={`${getInputFieldClass(!taxNumber && errorMessage !== null && activeTaxInput === 'taxId' && !validateTaxId().isValid)} text-center`}
                  placeholder="Ihre nationale Steuernummer"
                  disabled={isProcessingImage}
                />
              </div>
            )}
            {activeTaxInput === 'vatId' && (
              <div className="mt-2">
                <label
                  htmlFor="vatIdInput"
                  className="block text-teal-600 font-semibold text-center p-1"
                >
                  Umsatzsteuer-ID (USt-IdNr.) eingeben
                </label>
                <input
                  type="text"
                  id="vatIdInput"
                  value={vatId || ''}
                  onChange={e => setVatId(e.target.value)}
                  onAnimationStart={(e: AnimationEvent<HTMLInputElement>) =>
                    handleAutofillSync(e, setVatId)
                  }
                  className={`${getInputFieldClass(!vatId && errorMessage !== null && activeTaxInput === 'vatId' && !validateTaxId().isValid)} text-center`}
                  placeholder="z.B. DE123456789"
                  disabled={isProcessingImage}
                />
              </div>
            )}
          </div>

          <div className="mt-6 text-center">
            <button
              type="submit"
              disabled={isProcessingImage}
              className="w-full py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition duration-300 font-semibold disabled:opacity-50"
            >
              Weiter zu Schritt 4
            </button>
          </div>
        </form>
      </div>
      <PopupModal isOpen={isModalOpen} onClose={closeModal} steps={steps} />
    </div>
  );
}
