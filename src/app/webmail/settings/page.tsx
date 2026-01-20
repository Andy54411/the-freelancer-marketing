'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebmailSession } from '../layout';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Phone,
  CheckCircle2,
  Loader2,
  User,
  Bell,
  Shield,
  Lock,
  Mail,
  Key,
  Monitor,
  Smartphone,
  HardDrive,
  Search,
  HelpCircle,
  ChevronRight,
  LogOut,
  Camera,
  Trash2,
  ImagePlus,
  MapPin,
  Calendar,
  Globe,
  Briefcase,
  CreditCard,
  Check,
  Crown,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useWebmailTheme } from '@/contexts/WebmailThemeContext';
import { cn } from '@/lib/utils';
import { MailHeader } from '@/components/webmail/MailHeader';
import { getAppUrl } from '@/lib/webmail-urls';

interface UserSettings {
  displayName: string;
  signature: string;
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    desktop: boolean;
    sound: boolean;
  };
  appearance: {
    theme: 'light' | 'dark' | 'system';
    compactMode: boolean;
  };
  privacy: {
    readReceipts: boolean;
    showOnlineStatus: boolean;
  };
}

const defaultSettings: UserSettings = {
  displayName: '',
  signature: '',
  language: 'de',
  timezone: 'Europe/Berlin',
  notifications: {
    email: true,
    desktop: true,
    sound: true,
  },
  appearance: {
    theme: 'light',
    compactMode: false,
  },
  privacy: {
    readReceipts: true,
    showOnlineStatus: true,
  },
};

const navItems = [
  { id: 'overview', label: 'Übersicht', icon: User, color: 'bg-gradient-to-br from-teal-400 to-teal-600' },
  { id: 'personal', label: 'Persönliche Daten', icon: User, color: 'bg-gradient-to-br from-green-400 to-green-600' },
  { id: 'security', label: 'Sicherheit und Anmeldung', icon: Shield, color: 'bg-gradient-to-br from-cyan-400 to-cyan-600' },
  { id: 'password', label: 'Passwort', icon: Lock, color: 'bg-gradient-to-br from-blue-400 to-blue-600' },
  { id: 'privacy', label: 'Daten und Datenschutz', icon: Key, color: 'bg-gradient-to-br from-teal-400 to-cyan-600' },
  { id: 'notifications', label: 'Benachrichtigungen', icon: Bell, color: 'bg-gradient-to-br from-pink-400 to-pink-600' },
  { id: 'storage', label: 'Speicherplatz', icon: HardDrive, color: 'bg-gradient-to-br from-orange-400 to-orange-600' },
  { id: 'abos', label: 'Abos', icon: CreditCard, color: 'bg-gradient-to-br from-purple-400 to-purple-600' },
];

const quickActions = [
  { id: 'password', label: 'Mein Passwort', href: '#password' },
  { id: 'devices', label: 'Geräte', href: '#devices' },
  { id: 'email', label: 'E-Mail', href: '#email' },
];

export default function WebmailSettingsPage() {
  const { session, logout } = useWebmailSession();
  const _router = useRouter();
  const searchParams = useSearchParams();
  const { isDark } = useWebmailTheme();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');

  // URL-Parameter auslesen für section und upgrade-Bestätigung
  useEffect(() => {
    const section = searchParams.get('section');
    if (section && navItems.some(item => item.id === section)) {
      setActiveSection(section);
    }
    
    const upgraded = searchParams.get('upgraded');
    if (upgraded) {
      setActiveSection('abos');
      toast.success(`Erfolgreich auf ${upgraded} Plan upgraded!`);
    }
    
    const cancelled = searchParams.get('cancelled');
    if (cancelled === 'true') {
      setActiveSection('abos');
      toast.error('Zahlung wurde abgebrochen');
    }
  }, [searchParams]);

  const [phoneStatus, setPhoneStatus] = useState<{
    hasProfile: boolean;
    phone: string | null;
    phoneVerified: boolean;
    isLoading: boolean;
  }>({ hasProfile: false, phone: null, phoneVerified: false, isLoading: true });
  const [phoneInput, setPhoneInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationSessionId, setVerificationSessionId] = useState<string | null>(null);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Avatar State
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Name Edit State
  const [nameEditData, setNameEditData] = useState({ firstName: '', lastName: '', alias: '' });
  const [isSavingName, setIsSavingName] = useState(false);
  const aliasInputRef = useRef<HTMLInputElement>(null);

  // Storage State
  interface StorageService {
    name: string;
    used: number;
    limit: number;
    usedFormatted: string;
    limitFormatted: string;
    color: string;
    icon: string;
  }
  
  const [storageData, setStorageData] = useState<{
    totalUsed: number;
    totalLimit: number;
    usedPercent: number;
    totalUsedFormatted: string;
    totalLimitFormatted: string;
    services: StorageService[];
    canFreeUp: number;
    canFreeUpFormatted: string;
    isLoading: boolean;
  }>({
    totalUsed: 0,
    totalLimit: 10 * 1024 * 1024 * 1024,
    usedPercent: 0,
    totalUsedFormatted: '0 B',
    totalLimitFormatted: '10 GB',
    services: [],
    canFreeUp: 0,
    canFreeUpFormatted: '0 B',
    isLoading: true,
  });

  // Abo State
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string>('free');

  // Speicher-Pläne definieren
  const storagePlans = [
    { id: 'free', name: 'Kostenlos', storage: '15 GB', storageBytes: 15 * 1024 * 1024 * 1024, priceMonthly: 0, priceYearly: 0, isCurrent: currentPlan === 'free' },
    { id: 'basic', name: 'Basic', storage: '100 GB', storageBytes: 100 * 1024 * 1024 * 1024, priceMonthly: 1.99, priceYearly: 19.99, isCurrent: currentPlan === 'basic', recommended: false },
    { id: 'standard', name: 'Standard', storage: '200 GB', storageBytes: 200 * 1024 * 1024 * 1024, priceMonthly: 2.99, priceYearly: 29.99, isCurrent: currentPlan === 'standard', recommended: true },
    { id: 'pro', name: 'Pro', storage: '2 TB', storageBytes: 2 * 1024 * 1024 * 1024 * 1024, priceMonthly: 9.99, priceYearly: 99.99, isCurrent: currentPlan === 'pro' },
  ];

  const loadStorageData = useCallback(async () => {
    if (!session?.email) return;
    try {
      const response = await fetch('https://mail.taskilo.de/webmail-api/api/combined-storage/simple', {
        headers: {
          'x-user-id': session.email,
        },
      });
      const data = await response.json();
      if (data.success) {
        setStorageData({
          totalUsed: data.totalUsed,
          totalLimit: data.totalLimit,
          usedPercent: data.usedPercent,
          totalUsedFormatted: data.totalUsedFormatted,
          totalLimitFormatted: data.totalLimitFormatted,
          services: data.services || [],
          canFreeUp: data.canFreeUp || 0,
          canFreeUpFormatted: data.canFreeUpFormatted || '0 B',
          isLoading: false,
        });
        // Aktuellen Plan setzen
        if (data.plan) {
          setCurrentPlan(data.plan);
        }
      } else {
        setStorageData(prev => ({ ...prev, isLoading: false }));
      }
    } catch {
      setStorageData(prev => ({ ...prev, isLoading: false }));
    }
  }, [session?.email]);

  const loadSettings = useCallback(() => {
    if (!session?.email) return;
    const storageKey = `webmail_settings_${session.email}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setSettings({ ...defaultSettings, ...JSON.parse(saved) });
    } else {
      setSettings({ ...defaultSettings, displayName: session.email.split('@')[0] });
    }
    setIsLoading(false);
  }, [session?.email]);

  const loadPhoneStatus = useCallback(async () => {
    if (!session?.email) return;
    try {
      const response = await fetch(`https://mail.taskilo.de/api/phone-verification/status?email=${encodeURIComponent(session.email)}`);
      const data = await response.json();
      setPhoneStatus({ hasProfile: data.hasProfile || false, phone: data.phone || null, phoneVerified: data.phoneVerified || false, isLoading: false });
    } catch {
      setPhoneStatus(prev => ({ ...prev, isLoading: false }));
    }
  }, [session?.email]);

  // Avatar laden
  const loadAvatar = useCallback(async () => {
    if (!session?.email) return;
    try {
      const response = await fetch(`https://mail.taskilo.de/api/profile/avatar/${encodeURIComponent(session.email)}`);
      if (response.status === 200) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setAvatarUrl(url);
      }
    } catch {
      // Kein Avatar vorhanden
    }
  }, [session?.email]);

  useEffect(() => {
    if (session?.isAuthenticated) {
      loadSettings();
      loadPhoneStatus();
      loadAvatar();
      loadStorageData();
    }
  }, [session?.isAuthenticated, loadSettings, loadPhoneStatus, loadAvatar, loadStorageData]);

  // Avatar hochladen
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !session?.email) return;

    // Validierung
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Nur JPEG, PNG, WebP oder GIF erlaubt');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Bild zu groß (max. 5 MB)');
      return;
    }

    setIsUploadingAvatar(true);

    try {
      // Datei zu Base64 konvertieren
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const response = await fetch('https://mail.taskilo.de/api/profile/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session.email, image: base64 }),
      });

      const data = await response.json();
      if (data.success) {
        // Neues Bild laden
        await loadAvatar();
        // Event für MailHeader dispatchen
        window.dispatchEvent(new CustomEvent('avatarUpdated'));
        toast.success('Avatar wurde hochgeladen');
      } else {
        toast.error(data.error || 'Fehler beim Hochladen');
      }
    } catch {
      toast.error('Netzwerkfehler beim Hochladen');
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  // Avatar löschen
  const handleAvatarDelete = async () => {
    if (!session?.email) return;
    
    setIsUploadingAvatar(true);
    try {
      const response = await fetch(`https://mail.taskilo.de/api/profile/avatar/${encodeURIComponent(session.email)}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        setAvatarUrl(null);
        // Event für MailHeader dispatchen
        window.dispatchEvent(new CustomEvent('avatarUpdated'));
        toast.success('Avatar wurde gelöscht');
      } else {
        toast.error(data.error || 'Fehler beim Löschen');
      }
    } catch {
      toast.error('Netzwerkfehler beim Löschen');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSendCode = async () => {
    if (!session?.email || !phoneInput || !passwordInput) {
      toast.error('Bitte alle Felder ausfüllen');
      return;
    }
    setIsSendingCode(true);
    try {
      const response = await fetch('https://mail.taskilo.de/api/phone-verification/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session.email, password: passwordInput, phone: phoneInput }),
      });
      const data = await response.json();
      if (data.success) {
        setVerificationSessionId(data.sessionId);
        toast.success('SMS-Code wurde gesendet');
      } else {
        toast.error(data.error || 'Fehler beim Senden des Codes');
      }
    } catch {
      toast.error('Netzwerkfehler');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationSessionId || !verificationCode) {
      toast.error('Bitte Code eingeben');
      return;
    }
    setIsVerifying(true);
    try {
      const response = await fetch('https://mail.taskilo.de/api/phone-verification/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: verificationSessionId, code: verificationCode }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Telefonnummer erfolgreich verifiziert');
        setPhoneStatus({ hasProfile: true, phone: data.phone, phoneVerified: true, isLoading: false });
        setVerificationSessionId(null);
        setVerificationCode('');
        setPhoneInput('');
        setPasswordInput('');
      } else {
        toast.error(data.error || 'Ungültiger Code');
      }
    } catch {
      toast.error('Netzwerkfehler');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (!verificationSessionId) return;
    setIsSendingCode(true);
    try {
      const response = await fetch('https://mail.taskilo.de/api/phone-verification/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: verificationSessionId }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('SMS-Code wurde erneut gesendet');
      } else {
        toast.error(data.error || 'Fehler beim erneuten Senden');
      }
    } catch {
      toast.error('Netzwerkfehler');
    } finally {
      setIsSendingCode(false);
    }
  };

  const saveSettings = () => {
    if (!session?.email) return;
    setIsSaving(true);
    const storageKey = `webmail_settings_${session.email}`;
    localStorage.setItem(storageKey, JSON.stringify(settings));
    setTimeout(() => {
      setIsSaving(false);
      toast.success('Änderungen wurden gespeichert');
    }, 500);
  };

  const getInitials = (email: string) => email.split('@')[0].charAt(0).toUpperCase();
  const getDisplayName = (email: string) => settings.displayName || email.split('@')[0];

  if (isLoading) {
    return (
      <div className={cn("h-screen flex items-center justify-center", isDark ? "bg-[#202124]" : "bg-white")}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  const SettingsCard = ({ icon: Icon, iconColor, title, description, onClick }: { icon: React.ElementType; iconColor: string; title: string; description: string; onClick?: () => void }) => (
    <div className={cn("group rounded-2xl border p-5 transition-all cursor-pointer hover:shadow-lg hover:-translate-y-0.5", isDark ? "bg-[#2d2e30] border-[#5f6368] hover:border-[#8ab4f8]" : "bg-white border-gray-200 hover:border-teal-300")} onClick={onClick}>
      <div className="flex items-start gap-4">
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", iconColor)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className={cn("font-medium", isDark ? "text-white" : "text-gray-900")}>{title}</h3>
            {onClick && <ChevronRight className={cn("w-5 h-5 transition-transform group-hover:translate-x-1", isDark ? "text-gray-500" : "text-gray-400")} />}
          </div>
          <p className={cn("text-sm mt-0.5", isDark ? "text-gray-400" : "text-gray-500")}>{description}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className={cn("h-screen flex flex-col", isDark ? "bg-[#202124]" : "bg-gray-50")}>
      <MailHeader userEmail={session?.email || ''} onLogout={() => window.location.href = getAppUrl('/webmail')} />
      <div className={cn("flex-1 flex overflow-hidden", isDark ? "bg-[#202124]" : "bg-gray-50")}>
        <div className={cn("w-72 border-r overflow-y-auto", isDark ? "bg-[#202124] border-[#5f6368]" : "bg-white border-gray-200")}>
          <nav className="p-2">
            {navItems.map((item) => {
              const NavIcon = item.icon;
              return (
                <button key={item.id} onClick={() => setActiveSection(item.id)} className={cn('w-full flex items-center gap-3 px-4 py-3 rounded-full text-sm font-medium transition-all mb-1', activeSection === item.id ? (isDark ? 'bg-teal-900/30 text-teal-300' : 'bg-teal-50 text-teal-700') : (isDark ? 'text-gray-300 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-100'))}>
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", item.color)}>
                    <NavIcon className="w-5 h-5 text-white" />
                  </div>
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
          <div className={cn("border-t mt-4 pt-4 px-4", isDark ? "border-[#5f6368]" : "border-gray-200")}>
            <button className={cn("flex items-center gap-2 text-sm py-2", isDark ? "text-gray-400 hover:text-gray-200" : "text-gray-600 hover:text-gray-900")}>
              <HelpCircle className="w-4 h-4" />
              Hilfe
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeSection === 'overview' && (
            <div className="h-full flex flex-col">
              {/* Header mit Gradient */}
              <div className={cn("relative", isDark ? "bg-[#2d2e30]" : "bg-white")}>
                <div className="h-32 bg-linear-to-r from-red-400 via-teal-400 to-blue-500 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-30">
                    <svg viewBox="0 0 1200 100" className="w-full h-full" preserveAspectRatio="none">
                      <circle cx="150" cy="50" r="40" fill="rgba(255,255,255,0.3)" />
                      <circle cx="400" cy="30" r="25" fill="rgba(255,255,255,0.2)" />
                      <circle cx="700" cy="60" r="50" fill="rgba(255,255,255,0.2)" />
                      <circle cx="1000" cy="40" r="35" fill="rgba(255,255,255,0.3)" />
                    </svg>
                  </div>
                </div>
                
                {/* Profil-Info Leiste */}
                <div className={cn("border-b", isDark ? "border-[#5f6368]" : "border-gray-200")}>
                  <div className="px-8 pb-6">
                    <div className="flex items-end gap-6 -mt-16">
                      {/* Avatar */}
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                      <div className="relative group shrink-0">
                        <button 
                          onClick={() => avatarInputRef.current?.click()}
                          disabled={isUploadingAvatar}
                          className="relative"
                        >
                          <div className="w-32 h-32 rounded-full bg-linear-to-br from-red-400 via-yellow-400 to-blue-500 p-1 shadow-xl">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <div className={cn("w-full h-full rounded-full flex items-center justify-center text-4xl font-medium", isDark ? "bg-[#5f6368] text-white" : "bg-gray-400 text-white")}>
                                {getInitials(session?.email || '')}
                              </div>
                            )}
                          </div>
                          <div className={cn(
                            "absolute inset-0 rounded-full flex items-center justify-center transition-opacity",
                            isUploadingAvatar ? "opacity-100 bg-black/50" : "opacity-0 group-hover:opacity-100 bg-black/40"
                          )}>
                            {isUploadingAvatar ? <Loader2 className="w-8 h-8 text-white animate-spin" /> : <Camera className="w-8 h-8 text-white" />}
                          </div>
                        </button>
                        {avatarUrl && !isUploadingAvatar && (
                          <button onClick={handleAvatarDelete} className="absolute bottom-1 right-1 w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" title="Avatar löschen">
                            <Trash2 className="w-5 h-5 text-white" />
                          </button>
                        )}
                        {!avatarUrl && !isUploadingAvatar && (
                          <div className="absolute bottom-1 right-1 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <ImagePlus className="w-5 h-5 text-gray-600" />
                          </div>
                        )}
                      </div>
                      
                      {/* Name und E-Mail */}
                      <div className="flex-1 pb-2">
                        <h1 className={cn("text-3xl font-normal", isDark ? "text-white" : "text-gray-900")}>{getDisplayName(session?.email || '')}</h1>
                        <p className={cn("text-base mt-1", isDark ? "text-gray-400" : "text-gray-500")}>{session?.email}</p>
                      </div>
                      
                      {/* Suche */}
                      <div className="w-80 pb-2">
                        <div className={cn("flex items-center gap-3 px-4 py-3 rounded-full border", isDark ? "bg-[#3c4043] border-[#5f6368]" : "bg-gray-50 border-gray-200")}>
                          <Search className={cn("w-5 h-5", isDark ? "text-gray-400" : "text-gray-500")} />
                          <input type="text" placeholder="Einstellungen durchsuchen" className={cn("flex-1 bg-transparent border-none outline-none text-sm", isDark ? "text-white placeholder:text-gray-500" : "text-gray-900 placeholder:text-gray-400")} />
                        </div>
                      </div>
                    </div>
                    
                    {/* Quick Actions */}
                    <div className="flex items-center gap-2 mt-6 flex-wrap">
                      {quickActions.map((action) => (
                        <button key={action.id} onClick={() => setActiveSection(action.id === 'password' ? 'password' : 'security')} className={cn("px-4 py-2 rounded-full border text-sm font-medium transition-colors", isDark ? "border-[#5f6368] text-gray-300 hover:bg-white/5" : "border-gray-300 text-gray-700 hover:bg-gray-50")}>
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Settings Grid */}
              <div className={cn("flex-1 p-8", isDark ? "bg-[#202124]" : "bg-gray-50")}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <SettingsCard icon={User} iconColor="bg-gradient-to-br from-green-400 to-green-600" title="Persönliche Daten" description="Name, E-Mail-Adresse, Signatur" onClick={() => setActiveSection('personal')} />
                  <SettingsCard icon={Shield} iconColor="bg-gradient-to-br from-cyan-400 to-cyan-600" title="Sicherheit und Anmeldung" description="Passwort, 2-Faktor-Authentifizierung, Geräte" onClick={() => setActiveSection('security')} />
                  <SettingsCard icon={Key} iconColor="bg-gradient-to-br from-teal-400 to-cyan-600" title="Daten und Datenschutz" description="Lesebestätigungen, Online-Status" onClick={() => setActiveSection('privacy')} />
                  <SettingsCard icon={Bell} iconColor="bg-gradient-to-br from-pink-400 to-pink-600" title="Benachrichtigungen" description="E-Mail, Desktop, Töne" onClick={() => setActiveSection('notifications')} />
                  <SettingsCard icon={HardDrive} iconColor="bg-gradient-to-br from-orange-400 to-orange-600" title="Speicherplatz" description={storageData.isLoading ? 'Wird geladen...' : `${storageData.totalUsedFormatted} von ${storageData.totalLimitFormatted} belegt`} onClick={() => setActiveSection('storage')} />
                </div>
                
                <div className={cn("mt-8 p-4 rounded-lg flex items-start gap-3", isDark ? "bg-[#2d2e30]" : "bg-white border border-gray-200")}>
                  <Shield className={cn("w-5 h-5 mt-0.5 shrink-0", isDark ? "text-gray-400" : "text-gray-500")} />
                  <p className={cn("text-sm", isDark ? "text-gray-400" : "text-gray-600")}>Nur Sie können Ihre Einstellungen sehen. Taskilo behandelt Ihre Daten vertraulich und sicher.</p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'personal' && (
            <div className={cn("h-full overflow-y-auto", isDark ? "bg-[#202124]" : "bg-white")}>
              {/* Header */}
              <div className="px-8 py-8 max-w-3xl">
                <button onClick={() => setActiveSection('overview')} className={cn("flex items-center gap-2 text-sm mb-6", isDark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900")}>
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  Zurück zur Übersicht
                </button>
                <h1 className={cn("text-3xl font-normal", isDark ? "text-white" : "text-gray-900")}>Persönliche Daten</h1>
                <p className={cn("text-sm mt-3 leading-relaxed max-w-2xl", isDark ? "text-gray-400" : "text-gray-600")}>Hier können Sie Details verwalten, mit denen Taskilo besser an Ihre Anforderungen angepasst wird, und festlegen, welche Informationen für andere sichtbar sind</p>
              </div>
              
              {/* Profil-Liste - Ohne sichtbare Card-Border wie bei Google */}
              <div className="px-8 pb-8 max-w-3xl">
                <div className={cn("rounded-xl overflow-hidden", isDark ? "bg-[#2d2e30]" : "bg-white shadow-sm border border-gray-100")}>
                  
                  {/* Profilbild */}
                  <div 
                    className={cn("flex items-center justify-between px-6 py-5 cursor-pointer transition-colors", isDark ? "hover:bg-white/5" : "hover:bg-gray-50")} 
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    <div className="flex items-center gap-5">
                      <Camera className={cn("w-6 h-6", isDark ? "text-gray-400" : "text-gray-500")} />
                      <div>
                        <h3 className={cn("text-sm", isDark ? "text-white" : "text-gray-900")}>Profilbild</h3>
                        <p className={cn("text-sm mt-0.5", isDark ? "text-gray-400" : "text-gray-500")}>Ein Profilbild hilft anderen, dich zu erkennen</p>
                      </div>
                    </div>
                    <div className="w-14 h-14 rounded-full bg-teal-600 flex items-center justify-center overflow-hidden shrink-0">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-medium text-xl">{getInitials(session?.email || '')}</span>
                      )}
                    </div>
                  </div>

                  <div className={cn("h-px mx-6", isDark ? "bg-[#5f6368]" : "bg-gray-100")} />

                  {/* Name */}
                  <div 
                    className={cn("flex items-center justify-between px-6 py-5 cursor-pointer transition-colors", isDark ? "hover:bg-white/5" : "hover:bg-gray-50")}
                    onClick={() => {
                      const displayParts = (settings.displayName || '').split(' ');
                      setNameEditData({
                        firstName: displayParts[0] || session?.email?.split('@')[0] || '',
                        lastName: displayParts.slice(1).join(' ') || '',
                        alias: ''
                      });
                      setActiveSection('name-detail');
                    }}
                  >
                    <div className="flex items-center gap-5">
                      <User className={cn("w-6 h-6", isDark ? "text-gray-400" : "text-gray-500")} />
                      <div>
                        <h3 className={cn("text-sm", isDark ? "text-white" : "text-gray-900")}>Name</h3>
                        <p className={cn("text-sm mt-0.5", isDark ? "text-gray-300" : "text-gray-700")}>{settings.displayName || session?.email?.split('@')[0] || 'Nicht festgelegt'}</p>
                      </div>
                    </div>
                    <ChevronRight className={cn("w-5 h-5", isDark ? "text-gray-500" : "text-gray-400")} />
                  </div>

                  <div className={cn("h-px mx-6", isDark ? "bg-[#5f6368]" : "bg-gray-100")} />

                  {/* E-Mail */}
                  <div className={cn("flex items-center justify-between px-6 py-5 cursor-pointer transition-colors", isDark ? "hover:bg-white/5" : "hover:bg-gray-50")}>
                    <div className="flex items-center gap-5">
                      <Mail className={cn("w-6 h-6", isDark ? "text-gray-400" : "text-gray-500")} />
                      <div>
                        <h3 className={cn("text-sm", isDark ? "text-white" : "text-gray-900")}>E-Mail</h3>
                        <p className={cn("text-sm mt-0.5", isDark ? "text-gray-300" : "text-gray-700")}>{session?.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className={cn("h-px mx-6", isDark ? "bg-[#5f6368]" : "bg-gray-100")} />

                  {/* Telefon */}
                  <div className={cn("flex items-center justify-between px-6 py-5 cursor-pointer transition-colors", isDark ? "hover:bg-white/5" : "hover:bg-gray-50")}>
                    <div className="flex items-center gap-5">
                      <Phone className={cn("w-6 h-6", isDark ? "text-gray-400" : "text-gray-500")} />
                      <div>
                        <h3 className={cn("text-sm", isDark ? "text-white" : "text-gray-900")}>Telefon</h3>
                        <p className={cn("text-sm mt-0.5", isDark ? "text-gray-300" : "text-gray-700")}>
                          {phoneStatus.phoneVerified ? phoneStatus.phone : 'Nicht verifiziert'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={cn("h-px mx-6", isDark ? "bg-[#5f6368]" : "bg-gray-100")} />

                  {/* Geburtstag */}
                  <div className={cn("flex items-center justify-between px-6 py-5 cursor-pointer transition-colors", isDark ? "hover:bg-white/5" : "hover:bg-gray-50")}>
                    <div className="flex items-center gap-5">
                      <Calendar className={cn("w-6 h-6", isDark ? "text-gray-400" : "text-gray-500")} />
                      <div>
                        <h3 className={cn("text-sm", isDark ? "text-white" : "text-gray-900")}>Geburtstag</h3>
                        <p className={cn("text-sm mt-0.5", isDark ? "text-gray-300" : "text-gray-700")}>Nicht festgelegt</p>
                      </div>
                    </div>
                  </div>

                  <div className={cn("h-px mx-6", isDark ? "bg-[#5f6368]" : "bg-gray-100")} />

                  {/* Sprache */}
                  <div className={cn("flex items-center justify-between px-6 py-5 cursor-pointer transition-colors", isDark ? "hover:bg-white/5" : "hover:bg-gray-50")}>
                    <div className="flex items-center gap-5">
                      <Globe className={cn("w-6 h-6", isDark ? "text-gray-400" : "text-gray-500")} />
                      <div>
                        <h3 className={cn("text-sm", isDark ? "text-white" : "text-gray-900")}>Sprache</h3>
                        <p className={cn("text-sm mt-0.5", isDark ? "text-gray-300" : "text-gray-700")}>Deutsch (Deutschland)</p>
                      </div>
                    </div>
                  </div>

                  <div className={cn("h-px mx-6", isDark ? "bg-[#5f6368]" : "bg-gray-100")} />

                  {/* Adresse */}
                  <div className={cn("flex items-center justify-between px-6 py-5 cursor-pointer transition-colors", isDark ? "hover:bg-white/5" : "hover:bg-gray-50")}>
                    <div className="flex items-center gap-5">
                      <MapPin className={cn("w-6 h-6", isDark ? "text-gray-400" : "text-gray-500")} />
                      <div>
                        <h3 className={cn("text-sm", isDark ? "text-white" : "text-gray-900")}>Privatadresse</h3>
                        <p className={cn("text-sm mt-0.5", isDark ? "text-gray-300" : "text-gray-700")}>Nicht festgelegt</p>
                      </div>
                    </div>
                  </div>

                  <div className={cn("h-px mx-6", isDark ? "bg-[#5f6368]" : "bg-gray-100")} />

                  {/* Arbeitsadresse */}
                  <div className={cn("flex items-center justify-between px-6 py-5 cursor-pointer transition-colors", isDark ? "hover:bg-white/5" : "hover:bg-gray-50")}>
                    <div className="flex items-center gap-5">
                      <Briefcase className={cn("w-6 h-6", isDark ? "text-gray-400" : "text-gray-500")} />
                      <div>
                        <h3 className={cn("text-sm", isDark ? "text-white" : "text-gray-900")}>Arbeitsadresse</h3>
                        <p className={cn("text-sm mt-0.5", isDark ? "text-gray-300" : "text-gray-700")}>Nicht festgelegt</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Name Detail Section - Google Account Style */}
          {activeSection === 'name-detail' && (
            <div className={cn("h-full overflow-y-auto", isDark ? "bg-[#202124]" : "bg-white")}>
              {/* Header */}
              <div className="px-8 py-8 max-w-3xl">
                <button onClick={() => setActiveSection('personal')} className={cn("flex items-center gap-2 text-sm mb-6", isDark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900")}>
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  Name
                </button>
                <h1 className={cn("text-3xl font-normal", isDark ? "text-white" : "text-gray-900")}>Name</h1>
              </div>
              
              {/* Name Card */}
              <div className="px-8 pb-4 max-w-3xl">
                <div className={cn("rounded-xl overflow-hidden", isDark ? "bg-[#2d2e30]" : "bg-white shadow-sm border border-gray-100")}>
                  
                  {/* Name */}
                  <div className="px-6 py-5">
                    <div className="flex items-center gap-5">
                      <User className={cn("w-6 h-6", isDark ? "text-gray-400" : "text-gray-500")} />
                      <div className="flex-1">
                        <h3 className={cn("text-sm", isDark ? "text-white" : "text-gray-900")}>Name</h3>
                        <p className={cn("text-sm mt-0.5", isDark ? "text-gray-300" : "text-gray-700")}>
                          {nameEditData.firstName} {nameEditData.lastName}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={cn("h-px mx-6", isDark ? "bg-[#5f6368]" : "bg-gray-100")} />

                  {/* Alias */}
                  <div 
                    className={cn("flex items-center justify-between px-6 py-5 cursor-pointer transition-colors", isDark ? "hover:bg-white/5" : "hover:bg-gray-50")}
                    onClick={() => aliasInputRef.current?.focus()}
                  >
                    <div className="flex items-center gap-5">
                      <User className={cn("w-6 h-6", isDark ? "text-gray-400" : "text-gray-500")} />
                      <div>
                        <h3 className={cn("text-sm", isDark ? "text-white" : "text-gray-900")}>Alias</h3>
                        <p className={cn("text-sm mt-0.5", isDark ? "text-gray-300" : "text-gray-700")}>
                          {nameEditData.alias || 'Kein Alias'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className={cn("w-5 h-5", isDark ? "text-gray-500" : "text-gray-400")} />
                  </div>
                </div>
              </div>

              {/* Info Box - Wer kann meinen Namen sehen */}
              <div className="px-8 py-6 max-w-3xl">
                <h3 className={cn("text-base font-medium mb-4", isDark ? "text-white" : "text-gray-900")}>Wer kann meinen Namen sehen?</h3>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-gray-500" />
                  </div>
                  <p className={cn("text-sm leading-relaxed", isDark ? "text-gray-400" : "text-gray-600")}>
                    Diese Informationen sind für alle Personen sichtbar, die mit dir kommunizieren oder sich Inhalte ansehen, die du in Taskilo-Diensten erstellst.
                  </p>
                </div>
              </div>

              <div className={cn("mx-8 h-px max-w-3xl", isDark ? "bg-[#5f6368]" : "bg-gray-100")} />

              {/* Edit Form */}
              <div className="px-8 py-8 max-w-3xl">
                <h3 className={cn("text-base font-medium mb-6", isDark ? "text-white" : "text-gray-900")}>Namen ändern</h3>
                <div className="space-y-4">
                  <div>
                    <label className={cn("block text-sm mb-2", isDark ? "text-gray-400" : "text-gray-600")}>Vorname</label>
                    <Input
                      value={nameEditData.firstName}
                      onChange={(e) => setNameEditData(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="Vorname eingeben"
                      className={cn("max-w-md", isDark && "bg-[#3c4043] border-[#5f6368] text-white")}
                    />
                  </div>
                  <div>
                    <label className={cn("block text-sm mb-2", isDark ? "text-gray-400" : "text-gray-600")}>Nachname</label>
                    <Input
                      value={nameEditData.lastName}
                      onChange={(e) => setNameEditData(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Nachname eingeben"
                      className={cn("max-w-md", isDark && "bg-[#3c4043] border-[#5f6368] text-white")}
                    />
                  </div>
                  <div>
                    <label className={cn("block text-sm mb-2", isDark ? "text-gray-400" : "text-gray-600")}>Alias (optional)</label>
                    <Input
                      ref={aliasInputRef}
                      value={nameEditData.alias}
                      onChange={(e) => setNameEditData(prev => ({ ...prev, alias: e.target.value }))}
                      placeholder="z.B. Spitzname"
                      className={cn("max-w-md", isDark && "bg-[#3c4043] border-[#5f6368] text-white")}
                    />
                  </div>
                  <div className="pt-4">
                    <Button
                      onClick={async () => {
                        setIsSavingName(true);
                        const fullName = `${nameEditData.firstName} ${nameEditData.lastName}`.trim();
                        const newSettings = { ...settings, displayName: fullName };
                        setSettings(newSettings);
                        
                        if (session?.email) {
                          const storageKey = `webmail_settings_${session.email}`;
                          localStorage.setItem(storageKey, JSON.stringify(newSettings));
                        }
                        
                        await new Promise(resolve => setTimeout(resolve, 500));
                        setIsSavingName(false);
                        toast.success('Name gespeichert');
                        setActiveSection('personal');
                      }}
                      disabled={isSavingName || !nameEditData.firstName.trim()}
                      className="bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      {isSavingName && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Speichern
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className={cn("h-full", isDark ? "bg-[#202124]" : "bg-gray-50")}>
              <div className={cn("border-b px-8 py-6", isDark ? "bg-[#2d2e30] border-[#5f6368]" : "bg-white border-gray-200")}>
                <button onClick={() => setActiveSection('overview')} className={cn("flex items-center gap-2 text-sm mb-4", isDark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900")}>
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  Zurück zur Übersicht
                </button>
                <h1 className={cn("text-2xl font-normal", isDark ? "text-white" : "text-gray-900")}>Sicherheit und Anmeldung</h1>
                <p className={cn("text-sm mt-1", isDark ? "text-gray-400" : "text-gray-500")}>Einstellungen zur Sicherheit deines Kontos</p>
              </div>
              <div className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className={cn("rounded-2xl border p-6", isDark ? "bg-[#2d2e30] border-[#5f6368]" : "bg-white border-gray-200")}>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                      <Phone className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className={cn("font-medium", isDark ? "text-white" : "text-gray-900")}>Telefonnummer</h3>
                      {phoneStatus.isLoading ? (
                        <div className="flex items-center gap-2 mt-2">
                          <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                          <span className={cn("text-sm", isDark ? "text-gray-400" : "text-gray-500")}>Laden...</span>
                        </div>
                      ) : phoneStatus.phoneVerified ? (
                        <div className="flex items-center gap-2 mt-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className={cn("text-sm", isDark ? "text-gray-300" : "text-gray-700")}>{phoneStatus.phone}</span>
                        </div>
                      ) : verificationSessionId ? (
                        <div className="mt-4 space-y-4">
                          <p className={cn("text-sm", isDark ? "text-gray-400" : "text-gray-500")}>Gib den 6-stelligen Code ein, den wir an deine Telefonnummer gesendet haben.</p>
                          <Input value={verificationCode} onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" className={cn("text-center text-xl tracking-widest", isDark && "bg-[#3c4043] border-[#5f6368] text-white")} maxLength={6} />
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={handleResendCode} disabled={isSendingCode} className="flex-1">{isSendingCode && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Erneut senden</Button>
                            <Button onClick={handleVerifyCode} disabled={isVerifying || verificationCode.length !== 6} className="flex-1 bg-teal-600 hover:bg-teal-700">{isVerifying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Verifizieren</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 space-y-4">
                          <p className={cn("text-sm", isDark ? "text-gray-400" : "text-gray-500")}>Verifiziere deine Telefonnummer für zusätzliche Sicherheit.</p>
                          <Input type="tel" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} placeholder="0170 1234567" className={cn(isDark && "bg-[#3c4043] border-[#5f6368] text-white")} />
                          <Input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="E-Mail-Passwort zur Bestätigung" className={cn(isDark && "bg-[#3c4043] border-[#5f6368] text-white")} />
                          <Button onClick={handleSendCode} disabled={isSendingCode || !phoneInput || !passwordInput} className="w-full bg-teal-600 hover:bg-teal-700">{isSendingCode && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}SMS-Code senden</Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                  <SettingsCard icon={Lock} iconColor="bg-gradient-to-br from-blue-400 to-blue-600" title="Passwort" description="Zuletzt geändert: Unbekannt" onClick={() => setActiveSection('password')} />
                  <SettingsCard icon={Monitor} iconColor="bg-gradient-to-br from-purple-400 to-purple-600" title="Geräte" description="Verwalte Geräte, die auf dein Konto zugreifen" />
                  <SettingsCard icon={Smartphone} iconColor="bg-gradient-to-br from-indigo-400 to-indigo-600" title="2-Faktor-Authentifizierung" description="Nicht aktiviert" />
                </div>
              </div>
            </div>
          )}

          {activeSection === 'password' && (
            <div className={cn("h-full", isDark ? "bg-[#202124]" : "bg-gray-50")}>
              <div className={cn("border-b px-8 py-6", isDark ? "bg-[#2d2e30] border-[#5f6368]" : "bg-white border-gray-200")}>
                <button onClick={() => setActiveSection('security')} className={cn("flex items-center gap-2 text-sm mb-4", isDark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900")}>
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  Zurück zu Sicherheit
                </button>
                <h1 className={cn("text-2xl font-normal", isDark ? "text-white" : "text-gray-900")}>Passwort</h1>
                <p className={cn("text-sm mt-1", isDark ? "text-gray-400" : "text-gray-500")}>Verwalte dein Kontopasswort</p>
              </div>
              <div className="p-8">
                <div className={cn("rounded-2xl border p-6", isDark ? "bg-[#2d2e30] border-[#5f6368]" : "bg-white border-gray-200")}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                      <Lock className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className={cn("text-sm", isDark ? "text-gray-400" : "text-gray-500")}>Das Passwort wird über Mailcow verwaltet. Um dein Passwort zu ändern, kontaktiere bitte den Administrator.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'privacy' && (
            <div className={cn("h-full", isDark ? "bg-[#202124]" : "bg-gray-50")}>
              <div className={cn("border-b px-8 py-6", isDark ? "bg-[#2d2e30] border-[#5f6368]" : "bg-white border-gray-200")}>
                <button onClick={() => setActiveSection('overview')} className={cn("flex items-center gap-2 text-sm mb-4", isDark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900")}>
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  Zurück zur Übersicht
                </button>
                <h1 className={cn("text-2xl font-normal", isDark ? "text-white" : "text-gray-900")}>Daten und Datenschutz</h1>
                <p className={cn("text-sm mt-1", isDark ? "text-gray-400" : "text-gray-500")}>Kontrolliere deine Datenschutzeinstellungen</p>
              </div>
              <div className="p-8">
                <div className={cn("rounded-2xl border divide-y", isDark ? "bg-[#2d2e30] border-[#5f6368] divide-[#5f6368]" : "bg-white border-gray-200 divide-gray-200")}>
                  <div className="flex items-center justify-between p-5">
                    <div>
                      <h3 className={cn("font-medium", isDark ? "text-white" : "text-gray-900")}>Lesebestätigungen</h3>
                      <p className={cn("text-sm mt-0.5", isDark ? "text-gray-400" : "text-gray-500")}>Sende Lesebestätigungen an Absender</p>
                    </div>
                    <Switch checked={settings.privacy.readReceipts} onCheckedChange={(checked) => setSettings({ ...settings, privacy: { ...settings.privacy, readReceipts: checked } })} />
                  </div>
                  <div className="flex items-center justify-between p-5">
                    <div>
                      <h3 className={cn("font-medium", isDark ? "text-white" : "text-gray-900")}>Online-Status anzeigen</h3>
                      <p className={cn("text-sm mt-0.5", isDark ? "text-gray-400" : "text-gray-500")}>Andere können sehen wenn du online bist</p>
                    </div>
                    <Switch checked={settings.privacy.showOnlineStatus} onCheckedChange={(checked) => setSettings({ ...settings, privacy: { ...settings.privacy, showOnlineStatus: checked } })} />
                  </div>
                </div>
                <div className="flex justify-end mt-6">
                  <Button onClick={saveSettings} disabled={isSaving} className="bg-teal-600 hover:bg-teal-700">{isSaving ? 'Speichern...' : 'Änderungen speichern'}</Button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className={cn("h-full", isDark ? "bg-[#202124]" : "bg-gray-50")}>
              <div className={cn("border-b px-8 py-6", isDark ? "bg-[#2d2e30] border-[#5f6368]" : "bg-white border-gray-200")}>
                <button onClick={() => setActiveSection('overview')} className={cn("flex items-center gap-2 text-sm mb-4", isDark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900")}>
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  Zurück zur Übersicht
                </button>
                <h1 className={cn("text-2xl font-normal", isDark ? "text-white" : "text-gray-900")}>Benachrichtigungen</h1>
                <p className={cn("text-sm mt-1", isDark ? "text-gray-400" : "text-gray-500")}>Konfiguriere wie du benachrichtigt werden möchtest</p>
              </div>
              <div className="p-8">
                <div className={cn("rounded-2xl border divide-y", isDark ? "bg-[#2d2e30] border-[#5f6368] divide-[#5f6368]" : "bg-white border-gray-200 divide-gray-200")}>
                <div className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className={cn("font-medium", isDark ? "text-white" : "text-gray-900")}>E-Mail-Benachrichtigungen</h3>
                      <p className={cn("text-sm mt-0.5", isDark ? "text-gray-400" : "text-gray-500")}>Erhalte E-Mails über wichtige Updates</p>
                    </div>
                  </div>
                  <Switch checked={settings.notifications.email} onCheckedChange={(checked) => setSettings({ ...settings, notifications: { ...settings.notifications, email: checked } })} />
                </div>
                <div className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-linear-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                      <Monitor className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className={cn("font-medium", isDark ? "text-white" : "text-gray-900")}>Desktop-Benachrichtigungen</h3>
                      <p className={cn("text-sm mt-0.5", isDark ? "text-gray-400" : "text-gray-500")}>Zeige Benachrichtigungen im Browser</p>
                    </div>
                  </div>
                  <Switch checked={settings.notifications.desktop} onCheckedChange={(checked) => setSettings({ ...settings, notifications: { ...settings.notifications, desktop: checked } })} />
                </div>
                <div className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-linear-to-br from-pink-400 to-pink-600 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className={cn("font-medium", isDark ? "text-white" : "text-gray-900")}>Ton bei neuen E-Mails</h3>
                      <p className={cn("text-sm mt-0.5", isDark ? "text-gray-400" : "text-gray-500")}>Spiele einen Ton ab wenn neue E-Mails eintreffen</p>
                    </div>
                  </div>
                  <Switch checked={settings.notifications.sound} onCheckedChange={(checked) => setSettings({ ...settings, notifications: { ...settings.notifications, sound: checked } })} />
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <Button onClick={saveSettings} disabled={isSaving} className="bg-teal-600 hover:bg-teal-700">{isSaving ? 'Speichern...' : 'Änderungen speichern'}</Button>
              </div>
              </div>
            </div>
          )}

          {activeSection === 'storage' && (
            <div className={cn("h-full overflow-y-auto", isDark ? "bg-[#202124]" : "bg-gray-50")}>
              {/* Header mit Begrüßung */}
              <div className="px-8 py-10 text-center">
                <h1 className={cn("text-4xl font-normal", isDark ? "text-white" : "text-gray-900")}>
                  Guten {new Date().getHours() < 12 ? 'Morgen' : new Date().getHours() < 18 ? 'Tag' : 'Abend'}, {settings.displayName || session?.email?.split('@')[0]}
                </h1>
              </div>
              
              {/* Loading State */}
              {storageData.isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-[#14ad9f]" />
                </div>
              ) : (
                <>
                  {/* Widget Cards - Google One Style */}
                  <div className="px-8 pb-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                      
                      {/* Speicher Card mit Kreisdiagramm */}
                      <div className={cn("rounded-2xl border p-6 hover:shadow-lg transition-shadow cursor-pointer", isDark ? "bg-[#2d2e30] border-[#5f6368]" : "bg-white border-gray-200")}>
                        <h2 className={cn("text-base font-medium mb-6", isDark ? "text-white" : "text-gray-900")}>Speicher</h2>
                        <div className="flex flex-col items-center">
                          {/* SVG Kreisdiagramm - dynamisch berechnet */}
                          <div className="relative w-24 h-24 mb-4">
                            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 96 96">
                              {/* Hintergrund-Kreis */}
                              <circle 
                                cx="48" cy="48" r="42" 
                                fill="none" 
                                stroke={isDark ? "#3c4043" : "#e5e7eb"}
                                strokeWidth="6"
                              />
                              {/* Fortschritts-Kreis - strokeDashoffset = 263.89 - (263.89 * usedPercent / 100) */}
                              <circle 
                                cx="48" cy="48" r="42" 
                                fill="none" 
                                stroke="#14ad9f"
                                strokeWidth="6"
                                strokeDasharray="263.89"
                                strokeDashoffset={263.89 - (263.89 * storageData.usedPercent / 100)}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className={cn("text-2xl font-medium", isDark ? "text-white" : "text-gray-900")}>{storageData.usedPercent}<span className="text-lg">%</span></span>
                              <span className={cn("text-xs", isDark ? "text-gray-400" : "text-gray-500")}>belegt</span>
                            </div>
                          </div>
                          <p className={cn("text-sm", isDark ? "text-gray-400" : "text-gray-500")}>{storageData.totalUsedFormatted} von {storageData.totalLimitFormatted}</p>
                        </div>
                      </div>

                      {/* Backup Card */}
                      <div className={cn("rounded-2xl border p-6 hover:shadow-lg transition-shadow cursor-pointer", isDark ? "bg-[#2d2e30] border-[#5f6368]" : "bg-white border-gray-200")}>
                        <h2 className={cn("text-base font-medium mb-6", isDark ? "text-white" : "text-gray-900")}>Backup</h2>
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 mb-4 flex items-center justify-center">
                            <svg viewBox="0 0 48 48" className="w-16 h-16">
                              <path d="M24 4C12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20S35.046 4 24 4z" fill="none" stroke={isDark ? "#5f6368" : "#dadce0"} strokeWidth="2"/>
                              <path d="M24 14v10l6 6" fill="none" stroke="#14ad9f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M24 10v4M34 24h4M24 34v4M10 24h4" fill="none" stroke={isDark ? "#5f6368" : "#dadce0"} strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                          </div>
                          <p className={cn("text-sm text-center", isDark ? "text-gray-400" : "text-gray-500")}>Automatisches Backup aktiv</p>
                          <button className="mt-4 text-sm text-[#14ad9f] hover:text-teal-700 font-medium">Weitere Informationen</button>
                        </div>
                      </div>

                      {/* Speicherplatz freigeben Card */}
                      <div className={cn("rounded-2xl border p-6 hover:shadow-lg transition-shadow cursor-pointer", isDark ? "bg-[#2d2e30] border-[#5f6368]" : "bg-white border-gray-200")}>
                        <h2 className={cn("text-base font-medium mb-6", isDark ? "text-white" : "text-gray-900")}>Speicherplatz freigeben</h2>
                        <div className="flex flex-col items-center">
                          <div className="mb-4">
                            <span className={cn("text-4xl font-light", isDark ? "text-white" : "text-gray-900")}>{storageData.canFreeUpFormatted.split(' ')[0]}</span>
                            <span className={cn("text-xl ml-1", isDark ? "text-gray-400" : "text-gray-500")}>{storageData.canFreeUpFormatted.split(' ')[1] || 'B'} +</span>
                          </div>
                          <p className={cn("text-sm text-center", isDark ? "text-gray-400" : "text-gray-500")}>die freigegeben werden können</p>
                          <button className="mt-4 text-sm text-[#14ad9f] hover:text-teal-700 font-medium">Ansehen</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Speicherdetails */}
                  <div className="px-8 pb-8">
                    <div className={cn("rounded-2xl border p-6 max-w-5xl mx-auto", isDark ? "bg-[#2d2e30] border-[#5f6368]" : "bg-white border-gray-200")}>
                      <h3 className={cn("text-base font-medium mb-6", isDark ? "text-white" : "text-gray-900")}>Speichernutzung nach Dienst</h3>
                      
                      {/* Progress Bar - dynamisch basierend auf Services */}
                      <div className={cn("h-3 rounded-full overflow-hidden flex", isDark ? "bg-[#3c4043]" : "bg-gray-200")}>
                        {storageData.services.map((service, index) => {
                          const widthPercent = storageData.totalLimit > 0 
                            ? (service.used / storageData.totalLimit) * 100 
                            : 0;
                          return (
                            <div 
                              key={index}
                              className="h-full transition-all" 
                              style={{ width: `${widthPercent}%`, backgroundColor: service.color }} 
                            />
                          );
                        })}
                      </div>
                      
                      {/* Legende - dynamisch */}
                      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {storageData.services.map((service, index) => (
                          <div key={index} className={cn("flex items-center justify-between p-4 rounded-xl", isDark ? "bg-[#3c4043]" : "bg-gray-50")}>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${service.color}20` }}>
                                {service.icon === 'hard-drive' && <HardDrive className="w-5 h-5" style={{ color: service.color }} />}
                                {service.icon === 'camera' && <Camera className="w-5 h-5" style={{ color: service.color }} />}
                                {service.icon === 'mail' && <Mail className="w-5 h-5" style={{ color: service.color }} />}
                              </div>
                              <div>
                                <span className={cn("text-sm font-medium block", isDark ? "text-white" : "text-gray-900")}>{service.name}</span>
                                <span className={cn("text-xs", isDark ? "text-gray-400" : "text-gray-500")}>
                                  {service.name === 'Drive' ? 'Dateien & Dokumente' : service.name === 'Fotos' ? 'Bilder & Videos' : 'Nachrichten & Anhänge'}
                                </span>
                              </div>
                            </div>
                            <span className={cn("text-sm font-medium", isDark ? "text-gray-300" : "text-gray-700")}>{service.usedFormatted}</span>
                          </div>
                        ))}
                        
                        {/* Fallback wenn keine Services vorhanden */}
                        {storageData.services.length === 0 && (
                          <div className={cn("col-span-3 text-center py-4", isDark ? "text-gray-400" : "text-gray-500")}>
                            Keine Speicherdaten verfügbar
                          </div>
                        )}
                      </div>

                      {/* Gesamt */}
                      <div className={cn("mt-6 pt-6 border-t flex items-center justify-between", isDark ? "border-[#5f6368]" : "border-gray-200")}>
                        <span className={cn("text-sm", isDark ? "text-gray-400" : "text-gray-500")}>Gesamt verwendet</span>
                        <span className={cn("text-lg font-medium", isDark ? "text-white" : "text-gray-900")}>{storageData.totalUsedFormatted} von {storageData.totalLimitFormatted}</span>
                      </div>
                    </div>
                  </div>

                  {/* Upgrade Banner */}
                  <div className="px-8 pb-8">
                    <div className="max-w-5xl mx-auto rounded-2xl bg-linear-to-r from-[#14ad9f] to-teal-600 p-6 text-white">
                      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-medium">Mehr Speicherplatz benötigt?</h3>
                          <p className="text-sm text-white/80 mt-1">Upgrade auf Taskilo Pro für bis zu 2 TB Speicher und weitere Vorteile</p>
                        </div>
                        <button 
                          onClick={() => setActiveSection('abos')}
                          className="px-6 py-3 bg-white text-[#14ad9f] rounded-xl font-medium hover:bg-gray-100 transition-colors shrink-0"
                        >
                          Jetzt upgraden
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Abos Sektion - Google One Style */}
          {activeSection === 'abos' && (
            <div className={cn("flex-1 overflow-y-auto", isDark ? "bg-[#202124]" : "bg-gray-50")}>
              {/* Header */}
              <div className={cn("px-8 py-8 border-b", isDark ? "bg-[#202124] border-[#5f6368]" : "bg-white border-gray-200")}>
                <div className="max-w-5xl mx-auto">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 rounded-xl bg-linear-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                      <Crown className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h1 className={cn("text-2xl font-semibold", isDark ? "text-white" : "text-gray-900")}>Taskilo Abos</h1>
                      <p className={cn("text-sm", isDark ? "text-gray-400" : "text-gray-500")}>Wähle deinen Speicherplan</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Billing Toggle */}
              <div className="px-8 pt-8">
                <div className="max-w-5xl mx-auto flex justify-center">
                  <div className={cn("inline-flex rounded-full p-1", isDark ? "bg-[#3c4043]" : "bg-gray-200")}>
                    <button
                      onClick={() => setBillingCycle('monthly')}
                      className={cn(
                        "px-6 py-2.5 rounded-full text-sm font-medium transition-all",
                        billingCycle === 'monthly'
                          ? isDark ? "bg-[#202124] text-white shadow" : "bg-white text-gray-900 shadow"
                          : isDark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900"
                      )}
                    >
                      Monatlich
                    </button>
                    <button
                      onClick={() => setBillingCycle('yearly')}
                      className={cn(
                        "px-6 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                        billingCycle === 'yearly'
                          ? isDark ? "bg-[#202124] text-white shadow" : "bg-white text-gray-900 shadow"
                          : isDark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900"
                      )}
                    >
                      Jährlich
                      <span className="text-xs px-2 py-0.5 bg-green-500 text-white rounded-full">16% Rabatt</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Plans Grid */}
              <div className="px-8 py-8">
                <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {storagePlans.map((plan) => {
                    const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
                    const isCurrentPlan = plan.id === currentPlan;
                    
                    return (
                      <div
                        key={plan.id}
                        className={cn(
                          "rounded-2xl border-2 p-6 relative transition-all",
                          plan.recommended && !isCurrentPlan ? "border-[#14ad9f] ring-2 ring-[#14ad9f]/20" : "",
                          isCurrentPlan ? "border-gray-300" : "",
                          !plan.recommended && !isCurrentPlan ? isDark ? "border-[#5f6368]" : "border-gray-200" : "",
                          isDark ? "bg-[#2d2e30]" : "bg-white"
                        )}
                      >
                        {/* Badges */}
                        {isCurrentPlan && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                            <span className={cn("px-3 py-1 text-xs font-medium rounded-full", isDark ? "bg-[#3c4043] text-gray-300" : "bg-gray-200 text-gray-700")}>
                              Aktuelles Abo
                            </span>
                          </div>
                        )}
                        {plan.recommended && !isCurrentPlan && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                            <span className="px-3 py-1 text-xs font-medium rounded-full bg-[#14ad9f] text-white">
                              Empfohlen
                            </span>
                          </div>
                        )}

                        <div className="text-center pt-4">
                          <h3 className={cn("text-lg font-medium mb-1", isDark ? "text-white" : "text-gray-900")}>{plan.name}</h3>
                          <div className={cn("text-4xl font-light mb-1", isDark ? "text-white" : "text-gray-900")}>{plan.storage}</div>
                          
                          {plan.priceMonthly > 0 ? (
                            <div className="mt-4">
                              <span className={cn("text-2xl font-medium", isDark ? "text-white" : "text-gray-900")}>
                                {price.toFixed(2).replace('.', ',')} €
                              </span>
                              <span className={cn("text-sm", isDark ? "text-gray-400" : "text-gray-500")}>
                                /{billingCycle === 'monthly' ? 'Monat' : 'Jahr'}
                              </span>
                              <p className={cn("text-xs mt-1", isDark ? "text-gray-500" : "text-gray-400")}>
                                {billingCycle === 'monthly' ? 'Monatliche' : 'Jährliche'} Abrechnung
                              </p>
                            </div>
                          ) : (
                            <div className="mt-4">
                              <span className={cn("text-2xl font-medium", isDark ? "text-white" : "text-gray-900")}>Kostenlos</span>
                              <p className={cn("text-xs mt-1", isDark ? "text-gray-500" : "text-gray-400")}>Für immer</p>
                            </div>
                          )}

                          {/* Button */}
                          <div className="mt-6">
                            {isCurrentPlan ? (
                              <button
                                disabled
                                className={cn(
                                  "w-full py-3 px-4 rounded-xl font-medium",
                                  isDark ? "bg-[#3c4043] text-gray-400" : "bg-gray-100 text-gray-400"
                                )}
                              >
                                Aktuelles Abo
                              </button>
                            ) : plan.priceMonthly === 0 ? (
                              <button
                                disabled
                                className={cn(
                                  "w-full py-3 px-4 rounded-xl font-medium",
                                  isDark ? "bg-[#3c4043] text-gray-400" : "bg-gray-100 text-gray-400"
                                )}
                              >
                                Kostenlos
                              </button>
                            ) : (
                              <button
                                onClick={async () => {
                                  setSelectedPlan(plan.id);
                                  setIsProcessingPayment(true);
                                  
                                  try {
                                    // Revolut Payment initiieren
                                    const response = await fetch('/api/webmail/storage-upgrade', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        email: session?.email,
                                        planId: plan.id,
                                        billingCycle,
                                        amount: price,
                                        storage: plan.storageBytes,
                                      }),
                                    });
                                    
                                    const data = await response.json();
                                    
                                    if (data.success && data.paymentUrl) {
                                      // Revolut Checkout in neuem Tab öffnen
                                      const paymentWindow = window.open(data.paymentUrl, '_blank');
                                      
                                      // Polling um Payment-Status zu prüfen
                                      const orderId = data.orderId;
                                      if (orderId) {
                                        const checkPaymentStatus = setInterval(async () => {
                                          try {
                                            const statusResponse = await fetch(`/api/webmail/storage-upgrade?orderId=${orderId}`);
                                            const statusData = await statusResponse.json();
                                            
                                            if (statusData.status === 'completed' || statusData.status === 'paid') {
                                              clearInterval(checkPaymentStatus);
                                              toast.success(`Erfolgreich auf ${plan.name} (${plan.storage}) upgraded!`);
                                              setCurrentPlan(plan.id);
                                              loadStorageData();
                                              setIsProcessingPayment(false);
                                              setSelectedPlan(null);
                                            } else if (statusData.status === 'cancelled' || statusData.status === 'failed') {
                                              clearInterval(checkPaymentStatus);
                                              toast.error('Zahlung wurde abgebrochen oder ist fehlgeschlagen.');
                                              setIsProcessingPayment(false);
                                              setSelectedPlan(null);
                                            }
                                          } catch {
                                            // Ignoriere Fehler, weiter polling
                                          }
                                        }, 2000); // Alle 2 Sekunden prüfen
                                        
                                        // Timeout nach 10 Minuten
                                        setTimeout(() => {
                                          clearInterval(checkPaymentStatus);
                                          if (isProcessingPayment) {
                                            setIsProcessingPayment(false);
                                            setSelectedPlan(null);
                                          }
                                        }, 600000);
                                      }
                                    } else if (data.success && data.upgraded) {
                                      // Direkt upgraded (z.B. Test-Modus)
                                      toast.success(`Erfolgreich auf ${plan.name} (${plan.storage}) upgraded!`);
                                      setCurrentPlan(plan.id);
                                      loadStorageData();
                                      setIsProcessingPayment(false);
                                      setSelectedPlan(null);
                                    } else {
                                      toast.error(data.error || 'Fehler beim Upgrade');
                                      setIsProcessingPayment(false);
                                      setSelectedPlan(null);
                                    }
                                  } catch (error) {
                                    toast.error('Verbindungsfehler. Bitte versuche es erneut.');
                                    setIsProcessingPayment(false);
                                    setSelectedPlan(null);
                                  }
                                }}
                                disabled={isProcessingPayment}
                                className={cn(
                                  "w-full py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2",
                                  plan.recommended
                                    ? "bg-[#14ad9f] text-white hover:bg-teal-600"
                                    : isDark ? "bg-white text-gray-900 hover:bg-gray-100" : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                                )}
                              >
                                {isProcessingPayment && selectedPlan === plan.id ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                                    <span className="whitespace-nowrap">Wird verarbeitet...</span>
                                  </>
                                ) : (
                                  'Upgraden'
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Features */}
                        <div className="mt-6 pt-6 border-t space-y-3" style={{ borderColor: isDark ? '#5f6368' : '#e5e7eb' }}>
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-[#14ad9f]" />
                            <span className={cn("text-sm", isDark ? "text-gray-300" : "text-gray-600")}>{plan.storage} Gesamtspeicher</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-[#14ad9f]" />
                            <span className={cn("text-sm", isDark ? "text-gray-300" : "text-gray-600")}>Drive, Fotos & E-Mails</span>
                          </div>
                          {plan.id !== 'free' && (
                            <>
                              <div className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-[#14ad9f]" />
                                <span className={cn("text-sm", isDark ? "text-gray-300" : "text-gray-600")}>Prioritäts-Support</span>
                              </div>
                              {plan.id === 'pro' && (
                                <div className="flex items-center gap-2">
                                  <Sparkles className="w-4 h-4 text-[#14ad9f]" />
                                  <span className={cn("text-sm", isDark ? "text-gray-300" : "text-gray-600")}>KI-Features inklusive</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Current Usage Info */}
              <div className="px-8 pb-8">
                <div className="max-w-5xl mx-auto">
                  <div className={cn("rounded-2xl border p-6", isDark ? "bg-[#2d2e30] border-[#5f6368]" : "bg-white border-gray-200")}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className={cn("font-medium", isDark ? "text-white" : "text-gray-900")}>Aktuelle Nutzung</h3>
                        <p className={cn("text-sm mt-1", isDark ? "text-gray-400" : "text-gray-500")}>
                          {storageData.totalUsedFormatted} von {storageData.totalLimitFormatted} verwendet ({storageData.usedPercent}%)
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveSection('storage')}
                        className="text-sm text-[#14ad9f] hover:text-teal-700 font-medium"
                      >
                        Details anzeigen
                      </button>
                    </div>
                    
                    {/* Progress */}
                    <div className={cn("mt-4 h-2 rounded-full overflow-hidden", isDark ? "bg-[#3c4043]" : "bg-gray-200")}>
                      <div 
                        className="h-full bg-[#14ad9f] transition-all" 
                        style={{ width: `${Math.min(storageData.usedPercent, 100)}%` }} 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div className="px-8 pb-8">
                <div className="max-w-5xl mx-auto">
                  <div className={cn("rounded-2xl border p-6 flex items-center gap-4", isDark ? "bg-[#2d2e30] border-[#5f6368]" : "bg-white border-gray-200")}>
                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0">
                      <img src="/revolut-logo.svg" alt="Revolut" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <h3 className={cn("font-medium", isDark ? "text-white" : "text-gray-900")}>Sichere Zahlung mit Revolut</h3>
                      <p className={cn("text-sm mt-0.5", isDark ? "text-gray-400" : "text-gray-500")}>
                        Alle Zahlungen werden sicher über Revolut abgewickelt. Du kannst jederzeit kündigen.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* DSGVO & Made in Germany */}
              <div className="px-8 pb-8">
                <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 100% DSGVO */}
                  <div className={cn("rounded-2xl border p-5 flex items-center gap-4", isDark ? "bg-[#2d2e30] border-[#5f6368]" : "bg-white border-gray-200")}>
                    <div className="w-12 h-12 rounded-xl bg-linear-to-br from-green-500 to-green-600 flex items-center justify-center shrink-0">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className={cn("font-medium", isDark ? "text-white" : "text-gray-900")}>100% DSGVO-konform</h3>
                      <p className={cn("text-sm mt-0.5", isDark ? "text-gray-400" : "text-gray-500")}>
                        Deine Daten werden nach höchsten Datenschutzstandards geschützt
                      </p>
                    </div>
                  </div>

                  {/* Made in Germany */}
                  <div className={cn("rounded-2xl border p-5 flex items-center gap-4", isDark ? "bg-[#2d2e30] border-[#5f6368]" : "bg-white border-gray-200")}>
                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                      <div className="w-full h-full flex flex-col">
                        <div className="flex-1 bg-black"></div>
                        <div className="flex-1 bg-red-600"></div>
                        <div className="flex-1 bg-yellow-400"></div>
                      </div>
                    </div>
                    <div>
                      <h3 className={cn("font-medium", isDark ? "text-white" : "text-gray-900")}>Made in Germany</h3>
                      <p className={cn("text-sm mt-0.5", isDark ? "text-gray-400" : "text-gray-500")}>
                        Server in Deutschland, deutsche Qualitätsstandards
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}


        </div>
      </div>
    </div>
  );
}
