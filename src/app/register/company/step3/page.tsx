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
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import ProgressBar from '@/components/ProgressBar';
import { X, Info, Loader2, CheckCircle, AlertCircle, Upload, User, FileText, Award, Building2, Euro, ArrowLeft, ArrowRight } from 'lucide-react';
import PopupModal from '@/app/register/company/step4/components/PopupModal';
import { useRegistration } from '@/contexts/Registration-Context';
import dynamic from 'next/dynamic';

const PdfThumbnail = dynamic(() => import('@/components/PdfThumbnail'), { ssr: false });

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

  // UseEffect für Gewerbeschein-Vorschau (nur für Bilder, PDFs werden direkt gerendert)
  useEffect(() => {
    let objectUrl: string | null = null;
    if (registration.businessLicenseFile && registration.businessLicenseFile instanceof File) {
      if (registration.businessLicenseFile.type !== 'application/pdf') {
        try {
          objectUrl = URL.createObjectURL(registration.businessLicenseFile);
          setBusinessLicensePreview(objectUrl);
        } catch {
          setBusinessLicensePreview(null);
        }
      } else {
        setBusinessLicensePreview('pdf');
      }
    } else {
      setBusinessLicensePreview(null);
    }
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [registration.businessLicenseFile]);

  // UseEffect für Meisterbrief-Vorschau (nur für Bilder, PDFs werden direkt gerendert)
  useEffect(() => {
    let objectUrl: string | null = null;
    if (
      registration.masterCraftsmanCertificateFile &&
      registration.masterCraftsmanCertificateFile instanceof File
    ) {
      if (registration.masterCraftsmanCertificateFile.type !== 'application/pdf') {
        try {
          objectUrl = URL.createObjectURL(registration.masterCraftsmanCertificateFile);
          setMasterCraftsmanCertificatePreview(objectUrl);
        } catch {
          setMasterCraftsmanCertificatePreview(null);
        }
      } else {
        setMasterCraftsmanCertificatePreview('pdf');
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
            // Weißen Hintergrund setzen für transparente PNGs
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, targetDim, targetDim);
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

  return (
    <div className="min-h-screen flex flex-col">
      {/* Processing Overlay */}
      {isProcessingImage && (
        <div className="fixed inset-0 bg-gray-900/75 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-2xl flex items-center">
            <Loader2 className="animate-spin h-6 w-6 mr-3 text-[#14ad9f]" />
            <span className="text-gray-700 font-medium">Bild wird verarbeitet...</span>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative bg-linear-to-br from-[#14ad9f] via-teal-600 to-teal-800 text-white">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: "url('/images/features/accounting-hero.png')" }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Navigation */}
          <div className="flex justify-between items-center mb-6">
            <Link 
              href="/register/company/step2"
              className="flex items-center text-white/80 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span>Zurück</span>
            </Link>
            <Link 
              href="/"
              className="flex items-center text-white/80 hover:text-white transition-colors"
            >
              <span className="mr-2">Abbrechen</span>
              <X className="w-5 h-5" />
            </Link>
          </div>

          {/* Progress */}
          <div className="max-w-2xl mx-auto mb-6">
            <ProgressBar currentStep={3} totalSteps={5} />
          </div>

          {/* Title */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="flex items-center justify-center mb-4">
              <p className="text-lg text-white/80">Schritt 3 von 5</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="ml-3 text-white/60 hover:text-white transition-colors"
              >
                <Info className="w-5 h-5" />
              </button>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
              Profil & Nachweise
            </h1>
            <p className="text-lg text-white/80 max-w-xl mx-auto">
              Laden Sie Ihr Profilbild, Ihren Gewerbeschein und optional den Meisterbrief hoch.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* Error Message */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start mb-6">
                <AlertCircle className="w-5 h-5 mr-3 mt-0.5 shrink-0" />
                <p className="text-sm">{errorMessage}</p>
              </div>
            )}

            <form onSubmit={handleNextSubmit} className="space-y-8">
              {/* Upload Section - Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profilbild */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center mb-4">
                    <User className="w-5 h-5 text-[#14ad9f] mr-2" />
                    <label className={`font-semibold ${!registration.profilePictureFile && errorMessage ? 'text-red-600' : 'text-gray-800'}`}>
                      Profilbild*
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">
                    Min. {MIN_PROFILE_PIC_DIMENSION}x{MIN_PROFILE_PIC_DIMENSION}px, max. {(MAX_PROFILE_PIC_SIZE_BYTES / 1024).toFixed(0)}KB, JPEG/PNG
                  </p>
                  
                  <div className={`w-24 h-24 mx-auto mb-4 border-2 ${!registration.profilePictureFile && errorMessage ? 'border-red-300' : 'border-[#14ad9f]'} rounded-full flex justify-center items-center bg-white overflow-hidden`}>
                    {profilePicturePreview ? (
                      <Image
                        src={profilePicturePreview}
                        alt="Profilbild Vorschau"
                        width={96}
                        height={96}
                        className="object-cover"
                      />
                    ) : (
                      <User className="w-10 h-10 text-gray-400" />
                    )}
                  </div>
                  
                  <input
                    type="file"
                    onChange={e => handleFileChange(e, setProfilePictureFile, setProfilePicturePreview, MAX_PROFILE_PIC_SIZE_BYTES, 'Profilbild', true)}
                    className="hidden"
                    id="profilePictureInput"
                    accept="image/jpeg, image/png"
                    disabled={isProcessingImage}
                  />
                  <button
                    type="button"
                    disabled={isProcessingImage}
                    className="w-full py-2.5 px-4 border-2 border-[#14ad9f] rounded-xl text-[#14ad9f] hover:bg-teal-50 disabled:opacity-50 transition-colors font-medium flex items-center justify-center"
                    onClick={() => document.getElementById('profilePictureInput')?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Datei auswählen
                  </button>
                  {registration.profilePictureFile && (
                    <p className="mt-2 text-xs text-gray-600 text-center truncate">
                      {registration.profilePictureFile.name}
                    </p>
                  )}
                </div>

                {/* Gewerbeschein */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center mb-4">
                    <FileText className="w-5 h-5 text-[#14ad9f] mr-2" />
                    <label className={`font-semibold ${!registration.businessLicenseFile && errorMessage ? 'text-red-600' : 'text-gray-800'}`}>
                      Gewerbeschein*
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">
                    Max. {(MAX_BUSINESS_LICENSE_SIZE_BYTES / (1024 * 1024)).toFixed(0)}MB, PDF/JPEG/PNG
                  </p>
                  
                  <div className={`w-24 h-24 mx-auto mb-4 border-2 ${!registration.businessLicenseFile && errorMessage ? 'border-red-300' : 'border-gray-200'} rounded-xl flex justify-center items-center bg-white overflow-hidden`}>
                    {registration.businessLicenseFile?.type === 'application/pdf' ? (
                      <PdfThumbnail file={registration.businessLicenseFile} width={96} />
                    ) : businessLicensePreview ? (
                      <img
                        src={businessLicensePreview}
                        alt="Gewerbeschein Vorschau"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <FileText className="w-10 h-10 text-gray-400" />
                    )}
                  </div>
                  
                  <input
                    type="file"
                    onChange={e => handleFileChange(e, setBusinessLicenseFile, setBusinessLicensePreview, MAX_BUSINESS_LICENSE_SIZE_BYTES, 'Gewerbeschein', false)}
                    className="hidden"
                    id="businessLicenseInput"
                    accept=".pdf, image/jpeg, image/png, .heic, .heif"
                    disabled={isProcessingImage}
                  />
                  <button
                    type="button"
                    disabled={isProcessingImage}
                    className="w-full py-2.5 px-4 border-2 border-[#14ad9f] rounded-xl text-[#14ad9f] hover:bg-teal-50 disabled:opacity-50 transition-colors font-medium flex items-center justify-center"
                    onClick={() => document.getElementById('businessLicenseInput')?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Datei auswählen
                  </button>
                  {registration.businessLicenseFile && (
                    <p className="mt-2 text-xs text-gray-600 text-center truncate">
                      {registration.businessLicenseFile.name}
                    </p>
                  )}
                </div>

                {/* Meisterbrief (optional) */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center mb-4">
                    <Award className="w-5 h-5 text-[#14ad9f] mr-2" />
                    <label className="font-semibold text-gray-800">
                      Meisterbrief
                    </label>
                    <span className="ml-2 text-xs text-gray-400">(optional)</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">
                    Max. {(MAX_MASTER_CERT_SIZE_BYTES / (1024 * 1024)).toFixed(0)}MB, PDF/JPEG/PNG
                  </p>
                  
                  <div className="w-24 h-24 mx-auto mb-4 border-2 border-gray-200 rounded-xl flex justify-center items-center bg-white overflow-hidden">
                    {registration.masterCraftsmanCertificateFile?.type === 'application/pdf' ? (
                      <PdfThumbnail file={registration.masterCraftsmanCertificateFile} width={96} />
                    ) : masterCraftsmanCertificatePreview ? (
                      <img
                        src={masterCraftsmanCertificatePreview}
                        alt="Meisterbrief Vorschau"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Award className="w-10 h-10 text-gray-400" />
                    )}
                  </div>
                  
                  <input
                    type="file"
                    onChange={e => handleFileChange(e, setMasterCraftsmanCertificateFile, setMasterCraftsmanCertificatePreview, MAX_MASTER_CERT_SIZE_BYTES, 'Meisterbrief', false)}
                    className="hidden"
                    id="masterCraftsmanCertificateInput"
                    accept=".pdf, image/jpeg, image/png, .heic, .heif"
                    disabled={isProcessingImage}
                  />
                  <button
                    type="button"
                    disabled={isProcessingImage}
                    className="w-full py-2.5 px-4 border-2 border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors font-medium flex items-center justify-center"
                    onClick={() => document.getElementById('masterCraftsmanCertificateInput')?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Datei auswählen
                  </button>
                  {registration.masterCraftsmanCertificateFile && (
                    <p className="mt-2 text-xs text-gray-600 text-center truncate">
                      {registration.masterCraftsmanCertificateFile.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Business Details Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Stundenpreis */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center mb-4">
                    <Euro className="w-5 h-5 text-[#14ad9f] mr-2" />
                    <label htmlFor="hourlyRateInput" className={`font-semibold ${!hourlyRate && errorMessage ? 'text-red-600' : 'text-gray-800'}`}>
                      Stundenpreis*
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      id="hourlyRateInput"
                      value={hourlyRate || ''}
                      onChange={e => setHourlyRate(e.target.value)}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] text-gray-800 text-lg ${!hourlyRate && errorMessage ? 'border-red-300' : 'border-gray-200'}`}
                      placeholder="z.B. 50"
                      required
                      min="1"
                      disabled={isProcessingImage}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg font-medium">EUR/h</span>
                  </div>
                </div>

                {/* Rechtsform */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center mb-4">
                    <Building2 className="w-5 h-5 text-[#14ad9f] mr-2" />
                    <label htmlFor="legalFormInput" className={`font-semibold ${!legalForm && errorMessage ? 'text-red-600' : 'text-gray-800'}`}>
                      Rechtsform*
                    </label>
                  </div>
                  <select
                    id="legalFormInput"
                    value={legalForm || ''}
                    onChange={e => setLegalForm(e.target.value || null)}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] text-gray-800 bg-white ${!legalForm && errorMessage ? 'border-red-300' : 'border-gray-200'}`}
                    required
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
              </div>

              {/* Tax Identification Section */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className={`font-semibold mb-2 ${!validateTaxId().isValid && errorMessage ? 'text-red-600' : 'text-gray-800'}`}>
                  Steuerliche Identifikation*
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {legalForm && (legalForm.includes('GmbH') || legalForm.includes('UG') || legalForm.includes('AG') || legalForm.includes('e.K.'))
                    ? 'Handelsregisternummer ist für Ihre Rechtsform erforderlich.'
                    : 'Mindestens eine Angabe (HRN, Steuernr. oder USt-IdNr.) ist erforderlich.'}
                </p>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setActiveTaxInput('hrn')}
                    className={`p-4 rounded-xl border-2 transition-all flex items-center justify-center font-medium ${
                      activeTaxInput === 'hrn'
                        ? 'bg-[#14ad9f] text-white border-[#14ad9f]'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-[#14ad9f] hover:text-[#14ad9f]'
                    }`}
                  >
                    HRN
                    {companyRegister && <CheckCircle className="w-4 h-4 ml-2 text-green-400" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTaxInput('taxId')}
                    className={`p-4 rounded-xl border-2 transition-all flex items-center justify-center font-medium ${
                      activeTaxInput === 'taxId'
                        ? 'bg-[#14ad9f] text-white border-[#14ad9f]'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-[#14ad9f] hover:text-[#14ad9f]'
                    }`}
                  >
                    Steuernr.
                    {taxNumber && <CheckCircle className="w-4 h-4 ml-2 text-green-400" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTaxInput('vatId')}
                    className={`p-4 rounded-xl border-2 transition-all flex items-center justify-center font-medium ${
                      activeTaxInput === 'vatId'
                        ? 'bg-[#14ad9f] text-white border-[#14ad9f]'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-[#14ad9f] hover:text-[#14ad9f]'
                    }`}
                  >
                    USt-IdNr.
                    {vatId && <CheckCircle className="w-4 h-4 ml-2 text-green-400" />}
                  </button>
                </div>

                {activeTaxInput === 'hrn' && (
                  <div>
                    <label htmlFor="companyRegisterInput" className="block text-sm font-medium text-gray-700 mb-2">
                      Handelsregisternummer
                    </label>
                    <input
                      type="text"
                      id="companyRegisterInput"
                      value={companyRegister || ''}
                      onChange={e => setCompanyRegister(e.target.value)}
                      onAnimationStart={(e: AnimationEvent<HTMLInputElement>) => handleAutofillSync(e, setCompanyRegister)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] text-gray-800"
                      placeholder="z.B. HRB 12345"
                      disabled={isProcessingImage}
                    />
                  </div>
                )}
                {activeTaxInput === 'taxId' && (
                  <div>
                    <label htmlFor="taxNumberInput" className="block text-sm font-medium text-gray-700 mb-2">
                      Steuernummer
                    </label>
                    <input
                      type="text"
                      id="taxNumberInput"
                      value={taxNumber || ''}
                      onChange={e => setTaxNumber(e.target.value)}
                      onAnimationStart={(e: AnimationEvent<HTMLInputElement>) => handleAutofillSync(e, setTaxNumber)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] text-gray-800"
                      placeholder="Ihre nationale Steuernummer"
                      disabled={isProcessingImage}
                    />
                  </div>
                )}
                {activeTaxInput === 'vatId' && (
                  <div>
                    <label htmlFor="vatIdInput" className="block text-sm font-medium text-gray-700 mb-2">
                      Umsatzsteuer-ID (USt-IdNr.)
                    </label>
                    <input
                      type="text"
                      id="vatIdInput"
                      value={vatId || ''}
                      onChange={e => setVatId(e.target.value)}
                      onAnimationStart={(e: AnimationEvent<HTMLInputElement>) => handleAutofillSync(e, setVatId)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/20 focus:border-[#14ad9f] text-gray-800"
                      placeholder="z.B. DE123456789"
                      disabled={isProcessingImage}
                    />
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={isProcessingImage}
                  className="px-12 py-4 bg-linear-to-r from-[#14ad9f] to-teal-600 text-white rounded-xl hover:from-teal-600 hover:to-teal-700 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center"
                >
                  Weiter zu Schritt 4
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>

      <PopupModal isOpen={isModalOpen} onClose={closeModal} steps={steps} />
    </div>
  );
}
