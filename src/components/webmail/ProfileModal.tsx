'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  X, 
  Camera, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  LogOut,
  Cloud,
} from 'lucide-react';
import { getAllAccounts } from '@/lib/webmail-multi-session';

interface LinkedAccount {
  email: string;
  name?: string;
  profileImage?: string;
}

interface StorageInfo {
  usedBytes: number;
  totalBytes: number;
  usedPercent: number;
  usedGB: number;
  totalGB: number;
  breakdown?: {
    drive: number;
    photos: number;
    emails: number;
    driveFormatted: string;
    photosFormatted: string;
    emailsFormatted: string;
  };
}

// Hilfsfunktion: Bytes formatieren
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  userName?: string;
  profileImage?: string;
  onLogout: () => void;
  onLogoutAll?: () => void;
  onAddAccount?: () => void;
  onManageAccount?: () => void;
  onChangePhoto?: () => void;
  onSwitchAccount?: (email: string) => void;
  isDark?: boolean;
}

export function ProfileModal({
  isOpen,
  onClose,
  userEmail,
  userName,
  profileImage: propProfileImage,
  onLogout,
  onLogoutAll,
  onAddAccount,
  onManageAccount,
  onChangePhoto,
  onSwitchAccount,
  isDark = false,
}: ProfileModalProps) {
  const router = useRouter();
  const [showOtherAccounts, setShowOtherAccounts] = useState(true);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [profileImage, setProfileImage] = useState<string | undefined>(propProfileImage);
  const [isLoadingStorage, setIsLoadingStorage] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Avatar vom Hetzner-Server laden (über Profil-API um avatarUrl zu bekommen)
  useEffect(() => {
    if (propProfileImage) {
      setProfileImage(propProfileImage);
      return;
    }

    if (!userEmail || !isOpen) return;

    const loadAvatar = async () => {
      try {
        // Erst Profil laden um avatarUrl zu bekommen
        const profileResponse = await fetch(`https://mail.taskilo.de/webmail-api/api/profile/${encodeURIComponent(userEmail)}`);
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          if (profileData.success && profileData.profile?.avatarUrl) {
            // Avatar-Bild laden
            const avatarResponse = await fetch(`https://mail.taskilo.de/webmail-api${profileData.profile.avatarUrl}`);
            if (avatarResponse.ok) {
              const blob = await avatarResponse.blob();
              const url = URL.createObjectURL(blob);
              setProfileImage(url);
            }
          }
        }
      } catch {
        // Avatar konnte nicht geladen werden - Initial verwenden
      }
    };

    loadAvatar();
  }, [userEmail, propProfileImage, isOpen]);

  // Speichernutzung vom Server laden
  const loadStorageInfo = useCallback(async () => {
    if (!userEmail || !isOpen) return;

    try {
      setIsLoadingStorage(true);
      const response = await fetch(`/api/webmail/storage?email=${encodeURIComponent(userEmail)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setStorageInfo(data.data);
        }
      }
    } catch {
      // Speicherinfo konnte nicht geladen werden
    } finally {
      setIsLoadingStorage(false);
    }
  }, [userEmail, isOpen]);

  // Verknüpfte Konten laden (kombiniert lokale Multi-Session + API)
  const loadLinkedAccounts = useCallback(async () => {
    if (!userEmail || !isOpen) return;

    try {
      // 1. Lokale Multi-Session Accounts laden (ohne aktuellen User)
      const localAccounts = getAllAccounts()
        .filter(a => a.email !== userEmail)
        .map(a => ({
          email: a.email,
          name: a.name || a.email.split('@')[0],
          profileImage: a.profileImage,
        }));

      // 2. API-basierte verknüpfte Konten laden
      let apiAccounts: LinkedAccount[] = [];
      try {
        const response = await fetch(`/api/webmail/linked-accounts?email=${encodeURIComponent(userEmail)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            apiAccounts = data.data;
          }
        }
      } catch {
        // API-Fehler ignorieren
      }

      // 3. Kombinieren und Duplikate entfernen
      const combined = [...localAccounts];
      apiAccounts.forEach(apiAcc => {
        if (!combined.some(local => local.email === apiAcc.email)) {
          combined.push(apiAcc);
        }
      });

      setLinkedAccounts(combined);
    } catch {
      // Verknüpfte Konten konnten nicht geladen werden
    }
  }, [userEmail, isOpen]);

  useEffect(() => {
    if (isOpen) {
      loadStorageInfo();
      loadLinkedAccounts();
    }
  }, [isOpen, loadStorageInfo, loadLinkedAccounts]);

  // Klick außerhalb schließt Modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Ersten Buchstaben des Namens oder der E-Mail
  const initial = userName?.charAt(0)?.toUpperCase() || userEmail.charAt(0).toUpperCase();
  const displayName = userName || userEmail.split('@')[0];

  // Avatar-Farben basierend auf Buchstabe
  const getAvatarColor = (letter: string) => {
    const colors = [
      'bg-red-500',
      'bg-pink-500', 
      'bg-purple-500',
      'bg-indigo-500',
      'bg-blue-500',
      'bg-teal-500',
      'bg-green-500',
      'bg-orange-500',
    ];
    const index = letter.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Speichernutzung berechnen
  const storageUsedPercent = storageInfo?.usedPercent ?? 0;
  const storageTotalGB = storageInfo?.totalGB ?? 100;

  return (
    <div className="fixed inset-0 z-100" style={{ pointerEvents: 'none' }}>
      {/* Modal Container - Position rechts oben */}
      <div 
        ref={modalRef}
        className={cn(
          "absolute right-4 top-16 w-[360px] max-h-[calc(100vh-80px)] overflow-y-auto rounded-3xl shadow-2xl",
          isDark ? "bg-[#2d2e30]" : "bg-white"
        )}
        style={{ pointerEvents: 'auto' }}
      >
        {/* Header mit E-Mail (zentriert) und Schließen-Button */}
        <div className="relative flex items-center justify-center px-6 pt-4 pb-2">
          <span className={cn("text-sm", isDark ? "text-gray-300" : "text-gray-600")}>{userEmail}</span>
          <button
            onClick={onClose}
            className={cn(
              "absolute right-4 top-3 p-2 rounded-full transition-colors",
              isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
            )}
            aria-label="Schließen"
          >
            <X className={cn("w-5 h-5", isDark ? "text-gray-300" : "text-gray-500")} />
          </button>
        </div>

        {/* Profilbild und Name */}
        <div className="flex flex-col items-center px-6 py-4">
          {/* Avatar mit Kamera-Button */}
          <div className="relative mb-4">
            {/* Bunter Ring wie bei Google */}
            <div className="w-24 h-24 rounded-full p-1 bg-linear-to-tr from-red-500 via-green-500 to-blue-500">
              <div className={cn(
                "w-full h-full rounded-full flex items-center justify-center overflow-hidden",
                isDark ? "bg-[#2d2e30]" : "bg-white",
                !profileImage && getAvatarColor(initial)
              )}>
                {profileImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profileImage} alt="Profil" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-4xl font-medium">{initial}</span>
                )}
              </div>
            </div>
            {/* Kamera-Button */}
            {onChangePhoto && (
              <button
                onClick={onChangePhoto}
                className={cn(
                  "absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors border-2",
                  isDark 
                    ? "bg-[#3c4043] hover:bg-[#4a4d50] border-[#2d2e30]" 
                    : "bg-gray-100 hover:bg-gray-200 border-white"
                )}
                aria-label="Profilbild ändern"
              >
                <Camera className={cn("w-4 h-4", isDark ? "text-gray-200" : "text-gray-600")} />
              </button>
            )}
          </div>

          {/* Begrüßung */}
          <h2 className={cn("text-2xl mb-4", isDark ? "text-white" : "text-gray-900")}>
            Hallo {displayName}!
          </h2>

          {/* Konto verwalten Button */}
          <button
            onClick={onManageAccount}
            className={cn(
              "px-6 py-2.5 rounded-full border text-sm font-medium transition-colors",
              isDark 
                ? "border-gray-500 text-[#8ab4f8] hover:bg-[#3c4043]" 
                : "border-gray-300 text-[#1a73e8] hover:bg-gray-50"
            )}
          >
            Taskilo-Konto verwalten
          </button>
        </div>



        {/* Weitere Konten */}
        <div className={cn("border-t", isDark ? "border-gray-600/50" : "border-gray-200")}>
          {/* Toggle für andere Konten */}
          <button
            onClick={() => setShowOtherAccounts(!showOtherAccounts)}
            className={cn(
              "w-full flex items-center justify-between px-6 py-3 transition-colors",
              isDark ? "hover:bg-white/5" : "hover:bg-gray-50"
            )}
          >
            <span className={cn("text-sm", isDark ? "text-gray-300" : "text-gray-700")}>
              {showOtherAccounts ? 'Weitere Konten ausblenden' : 'Weitere Konten anzeigen'}
            </span>
            {showOtherAccounts ? (
              <ChevronUp className={cn("w-5 h-5", isDark ? "text-gray-400" : "text-gray-500")} />
            ) : (
              <ChevronDown className={cn("w-5 h-5", isDark ? "text-gray-400" : "text-gray-500")} />
            )}
          </button>

          {/* Kontenliste */}
          {showOtherAccounts && (
            <div className="pb-2">
              {linkedAccounts.length > 0 ? (
                linkedAccounts.map((account, index) => {
                  const accountInitial = account.name?.charAt(0)?.toUpperCase() || account.email.charAt(0).toUpperCase();
                  const accountDisplayName = account.name || account.email.split('@')[0];
                  
                  return (
                    <button
                      key={index}
                      className={cn(
                        "w-full flex items-center gap-3 px-6 py-2.5 transition-colors",
                        isDark ? "hover:bg-white/5" : "hover:bg-gray-50"
                      )}
                      onClick={() => {
                        if (onSwitchAccount) {
                          onSwitchAccount(account.email);
                        }
                        onClose();
                      }}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center overflow-hidden shrink-0",
                        account.profileImage ? "" : getAvatarColor(accountInitial)
                      )}>
                        {account.profileImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={account.profileImage} alt={accountDisplayName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white text-lg font-medium">{accountInitial}</span>
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className={cn("text-sm truncate", isDark ? "text-white" : "text-gray-900")}>{accountDisplayName}</p>
                        <p className={cn("text-xs truncate", isDark ? "text-gray-400" : "text-gray-500")}>{account.email}</p>
                      </div>
                    </button>
                  );
                })
              ) : (
                <p className={cn("px-6 py-2 text-sm", isDark ? "text-gray-500" : "text-gray-400")}>
                  Keine weiteren Konten verknüpft
                </p>
              )}

              {/* Weiteres Konto hinzufügen */}
              <button
                onClick={() => {
                  onClose();
                  if (onAddAccount) {
                    onAddAccount();
                  } else {
                    router.push('/webmail/add-account');
                  }
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-6 py-2.5 transition-colors",
                  isDark ? "hover:bg-white/5" : "hover:bg-gray-50"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full border flex items-center justify-center",
                  isDark ? "border-gray-500" : "border-gray-300"
                )}>
                  <Plus className={cn("w-5 h-5", isDark ? "text-gray-300" : "text-gray-500")} />
                </div>
                <span className={cn("text-sm", isDark ? "text-gray-300" : "text-gray-700")}>
                  Weiteres Konto hinzufügen
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Abmelden */}
        <div className={cn("border-t", isDark ? "border-gray-600/50" : "border-gray-200")}>
          <button
            onClick={() => {
              if (linkedAccounts.length > 0 && onLogoutAll) {
                onLogoutAll();
              } else {
                onLogout();
              }
              onClose();
            }}
            className={cn(
              "w-full flex items-center gap-3 px-6 py-3 transition-colors",
              isDark ? "hover:bg-white/5" : "hover:bg-gray-50"
            )}
          >
            <LogOut className={cn("w-5 h-5", isDark ? "text-gray-300" : "text-gray-600")} />
            <span className={cn("text-sm", isDark ? "text-gray-300" : "text-gray-700")}>
              {linkedAccounts.length > 0 ? 'Von allen Konten abmelden' : 'Abmelden'}
            </span>
          </button>
        </div>

        {/* Speicherplatz */}
        <div className={cn("border-t px-6 py-3", isDark ? "border-gray-600/50" : "border-gray-200")}>
          <div className="flex items-center gap-3">
            <Cloud className={cn("w-5 h-5", isDark ? "text-gray-400" : "text-gray-500")} />
            <div className="flex-1">
              {isLoadingStorage ? (
                <div className={cn("h-4 rounded animate-pulse", isDark ? "bg-gray-600" : "bg-gray-200")} />
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    {/* Speicher-Anzeige mit buntem Balken */}
                    <div className={cn(
                      "flex-1 h-1.5 rounded-full overflow-hidden",
                      isDark ? "bg-gray-600" : "bg-gray-200"
                    )}>
                      <div 
                        className="h-full rounded-full bg-linear-to-r from-blue-500 via-green-500 to-yellow-500"
                        style={{ width: `${Math.max(Math.min(storageUsedPercent, 100), 0.5)}%` }}
                      />
                    </div>
                  </div>
                  <p className={cn("text-xs mt-1", isDark ? "text-gray-400" : "text-gray-500")}>
                    {storageInfo?.usedBytes ? formatBytes(storageInfo.usedBytes) : '0 B'} von {storageTotalGB} GB belegt
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer Links */}
        <div className={cn(
          "border-t px-6 py-3 flex items-center justify-center gap-2 text-xs",
          isDark ? "border-gray-600/50 text-gray-400" : "border-gray-200 text-gray-500"
        )}>
          <a 
            href="/datenschutz" 
            className={cn("transition-colors", isDark ? "hover:text-gray-200" : "hover:text-gray-700")}
            target="_blank"
            rel="noopener noreferrer"
          >
            Datenschutzerklärung
          </a>
          <span>·</span>
          <a 
            href="/agb" 
            className={cn("transition-colors", isDark ? "hover:text-gray-200" : "hover:text-gray-700")}
            target="_blank"
            rel="noopener noreferrer"
          >
            Nutzungsbedingungen
          </a>
        </div>
      </div>
    </div>
  );
}
