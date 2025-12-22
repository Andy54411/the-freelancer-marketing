'use client';

import { Mail, ArrowRight, Shield, Zap, Globe } from 'lucide-react';
import Link from 'next/link';

export default function EmailCTA() {
  return (
    <section className="py-16 bg-linear-to-br from-teal-600 to-teal-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-white">
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 mb-6">
              <Mail className="h-5 w-5" />
              <span className="text-sm font-medium">Kostenlose E-Mail</span>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Deine kostenlose @taskilo.de E-Mail-Adresse
            </h2>
            
            <p className="text-lg text-teal-100 mb-8">
              Erstelle jetzt deine professionelle E-Mail-Adresse. 
              1 GB Speicher, sicher gehostet in Deutschland.
            </p>

            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              <div className="flex items-center gap-2 text-teal-100">
                <Shield className="h-5 w-5 text-white" />
                <span className="text-sm">DSGVO-konform</span>
              </div>
              <div className="flex items-center gap-2 text-teal-100">
                <Zap className="h-5 w-5 text-white" />
                <span className="text-sm">Sofort nutzbar</span>
              </div>
              <div className="flex items-center gap-2 text-teal-100">
                <Globe className="h-5 w-5 text-white" />
                <span className="text-sm">Webmail inklusive</span>
              </div>
            </div>

            <Link
              href="/webmail"
              className="inline-flex items-center gap-2 bg-white text-teal-700 px-6 py-3 rounded-lg font-semibold hover:bg-teal-50 transition-colors shadow-lg"
            >
              <Mail className="h-5 w-5" />
              E-Mail-Adresse erstellen
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>

          {/* Right Side - Visual */}
          <div className="hidden lg:block">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <div className="space-y-4">
                {/* Email Preview */}
                <div className="bg-white rounded-lg p-4 shadow-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                      <Mail className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">dein.name@taskilo.de</p>
                      <p className="text-sm text-gray-500">Deine neue E-Mail-Adresse</p>
                    </div>
                  </div>
                  <div className="h-px bg-gray-200 my-3" />
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                    <div className="h-3 bg-gray-100 rounded w-5/6" />
                  </div>
                </div>

                {/* Features */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/80 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-teal-600">1 GB</p>
                    <p className="text-xs text-gray-600">Speicherplatz</p>
                  </div>
                  <div className="bg-white/80 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-teal-600">SSL</p>
                    <p className="text-xs text-gray-600">Verschlüsselt</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
