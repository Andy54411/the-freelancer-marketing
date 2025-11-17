'use client';

import { HeroHeader } from '@/components/hero8-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function ContactPage() {
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Spam-Schutz
  const [captcha, setCaptcha] = useState({ question: '', answer: 0 });
  const [captchaInput, setCaptchaInput] = useState('');
  const [lastSubmission, setLastSubmission] = useState(0);

  // Hydration fix
  useEffect(() => {
    setMounted(true);
    generateCaptcha();
  }, []);

  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    setCaptcha({
      question: `${num1} + ${num2} = ?`,
      answer: num1 + num2,
    });
    setCaptchaInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Rate Limiting - 30 Sekunden zwischen Nachrichten
    const now = Date.now();
    if (now - lastSubmission < 30000) {
      setError('Bitte warten Sie 30 Sekunden zwischen Nachrichten.');
      setIsLoading(false);
      return;
    }

    // Captcha-Validierung
    if (parseInt(captchaInput) !== captcha.answer) {
      setError('Bitte lösen Sie die Rechenaufgabe korrekt.');
      setIsLoading(false);
      generateCaptcha();
      return;
    }

    // Spam-Filter: Einfache Wort-Blacklist
    const spamWords = ['casino', 'viagra', 'loan', 'credit', 'bitcoin', 'crypto'];
    const messageText = `${formData.subject} ${formData.message}`.toLowerCase();
    if (spamWords.some(word => messageText.includes(word))) {
      setError('Ihre Nachricht enthält nicht erlaubte Inhalte.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/contact-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          captcha: captchaInput,
          timestamp: now,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Fehler beim Senden der Nachricht');
      }

      setIsSubmitted(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
      setLastSubmission(now);
      generateCaptcha();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein unerwarteter Fehler ist aufgetreten');
      generateCaptcha();
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // Hydration loading state
  if (!mounted) {
    return (
      <div className="min-h-screen bg-linear-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative">
        <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
        <div className="relative z-10">
          <HeroHeader />
          <main className="py-20">
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-center">
                <div className="text-white">Lädt...</div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-[#14ad9f] via-teal-600 to-blue-600 relative">
      <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
      <div className="relative z-10">
        <HeroHeader />
        <main className="py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-white mb-4 drop-shadow-lg">Kontakt</h1>
              <p className="text-xl text-white/90 max-w-2xl mx-auto drop-shadow-md">
                Haben Sie Fragen oder benötigen Sie Hilfe? Wir sind für Sie da und helfen Ihnen
                gerne weiter.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12">
              {/* Kontakt-Informationen */}
              <div className="space-y-8">
                <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-white/20">
                  <CardHeader>
                    <CardTitle className="text-2xl text-gray-900">Kontakt-Informationen</CardTitle>
                    <CardDescription>Erreichen Sie uns über die folgenden Kanäle</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-start gap-4">
                      <Mail className="h-6 w-6 text-[#14ad9f] mt-1" />
                      <div>
                        <h3 className="font-semibold text-gray-900">E-Mail</h3>
                        <p className="text-gray-600">info@taskilo.de</p>
                        <p className="text-gray-600">support@taskilo.de</p>
                        <p className="text-gray-600">legal@taskilo.de</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <Phone className="h-6 w-6 text-[#14ad9f] mt-1" />
                      <div>
                        <h3 className="font-semibold text-gray-900">Telefon</h3>
                        <p className="text-gray-600">Auf Anfrage per E-Mail</p>
                        <p className="text-sm text-gray-500">Mo-Fr: 9:00-18:00 Uhr</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <MapPin className="h-6 w-6 text-[#14ad9f] mt-1" />
                      <div>
                        <h3 className="font-semibold text-gray-900">Adresse</h3>
                        <p className="text-gray-600">
                          The Freelancer Marketing Ltd.
                          <br />
                          Sinasi Bei, 69 KINGS RESORT BLOCK C, Flat/Office A2
                          <br />
                          8015, Paphos Cyprus
                          <br />
                          Registrierungsnummer: HE 458650
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <Clock className="h-6 w-6 text-[#14ad9f] mt-1" />
                      <div>
                        <h3 className="font-semibold text-gray-900">Öffnungszeiten</h3>
                        <div className="text-gray-600 space-y-1">
                          <p>Montag - Freitag: 9:00 - 18:00 Uhr</p>
                          <p>Samstag - Sonntag: Geschlossen</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-white/20">
                  <CardHeader>
                    <CardTitle className="text-xl text-gray-900">Schnelle Hilfe</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-3">
                      <Button
                        variant="outline"
                        className="justify-start bg-white/80 border-white/30 hover:bg-white/90"
                        asChild
                      >
                        <a href="/help" className="flex items-center gap-2">
                          📚 Hilfe-Center besuchen
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        className="justify-start bg-white/80 border-white/30 hover:bg-white/90"
                        asChild
                      >
                        <a href="/faq" className="flex items-center gap-2">
                          ❓ Häufig gestellte Fragen
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        className="justify-start bg-white/80 border-white/30 hover:bg-white/90"
                        asChild
                      >
                        <a href="/coming-soon" className="flex items-center gap-2">
                          🚀 Neue Features
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Kontakt-Formular */}
              <Card className="bg-white/95 backdrop-blur-sm shadow-xl border-white/20">
                <CardHeader>
                  <CardTitle className="text-2xl text-gray-900">Nachricht senden</CardTitle>
                  <CardDescription>
                    Schreiben Sie uns eine Nachricht und wir melden uns schnellstmöglich bei Ihnen
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isSubmitted ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl text-green-600">✓</span>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        Nachricht gesendet!
                      </h3>
                      <p className="text-gray-600">
                        Vielen Dank für Ihre Nachricht. Wir werden uns innerhalb von 24 Stunden bei
                        Ihnen melden.
                      </p>
                      <Button
                        className="mt-4 bg-[#14ad9f] hover:bg-teal-700"
                        onClick={() => setIsSubmitted(false)}
                      >
                        Neue Nachricht senden
                      </Button>
                    </div>
                  ) : (
                    <>
                      {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-red-600 text-sm">{error}</p>
                        </div>
                      )}
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
                              className="bg-white/80 border-white/30"
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
                              className="bg-white/80 border-white/30"
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
                            className="bg-white/80 border-white/30"
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
                            className="bg-white/80 border-white/30"
                          />
                        </div>

                        {/* Spam-Schutz Captcha */}
                        <div>
                          <Label htmlFor="captcha">Spam-Schutz: {captcha.question} *</Label>
                          <Input
                            id="captcha"
                            type="number"
                            value={captchaInput}
                            onChange={e => setCaptchaInput(e.target.value)}
                            required
                            placeholder="Antwort eingeben"
                            className="bg-white/80 border-white/30"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Bitte lösen Sie die einfache Rechenaufgabe zum Schutz vor Spam.
                          </p>
                        </div>

                        <Button
                          type="submit"
                          className="w-full bg-[#14ad9f] hover:bg-teal-700"
                          disabled={isLoading}
                        >
                          {isLoading ? 'Wird gesendet...' : 'Nachricht senden'}
                        </Button>

                        <p className="text-sm text-gray-500">
                          * Pflichtfelder. Ihre Daten werden vertraulich behandelt und nicht an
                          Dritte weitergegeben.
                        </p>
                      </form>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
