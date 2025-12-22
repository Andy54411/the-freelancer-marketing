'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Loader2,
  User,
  Bot,
  HelpCircle,
  CreditCard,
  Clock,
  FileText,
  AlertTriangle,
  Headphones,
  ChevronLeft,
  CheckCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Markdown from 'react-markdown';

interface Message {
  role: 'user' | 'model' | 'system';
  parts: { text: string }[];
  ticketId?: string;
}

interface QuickAction {
  id: string;
  icon: React.ElementType;
  label: string;
  message: string;
  category: 'general' | 'billing' | 'technical' | 'account';
}

const quickActions: QuickAction[] = [
  {
    id: 'order-status',
    icon: Clock,
    label: 'Auftragsstatus',
    message: 'Wie kann ich den Status meines Auftrags einsehen?',
    category: 'general',
  },
  {
    id: 'payment',
    icon: CreditCard,
    label: 'Zahlung & Rechnung',
    message: 'Ich habe eine Frage zu meiner Zahlung oder Rechnung.',
    category: 'billing',
  },
  {
    id: 'cancel-order',
    icon: X,
    label: 'Auftrag stornieren',
    message: 'Wie kann ich einen Auftrag stornieren?',
    category: 'general',
  },
  {
    id: 'account-settings',
    icon: User,
    label: 'Kontoeinstellungen',
    message: 'Wie kann ich meine Kontoeinstellungen aendern?',
    category: 'account',
  },
  {
    id: 'find-provider',
    icon: HelpCircle,
    label: 'Dienstleister finden',
    message: 'Wie finde ich den passenden Dienstleister fuer meinen Auftrag?',
    category: 'general',
  },
  {
    id: 'technical-issue',
    icon: AlertTriangle,
    label: 'Technisches Problem',
    message: 'Ich habe ein technisches Problem mit der Plattform.',
    category: 'technical',
  },
  {
    id: 'invoice',
    icon: FileText,
    label: 'Rechnung anfordern',
    message: 'Wie kann ich eine Rechnung fuer meinen Auftrag erhalten?',
    category: 'billing',
  },
  {
    id: 'human-support',
    icon: Headphones,
    label: 'Mit Mitarbeiter sprechen',
    message: 'Ich moechte mit einem Support-Mitarbeiter sprechen.',
    category: 'general',
  },
];

const initialMessage: Message = {
  role: 'model',
  parts: [{ text: 'Hallo! Ich bin der Taskilo Support-Assistent. Wie kann ich Ihnen heute helfen?\n\nWaehlen Sie eine der haeufigen Fragen unten oder schreiben Sie mir direkt.' }],
};

const SupportChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [ticketCreated, setTicketCreated] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([initialMessage]);
    }
  }, [isOpen, messages.length]);

  useEffect(() => {
    const openChatbot = () => setIsOpen(true);
    window.addEventListener('openChatbot', openChatbot);
    return () => window.removeEventListener('openChatbot', openChatbot);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (textToSend === '' || isLoading) return;

    const userMessage: Message = { role: 'user', parts: [{ text: textToSend }] };
    const historyForApi = messages.length > 0 && messages[0] === initialMessage 
      ? messages.slice(1) 
      : messages;

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setShowQuickActions(false);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: historyForApi,
          message: textToSend,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server-Fehler: ${response.status}`);
      }

      const data = await response.json();
      
      // Pruefe ob Eskalation zu Mitarbeiter gewuenscht
      if (data.escalated || textToSend.toLowerCase().includes('mitarbeiter')) {
        setShowEmailForm(true);
        const escalationMessage: Message = {
          role: 'model',
          parts: [{ text: 'Ich verstehe, dass Sie mit einem Mitarbeiter sprechen moechten. Bitte geben Sie Ihre E-Mail-Adresse an, damit wir ein Support-Ticket fuer Sie erstellen koennen.' }],
        };
        setMessages(prev => [...prev, escalationMessage]);
      } else {
        const modelMessage: Message = { role: 'model', parts: [{ text: data.text }] };
        setMessages(prev => [...prev, modelMessage]);
      }
    } catch {
      const errorMessage: Message = {
        role: 'model',
        parts: [{ text: 'Entschuldigung, es ist ein Fehler aufgetreten. Bitte versuchen Sie es spaeter erneut oder erstellen Sie ein Support-Ticket.' }],
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    if (action.id === 'human-support') {
      setShowEmailForm(true);
      setShowQuickActions(false);
      const escalationMessage: Message = {
        role: 'model',
        parts: [{ text: 'Ich verbinde Sie mit unserem Support-Team. Bitte geben Sie Ihre Kontaktdaten an, damit wir uns bei Ihnen melden koennen.' }],
      };
      setMessages(prev => [...prev, escalationMessage]);
    } else {
      handleSend(action.message);
    }
  };

  const handleCreateTicket = async () => {
    if (!userEmail.trim()) return;

    setIsLoading(true);
    
    // Sammle Chat-Kontext
    const chatContext = messages
      .filter(m => m.role !== 'system')
      .map(m => `${m.role === 'user' ? 'Kunde' : 'Bot'}: ${m.parts[0].text}`)
      .join('\n');

    try {
      const response = await fetch('/api/support/create-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: userEmail,
          customerName: userName || 'Unbekannt',
          title: 'Support-Anfrage via Chat',
          description: `Chat-Verlauf:\n\n${chatContext}`,
          category: 'support',
          priority: 'medium',
          source: 'chatbot',
        }),
      });

      const data = await response.json();
      
      if (data.success && data.ticketId) {
        setTicketCreated(data.ticketId);
        setShowEmailForm(false);
        
        const successMessage: Message = {
          role: 'system',
          parts: [{ text: `Ihr Support-Ticket wurde erstellt!\n\n**Ticket-Nummer:** ${data.ticketId}\n\nUnser Team wird sich innerhalb von 24 Stunden bei Ihnen melden. Sie erhalten eine Bestaetigung per E-Mail an ${userEmail}.` }],
          ticketId: data.ticketId,
        };
        setMessages(prev => [...prev, successMessage]);
      } else {
        throw new Error(data.error || 'Ticket konnte nicht erstellt werden');
      }
    } catch {
      const errorMessage: Message = {
        role: 'model',
        parts: [{ text: 'Entschuldigung, das Ticket konnte nicht erstellt werden. Bitte versuchen Sie es erneut oder kontaktieren Sie uns unter support@taskilo.de' }],
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([initialMessage]);
    setShowQuickActions(true);
    setTicketCreated(null);
    setShowEmailForm(false);
    setUserEmail('');
    setUserName('');
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-[#14ad9f] text-white rounded-full p-4 shadow-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-transform transform hover:scale-110"
          aria-label="Support Chat oeffnen"
        >
          {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
        </button>
      </div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 w-full max-w-sm h-[70vh] max-h-[600px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl flex flex-col z-50 border border-gray-200 dark:border-gray-700"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-[#14ad9f] text-white rounded-t-lg">
              <div className="flex items-center gap-2">
                {!showQuickActions && messages.length > 1 && (
                  <button
                    onClick={resetChat}
                    className="p-1 hover:bg-white/20 rounded"
                    title="Neuer Chat"
                  >
                    <ChevronLeft size={20} />
                  </button>
                )}
                <Bot size={24} />
                <div>
                  <h3 className="font-semibold">Taskilo Support</h3>
                  <p className="text-xs text-white/80">Meist antwortet innerhalb Minuten</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
                >
                  {(msg.role === 'model' || msg.role === 'system') && (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      msg.role === 'system' ? 'bg-green-100 dark:bg-green-900' : 'bg-teal-100 dark:bg-teal-900'
                    }`}>
                      {msg.role === 'system' ? (
                        <CheckCircle className="text-green-600 dark:text-green-300" size={18} />
                      ) : (
                        <Bot className="text-teal-600 dark:text-teal-300" size={18} />
                      )}
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      msg.role === 'user' 
                        ? 'bg-[#14ad9f] text-white rounded-br-none' 
                        : msg.role === 'system'
                          ? 'bg-green-50 dark:bg-green-900/30 text-gray-800 dark:text-gray-200 rounded-bl-none border border-green-200 dark:border-green-800'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
                    }`}
                  >
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <Markdown>{msg.parts[0].text}</Markdown>
                    </div>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center shrink-0">
                      <User className="text-gray-600 dark:text-gray-300" size={18} />
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center shrink-0">
                    <Bot className="text-teal-600 dark:text-teal-300" size={18} />
                  </div>
                  <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700">
                    <Loader2 className="animate-spin text-gray-500" size={20} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            {showQuickActions && !showEmailForm && (
              <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <p className="text-xs text-gray-500 mb-2">Haeufige Fragen:</p>
                <div className="grid grid-cols-2 gap-2">
                  {quickActions.map(action => (
                    <button
                      key={action.id}
                      onClick={() => handleQuickAction(action)}
                      className="flex items-center gap-2 p-2 text-left text-sm bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-[#14ad9f] hover:bg-teal-50 dark:hover:bg-teal-900/30 transition-colors"
                    >
                      <action.icon size={16} className="text-[#14ad9f] shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300 text-xs">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Email Form for Ticket Creation */}
            {showEmailForm && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 space-y-3">
                <input
                  type="text"
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  placeholder="Ihr Name"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                />
                <input
                  type="email"
                  value={userEmail}
                  onChange={e => setUserEmail(e.target.value)}
                  placeholder="Ihre E-Mail-Adresse *"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                  required
                />
                <button
                  onClick={handleCreateTicket}
                  disabled={!userEmail.trim() || isLoading}
                  className="w-full bg-[#14ad9f] text-white py-2 px-4 rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      <Headphones size={18} />
                      Support-Ticket erstellen
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Input Field */}
            {!showEmailForm && !ticketCreated && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleSend()}
                    placeholder="Ihre Frage eingeben..."
                    className="w-full p-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent dark:bg-gray-700 dark:text-white"
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={isLoading || input.trim() === ''}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full text-[#14ad9f] hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* Ticket Created - New Chat Button */}
            {ticketCreated && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={resetChat}
                  className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Neuen Chat starten
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SupportChatbot;
