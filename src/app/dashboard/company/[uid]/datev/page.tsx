'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  RefreshCw,
  CheckCircle,
  ExternalLink,
  Download,
  HelpCircle,
} from 'lucide-react';

interface DatevConnection {
  id: string;
  organizationName: string;
  status: 'connected' | 'error' | 'pending';
  lastSync: string;
  accountCount: number;
}

export default function DatevMainPage() {
  const params = useParams();
  const router = useRouter();
  const { user, firebaseUser } = useAuth();
  const uid = params?.uid as string;

  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<DatevConnection[]>([]);
  const [selectedExportType, setSelectedExportType] = useState<'accounting' | 'invoices'>('invoices');

  useEffect(() => {
    if (!user || user.uid !== uid || !firebaseUser) return;
    loadDatevConnections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, user, firebaseUser]);

  const loadDatevConnections = async () => {
    try {
      setLoading(true);

      if (!firebaseUser) {
        setConnections([]);
        return;
      }

      const token = await firebaseUser.getIdToken();
      const response = await fetch(`/api/datev/userinfo-test?companyId=${uid}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-company-id': uid,
        },
      });

      const data = await response.json();

      if (response.ok && data.success && data.userInfo) {
        const datevConnections: DatevConnection[] = [
          {
            id: data.userInfo.account_id || data.userInfo.sub || 'unknown',
            organizationName:
              data.userInfo.name || data.userInfo.preferred_username || 'DATEV User',
            status: 'connected',
            accountCount: 1,
            lastSync: new Date().toISOString(),
          },
        ];

        setConnections(datevConnections);
      } else {
        setConnections([]);
      }
    } catch (error) {
      setConnections([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupDatev = () => {
    router.push(`/dashboard/company/${uid}/datev/setup`);
  };

  if (!user || user.uid !== uid) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Zugriff verweigert</h2>
          <p className="text-gray-600">Sie sind nicht berechtigt, diese Seite zu sehen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Exporte / Steuerberater</h1>
      </div>

      {/* Steuerberater Section - Grid mit 2 Spalten */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Steuerberater</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
          {/* Nachrichten Card (Long Item) */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Nachrichten</h4>
              <div className="flex flex-col items-center justify-center py-12">
                <span className="text-gray-600 text-center mb-6 max-w-md">
                  Du hast noch keine Nachrichten. Dein Steuerberater kann für dich automatisierte 
                  Erinnerungen bezüglich fehlende/unvollständige Belege über den Steuerberaterportal aktivieren.
                </span>
                <img 
                  width="217" 
                  alt="Keine Nachrichten" 
                  src="/images/accountant/accountant_no_messages.svg"
                  className="opacity-60"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
            </div>
          </div>

          {/* Steuerberater Card (Short Item) */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6 h-full flex flex-col">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Steuerberater</h4>
              
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : connections.length > 0 ? (
                <div className="flex-1 space-y-4">
                  {connections.map((connection) => (
                    <div key={connection.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 bg-[#14ad9f] rounded-full flex items-center justify-center text-white font-semibold">
                        {connection.organizationName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{connection.organizationName}</div>
                        <div className="text-xs text-gray-500">
                          <CheckCircle className="w-3 h-3 inline mr-1" />
                          Verbunden
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                  <span className="text-gray-600 text-sm">
                    Arbeitest du mit einem Steuerberater zusammen? Lade ihn zu Taskilo ein!
                  </span>
                  
                  <Button 
                    onClick={handleSetupDatev}
                    variant="outline"
                    className="w-full"
                  >
                    Verknüpfung einrichten
                  </Button>
                  
                  <div className="flex-1 flex items-center justify-center">
                    <img 
                      src="/images/accountant/accountant_invite.svg" 
                      alt="Steuerberater einladen"
                      className="h-48 opacity-50"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                  
                  <p className="text-xs text-gray-500">
                    Bist du auf der Suche nach einem Steuerberater?<br />
                    Schaue jetzt auf unserer{' '}
                    <a 
                      href="https://hilfe.taskilo.de/steuerberater" 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-[#14ad9f] hover:underline"
                    >
                      Empfehlungsliste
                    </a>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Exporte Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Exporte</h2>
        
        <div className="space-y-6">
          {/* Info Card - Full Width */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Wie sollen die Belegbilder übertragen werden?
              </h1>
              <div className="flex items-start justify-between gap-8">
                <div className="flex-1 text-gray-700 space-y-2">
                  <p>
                    Bitte kläre mit deinem Steuerberater in welchem Format er deine Daten erhalten möchte.
                  </p>
                  <p>
                    Die Auswahl kannst du nachträglich jederzeit ändern.
                  </p>
                  <p className="mt-4">
                    <strong>Benötigst du Hilfe?</strong><br />
                    <a 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        alert('Wissensdatenbank wird bald verfügbar sein!');
                      }}
                      className="text-[#14ad9f] hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      Anleitung zum Export und Import in der Wissensdatenbank
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 shrink-0">
                    <svg width="100%" height="100%" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" role="presentation">
                      <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                        <g transform="translate(2.000000, 3.000000)">
                          <g fillRule="nonzero">
                            <path d="M25,40 L23,40 L23,35 L25,35 L25,40 Z M41,38.4 L37.6,35 L39,33.6 L42.4,37 L41,38.4 Z M7,38.4 L5.6,37 L9,33.6 L10.4,35 L7,38.4 Z M39,6.4 L37.6,5 L41,1.6 L42.4,3 L39,6.4 Z M9,6.4 L5.6,3 L7,1.6 L10.4,5 L9,6.4 Z M25,5 L23,5 L23,0 L25,0 L25,5 Z" fill="#E8EDF6"></path>
                            <polygon fill="#4A89DC" points="4 9 4 16 0 20 4 24 4 31 44 31 44 9"></polygon>
                          </g>
                          <rect fill="#7DA8E0" x="5.5" y="11.1111111" width="36.3" height="17.7777778"></rect>
                          <path d="M36,25 L12,25 L12,23 L36,23 L36,25 Z M30,21 L12,21 L12,19 L30,19 L30,21 Z M36,17 L12,17 L12,15 L36,15 L36,17 Z" fill="#FFFFFF" fillRule="nonzero"></path>
                        </g>
                      </g>
                    </svg>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      // TODO: Implement change export type dialog
                      alert('Export-Typ Auswahl öffnen');
                    }}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    Ändern
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Export Type Selection */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Exporttyp auswählen</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Buchungsdaten + Belegbilder Card */}
              <div className="bg-white rounded-lg border-2 border-gray-200 hover:border-[#14ad9f] hover:shadow-lg transition-all">
                <div className="p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-16 h-16 shrink-0">
                      <svg width="100%" height="100%" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" role="presentation">
                        <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                          <g transform="translate(0.000000, 8.000000)">
                            <polygon fill="#4A89DC" points="0 23.3224529 0 20.5343749 23.8900298 14.2614601 48 20.5343749 48 23.3224529 24 31.5789474"></polygon>
                            <polygon fill="#EEEEEE" points="0 20.2664257 0 17.4783478 23.8900298 11.2054329 48 17.4783478 48 20.2664257 24 28.5229202"></polygon>
                            <polygon fill="#4A89DC" points="0 17.2103985 0 14.4223206 23.8900298 8.14940577 48 14.4223206 48 17.2103985 24 25.466893"></polygon>
                            <polygon fill="#EEEEEE" points="0 15.1730471 0 12.3849692 23.8900298 6.11205433 48 12.3849692 48 15.1730471 24 23.4295416"></polygon>
                            <polygon fill="#4A89DC" points="0 12.1170199 0 9.32894199 23.8900298 3.05602716 48 9.32894199 48 12.1170199 24 20.3735144"></polygon>
                            <polygon fill="#EEEEEE" points="0 9.06099278 23.8900298 0 48 9.06099278 24 17.3174873"></polygon>
                          </g>
                        </g>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        <strong className="font-extrabold">Buchungs</strong>daten + Belegbilder
                      </h3>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-6">
                    Der Export enthält die Buchungssätze und Stammdaten, sowie die dazugehörigen Belegbilder.
                  </p>
                  
                  <Button 
                    onClick={() => setSelectedExportType('accounting')}
                    className={`w-full h-11 transition-all ${
                      selectedExportType === 'accounting'
                        ? 'bg-[#14ad9f] hover:bg-taskilo-hover text-white'
                        : 'bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300'
                    }`}
                  >
                    {selectedExportType === 'accounting' ? (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    ) : null}
                    Auswählen
                  </Button>
                </div>
              </div>

              {/* Rechnungsdaten + Belegbilder Card */}
              <div className="bg-white rounded-lg border-2 border-gray-200 hover:border-[#14ad9f] hover:shadow-lg transition-all">
                <div className="p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-16 h-16 shrink-0">
                      <svg width="100%" height="100%" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" role="presentation">
                        <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                          <g transform="translate(2.000000, 3.000000)">
                            <g fillRule="nonzero">
                              <path d="M25,40 L23,40 L23,35 L25,35 L25,40 Z M41,38.4 L37.6,35 L39,33.6 L42.4,37 L41,38.4 Z M7,38.4 L5.6,37 L9,33.6 L10.4,35 L7,38.4 Z M39,6.4 L37.6,5 L41,1.6 L42.4,3 L39,6.4 Z M9,6.4 L5.6,3 L7,1.6 L10.4,5 L9,6.4 Z M25,5 L23,5 L23,0 L25,0 L25,5 Z" fill="#E8EDF6"></path>
                              <polygon fill="#4A89DC" points="4 9 4 16 0 20 4 24 4 31 44 31 44 9"></polygon>
                            </g>
                            <rect fill="#7DA8E0" x="5.5" y="11.1111111" width="36.3" height="17.7777778"></rect>
                            <path d="M36,25 L12,25 L12,23 L36,23 L36,25 Z M30,21 L12,21 L12,19 L30,19 L30,21 Z M36,17 L12,17 L12,15 L36,15 L36,17 Z" fill="#FFFFFF" fillRule="nonzero"></path>
                          </g>
                        </g>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        <strong className="font-extrabold">Rechnungs</strong>daten + Belegbilder
                      </h3>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-6">
                    Der Export enthält Belegbilder inkl. der Rechnungsdaten (Bsp. Nettobetrag, Umsatzsteuer, Kreditor / Debitor).
                  </p>
                  
                  <Button 
                    onClick={() => setSelectedExportType('invoices')}
                    className={`w-full h-11 transition-all ${
                      selectedExportType === 'invoices'
                        ? 'bg-[#14ad9f] hover:bg-taskilo-hover text-white'
                        : 'bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300'
                    }`}
                  >
                    {selectedExportType === 'invoices' ? (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    ) : null}
                    Auswählen
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Export Method Cards - 2 Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            <h3 className="text-lg font-semibold text-gray-900 col-span-full">Übertragungsart wählen</h3>
            
            {/* Buchungsdatenservice / Rechnungsdatenservice Card */}
            <div className="bg-white rounded-lg border-2 border-gray-200 hover:border-[#14ad9f] hover:shadow-lg transition-all">
              <div className="p-8">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-16 h-16 shrink-0">
                    {/* Cloud Sync Icon from sevDesk */}
                    <svg width="100%" height="100%" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation">
                      <mask id="a" maskUnits="userSpaceOnUse" x="2" y="5" width="43" height="26">
                        <path d="M17.1662 13.3331L16.962 14.0702L16.4583 13.7921C15.308 13.1234 14.0322 12.711 12.7147 12.5821C11.5391 12.4818 10.3556 12.6192 9.23207 12.9866C8.1085 13.3539 7.06686 13.944 6.16675 14.7231C5.26664 15.5021 4.52571 16.4548 3.98638 17.5267C3.44704 18.5986 3.11987 19.7686 3.02359 20.9697C2.92731 22.1709 3.0638 23.3797 3.42527 24.5269C3.78673 25.6742 4.36607 26.7373 5.13013 27.6556C5.8942 28.5739 6.82799 29.3292 7.87809 29.8784C8.92819 30.4276 10.074 30.7599 11.2499 30.8563C11.4936 30.8772 11.7373 30.8869 11.9796 30.8869H38.6205C39.4279 30.89 40.2279 30.7306 40.9748 30.4177C41.7218 30.1048 42.4011 29.6446 42.9739 29.0634C43.5467 28.4822 44.0019 27.7914 44.3132 27.0305C44.6246 26.2695 44.7862 25.4534 44.7887 24.6286C44.79 24.4192 44.7805 24.2098 44.7601 24.0014C44.4606 20.8862 41.8605 18.4663 38.7975 18.3828C38.5292 18.3773 38.2608 18.3912 37.9943 18.4246L37.232 18.508L37.3409 17.7292C37.4198 17.2045 37.4608 16.6746 37.4634 16.1438C37.4633 13.5892 36.5567 11.1213 34.9116 9.19752C33.2664 7.27372 30.9944 6.02447 28.5165 5.68135C26.0386 5.33823 23.523 5.92449 21.436 7.33148C19.3489 8.73847 17.8319 10.8708 17.1662 13.3331Z" fill="white"/>
                      </mask>
                      <g mask="url(#a)">
                        <path d="M27.8253 3H20.869V10.1066H27.8253V3Z" fill="#A1D752"/>
                        <path d="M34.7816 3H27.8253V10.1066H34.7816V3Z" fill="#90CD2C"/>
                        <path d="M41.7379 3H34.7816V10.1066H41.7379V3Z" fill="#74BD29"/>
                        <path d="M6.95632 10.1066H0V17.2133H6.95632V10.1066Z" fill="#74C7C7"/>
                        <path d="M13.9126 10.1066H6.9563V17.2133H13.9126V10.1066Z" fill="#8ED2D2"/>
                        <path d="M20.8689 10.1066H13.9126V17.2133H20.8689V10.1066Z" fill="#C7E799"/>
                        <path d="M27.8253 10.1066H20.869V17.2133H27.8253V10.1066Z" fill="#B7E07A"/>
                        <path d="M34.7816 10.1066H27.8253V17.2133H34.7816V10.1066Z" fill="#A1D752"/>
                        <path d="M41.7379 10.1066H34.7816V17.2133H41.7379V10.1066Z" fill="#90CD2C"/>
                        <path d="M6.95632 17.2132H0V24.3199H6.95632V17.2132Z" fill="#42B3B3"/>
                        <path d="M13.9126 17.2132H6.9563V24.3199H13.9126V17.2132Z" fill="#74C7C7"/>
                        <path d="M20.8689 17.2132H13.9126V24.3199H20.8689V17.2132Z" fill="#8ED2D2"/>
                        <path d="M27.8253 17.2132H20.869V24.3199H27.8253V17.2132Z" fill="#C7E799"/>
                        <path d="M34.7816 17.2132H27.8253V24.3199H34.7816V17.2132Z" fill="#B7E07A"/>
                        <path d="M41.7379 17.2132H34.7816V24.3199H41.7379V17.2132Z" fill="#A1D752"/>
                        <path d="M48 17.2132H41.7379V24.3199H48V17.2132Z" fill="#90CD2C"/>
                        <path d="M6.95632 24.3199H0V31.4265H6.95632V24.3199Z" fill="#109F9F"/>
                        <path d="M13.9126 24.3199H6.9563V31.4265H13.9126V24.3199Z" fill="#42B3B3"/>
                        <path d="M20.8689 24.3199H13.9126V31.4265H20.8689V24.3199Z" fill="#74C7C7"/>
                        <path d="M27.8253 24.3199H20.869V31.4265H27.8253V24.3199Z" fill="#8ED2D2"/>
                        <path d="M34.7816 24.3199H27.8253V31.4265H34.7816V24.3199Z" fill="#C7E799"/>
                        <path d="M41.7379 24.3199H34.7816V31.4265H41.7379V24.3199Z" fill="#B7E07A"/>
                        <path d="M48 24.3199H41.7379V31.4265H48V24.3199Z" fill="#A1D752"/>
                        <path d="M20.8689 3H13.9126V10.1066H20.8689V3Z" fill="#BCDF73"/>
                      </g>
                      <path d="M15.8879 18.5483V22.943H7.9514L1.60767 29.4238L8.38566 36.3358V31.9411H16.3085L22.6522 25.4603L15.8879 18.5483Z" fill="white"/>
                      <path d="M7.33886 25.0848L3.09155 29.4238L7.33886 33.7629V30.8702H15.8729V27.9775H7.33886V25.0848Z" fill="#039A9A"/>
                      <path d="M16.9212 21.1212L21.1685 25.4603L16.9212 29.7993V26.9066H8.38574V24.0139H16.9212V21.1212Z" fill="#039A9A"/>
                      <path fillRule="evenodd" clipRule="evenodd" d="M6.2076 43.4146H7.25581C8.86216 43.4146 10.1826 42.3437 10.2507 40.355C10.3188 38.4358 9.27056 37.2954 7.74588 37.2954H6.2076V43.4146ZM4.32898 35.7238H7.88201C10.3188 35.7238 12.0613 37.5735 12.1429 40.4245C12.1429 42.9834 10.0465 44.9861 7.60975 44.9861H4.32898V35.7238ZM28.2473 35.7238H34.3188V37.2954H30.2076V39.3676H34.0465V40.9391H30.2076V43.498H34.5366V45H28.2609V35.7238H28.2473ZM16.186 44.9861V43.4841H18.6909L16.4583 37.6431L13.7357 44.9861H11.789L15.2753 35.7238H17.644L21.197 44.9861H16.186ZM19.671 37.2954V35.7238H27.485V37.2954H24.6262V44.9861H22.5978V37.2954H19.671ZM39.2059 35.7238V37.2954H41.5065L39.4101 42.9278L36.8236 35.7238H34.7952L38.3483 44.9861H40.5128L43.9991 35.7238H39.2059Z" fill="#039A9A"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                      {selectedExportType === 'accounting' ? 'Buchungsdatenservice' : 'Rechnungsdatenservice 1.0'}
                      <button type="button" className="text-gray-400 hover:text-gray-600">
                        <HelpCircle className="w-4 h-4" />
                      </button>
                    </h2>
                  </div>
                </div>
                
                <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                  {selectedExportType === 'accounting' ? (
                    <>
                      Der <strong>Buchungsdatenservice</strong> bietet die Möglichkeit per Knopfdruck Buchungsdaten, Stammdaten und die zugehörigen Belegbilder komfortabel über DATEV Unternehmen online zu übertragen.
                      <br /><br />
                      Alle buchhaltungsrelevanten Daten verknüpfen sich automatisch in DATEV Kanzlei-Rechnungswesen.
                    </>
                  ) : (
                    <>
                      Der <strong>Rechnungsdatenservice 1.0</strong> ist eine webbasierte Schnittstelle für den digitalen Datenaustausch nach DATEV Unternehmen online.
                      <br /><br />
                      Die Belegbilder inkl. der Rechnungsdaten werden per Knopfdruck übertragen.
                    </>
                  )}
                </p>
                
                <Button 
                  onClick={() => {
                    if (selectedExportType === 'accounting') {
                      router.push(`/dashboard/company/${uid}/datev/export/booking-data-service`);
                    } else {
                      router.push(`/dashboard/company/${uid}/datev/export?type=invoices&method=service`);
                    }
                  }}
                  className="w-full bg-[#14ad9f] hover:bg-taskilo-hover text-white h-11"
                >
                  {selectedExportType === 'accounting' ? 'Buchungsdatenservice aktivieren' : 'Rechnungsdatenservice 1.0 aktivieren'}
                </Button>
              </div>
            </div>

            {/* Datei-Export Card */}
            <div className="bg-white rounded-lg border-2 border-gray-200 hover:border-[#14ad9f] hover:shadow-lg transition-all">
              <div className="p-8">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-16 h-16 shrink-0">
                    {/* Folder Icon */}
                    <svg width="100%" height="100%" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" role="presentation">
                      <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                        <g transform="translate(4.000000, 8.000000)" fillRule="nonzero">
                          <path d="M36,3.88888889 L18,3.88888889 L14,0 L4,0 C1.8008,0 0,1.75077778 0,3.88888889 L0,11.6666667 L40,11.6666667 L40,7.77777778 C40,5.63966667 38.1992,3.88888889 36,3.88888889 Z" fill="#3966B2"/>
                          <path d="M36,3.88888889 L4,3.88888889 C1.8008,3.88888889 0,5.63966667 0,7.77777778 L0,27.2222222 C0,29.3603333 1.8008,31.1111111 4,31.1111111 L36,31.1111111 C38.1992,31.1111111 40,29.3603333 40,27.2222222 L40,7.77777778 C40,5.63966667 38.1992,3.88888889 36,3.88888889 Z" fill="#4A89DC"/>
                          <polygon fill="#E8EDF6" points="18 11.6666667 22 11.6666667 22 9.72222222 18 9.72222222"/>
                          <polygon fill="#E8EDF6" points="18 5.83333333 22 5.83333333 22 3.88888889 18 3.88888889"/>
                          <polygon fill="#E8EDF6" points="18 8.75 22 8.75 22 6.80555556 18 6.80555556"/>
                          <polygon fill="#E8EDF6" points="18 14.5833333 22 14.5833333 22 12.6388889 18 12.6388889"/>
                          <path d="M22,15.5555556 L18,15.5555556 C18,18.4722222 16,21.3888889 16,23.3333333 C16,25.4714444 17.8008,27.2222222 20,27.2222222 C22.1992,27.2222222 24,25.4714444 24,23.3333333 C24,21.3888889 22,18.4722222 22,15.5555556 Z M20,25.2777778 C18.8984,25.2777778 18,24.4043333 18,23.3333333 C18,22.2623333 18.8984,21.3888889 20,21.3888889 C21.1016,21.3888889 22,22.2623333 22,23.3333333 C22,24.4043333 21.1016,25.2777778 20,25.2777778 Z" fill="#E8EDF6"/>
                        </g>
                      </g>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900">Datei-Export</h2>
                  </div>
                </div>
                
                <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                  {selectedExportType === 'accounting' ? (
                    <>
                      Die Buchungsdaten (Buchungsstapel) und die zugehörigen Stammdaten werden im CSV Format als ZIP-Datei exportiert.
                      <br /><br />
                      Im zweiten Schritt erfolgt der Download der Belegbilder als ZIP-Datei.
                    </>
                  ) : (
                    <>
                      Die Belegbilder inkl. der Rechnungsdaten werden als ZIP-Datei exportiert.
                      <br /><br />
                      Die Belegbilder werden in Form einer PDF oder JPG Datei bereitgestellt und zusammen mit den Beleginformationen als XML exportiert.
                    </>
                  )}
                </p>
                
                <Button 
                  onClick={() => {
                    if (selectedExportType === 'accounting') {
                      router.push(`/dashboard/company/${uid}/datev/export/file-export`);
                    } else {
                      router.push(`/dashboard/company/${uid}/datev/export/invoice-file-export`);
                    }
                  }}
                  variant="outline"
                  className="w-full h-11 border-gray-300 hover:bg-gray-50"
                >
                  Datei-Export auswählen
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
