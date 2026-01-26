'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Building2, 
  User, 
  Mail, 
  HardDrive, 
  Video, 
  Calendar, 
  Shield, 
  Sparkles,
  Globe,
  Users,
  Clock,
  Zap,
  Cloud,
  Lock,
  Headphones,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function AddAccountPage() {
  const router = useRouter();
  const [hoveredOption, setHoveredOption] = useState<'business' | 'free' | null>(null);

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-teal-50/30 flex flex-col">
      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Logo */}
        <div className="mb-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#14ad9f] rounded-xl flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">Taskilo</span>
          </Link>
        </div>

        {/* Title */}
        <div className="text-center mb-12 max-w-2xl">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Wählen Sie Ihr Konto
          </h1>
          <p className="text-lg text-gray-600">
            Ob für Ihr Unternehmen oder privat - wir haben die passende Lösung für Sie.
          </p>
        </div>

        {/* Options Container */}
        <div className="flex flex-col lg:flex-row gap-8 w-full max-w-5xl">
          
          {/* Business Option */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onMouseEnter={() => setHoveredOption('business')}
            onMouseLeave={() => setHoveredOption(null)}
            className={cn(
              "flex-1 bg-white rounded-3xl p-8 transition-all duration-300 cursor-pointer relative overflow-hidden",
              hoveredOption === 'business' 
                ? "shadow-2xl shadow-teal-200/50 ring-2 ring-[#14ad9f] -translate-y-1" 
                : "shadow-lg hover:shadow-xl"
            )}
            onClick={() => router.push('/webmail/register/business')}
          >
            {/* Recommended Badge */}
            <div className="absolute top-0 right-0">
              <div className="bg-[#14ad9f] text-white text-xs font-semibold px-4 py-1.5 rounded-bl-2xl rounded-tr-3xl flex items-center gap-1">
                <Star className="w-3 h-3" />
                Empfohlen
              </div>
            </div>

            {/* Header */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 bg-teal-50 text-[#14ad9f] text-sm font-medium px-3 py-1.5 rounded-full mb-4">
                <Zap className="w-4 h-4" />
                14 Tage kostenlos
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                Taskilo Business
              </h3>
              <p className="text-gray-500 mt-1">
                Ab 6€/Monat pro Nutzer
              </p>
            </div>

            {/* Highlight */}
            <div className="bg-linear-to-r from-teal-50 to-cyan-50 rounded-2xl p-4 mb-6">
              <p className="text-[#14ad9f] font-semibold flex items-center gap-2">
                <Globe className="w-5 h-5" />
                IhrName@IhrUnternehmen.de
              </p>
              <p className="text-gray-600 text-sm mt-1">
                Professionelle E-Mail mit Ihrer eigenen Domain
              </p>
            </div>

            {/* CTA Button */}
            <button 
              className="w-full bg-[#14ad9f] text-white py-4 px-6 rounded-xl font-semibold hover:bg-teal-700 transition-all duration-300 shadow-lg shadow-teal-200/50 hover:shadow-xl hover:shadow-teal-300/50 mb-8"
              onClick={(e) => {
                e.stopPropagation();
                router.push('/webmail/register/business');
              }}
            >
              Kostenlos testen
            </button>

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-4">
              <FeatureItem icon={HardDrive} text="Bis zu 5 TB Speicher" highlight />
              <FeatureItem icon={Globe} text="Eigene Domain" />
              <FeatureItem icon={Video} text="Unbegrenzte Meetings" />
              <FeatureItem icon={Users} text="Team-Verwaltung" />
              <FeatureItem icon={Lock} text="Admin-Konsole" />
              <FeatureItem icon={Headphones} text="Prioritäts-Support" />
            </div>

            {/* Bottom Illustration */}
            <div className="mt-8 relative h-32 rounded-2xl overflow-hidden bg-linear-to-br from-teal-500 to-cyan-500">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-4 left-4 w-16 h-16 bg-white rounded-full" />
                <div className="absolute bottom-4 right-8 w-24 h-24 bg-white rounded-full" />
                <div className="absolute top-8 right-4 w-8 h-8 bg-white rounded-full" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center gap-4">
                <div className="bg-white/90 backdrop-blur rounded-xl p-3 shadow-lg">
                  <Mail className="w-6 h-6 text-[#14ad9f]" />
                </div>
                <div className="bg-white/90 backdrop-blur rounded-xl p-3 shadow-lg">
                  <Calendar className="w-6 h-6 text-blue-500" />
                </div>
                <div className="bg-white/90 backdrop-blur rounded-xl p-3 shadow-lg">
                  <Video className="w-6 h-6 text-red-500" />
                </div>
                <div className="bg-white/90 backdrop-blur rounded-xl p-3 shadow-lg">
                  <Cloud className="w-6 h-6 text-yellow-500" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Free Option */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onMouseEnter={() => setHoveredOption('free')}
            onMouseLeave={() => setHoveredOption(null)}
            className={cn(
              "flex-1 bg-white rounded-3xl p-8 transition-all duration-300 cursor-pointer",
              hoveredOption === 'free' 
                ? "shadow-2xl shadow-gray-200/50 ring-2 ring-gray-300 -translate-y-1" 
                : "shadow-lg hover:shadow-xl"
            )}
            onClick={() => router.push('/webmail/register')}
          >
            {/* Header */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 text-sm font-medium px-3 py-1.5 rounded-full mb-4">
                <Sparkles className="w-4 h-4" />
                Kostenlos für immer
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                Taskilo Free
              </h3>
              <p className="text-gray-500 mt-1">
                Perfekt für den Einstieg
              </p>
            </div>

            {/* Highlight */}
            <div className="bg-linear-to-r from-gray-50 to-slate-50 rounded-2xl p-4 mb-6">
              <p className="text-gray-700 font-semibold flex items-center gap-2">
                <Mail className="w-5 h-5 text-gray-500" />
                IhrName@taskilo.de
              </p>
              <p className="text-gray-500 text-sm mt-1">
                Ihre persönliche Taskilo-Adresse
              </p>
            </div>

            {/* CTA Button */}
            <button 
              className="w-full bg-gray-900 text-white py-4 px-6 rounded-xl font-semibold hover:bg-gray-800 transition-all duration-300 mb-8"
              onClick={(e) => {
                e.stopPropagation();
                router.push('/webmail/register');
              }}
            >
              Kostenloses Konto erstellen
            </button>

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-4">
              <FeatureItem icon={HardDrive} text="15 GB Speicher" color="gray" />
              <FeatureItem icon={Mail} text="Taskilo Mail" color="gray" />
              <FeatureItem icon={Cloud} text="Taskilo Drive" color="gray" />
              <FeatureItem icon={Calendar} text="Kalender" color="gray" />
              <FeatureItem icon={Video} text="Meet (60 Min)" color="gray" />
              <FeatureItem icon={Shield} text="Spam-Schutz" color="gray" />
            </div>

            {/* Bottom Illustration */}
            <div className="mt-8 relative h-32 rounded-2xl overflow-hidden bg-linear-to-br from-gray-200 to-gray-300">
              <div className="absolute inset-0 opacity-30">
                <div className="absolute top-4 left-4 w-16 h-16 bg-white rounded-full" />
                <div className="absolute bottom-4 right-8 w-24 h-24 bg-white rounded-full" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <User className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="text-white font-medium">
                    <p className="text-sm opacity-80">Einfach starten</p>
                    <p className="font-semibold">Ohne Kosten</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Comparison Note */}
        <div className="mt-12 text-center max-w-2xl">
          <p className="text-gray-500 text-sm">
            Sie können jederzeit upgraden. Alle Pläne beinhalten Taskilo Mail, Drive, Fotos, Kalender und Meet.
          </p>
        </div>

        {/* Trust Badges */}
        <div className="mt-10 flex flex-wrap justify-center gap-8">
          <TrustBadge icon={Shield} text="DSGVO-konform" />
          <TrustBadge icon={Building2} text="Server in Deutschland" />
          <TrustBadge icon={Lock} text="Ende-zu-Ende verschlüsselt" />
          <TrustBadge icon={Clock} text="99.9% Verfügbarkeit" />
        </div>
      </main>
    </div>
  );
}

// Feature Item Component
function FeatureItem({ 
  icon: Icon, 
  text, 
  highlight = false,
  color = 'teal',
}: { 
  icon: React.ElementType; 
  text: string; 
  highlight?: boolean;
  color?: 'teal' | 'gray';
}) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
        color === 'teal' 
          ? highlight ? "bg-[#14ad9f] text-white" : "bg-teal-50 text-[#14ad9f]"
          : "bg-gray-100 text-gray-500"
      )}>
        <Icon className="w-4 h-4" />
      </div>
      <span className={cn(
        "text-sm",
        highlight ? "font-semibold text-gray-900" : "text-gray-600"
      )}>
        {text}
      </span>
    </div>
  );
}

// Trust Badge Component
function TrustBadge({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-center gap-2 text-gray-500">
      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}
