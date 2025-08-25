'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare as FiMessageSquare,
  X as FiX,
  Send as FiSend,
  Loader2 as FiLoader,
  User as FiUser,
  Cpu as FiCpu,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Markdown from 'react-markdown';

interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

const initialMessage: Message = {
  role: 'model',
  parts: [{ text: 'Hallo! Ich bin Ihr Support Bot von Taskilo. Wie kann ich Ihnen heute helfen?' }],
};

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Füge die initiale Begrüßungsnachricht nur einmal hinzu, wenn der Chat geöffnet wird
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([initialMessage]);
    }
  }, [isOpen, messages.length]);

  // NEU: useEffect, um auf externe Events zum Öffnen des Chats zu lauschen
  useEffect(() => {
    const openChatbot = () => setIsOpen(true);
    window.addEventListener('openChatbot', openChatbot);
    return () => window.removeEventListener('openChatbot', openChatbot);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (input.trim() === '' || isLoading) return;

    const userMessage: Message = { role: 'user', parts: [{ text: input }] };
    // Die Historie VOR dem Senden der neuen Nachricht erstellen. Wir filtern die erste Nachricht
    // explizit heraus, wenn es sich um die Begrüßung des Bots handelt. Dies ist robuster als ein reiner Referenzvergleich.
    const historyForApi =
      messages.length > 0 && messages[0] === initialMessage ? messages.slice(1) : messages;

    setMessages(prev => [...prev, userMessage]); // UI mit der neuen Nachricht aktualisieren
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          history: historyForApi, // Korrekte, gefilterte Historie senden
          message: input,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text(); // Lese die Antwort als Text, um detailliertere Fehler zu sehen
        throw new Error(
          `Netzwerkantwort war nicht in Ordnung (${response.status} ${response.statusText}). Server-Antwort: ${errorText}`
        );
      }

      const data = await response.json();
      const modelMessage: Message = { role: 'model', parts: [{ text: data.text }] };
      setMessages(prev => [...prev, modelMessage]);
    } catch (error) {

      const errorMessage: Message = {
        role: 'model',
        parts: [
          {
            text: 'Entschuldigung, es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.',
          },
        ],
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-[#14ad9f] text-white rounded-full p-4 shadow-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-transform transform hover:scale-110"
          aria-label="Chatbot öffnen"
        >
          {isOpen ? <FiX size={24} /> : <FiMessageSquare size={24} />}
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
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                Hilfe & Support
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
                >
                  {msg.role === 'model' && (
                    <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center shrink-0">
                      <FiCpu className="text-teal-600 dark:text-teal-300" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${msg.role === 'user' ? 'bg-[#14ad9f] text-white rounded-br-none' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'}`}
                  >
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <Markdown>{msg.parts[0].text}</Markdown>
                    </div>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center shrink-0">
                      <FiUser className="text-gray-600 dark:text-gray-300" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center shrink-0">
                    <FiCpu className="text-teal-600 dark:text-teal-300" />
                  </div>
                  <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700">
                    <FiLoader className="animate-spin text-gray-500" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleSend()}
                  placeholder="Ihre Frage..."
                  className="w-full p-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent dark:bg-gray-700 dark:text-white"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || input.trim() === ''}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiSend />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Chatbot;
