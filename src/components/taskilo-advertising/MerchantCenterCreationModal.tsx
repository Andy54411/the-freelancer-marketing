'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronDown,
  Check,
  ChevronRight,
  User,
  BarChart,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MerchantCenterCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    businessName: string;
    websiteUrl: string;
    country: string;
  }) => Promise<void> | void;
  initialBusinessName?: string;
  initialWebsiteUrl?: string;
}

const COUNTRY_OPTIONS = [
  'Afghanistan',
  'Ägypten',
  'Albanien',
  'Algerien',
  'Amerikanisch-Samoa',
  'Amerikanische Jungferninseln',
  'Andorra',
  'Angola',
  'Anguilla',
  'Antarktis',
  'Antigua und Barbuda',
  'Äquatorialguinea',
  'Argentinien',
  'Armenien',
  'Aruba',
  'Aserbaidschan',
  'Äthiopien',
  'Australien',
  'Bahamas',
  'Bahrain',
  'Bangladesch',
  'Barbados',
  'Belarus',
  'Belgien',
  'Belize',
  'Benin',
  'Bermudas',
  'Bhutan',
  'Birma (Myanmar)',
  'Bolivien',
  'Bosnien und Herzegowina',
  'Botsuana',
  'Brasilien',
  'Britisches Territorium im Indischen Ozean',
  'Brunei Darussalam',
  'Bulgarien',
  'Burkina Faso',
  'Burundi',
  'Caribbean Netherlands',
  'Chile',
  'China',
  'Cocos-(Keeling)-Inseln',
  'Cook-Inseln',
  'Costa Rica',
  'Curacao',
  'Dänemark',
  'Deutschland',
  'Dominica',
  'Dominikanische Republik',
  'Dschibuti',
  'Ecuador',
  'El Salvador',
  'Elfenbeinküste',
  'Eritrea',
  'Estland',
  'Falkland-Inseln (Islas Malvinas)',
  'Färöer-Inseln',
  'Fidschi',
  'Finnland',
  'Frankreich',
  'Französisch-Guayana',
  'Französisch-Polynesien',
  'Französische Südgebiete',
  'Gabun',
  'Gambia',
  'Georgien',
  'Ghana',
  'Gibraltar',
  'Grenada',
  'Griechenland',
  'Grönland',
  'Guadeloupe',
  'Guam',
  'Guatemala',
  'Guernsey',
  'Guinea',
  'Guinea-Bissau',
  'Guyana',
  'Haiti',
  'Honduras',
  'Hongkong',
  'Indien',
  'Indonesien',
  'Irak',
  'Irland',
  'Island',
  'Israel',
  'Italien',
  'Jamaika',
  'Japan',
  'Jemen',
  'Jersey',
  'Jordanien',
  'Jungferninseln (Britisch)',
  'Kaimaninseln',
  'Kambodscha',
  'Kamerun',
  'Kanada',
  'Kap Verde',
  'Kasachstan',
  'Katar',
  'Kenia',
  'Kirgisistan',
  'Kiribati',
  'Kleinere Amerikanische Überseeinseln',
  'Kolumbien',
  'Komoren',
  'Kongo',
  'Kongo, Demokratische Republik Kongo',
  'Kosovo',
  'Kroatien',
  'Kuwait',
  'Laos, Demokratische Volksrepublik Laos',
  'Lesotho',
  'Lettland',
  'Libanon',
  'Liberia',
  'Libyen',
  'Liechtenstein',
  'Litauen',
  'Luxemburg',
  'Macau',
  'Madagaskar',
  'Malawi',
  'Malaysia',
  'Malediven',
  'Mali',
  'Malta',
  'Marokko',
  'Marshallinseln',
  'Martinique',
  'Mauretanien',
  'Mauritius',
  'Mayotte',
  'Mazedonien',
  'Mexiko',
  'Mikronesien',
  'Monaco',
  'Mongolei',
  'Montenegro',
  'Montserrat',
  'Mosambik',
  'Namibia',
  'Nauru',
  'Nepal',
  'Neukaledonien',
  'Neuseeland',
  'Nicaragua',
  'Niederlande',
  'Niederländische Antillen',
  'Niger',
  'Nigeria',
  'Niue',
  'Norfolkinsel',
  'Norwegen',
  'Nördliche Marianen',
  'Oman',
  'Österreich',
  'Osttimor',
  'Pakistan',
  'Palau',
  'Palästinensische Gebiete',
  'Panama',
  'Papua-Neuguinea',
  'Paraguay',
  'Peru',
  'Philippinen',
  'Pitcairn',
  'Polen',
  'Portugal',
  'Puerto Rico',
  'Republik Moldau',
  'Réunion',
  'Ruanda',
  'Rumänien',
  'Russische Föderation',
  'Saint Barthelemy',
  'Saint Kitts und Nevis',
  'Saint Martin',
  'Sambia',
  'Samoa',
  'San Marino',
  'São Tomé und Príncipe',
  'Saudi-Arabien',
  'Schweden',
  'Schweiz',
  'Senegal',
  'Serbien',
  'Seychellen',
  'Sierra Leone',
  'Simbabwe',
  'Singapur',
  'Sint Maarten',
  'Slowakei',
  'Slowenien',
  'Solomon-Inseln',
  'Somalia',
  'South Sudan',
  'Spanien',
  'Spitzbergen und Jan Mayen',
  'Sri Lanka',
  'St. Helena',
  'St. Lucia',
  'St. Pierre und Miquelon',
  'St. Vincent und die Grenadinen',
  'Sudan',
  'Südafrika',
  'Süd-Georgien und Südliche Sandwich-Inseln',
  'Südkorea',
  'Suriname',
  'Swasiland',
  'Tadschikistan',
  'Taiwan',
  'Tansania',
  'Thailand',
  'Togo',
  'Tokelau',
  'Tonga',
  'Trinidad und Tobago',
  'Tschad',
  'Tschechien',
  'Tunesien',
  'Türkei',
  'Turkmenistan',
  'Turks- und Caicosinseln',
  'Tuvalu',
  'Uganda',
  'Ukraine',
  'Ungarn',
  'Uruguay',
  'USA',
  'Usbekistan',
  'Vanuatu',
  'Vatikanstadt',
  'Venezuela',
  'Vereinigte Arabische Emirate',
  'Vereinigtes Königreich',
  'Vietnam',
  'Wallis- und Futuna-Inseln',
  'Weihnachtsinsel',
  'West-Sahara',
  'Zentralafrikanische Republik',
  'Zypern',
];

export default function MerchantCenterCreationModal({
  isOpen,
  onClose,
  onSave,
  initialBusinessName = '',
  initialWebsiteUrl = '',
}: MerchantCenterCreationModalProps) {
  const [businessName, setBusinessName] = useState(initialBusinessName);
  const [websiteUrl, setWebsiteUrl] = useState(initialWebsiteUrl);
  const [country, setCountry] = useState('Deutschland');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [isDataSharingExpanded, setIsDataSharingExpanded] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setBusinessName(initialBusinessName);
      setWebsiteUrl(initialWebsiteUrl);
      setIsClosing(false);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, initialBusinessName, initialWebsiteUrl]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300); // Match transition duration
  };

  const handleSave = async () => {
    if (!businessName || !websiteUrl) return;

    try {
      setIsSaving(true);
      await onSave({ businessName, websiteUrl, country });
      handleClose();
    } catch (error) {
      console.error('Error saving Merchant Center account:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 transition-opacity duration-300 ${
          isOpen && !isClosing ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Slide-in Panel */}
      <div
        className={`relative w-full max-w-4xl bg-white h-full shadow-2xl transform transition-transform duration-300 flex flex-col ${
          isOpen && !isClosing ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white z-10">
          <h2 className="text-xl font-normal text-gray-900">
            Merchant Center-Konto erstellen und verknüpfen
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-8">
            {/* Bordered Box */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-base font-medium text-gray-900 mb-6">
                Unternehmensinformationen eingeben
              </h3>

              <div className="flex gap-8 items-start mb-6">
                {/* Left: Inputs */}
                <div className="flex-1 space-y-6">
                  {/* Business Name */}
                  <div className="relative group">
                    <div className="relative">
                      <input
                        type="text"
                        id="mc-business-name"
                        value={businessName}
                        onChange={e => setBusinessName(e.target.value)}
                        className="peer w-full px-3 py-3 border border-gray-300 rounded focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none transition-colors pt-6"
                        placeholder=" "
                      />
                      <label
                        htmlFor="mc-business-name"
                        className={`absolute left-3 top-4 text-gray-500 text-base transition-all duration-200 pointer-events-none
                          peer-focus:-translate-y-3 peer-focus:text-xs peer-focus:text-teal-600
                          ${businessName ? '-translate-y-3 text-xs' : ''}`}
                      >
                        Name des Unternehmens <span className="text-red-500">*</span>
                      </label>
                    </div>
                  </div>

                  {/* Website URL */}
                  <div className="relative group">
                    <div className="relative">
                      <input
                        type="text"
                        id="mc-website-url"
                        value={websiteUrl}
                        onChange={e => setWebsiteUrl(e.target.value)}
                        className="peer w-full px-3 py-3 border border-gray-300 rounded focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none transition-colors pt-6"
                        placeholder=" "
                      />
                      <label
                        htmlFor="mc-website-url"
                        className={`absolute left-3 top-4 text-gray-500 text-base transition-all duration-200 pointer-events-none
                          peer-focus:-translate-y-3 peer-focus:text-xs peer-focus:text-teal-600
                          ${websiteUrl ? '-translate-y-3 text-xs' : ''}`}
                      >
                        Website des Unternehmens <span className="text-red-500">*</span>
                      </label>
                    </div>
                    <p className="text-xs text-red-500 mt-1 px-3 hidden">
                      Bitte Unternehmenswebsite eingeben
                    </p>
                  </div>

                  {/* Country Select */}
                  <div className="relative">
                    <div className="relative">
                      <select
                        value={country}
                        onChange={e => setCountry(e.target.value)}
                        className="peer w-full px-3 py-3 border border-gray-300 rounded bg-white focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none transition-colors pt-6 appearance-none cursor-pointer"
                      >
                        {COUNTRY_OPTIONS.map(c => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <label className="absolute left-3 top-1 text-xs text-gray-500 pointer-events-none">
                        Land, in dem das Unternehmen eingetragen ist
                      </label>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Right: Image */}
                <div className="hidden md:block w-[280px] shrink-0">
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 flex items-center justify-center aspect-square">
                    <img
                      src="https://ssl.gstatic.com/bfe/images/setup/illustrations/bpupsellnonafrpvp.svg"
                      alt="Merchant Center Illustration"
                      className="w-full h-auto mix-blend-multiply opacity-90"
                    />
                  </div>
                </div>
              </div>

              {/* Checkbox */}
              <div className="flex items-start gap-3 mb-6">
                <div
                  className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer mt-0.5 transition-colors shrink-0 ${
                    emailNotifications ? 'bg-teal-600 border-teal-600' : 'border-gray-400'
                  }`}
                  onClick={() => setEmailNotifications(!emailNotifications)}
                >
                  {emailNotifications && <Check className="w-4 h-4 text-white" />}
                </div>
                <span
                  className="text-sm text-gray-700 cursor-pointer"
                  onClick={() => setEmailNotifications(!emailNotifications)}
                >
                  Ich möchte personalisierte E-Mail-Benachrichtigungen zu Neuigkeiten und Tipps
                  erhalten
                </span>
              </div>

              {/* Legal Text */}
              <div className="text-sm text-gray-600 space-y-4">
                <p>
                  Indem Sie fortfahren, stimmen Sie den{' '}
                  <a href="#" className="text-teal-600 hover:underline">
                    Merchant Center-Nutzungsbedingungen
                  </a>{' '}
                  zu. Je nach Einrichtung werden Ihre App-Daten möglicherweise in{' '}
                  <a href="#" className="text-teal-600 hover:underline">
                    Unternehmensmanager
                  </a>{' '}
                  freigegeben. In der{' '}
                  <a href="#" className="text-teal-600 hover:underline">
                    Datenschutzerklaerung von Google
                  </a>{' '}
                  wird beschrieben, wie Google mit Ihren Daten umgeht.
                </p>
                <p className="text-xs text-gray-500">
                  Im Europäischen Wirtschaftsraum, im Vereinigten Königreich und in der Schweiz
                  können Sie für Ihre Produkte über ein oder mehrere Preisvergleichsportale Ihrer
                  Wahl werben. Falls Sie hier ein Konto erstellen, wird es mit Google Shopping, dem
                  Preisvergleichsportal von Google, verknüpft. Wenn Sie ein Konto bei einem anderen
                  Preisvergleichsportal erstellen möchten, wenden Sie sich bitte direkt an dieses
                  Portal.{' '}
                  <a href="#" className="text-teal-600 hover:underline">
                    Hier finden Sie zertifizierte Preisvergleichsportale.
                  </a>{' '}
                  <a href="#" className="text-teal-600 hover:underline">
                    Weitere Informationen zu Werbung mit Preisvergleichsportalen
                  </a>
                </p>
                <p>
                  Wenn Sie ein Merchant Center-Konto erstellen und mit diesem Google Ads-Konto
                  verknüpfen, erklären Sie sich ferner damit einverstanden, dass Daten zwischen
                  diesen Konten ausgetauscht werden.
                </p>
              </div>
            </div>

            {/* Data Sharing Zippy */}
            <div className="border-t border-gray-200 pt-4">
              <button
                className="flex items-center gap-2 text-gray-700 font-medium hover:bg-gray-50 w-full py-2 rounded transition-colors"
                onClick={() => setIsDataSharingExpanded(!isDataSharingExpanded)}
              >
                {isDataSharingExpanded ? (
                  <ChevronDown className="w-5 h-5" />
                ) : (
                  <ChevronRight className="w-5 h-5" />
                )}
                Details zu freigegebenen Daten einblenden
              </button>

              {isDataSharingExpanded && (
                <div className="mt-4 pl-7 space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">Datenfreigabe</h4>

                    {/* Block 1 */}
                    <div className="mb-6">
                      <h5 className="text-sm font-medium text-gray-700 mb-3">
                        Von Google Ads für Google Merchant Center freigegebene Daten
                      </h5>

                      <div className="space-y-4">
                        <div className="flex gap-3">
                          <User className="w-5 h-5 text-gray-400 shrink-0" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              Details zu Ihrem Google Ads-Konto
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              Einschließlich Kontoname und Kundennummer.
                            </div>
                            <a
                              href="#"
                              className="text-xs text-teal-600 hover:underline inline-flex items-center mt-1"
                            >
                              Weitere Informationen zur Kundennummer{' '}
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <BarChart className="w-5 h-5 text-gray-400 shrink-0" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              Messwerte, die sich auf Anzeigen beziehen, in denen für Produkte aus
                              dem verknüpften Merchant Center-Konto geworben wird
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              Beispielsweise kann die Anzahl der Klicks weitergegeben werden.
                            </div>
                            <a
                              href="#"
                              className="text-xs text-teal-600 hover:underline inline-flex items-center mt-1"
                            >
                              Weitere Informationen zu freigegebenen Daten{' '}
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Block 2 */}
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-3">
                        Von Google Merchant Center für Google Ads freigegebene Daten
                      </h5>

                      <div className="space-y-4">
                        <div className="flex gap-3">
                          <User className="w-5 h-5 text-gray-400 shrink-0" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              Details zum Merchant Center-Konto
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              Einschließlich Name und ID des Merchant Center-Kontos
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <FileText className="w-5 h-5 text-gray-400 shrink-0" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              Produktdaten für die Kampagnenerstellung
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              Produktinformationen aus dem Merchant Center-Konto zu Produkten mit
                              aktiven Shopping-Anzeigen
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-white flex justify-start gap-3">
          <Button
            onClick={handleSave}
            disabled={!businessName || !websiteUrl || isSaving}
            className="bg-teal-600 hover:bg-teal-700 text-white min-w-[200px]"
          >
            {isSaving ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Wird erstellt...</span>
              </div>
            ) : (
              'Konto erstellen und verknuepfen'
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isSaving}
            className="text-teal-600 hover:bg-teal-50 hover:text-teal-700"
          >
            Abbrechen
          </Button>
        </div>
      </div>
    </div>
  );
}
