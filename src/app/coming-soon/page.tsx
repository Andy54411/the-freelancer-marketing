'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/logo';
import {
  FiCalendar,
  FiMail,
  FiStar,
  FiTrendingUp,
  FiUsers,
  FiZap,
  FiCheckCircle,
  FiClock,
  FiArrowRight,
  FiBell,
} from 'react-icons/fi';
import Link from 'next/link';
import GoogleTranslateWidget from '@/components/GoogleTranslateWidget';

const getFeatures = () => [
  {
    title: 'KI-gestützter Projektassistent',
    description: 'Intelligente Projektvorschläge und automatische Anbieter-Matching',
    progress: 85,
    status: 'In Entwicklung',
    icon: FiZap,
    estimated: 'Q3 2025',
    color: 'bg-blue-500',
  },
  {
    title: 'Mobile App',
    description: 'Native iOS und Android App für unterwegs',
    progress: 60,
    status: 'Beta-Test',
    icon: FiTrendingUp,
    estimated: 'Q3 2025',
    color: 'bg-green-500',
  },
  {
    title: 'Erweiterte Bewertungssysteme',
    description: 'Detaillierte Anbieter-Bewertungen und Qualitätssicherung',
    progress: 40,
    status: 'Planung',
    icon: FiStar,
    estimated: 'Q4 2025',
    color: 'bg-yellow-500',
  },
  {
    title: 'Team-Kollaboration',
    description: 'Mehrere Benutzer pro Unternehmen und Projekt-Teams',
    progress: 25,
    status: 'Konzept',
    icon: FiUsers,
    estimated: 'Q1 2026',
    color: 'bg-purple-500',
  },
  {
    title: 'Automatisierte Rechnungsstellung',
    description: 'Integrierte Buchhaltung und Steuer-Management',
    progress: 70,
    status: 'Beta-Test',
    icon: FiCalendar,
    estimated: 'Q4 2025',
    color: 'bg-teal-500',
  },
  {
    title: 'Video-Beratung',
    description: 'Direkte Video-Calls mit Anbietern für komplexe Projekte',
    progress: 35,
    status: 'Prototyp',
    icon: FiMail,
    estimated: 'Q4 2025',
    color: 'bg-red-500',
  },
];

const milestones = [
  {
    date: 'August 2025',
    title: 'KI-Assistent Launch',
    description: 'Vollständig ausgerollter KI-gestützter Projektassistent',
    completed: false,
  },
  {
    date: 'September 2025',
    title: 'Mobile App Beta',
    description: 'Beta-Version der mobilen App für iOS und Android',
    completed: false,
  },
  {
    date: 'Oktober 2025',
    title: 'Premium Features',
    description: 'Erweiterte Funktionen für Geschäftskunden',
    completed: false,
  },
  {
    date: 'November 2025',
    title: 'API Launch',
    description: 'Öffentliche API für Drittanbieter-Integrationen',
    completed: false,
  },
];

export default function ComingSoonPage() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const features = getFeatures();

  const milestones = [
    {
      date: 'August 2025',
      title: 'KI-Assistent Launch',
      description: 'Vollständig ausgerollter KI-gestützter Projektassistent',
      completed: false,
    },
    {
      date: 'September 2025',
      title: 'Mobile App Beta',
      description: 'Beta-Version der mobilen App für iOS und Android',
      completed: false,
    },
    {
      date: 'Oktober 2025',
      title: 'Premium Features',
      description: 'Erweiterte Funktionen für Geschäftskunden',
      completed: false,
    },
    {
      date: 'November 2025',
      title: 'API Launch',
      description: 'Öffentliche API für Drittanbieter-Integrationen',
      completed: false,
    },
  ];

  // Countdown bis zum nächsten großen Feature (KI-Assistent)
  useEffect(() => {
    const targetDate = new Date('2025-08-14T00:00:00Z'); // 30 Tage ab 15. Juli 2025

    const updateCountdown = () => {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();

      if (difference > 0) {
        setCountdown({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Hier würde die Email-Anmeldung implementiert werden
    setSubscribed(true);
    setEmail('');
  };

  return (
    <>
      <div className="relative z-10">
        {/* Header */}
        <header className="relative z-10 p-6">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Logo variant="white" />
            </Link>
            <Link href="/dashboard">
              <Button
                variant="outline"
                className="bg-white/90 border-white/20 text-[#14ad9f] hover:bg-white hover:text-[#0f9d84] shadow-lg font-semibold transition-all duration-300"
              >
                Zum Dashboard
              </Button>
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative z-10 py-20">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-6xl md:text-8xl font-bold text-white mb-6">
                Bald verfügbar
              </h1>
              <p className="text-xl md:text-2xl text-white/90 mb-12 max-w-3xl mx-auto">
                Erleben Sie die Zukunft der Dienstleistungen
              </p>
            </motion.div>

            {/* Countdown */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="bg-white/10 backdrop-blur-md rounded-2xl p-8 mb-12 max-w-2xl mx-auto"
            >
              <h3 className="text-2xl font-semibold text-white mb-6">
                Countdown bis zum Launch
              </h3>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Tage', value: countdown.days },
                  { label: 'Stunden', value: countdown.hours },
                  { label: 'Minuten', value: countdown.minutes },
                  { label: 'Sekunden', value: countdown.seconds },
                ].map((item, index) => (
                  <div key={index} className="text-center">
                    <div className="text-4xl md:text-5xl font-bold text-white">
                      {item.value.toString().padStart(2, '0')}
                    </div>
                    <div className="text-white/70 text-sm uppercase tracking-wide">{item.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Email Subscription */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="max-w-md mx-auto"
            >
              {!subscribed ? (
                <form onSubmit={handleEmailSubmit} className="flex gap-3">
                  <Input
                    type="email"
                    placeholder="Ihre E-Mail-Adresse"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                    required
                  />
                  <Button type="submit" className="bg-white text-[#14ad9f] hover:bg-white/90">
                    <FiBell className="mr-2 h-4 w-4" />
                    Benachrichtigen
                  </Button>
                </form>
              ) : (
                <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 text-white">
                  <FiCheckCircle className="inline mr-2" />
                  Vielen Dank für Ihre Anmeldung!
                </div>
              )}
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="relative z-10 py-20">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Was Sie erwarten können
              </h2>
              <p className="text-xl text-white/80 max-w-3xl mx-auto">
                Entdecken Sie, was Taskilo zu bieten hat
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.8 + index * 0.1 }}
                >
                  <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white h-full">
                    <CardHeader>
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`p-3 rounded-full ${feature.color}`}>
                          <feature.icon className="h-6 w-6 text-white" />
                        </div>
                        <Badge variant="outline" className="border-white/30 text-white">
                          {feature.status}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                      <CardDescription className="text-white/70">
                        {feature.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>Fortschritt</span>
                            <span>{feature.progress}%</span>
                          </div>
                          <Progress value={feature.progress} className="bg-white/20" />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-white/70">
                          <FiClock className="h-4 w-4" />
                          Geschätzt: {feature.estimated}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Roadmap */}
        <section className="relative z-10 py-20">
          <div className="max-w-4xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.2 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Roadmap 2025</h2>
              <p className="text-xl text-white/80">
                Unsere wichtigsten Meilensteine für das kommende Jahr.
              </p>
            </motion.div>

            <div className="space-y-8">
              {milestones.map((milestone, index) => (
                <motion.div
                  key={milestone.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 1.4 + index * 0.1 }}
                  className="flex gap-6 items-start"
                >
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-4 h-4 rounded-full ${milestone.completed ? 'bg-green-500' : 'bg-white/30'}`}
                    ></div>
                    {index < milestones.length - 1 && (
                      <div className="w-0.5 h-16 bg-white/20 mt-4"></div>
                    )}
                  </div>
                  <Card className="bg-white/10 backdrop-blur-md border-white/20 flex-1">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-xl font-semibold text-white">{milestone.title}</h3>
                        <Badge variant="outline" className="border-white/30 text-white text-xs">
                          {milestone.date}
                        </Badge>
                      </div>
                      <p className="text-white/70">{milestone.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative z-10 py-20">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.8 }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Bereit für die Zukunft?
              </h2>
              <p className="text-xl text-white/80 mb-8">Werden Sie Teil der Taskilo Community und gestalten Sie die Zukunft der Dienstleistungen mit.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auftrag/get-started">
                  <Button size="lg" className="bg-white text-[#14ad9f] hover:bg-white/90">
                    Projekt starten
                    <FiArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/register/company">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/50 text-white hover:bg-white/10 bg-white/5"
                  >
                    Als Anbieter registrieren
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  );
}
