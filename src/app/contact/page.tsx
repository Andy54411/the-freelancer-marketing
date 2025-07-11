"use client";

import { HeroHeader } from '@/components/hero8-header';
import FooterSection from '@/components/footer';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import { useState } from 'react';

export default function ContactPage() {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Hier würde die Form-Verarbeitung implementiert werden
    setIsSubmitted(true);
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <>
      <HeroHeader />
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Kontakt
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Haben Sie Fragen oder benötigen Sie Hilfe? Wir sind für Sie da und helfen Ihnen gerne weiter.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Kontakt-Informationen */}
            <div className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl text-gray-900 dark:text-white">
                    Kontakt-Informationen
                  </CardTitle>
                  <CardDescription>
                    Erreichen Sie uns über die folgenden Kanäle
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-start gap-4">
                    <Mail className="h-6 w-6 text-[#14ad9f] mt-1" />
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">E-Mail</h3>
                      <p className="text-gray-600 dark:text-gray-400">info@taskilo.de</p>
                      <p className="text-gray-600 dark:text-gray-400">support@taskilo.de</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <Phone className="h-6 w-6 text-[#14ad9f] mt-1" />
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Telefon</h3>
                      <p className="text-gray-600 dark:text-gray-400">+49 (0) 123 456789</p>
                      <p className="text-sm text-gray-500 dark:text-gray-500">Mo-Fr: 9:00-17:00 Uhr</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <MapPin className="h-6 w-6 text-[#14ad9f] mt-1" />
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Adresse</h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Taskilo GmbH<br/>
                        Musterstraße 123<br/>
                        12345 Musterstadt<br/>
                        Deutschland
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <Clock className="h-6 w-6 text-[#14ad9f] mt-1" />
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Öffnungszeiten</h3>
                      <div className="text-gray-600 dark:text-gray-400 space-y-1">
                        <p>Montag - Freitag: 9:00 - 17:00 Uhr</p>
                        <p>Samstag: 10:00 - 14:00 Uhr</p>
                        <p>Sonntag: Geschlossen</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-xl text-gray-900 dark:text-white">
                    Schnelle Hilfe
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    <Button variant="outline" className="justify-start" asChild>
                      <a href="/help" className="flex items-center gap-2">
                        📚 Hilfe-Center besuchen
                      </a>
                    </Button>
                    <Button variant="outline" className="justify-start" asChild>
                      <a href="/faq" className="flex items-center gap-2">
                        ❓ Häufig gestellte Fragen
                      </a>
                    </Button>
                    <Button variant="outline" className="justify-start" asChild>
                      <a href="/coming-soon" className="flex items-center gap-2">
                        🚀 Neue Features
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Kontakt-Formular */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-gray-900 dark:text-white">
                  Nachricht senden
                </CardTitle>
                <CardDescription>
                  Schreiben Sie uns eine Nachricht und wir melden uns schnellstmöglich bei Ihnen
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isSubmitted ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">✓</span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Nachricht gesendet!
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Vielen Dank für Ihre Nachricht. Wir werden uns innerhalb von 24 Stunden bei Ihnen melden.
                    </p>
                    <Button 
                      className="mt-4" 
                      onClick={() => setIsSubmitted(false)}
                    >
                      Neue Nachricht senden
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          placeholder="Ihr vollständiger Name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">E-Mail *</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          placeholder="ihre.email@beispiel.de"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="subject">Betreff *</Label>
                      <Input
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                        placeholder="Worum geht es?"
                      />
                    </div>

                    <div>
                      <Label htmlFor="message">Nachricht *</Label>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        rows={6}
                        placeholder="Beschreiben Sie Ihr Anliegen..."
                      />
                    </div>

                    <Button type="submit" className="w-full bg-[#14ad9f] hover:bg-teal-700">
                      Nachricht senden
                    </Button>

                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      * Pflichtfelder. Ihre Daten werden vertraulich behandelt und nicht an Dritte weitergegeben.
                    </p>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <FooterSection />
    </>
  );
}
