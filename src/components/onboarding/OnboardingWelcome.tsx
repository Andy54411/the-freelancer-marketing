'use client';

import { useOnboarding } from '@/contexts/OnboardingContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, Users, Shield, TrendingUp, Zap } from 'lucide-react';
import { useEffect } from 'react';

interface OnboardingWelcomeProps {
  companyUid?: string;
  onStartOnboarding: () => void;
}

function OnboardingWelcome({ companyUid: _companyUid, onStartOnboarding }: OnboardingWelcomeProps) {
  const { onboardingStatus } = useOnboarding();

  // Prüfe Onboarding Status beim Laden
  useEffect(() => {
    // Wenn bereits Onboarding läuft, weiterleiten
    if (onboardingStatus && onboardingStatus.status === 'in_progress') {
      onStartOnboarding();
    }
  }, [onboardingStatus, onStartOnboarding]);

  const features = [
    {
      icon: <Users className="h-6 w-6 text-[#14ad9f]" />,
      title: 'Professionelle Unternehmensprofile',
      description: 'Erstellen Sie ein umfassendes Firmenprofil mit allen wichtigen Informationen',
    },
    {
      icon: <Shield className="h-6 w-6 text-[#14ad9f]" />,
      title: 'Sichere Zahlungsabwicklung',
      description: 'Sichere Escrow-Zahlungen für transparenten Geldtransfer und Rechnungsstellung',
    },
    {
      icon: <TrendingUp className="h-6 w-6 text-[#14ad9f]" />,
      title: 'Erweiterte Geschäftsfunktionen',
      description: 'Buchhaltung, Steuereinstellungen und professionelle Rechnungsstellung',
    },
    {
      icon: <Zap className="h-6 w-6 text-[#14ad9f]" />,
      title: 'Schnelle Marktpräsenz',
      description: 'Sofortiger Zugang zu Kunden und optimierte Sichtbarkeit auf der Plattform',
    },
  ];

  const benefits = [
    'Professionelle Geschäftsführung mit integrierten Tools',
    'Automatisierte Rechnungsstellung und Buchhaltung',
    'Erweiterte Marketing- und Sichtbarkeitsoptionen',
    'Priorisierter Kundensupport und Account-Management',
    'Escrow-System für sichere B2B-Zahlungen',
    'Compliance-Tools für Steuer und Recht',
  ];

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Willkommen bei Taskilo Business</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Verwandeln Sie Ihr Unternehmen in eine professionelle Dienstleistungsmarke. Unser
            5-Schritte-Onboarding führt Sie durch alle wichtigen Einstellungen für einen
            erfolgreichen Start.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {features.map((feature, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex justify-center mb-3">{feature.icon}</div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Was Sie im Onboarding erwartet</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-[#14ad9f]">Onboarding-Schritte</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Clock className="h-5 w-5 text-gray-400" />
                      <span className="text-sm">Schritt 1: Allgemeine Einstellungen (5 Min)</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Clock className="h-5 w-5 text-gray-400" />
                      <span className="text-sm">Schritt 2: Buchhaltung & Banking (10 Min)</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Clock className="h-5 w-5 text-gray-400" />
                      <span className="text-sm">Schritt 3: Öffentliches Profil (15 Min)</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Clock className="h-5 w-5 text-gray-400" />
                      <span className="text-sm">Schritt 4: Services & Kategorien (10 Min)</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Clock className="h-5 w-5 text-gray-400" />
                      <span className="text-sm">Schritt 5: Überprüfung & Abschluss (5 Min)</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-[#14ad9f]">Ihre Vorteile</h3>
                  <div className="space-y-2">
                    {benefits.map((benefit, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                        <span className="text-sm">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA Section */}
          <div className="text-center">
            <div className="bg-white rounded-lg p-8 shadow-sm border">
              <h3 className="text-2xl font-bold mb-4">Bereit für den nächsten Schritt?</h3>
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                Das Onboarding dauert etwa 45 Minuten und kann jederzeit unterbrochen und später
                fortgesetzt werden. Ihre Daten werden automatisch gespeichert.
              </p>
              <Button
                size="lg"
                className="bg-[#14ad9f] hover:bg-taskilo-hover text-white px-8 py-3 text-lg"
                onClick={onStartOnboarding}
              >
                Onboarding starten
              </Button>
            </div>
          </div>

          {/* Continue Section - nur wenn bereits begonnen */}
          {onboardingStatus && onboardingStatus.status === 'in_progress' && (
            <div className="mt-8 text-center">
              <Card className="border-[#14ad9f] border-2">
                <CardHeader>
                  <CardTitle className="text-[#14ad9f]">Onboarding fortsetzen</CardTitle>
                  <CardDescription>
                    Sie haben bereits mit dem Onboarding begonnen. Setzen Sie dort fort, wo Sie
                    aufgehört haben.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="border-[#14ad9f] text-[#14ad9f] hover:bg-[#14ad9f] hover:text-white"
                    onClick={onStartOnboarding}
                  >
                    Fortsetzen
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OnboardingWelcome;
