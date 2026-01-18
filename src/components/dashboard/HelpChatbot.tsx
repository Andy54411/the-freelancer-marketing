'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, ExternalLink, Sparkles, ChevronDown, ThumbsUp, ThumbsDown, Globe, Brain } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { auth, db } from '@/firebase/clients';
import { doc, getDoc, collection, getDocs, query, limit } from 'firebase/firestore';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  links?: Array<{ title: string; url: string }>;
  source?: 'knowledge_base' | 'web_search' | 'learned' | 'company_context' | 'learned_knowledge' | 'company_analysis';
  messageId?: string;
  feedbackGiven?: 'positive' | 'negative' | null;
}

// Company-Kontext für die KI
interface CompanyContext {
  name?: string;
  industry?: string;
  kleinunternehmer?: boolean;
  hasEmployees?: boolean;
  employeeCount?: number;
  hasCustomers?: boolean;
  customerCount?: number;
  hasInvoices?: boolean;
  invoiceCount?: number;
  hasInventory?: boolean;
  modules?: string[];
  settings?: {
    taxNumber?: boolean;
    vatId?: boolean;
    bankConnected?: boolean;
    emailConnected?: boolean;
  };
}

interface HelpChatbotProps {
  companyId: string;
}

export function HelpChatbot({ companyId }: HelpChatbotProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [companyContext, setCompanyContext] = useState<CompanyContext | null>(null);
  const [contextLoaded, setContextLoaded] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([
    'Wie erstelle ich eine Rechnung?',
    'Wo finde ich meine Kunden?',
    'Wie starte ich eine Inventur?',
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Company-Kontext laden wenn Chat geöffnet wird
  useEffect(() => {
    if (!isOpen || contextLoaded || !companyId) return;

    const loadCompanyContext = async () => {
      try {
        const context: CompanyContext = {};

        // Company-Daten laden
        const companyDoc = await getDoc(doc(db, 'companies', companyId));
        if (companyDoc.exists()) {
          const data = companyDoc.data();
          context.name = data.companyName || data.name;
          context.industry = data.industry || data.branche;
          context.kleinunternehmer = data.kleinunternehmer === 'ja' || data.ust === 'kleinunternehmer';
          context.modules = data.activeModules || [];
          context.settings = {
            taxNumber: !!data.taxNumber,
            vatId: !!data.vatId,
            bankConnected: !!data.bankConnection,
            emailConnected: !!data.emailConfig,
          };
        }

        // Kunden zählen (max 1 für Performance)
        try {
          const customersQuery = query(collection(db, 'companies', companyId, 'customers'), limit(1));
          const customersSnap = await getDocs(customersQuery);
          context.hasCustomers = !customersSnap.empty;
          context.customerCount = customersSnap.size;
        } catch {
          context.hasCustomers = false;
        }

        // Mitarbeiter zählen
        try {
          const employeesQuery = query(collection(db, 'companies', companyId, 'employees'), limit(1));
          const employeesSnap = await getDocs(employeesQuery);
          context.hasEmployees = !employeesSnap.empty;
          context.employeeCount = employeesSnap.size;
        } catch {
          context.hasEmployees = false;
        }

        // Rechnungen zählen
        try {
          const invoicesQuery = query(collection(db, 'companies', companyId, 'invoices'), limit(1));
          const invoicesSnap = await getDocs(invoicesQuery);
          context.hasInvoices = !invoicesSnap.empty;
          context.invoiceCount = invoicesSnap.size;
        } catch {
          context.hasInvoices = false;
        }

        // Inventar prüfen
        try {
          const inventoryQuery = query(collection(db, 'companies', companyId, 'inventory'), limit(1));
          const inventorySnap = await getDocs(inventoryQuery);
          context.hasInventory = !inventorySnap.empty;
        } catch {
          context.hasInventory = false;
        }

        setCompanyContext(context);
        setContextLoaded(true);

        // Personalisierte Vorschläge basierend auf Kontext
        const newSuggestions: string[] = [];
        if (!context.hasCustomers) {
          newSuggestions.push('Wie lege ich meinen ersten Kunden an?');
        }
        if (!context.hasInvoices) {
          newSuggestions.push('Wie erstelle ich meine erste Rechnung?');
        }
        if (context.kleinunternehmer) {
          newSuggestions.push('Was bedeutet Kleinunternehmerregelung?');
        }
        if (!context.settings?.taxNumber) {
          newSuggestions.push('Wo trage ich meine Steuernummer ein?');
        }
        if (newSuggestions.length > 0) {
          setSuggestions(newSuggestions.slice(0, 3));
        }
      } catch {
        // Kontext-Fehler ignorieren, Chat funktioniert auch ohne
        setContextLoaded(true);
      }
    };

    loadCompanyContext();
  }, [isOpen, contextLoaded, companyId]);

  // Auto-scroll zu neuen Nachrichten
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus auf Input wenn Chat geöffnet wird
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  // Willkommensnachricht beim ersten Öffnen
  useEffect(() => {
    if (isOpen && messages.length === 0 && contextLoaded) {
      const greeting = companyContext?.name 
        ? `Hallo! Ich bin Ihr Taskilo-Assistent für ${companyContext.name}.`
        : `Hallo! Ich bin Ihr Taskilo-Assistent.`;
      
      let tips = '';
      if (companyContext) {
        if (!companyContext.hasCustomers) {
          tips += '\n- Legen Sie Ihren ersten Kunden an';
        }
        if (!companyContext.hasInvoices) {
          tips += '\n- Erstellen Sie Ihre erste Rechnung';
        }
        if (!companyContext.settings?.taxNumber) {
          tips += '\n- Tragen Sie Ihre Steuerdaten ein';
        }
      }
      
      const content = tips 
        ? `${greeting}\n\nIch sehe, Sie könnten folgendes noch einrichten:${tips}\n\nWie kann ich Ihnen helfen?`
        : `${greeting}\n\nIch helfe Ihnen gerne bei Fragen zu allen Funktionen. Was möchten Sie wissen?`;
      
      setMessages([
        {
          role: 'assistant',
          content,
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, messages.length, contextLoaded, companyContext]);

  const sendMessage = useCallback(async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading || !user) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Nicht eingeloggt');
      const token = await currentUser.getIdToken();
      
      const response = await fetch(`/api/company/${companyId}/help-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: text,
          company_id: companyId,
          conversation_history: messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content,
          })),
          context: companyContext ? {
            company_name: companyContext.name,
            industry: companyContext.industry,
            is_kleinunternehmer: companyContext.kleinunternehmer,
            has_employees: companyContext.hasEmployees,
            employee_count: companyContext.employeeCount,
            has_customers: companyContext.hasCustomers,
            customer_count: companyContext.customerCount,
            has_invoices: companyContext.hasInvoices,
            invoice_count: companyContext.invoiceCount,
            has_inventory: companyContext.hasInventory,
            active_modules: companyContext.modules,
            settings: companyContext.settings,
          } : null,
        }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: data.data.message,
          timestamp: new Date(),
          links: data.data.related_links,
          source: data.data.source || 'knowledge_base',
          messageId: `msg_${Date.now()}`,
          feedbackGiven: null,
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        if (data.data.suggestions?.length > 0) {
          setSuggestions(data.data.suggestions);
        }
      } else {
        throw new Error(data.error || 'Fehler bei der Anfrage');
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Entschuldigung, ich konnte Ihre Anfrage nicht verarbeiten. Bitte versuchen Sie es erneut oder kontaktieren Sie unseren Support.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, user, companyId, messages]);

  const sendFeedback = useCallback(async (messageIndex: number, isPositive: boolean) => {
    const message = messages[messageIndex];
    if (!message || message.role !== 'assistant' || message.feedbackGiven) return;

    // Finde die vorherige User-Nachricht
    const userMessage = messages.slice(0, messageIndex).reverse().find(m => m.role === 'user');
    if (!userMessage) return;

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      const token = await currentUser.getIdToken();

      await fetch(`/api/company/${companyId}/help-chat/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message_id: message.messageId,
          question: userMessage.content,
          answer: message.content,
          rating: isPositive ? 5 : 2,
          company_id: companyId,
        }),
      });

      // Update message to show feedback was given
      setMessages(prev => prev.map((m, i) => 
        i === messageIndex ? { ...m, feedbackGiven: isPositive ? 'positive' : 'negative' } : m
      ));
    } catch {
      // Feedback-Fehler ignorieren
    }
  }, [messages, companyId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Floating Button wenn geschlossen
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-linear-to-br from-[#14ad9f] to-teal-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center justify-center group print:hidden"
        title="Hilfe-Chat öffnen"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="absolute -top-2 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
          <Sparkles className="w-3 h-3 text-white" />
        </span>
      </button>
    );
  }

  return (
    <div 
      className={`fixed bottom-6 right-6 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 transition-all duration-300 print:hidden ${
        isMinimized ? 'w-72 h-14' : 'w-96 h-128'
      }`}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-5 py-4 bg-linear-to-r from-[#14ad9f] via-teal-500 to-teal-600 rounded-t-2xl cursor-pointer shadow-sm"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-inner">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Taskilo Hilfe</h3>
            {!isMinimized && (
              <p className="text-xs text-white/70 font-medium">Powered by Taskilo-KI</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(!isMinimized);
            }}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <ChevronDown className={`w-4 h-4 text-white transition-transform ${isMinimized ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Chat Content */}
      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 h-96 bg-linear-to-b from-white to-gray-50/50">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in-0 slide-in-from-bottom-2 duration-300`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-sm ${
                    message.role === 'user'
                      ? 'bg-linear-to-br from-[#14ad9f] to-teal-600 text-white rounded-br-md'
                      : 'bg-white border border-gray-100 text-gray-800 rounded-bl-md'
                  }`}
                >
                  {/* Source Indicator für Assistant-Nachrichten */}
                  {message.role === 'assistant' && message.source && message.source !== 'knowledge_base' && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5 pb-1.5 border-b border-gray-200/50">
                      {message.source === 'web_search' && (
                        <>
                          <Globe className="w-3 h-3" />
                          <span>Web-Recherche</span>
                        </>
                      )}
                      {message.source === 'learned' && (
                        <>
                          <Brain className="w-3 h-3" />
                          <span>Gelernte Antwort</span>
                        </>
                      )}
                      {message.source === 'learned_knowledge' && (
                        <>
                          <Brain className="w-3 h-3 text-purple-500" />
                          <span>Autonome Wissensdatenbank</span>
                        </>
                      )}
                      {message.source === 'company_analysis' && (
                        <>
                          <Brain className="w-3 h-3 text-teal-600" />
                          <span>Ihre Unternehmensdaten</span>
                        </>
                      )}
                    </div>
                  )}
                  
                  {message.role === 'user' ? (
                    <div className="text-[15px] leading-relaxed text-white">
                      {message.content}
                    </div>
                  ) : (
                  <div className="text-[15px] leading-relaxed prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-2 prose-li:my-0.5 prose-headings:font-bold prose-headings:text-gray-900">
                    <ReactMarkdown
                      components={{
                        a: ({ href, children }) => (
                          <a 
                            href={href} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-teal-600 font-medium underline decoration-teal-400/50 underline-offset-2 hover:text-teal-700 hover:decoration-teal-600 transition-colors"
                          >
                            {children}
                          </a>
                        ),
                        p: ({ children }) => <p className="mb-2.5 text-gray-700 leading-relaxed">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
                        li: ({ children }) => <li className="text-gray-700 leading-relaxed">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                        em: ({ children }) => <em className="text-gray-500 not-italic text-sm">{children}</em>,
                        hr: () => <hr className="my-3 border-gray-200" />,
                        h1: ({ children }) => <h1 className="text-lg font-bold text-gray-900 mb-2">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-base font-bold text-gray-900 mb-2">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-sm font-bold text-gray-800 mb-1.5">{children}</h3>,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                  )}
                  
                  {/* Links */}
                  {message.links && message.links.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200/50 space-y-1">
                      {message.links.map((link, linkIndex) => (
                        <Link
                          key={linkIndex}
                          href={link.url}
                          className="flex items-center gap-1.5 text-xs text-teal-700 hover:text-teal-900 hover:underline"
                          onClick={() => setIsOpen(false)}
                        >
                          <ExternalLink className="w-3 h-3" />
                          {link.title}
                        </Link>
                      ))}
                    </div>
                  )}
                  
                  {/* Feedback Buttons für Assistant-Nachrichten */}
                  {message.role === 'assistant' && index > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200/50 flex items-center gap-2">
                      {message.feedbackGiven ? (
                        <span className="text-xs text-gray-400">
                          Danke für Ihr Feedback!
                        </span>
                      ) : (
                        <>
                          <span className="text-xs text-gray-400">War das hilfreich?</span>
                          <button
                            onClick={() => sendFeedback(index, true)}
                            className="p-1 hover:bg-green-100 rounded transition-colors"
                            title="Hilfreich"
                          >
                            <ThumbsUp className="w-3.5 h-3.5 text-gray-400 hover:text-green-600" />
                          </button>
                          <button
                            onClick={() => sendFeedback(index, false)}
                            className="p-1 hover:bg-red-100 rounded transition-colors"
                            title="Nicht hilfreich"
                          >
                            <ThumbsDown className="w-3.5 h-3.5 text-gray-400 hover:text-red-600" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex justify-start animate-in fade-in-0 slide-in-from-bottom-2">
                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-5 py-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Loader2 className="w-5 h-5 animate-spin text-[#14ad9f]" />
                      <div className="absolute inset-0 w-5 h-5 bg-teal-400/20 rounded-full animate-ping" />
                    </div>
                    <span className="text-sm font-medium text-gray-600">Taskilo-KI denkt nach...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && messages.length < 3 && (
            <div className="px-5 pb-3">
              <p className="text-xs text-gray-400 mb-2 font-medium">Vorschläge:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => sendMessage(suggestion)}
                    disabled={isLoading}
                    className="text-xs px-3 py-1.5 bg-linear-to-r from-gray-50 to-gray-100 hover:from-teal-50 hover:to-teal-100 text-gray-700 hover:text-teal-700 rounded-full transition-all duration-200 disabled:opacity-50 border border-gray-200 hover:border-teal-200 font-medium shadow-sm"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Stellen Sie eine Frage..."
                disabled={isLoading}
                className="flex-1 px-4 py-3 text-[15px] bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14ad9f]/30 focus:border-[#14ad9f] disabled:opacity-50 placeholder:text-gray-400 shadow-sm transition-all"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                className="p-3 bg-linear-to-r from-[#14ad9f] to-teal-600 text-white rounded-xl hover:from-teal-600 hover:to-teal-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
