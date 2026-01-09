'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HeroHeader } from '@/components/hero8-header';
import { IPhoneMockup } from '@/components/ui/iphone-mockup';
import {
  MessageCircle,
  Users,
  Shield,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  PlayCircle,
  Bot,
  Clock,
  FileText,
  Zap,
  Send,
  UserCheck,
  Headphones,
  Target,
  Image as ImageIcon,
  MousePointerClick,
  ChevronRight,
  User,
  Phone,
  MoreVertical,
} from 'lucide-react';

const featuresData = [
  { icon: MessageCircle, title: 'Team-Inbox', description: 'Alle WhatsApp-Nachrichten zentral im Team bearbeiten.' },
  { icon: FileText, title: 'Nachrichtenvorlagen', description: 'Vorgefertigte Antworten für häufige Kundenanfragen.' },
  { icon: Bot, title: 'Chatbot-Automatisierung', description: 'Automatische Antworten außerhalb der Geschäftszeiten.' },
  { icon: Users, title: 'Kontaktverwaltung', description: 'Kunden direkt in Taskilo CRM verknüpfen.' },
  { icon: Clock, title: 'Nachricht planen', description: 'Nachrichten zeitgesteuert versenden.' },
  { icon: Shield, title: 'DSGVO-konform', description: 'Alle Daten in Deutschland gespeichert.' },
];

const statsData = [
  { value: '2 Mrd.', label: 'WhatsApp-Nutzer weltweit' },
  { value: '98%', label: 'Öffnungsrate' },
  { value: 'Echtzeit', label: 'Benachrichtigungen' },
];

const splitScrollFeatures = [
  { id: 0, icon: Headphones, title: '24/7 Support auf WhatsApp', description: 'Unterstützen Sie Ihre Kunden dort, wo sie die meiste Zeit verbringen - auf WhatsApp. Nutzen Sie Chatbots für FAQs, leiten Sie komplexe Anfragen an Mitarbeiter weiter und richten Sie Auto-Antworten ein.' },
  { id: 1, icon: Target, title: 'Gezielte WhatsApp-Kampagnen', description: 'Senden Sie automatisierte Nachrichten mit Updates, Erinnerungen, Angeboten und Benachrichtigungen. Sammeln Sie Feedback, steigern Sie den Umsatz und verbessern Sie die Kundenbindung.' },
  { id: 2, icon: ImageIcon, title: 'Rich Media & Kataloge', description: 'Nutzen Sie Bilder, Videos und interaktive Kataloge, um Engagement und Verkäufe um bis zu 40% zu steigern. Integration mit 100+ Tools für personalisierte Kauferlebnisse.' },
  { id: 3, icon: MousePointerClick, title: 'Click-to-WhatsApp Ads', description: 'Starten Sie einen Chat direkt aus Anzeigen heraus. Erhöhen Sie Engagement und Conversion-Raten. Bis zu 30% mehr Kundenanfragen bei weniger Reibungsverlusten.' },
];

// Typing Indicator Komponente
function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-white rounded-lg rounded-tl-none px-3 py-2 shadow-sm">
        <div className="flex gap-1">
          <motion.div
            className="w-2 h-2 bg-gray-400 rounded-full"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
          />
          <motion.div
            className="w-2 h-2 bg-gray-400 rounded-full"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
          />
          <motion.div
            className="w-2 h-2 bg-gray-400 rounded-full"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
          />
        </div>
      </div>
    </div>
  );
}

// Animierte Chat-Nachrichten Hook
function useAnimatedMessages(messages: Array<{ text?: string; isOutgoing?: boolean; time?: string; isBot?: boolean; isImage?: boolean; imageLabel?: string; isButton?: boolean; isEntry?: boolean }>, resetKey: number | string) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    setVisibleCount(0);
    setIsTyping(false);
    
    const showNextMessage = (index: number) => {
      if (index >= messages.length) return;
      
      const msg = messages[index];
      const delay = msg?.isEntry ? 300 : 800;
      const typingDelay = msg?.isOutgoing ? 600 : 400;
      
      // Zeige Typing Indicator vor der Nachricht
      if (!msg?.isEntry) {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setVisibleCount(index + 1);
          showNextMessage(index + 1);
        }, typingDelay);
      } else {
        setTimeout(() => {
          setVisibleCount(index + 1);
          showNextMessage(index + 1);
        }, delay);
      }
    };

    const timer = setTimeout(() => showNextMessage(0), 500);
    return () => clearTimeout(timer);
  }, [resetKey, messages.length]);

  return { visibleCount, isTyping };
}

const chatPreview = [
  { sender: 'Kunde', message: 'Hallo, ich habe eine Frage zu meiner Bestellung #1234', time: '10:15', isCustomer: true },
  { sender: 'Team', message: 'Guten Tag! Ich schaue mir das gerne an. Einen Moment bitte.', time: '10:16', isCustomer: false },
  { sender: 'Team', message: 'Ihre Bestellung wurde heute versendet. Die Sendungsnummer ist: DE123456789', time: '10:18', isCustomer: false },
  { sender: 'Kunde', message: 'Super, vielen Dank für die schnelle Antwort!', time: '10:19', isCustomer: true },
];

const chatMockups = [
  {
    header: { avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face', name: 'Max Kunde', status: 'Online' },
    messages: [
      { text: 'Heute', isEntry: true },
      { text: 'Hallo! Ich brauche Hilfe mit meinem Konto.', isOutgoing: false, time: '14:23' },
      { text: 'Guten Tag! Ich helfe Ihnen gerne. Was genau benötigen Sie?', isOutgoing: true, time: '14:24', isBot: true },
      { text: 'Ich kann mich nicht einloggen.', isOutgoing: false, time: '14:25' },
      { text: 'Ich sende Ihnen einen Link zum Zurücksetzen.', isOutgoing: true, time: '14:25' },
    ],
  },
  {
    header: { avatar: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=80&h=80&fit=crop', name: 'Taskilo Shop', status: 'Business' },
    messages: [
      { text: 'Neue Kampagne', isEntry: true },
      { text: 'Exklusiv für Sie: 20% Rabatt!', isOutgoing: true, time: '10:00', isBot: true },
      { text: '', isOutgoing: true, time: '10:00', isImage: true, imageLabel: 'Sommerkollektion', imageSrc: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&h=120&fit=crop' },
      { text: 'Jetzt shoppen', isOutgoing: true, time: '10:00', isButton: true },
      { text: 'Oh super! Danke für den Tipp!', isOutgoing: false, time: '10:15' },
    ],
  },
  {
    header: { avatar: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=80&h=80&fit=crop', name: 'Produktkatalog', status: 'Verifiziert' },
    messages: [
      { text: 'Katalog', isEntry: true },
      { text: 'Hier ist unser neuer Katalog:', isOutgoing: true, time: '09:00', isBot: true },
      { text: '', isOutgoing: true, time: '09:00', isImage: true, imageLabel: 'Produktkatalog 2025', imageSrc: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=120&fit=crop' },
      { text: 'Katalog ansehen', isOutgoing: true, time: '09:00', isButton: true },
      { text: 'Sehr schön! Ich bestelle gleich.', isOutgoing: false, time: '09:30' },
    ],
  },
  {
    header: { avatar: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=80&h=80&fit=crop', name: 'Werbeanzeige', status: 'Sponsored' },
    messages: [
      { text: 'Click-to-WhatsApp', isEntry: true },
      { text: 'Hallo! Sie haben auf unsere Anzeige geklickt.', isOutgoing: true, time: '16:00', isBot: true },
      { text: 'Wie kann ich Ihnen helfen?', isOutgoing: true, time: '16:00' },
      { text: 'Ich interessiere mich für Ihr Angebot.', isOutgoing: false, time: '16:05' },
      { text: 'Perfekt! Hier sind unsere aktuellen Angebote:', isOutgoing: true, time: '16:06' },
    ],
  },
];

function SplitScrollSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const featureRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      const sectionRect = sectionRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      if (sectionRect.top > windowHeight || sectionRect.bottom < 0) return;

      let newActiveIndex = 0;
      featureRefs.current.forEach((ref, index) => {
        if (ref) {
          const rect = ref.getBoundingClientRect();
          const elementCenter = rect.top + rect.height / 2;
          if (elementCenter < windowHeight * 0.6) {
            newActiveIndex = index;
          }
        }
      });
      setActiveIndex(newActiveIndex);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const currentMockup = chatMockups[activeIndex];
  const { visibleCount, isTyping } = useAnimatedMessages(currentMockup.messages, activeIndex);

  return (
    <section ref={sectionRef} className="bg-gradient-to-br from-teal-50 via-teal-100/50 to-cyan-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center py-16 sm:py-24">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }}>
            <Badge className="mb-4 bg-[#14ad9f]/10 text-[#14ad9f] border-[#14ad9f]/30">Funktionen</Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">Alles was Sie brauchen</h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">Entdecken Sie die leistungsstarken Funktionen unserer WhatsApp Business Integration</p>
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16">
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <AnimatePresence mode="wait">
                <motion.div key={activeIndex} initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }} transition={{ duration: 0.4 }} className="max-w-[340px] mx-auto">
                  <div className="relative">
                    <IPhoneMockup size="md" className="mx-auto drop-shadow-2xl">
                      <div className="w-full h-full flex flex-col bg-white">
                        <div className="bg-[#075E54] pt-14 pb-0 px-5 flex justify-between items-center text-white text-xs font-medium">
                          <span>9:41</span>
                          <div className="flex items-center gap-1">
                            <div className="flex items-center">
                              <div className="w-5 h-2.5 border border-white rounded-sm relative">
                                <div className="absolute inset-[1px] right-0.5 bg-white rounded-sm" />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="bg-[#075E54] text-white px-4 py-3">
                          <div className="flex items-center gap-3">
                            <ArrowLeft className="w-5 h-5" />
                            <img src={currentMockup.header.avatar} alt={currentMockup.header.name} className="w-10 h-10 rounded-full object-cover" />
                            <div className="flex-1">
                              <div className="font-semibold text-sm">{currentMockup.header.name}</div>
                              <div className="text-xs text-white/70">{currentMockup.header.status}</div>
                            </div>
                            <Phone className="w-5 h-5" />
                            <MoreVertical className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="flex-1 bg-[#ECE5DD] p-3 overflow-y-auto space-y-2">
                          {currentMockup.messages.slice(0, visibleCount).map((msg, i) => (
                            <motion.div 
                              key={i} 
                              initial={{ opacity: 0, y: 10, scale: 0.9 }} 
                              animate={{ opacity: 1, y: 0, scale: 1 }} 
                              transition={{ duration: 0.3, type: 'spring', stiffness: 500, damping: 30 }}
                            >
                              {msg.isEntry ? (
                                <div className="flex justify-center mb-2">
                                  <span className="bg-[#E1F3FB] text-gray-600 text-xs px-3 py-1 rounded-lg shadow-sm">{msg.text}</span>
                                </div>
                              ) : (
                                <div className={`flex ${msg.isOutgoing ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`max-w-[80%] rounded-lg px-3 py-2 shadow-sm ${msg.isOutgoing ? 'bg-[#DCF8C6] rounded-tr-none' : 'bg-white rounded-tl-none'}`}>
                                    {msg.isBot && (
                                      <div className="flex items-center gap-1 mb-1">
                                        <Bot className="w-3 h-3 text-[#14ad9f]" />
                                        <span className="text-[10px] text-[#14ad9f] font-medium">Bot</span>
                                      </div>
                                    )}
                                    {msg.isImage ? (
                                      <div className="bg-gray-100 rounded-lg overflow-hidden mb-1">
                                        {msg.imageSrc ? (
                                          <img src={msg.imageSrc} alt={msg.imageLabel} className="w-full h-20 object-cover" />
                                        ) : (
                                          <div className="w-full h-16 bg-gradient-to-br from-teal-200 to-cyan-200 flex items-center justify-center">
                                            <ImageIcon className="w-6 h-6 text-teal-500" />
                                          </div>
                                        )}
                                        <div className="p-2">
                                          <span className="text-xs text-gray-700">{msg.imageLabel}</span>
                                        </div>
                                      </div>
                                    ) : msg.isButton ? (
                                      <div className="bg-[#14ad9f]/10 text-[#14ad9f] font-medium text-sm py-2 px-4 rounded-lg text-center">{msg.text}</div>
                                    ) : (
                                      <p className="text-sm text-gray-800">{msg.text}</p>
                                    )}
                                    {msg.time && (
                                      <div className="flex justify-end items-center gap-1 mt-1">
                                        <span className="text-[10px] text-gray-500">{msg.time}</span>
                                        {msg.isOutgoing && (
                                          <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 16 16">
                                            <path d="M12.354 4.354a.5.5 0 0 0-.708-.708L5 10.293 1.854 7.146a.5.5 0 1 0-.708.708l3.5 3.5a.5.5 0 0 0 .708 0l7-7zm-4.208 7-.896-.897.707-.707.543.543 6.646-6.647a.5.5 0 0 1 .708.708l-7 7a.5.5 0 0 1-.708 0z"/>
                                          </svg>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          ))}
                          {isTyping && <TypingIndicator />}
                        </div>
                        <div className="bg-[#F0F0F0] px-3 py-2 flex items-center gap-2">
                          <div className="flex-1 bg-white rounded-full px-4 py-2 text-sm text-gray-400">Nachricht</div>
                          <div className="w-10 h-10 rounded-full bg-[#14ad9f] flex items-center justify-center">
                            <Send className="w-5 h-5 text-white" />
                          </div>
                        </div>
                      </div>
                    </IPhoneMockup>
                    <div className="absolute -inset-8 bg-gradient-to-br from-teal-400/10 via-transparent to-cyan-400/10 rounded-[5rem] -z-10 blur-2xl" />
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="space-y-8 pb-24">
            {splitScrollFeatures.map((feature, index) => (
              <div key={feature.id} ref={(el) => { featureRefs.current[index] = el; }} className="scroll-mt-32">
                <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} viewport={{ once: true, amount: 0.3 }} className={`p-6 sm:p-8 rounded-2xl transition-all duration-500 ${activeIndex === index ? 'bg-white shadow-xl border-2 border-[#14ad9f]/30 scale-[1.02]' : 'bg-white/50 border border-gray-200 hover:bg-white hover:shadow-md'}`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${activeIndex === index ? 'bg-[#14ad9f] shadow-lg' : 'bg-gray-100'}`}>
                      <feature.icon className={`w-7 h-7 ${activeIndex === index ? 'text-white' : 'text-[#14ad9f]'}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl sm:text-2xl font-bold mb-3 text-gray-900">{feature.title}</h3>
                      <p className={`text-base leading-relaxed ${activeIndex === index ? 'text-gray-700' : 'text-gray-500'}`}>{feature.description}</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            ))}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.5 }} viewport={{ once: true }} className="pt-4">
              <Link href="/registrieren" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#14ad9f] text-white font-semibold hover:bg-teal-700 transition-all shadow-lg hover:shadow-xl">
                Jetzt kostenlos testen
                <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

function UseCasesSection() {
  const [activeUseCase, setActiveUseCase] = useState(0);

  const useCases = [
    { id: 'kundenservice', icon: UserCheck, title: 'Kundenservice', description: 'Beantworten Sie Kundenanfragen schnell und persönlich.', benefits: ['Schnelle Reaktionszeiten', 'Persönliche Betreuung', 'Höhere Kundenzufriedenheit'], headerName: 'Kunde Max', headerStatus: 'Online', headerAvatar: 'https://images.unsplash.com/photo-1599566150163-29194dcabd36?w=80&h=80&fit=crop&crop=face', messages: [{ text: 'Hallo! Ich habe eine Frage zu meiner Bestellung.', isOutgoing: false, time: '10:30' }, { text: 'Guten Tag! Ich helfe Ihnen gerne.', isOutgoing: true, time: '10:31' }, { text: 'Ihre Bestellung wird morgen geliefert.', isOutgoing: true, time: '10:31' }, { text: 'Super, vielen Dank!', isOutgoing: false, time: '10:32' }] },
    { id: 'auftraege', icon: Send, title: 'Auftragsbestätigungen', description: 'Senden Sie automatische Bestätigungen für Bestellungen.', benefits: ['Automatische Benachrichtigungen', 'Sendungsverfolgung', 'Terminbestätigungen'], headerName: 'Taskilo Shop', headerStatus: 'Verifiziert', headerAvatar: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=80&h=80&fit=crop', messages: [{ text: 'Vielen Dank für Ihre Bestellung!', isOutgoing: true, time: '14:00', isBot: true }, { text: 'Bestellung #98765 - Gesamt: 129,97', isOutgoing: true, time: '14:00' }, { text: 'Sendung verfolgen', isOutgoing: true, time: '14:00', isButton: true }, { text: 'Danke!', isOutgoing: false, time: '14:15' }] },
    { id: 'marketing', icon: Zap, title: 'Marketing-Kampagnen', description: 'Erreichen Sie Ihre Kunden mit Angeboten direkt auf dem Smartphone.', benefits: ['98% Öffnungsrate', 'Personalisierte Nachrichten', 'Hohe Conversion'], headerName: 'Mode & Style', headerStatus: 'Business', headerAvatar: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=80&h=80&fit=crop', messages: [{ text: 'Exklusiv für Sie!', isOutgoing: true, time: '09:00', isBot: true }, { text: 'Heute 30% Rabatt! Code: WINTER30', isOutgoing: true, time: '09:00' }, { text: 'Jetzt shoppen', isOutgoing: true, time: '09:00', isButton: true }, { text: 'Toll, ich schaue gleich rein!', isOutgoing: false, time: '09:15' }] },
    { id: 'termine', icon: Clock, title: 'Terminverwaltung', description: 'Erinnerungen und Bestätigungen für Termine automatisch versenden.', benefits: ['Weniger No-Shows', 'Einfache Terminänderungen', 'Automatische Erinnerungen'], headerName: 'Praxis Dr. Schmidt', headerStatus: 'Verifiziert', headerAvatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=80&h=80&fit=crop&crop=face', messages: [{ text: 'Terminerinnerung', isOutgoing: true, time: '08:00', isBot: true }, { text: 'Morgen 14:30 Uhr - Dr. Schmidt', isOutgoing: true, time: '08:00' }, { text: 'Termin bestätigen', isOutgoing: true, time: '08:00', isButton: true }, { text: 'Ich bestätige, danke!', isOutgoing: false, time: '08:15' }] },
  ];

  const currentCase = useCases[activeUseCase];
  const { visibleCount, isTyping } = useAnimatedMessages(currentCase.messages, activeUseCase);

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="text-center mb-12">
        <Badge variant="outline" className="mb-4 bg-[#14ad9f]/10 text-[#14ad9f] border-[#14ad9f]/30">Anwendungsfälle</Badge>
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">So nutzen erfolgreiche Unternehmen WhatsApp</h2>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">Entdecken Sie die vielfältigen Einsatzmöglichkeiten für Ihr Business</p>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-start">
        <div className="space-y-4">
          {useCases.map((useCase, index) => (
            <motion.div key={useCase.id} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: index * 0.1 }} viewport={{ once: true }}>
              <button onClick={() => setActiveUseCase(index)} className={`w-full text-left p-6 rounded-2xl transition-all duration-300 ${activeUseCase === index ? 'bg-gradient-to-r from-[#14ad9f]/10 to-cyan-500/10 border-2 border-[#14ad9f]/30 shadow-lg' : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${activeUseCase === index ? 'bg-[#14ad9f] text-white' : 'bg-gray-200 text-gray-600'} transition-colors`}>
                    <useCase.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-lg font-bold mb-1 ${activeUseCase === index ? 'text-gray-900' : 'text-gray-700'}`}>{useCase.title}</h3>
                    <p className={`text-sm ${activeUseCase === index ? 'text-gray-700' : 'text-gray-500'}`}>{useCase.description}</p>
                    <AnimatePresence mode="wait">
                      {activeUseCase === index && (
                        <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} className="mt-4 space-y-2">
                          {useCase.benefits.map((benefit, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                              <CheckCircle className="h-4 w-4 text-[#14ad9f] flex-shrink-0" />
                              {benefit}
                            </li>
                          ))}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </div>
                  <ChevronRight className={`w-5 h-5 transition-transform ${activeUseCase === index ? 'text-[#14ad9f] rotate-90' : 'text-gray-400'}`} />
                </div>
              </button>
            </motion.div>
          ))}
        </div>

        <div className="lg:sticky lg:top-32">
          <AnimatePresence mode="wait">
            <motion.div key={currentCase.id} initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -20 }} transition={{ duration: 0.4 }} className="flex justify-center">
              <div className="relative">
                <IPhoneMockup size="sm" className="mx-auto drop-shadow-2xl">
                  <div className="w-full h-full flex flex-col bg-white">
                    <div className="bg-[#075E54] pt-12 pb-0 px-4 flex justify-between items-center text-white text-xs font-medium">
                      <span>9:41</span>
                      <div className="w-4 h-2 border border-white rounded-sm relative">
                        <div className="absolute inset-[1px] right-0.5 bg-white rounded-sm" />
                      </div>
                    </div>
                    <div className="bg-[#075E54] text-white pb-2 px-3">
                      <div className="flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        <img src={currentCase.headerAvatar} alt={currentCase.headerName} className="w-8 h-8 rounded-full object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-xs truncate">{currentCase.headerName}</p>
                          <p className="text-[10px] text-white/70 truncate">{currentCase.headerStatus}</p>
                        </div>
                        <Phone className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex-1 bg-[#ECE5DD] p-2 overflow-y-auto space-y-1.5">
                      {currentCase.messages.slice(0, visibleCount).map((msg, msgIndex) => (
                        <motion.div 
                          key={msgIndex} 
                          initial={{ opacity: 0, y: 10, scale: 0.9 }} 
                          animate={{ opacity: 1, y: 0, scale: 1 }} 
                          transition={{ duration: 0.3, type: 'spring', stiffness: 500, damping: 30 }}
                          className={`flex ${msg.isOutgoing ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[85%] rounded-lg px-2 py-1.5 shadow-sm ${msg.isOutgoing ? 'bg-[#DCF8C6] rounded-tr-none' : 'bg-white rounded-tl-none'}`}>
                            {msg.isBot && (
                              <div className="flex items-center gap-1 mb-0.5">
                                <Bot className="w-2.5 h-2.5 text-[#14ad9f]" />
                                <span className="text-[8px] text-[#14ad9f] font-medium">Auto</span>
                              </div>
                            )}
                            {msg.isButton ? (
                              <div className="bg-[#14ad9f]/10 text-[#14ad9f] font-medium text-[10px] py-1.5 px-3 rounded text-center">{msg.text}</div>
                            ) : (
                              <p className="text-[11px] text-gray-800 whitespace-pre-line leading-tight">{msg.text}</p>
                            )}
                            {msg.time && !msg.isButton && (
                              <div className="flex justify-end items-center gap-0.5 mt-0.5">
                                <span className="text-[8px] text-gray-500">{msg.time}</span>
                                {msg.isOutgoing && (
                                  <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M12.354 4.354a.5.5 0 0 0-.708-.708L5 10.293 1.854 7.146a.5.5 0 1 0-.708.708l3.5 3.5a.5.5 0 0 0 .708 0l7-7zm-4.208 7-.896-.897.707-.707.543.543 6.646-6.647a.5.5 0 0 1 .708.708l-7 7a.5.5 0 0 1-.708 0z"/>
                                  </svg>
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                      {isTyping && <TypingIndicator />}
                    </div>
                    <div className="bg-[#F0F0F0] px-2 py-1.5 flex items-center gap-1.5">
                      <div className="flex-1 bg-white rounded-full px-3 py-1.5 text-[10px] text-gray-400">Nachricht</div>
                      <div className="w-7 h-7 rounded-full bg-[#14ad9f] flex items-center justify-center">
                        <Send className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                  </div>
                </IPhoneMockup>
                <div className="absolute -inset-6 bg-gradient-to-br from-teal-400/15 via-transparent to-cyan-400/15 rounded-[4rem] -z-10 blur-2xl" />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

export default function WhatsAppPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-br from-[#14ad9f] via-teal-600 to-teal-700">
        <HeroHeader />
        <section className="pt-32 pb-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="text-left">
                <Badge variant="outline" className="mb-4 bg-white/10 text-white border-white/20">Business Solutions</Badge>
                <h1 className="text-4xl md:text-5xl lg:text-5xl font-bold text-white mb-6 leading-tight">WhatsApp<br /><span className="text-teal-200">Business</span></h1>
                <p className="text-xl text-white/90 mb-8 leading-relaxed max-w-lg">Kommunizieren Sie mit Ihren Kunden über WhatsApp. Team-Inbox, Vorlagen und Automatisierung.</p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button size="lg" asChild className="bg-white text-[#14ad9f] hover:bg-gray-100 font-semibold px-8 py-4 shadow-lg">
                    <Link href="/register/company">Jetzt kostenlos testen<ArrowRight className="ml-2 h-5 w-5" /></Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild className="border-2 border-white text-white hover:bg-white hover:text-[#14ad9f] font-semibold px-8 py-4 bg-transparent">
                    <Link href="/contact"><PlayCircle className="mr-2 h-5 w-5" />Demo anfordern</Link>
                  </Button>
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="hidden lg:block">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="p-4 border-b bg-[#25D366] flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                        <MessageCircle className="h-5 w-5 text-[#25D366]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">Team-Inbox</h3>
                        <p className="text-white/80 text-xs">3 Mitarbeiter online</p>
                      </div>
                    </div>
                    <div className="p-4 space-y-3 bg-[#ECE5DD] min-h-[250px]">
                      {chatPreview.map((msg, i) => (
                        <div key={i} className={`flex ${msg.isCustomer ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[80%] p-3 rounded-lg shadow-sm ${msg.isCustomer ? 'bg-white' : 'bg-[#DCF8C6]'}`}>
                            <p className="text-sm text-gray-800">{msg.message}</p>
                            <p className="text-xs text-gray-500 text-right mt-1">{msg.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 bg-[#F0F0F0] flex items-center gap-2">
                      <div className="flex-1 bg-white rounded-full px-4 py-2 text-sm text-gray-400">Nachricht eingeben...</div>
                      <Button size="sm" className="rounded-full bg-[#25D366] hover:bg-[#128C7E]"><Send className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
        <section className="pb-20 px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="max-w-6xl mx-auto">
            <div className="grid grid-cols-3 gap-8">
              {statsData.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-white mb-2">{stat.value}</div>
                  <div className="text-white/80">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </section>
      </div>

      <section className="py-24 px-4 bg-gray-50 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="text-center mb-16">
            <Badge className="mb-4 bg-[#14ad9f]/10 text-[#14ad9f] border-[#14ad9f]/20">Features</Badge>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">Professionelle Kundenkommunikation</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">Nutzen Sie den beliebtesten Messenger für Ihre Geschäftskommunikation.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuresData.map((feature, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.1 }} viewport={{ once: true }} className="bg-white rounded-3xl p-6 border border-gray-200 hover:shadow-xl hover:border-[#14ad9f]/30 transition-all group">
                <div className="w-12 h-12 bg-[#14ad9f]/10 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-[#14ad9f]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <SplitScrollSection />

      <section className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <UseCasesSection />
        </div>
      </section>

      <section className="py-24 px-4 bg-gradient-to-r from-[#14ad9f] to-teal-600">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Starten Sie mit WhatsApp Business</h2>
          <p className="text-xl text-white/90 mb-10">Verbinden Sie Ihr WhatsApp mit Taskilo und kommunizieren Sie effizienter mit Ihren Kunden.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="bg-white text-[#14ad9f] hover:bg-gray-100 font-semibold px-8 py-4 shadow-lg">
              <Link href="/register/company">Jetzt kostenlos starten<ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-2 border-white text-white hover:bg-white hover:text-[#14ad9f] font-semibold px-8 py-4 bg-transparent">
              <Link href="/contact">Beratungstermin vereinbaren</Link>
            </Button>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
