'use client';

import React, { useState, useRef } from 'react';
import { X, Mail, User, Building2, Phone, Calendar, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DemoRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DemoRequestModal({ isOpen, onClose }: DemoRequestModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    preferredDate: '',
    message: '',
    website: '' // Honeypot field
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Bot-Schutz 1: Honeypot-Feld prüfen
    if (formData.website) {
      console.log('Bot detected: Honeypot filled');
      setIsSubmitting(false);
      return;
    }

    // Bot-Schutz 2: Zeitverzögerung prüfen (mindestens 3 Sekunden)
    const timeTaken = Date.now() - startTimeRef.current;
    if (timeTaken < 3000) {
      setError('Bitte nehmen Sie sich etwas mehr Zeit für das Ausfüllen des Formulars.');
      setIsSubmitting(false);
      return;
    }

    try {
      // API-Anfrage an Backend senden
      const response = await fetch('/api/demo-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          company: formData.company,
          phone: formData.phone,
          preferredDate: formData.preferredDate,
          message: formData.message,
        }),
      });

      if (!response.ok) {
        throw new Error('Fehler beim Senden der Anfrage');
      }

      setIsSubmitting(false);
      setIsSuccess(true);

      // Modal nach 2 Sekunden schließen
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
        setFormData({
          name: '',
          email: '',
          company: '',
          phone: '',
          preferredDate: '',
          message: '',
          website: ''
        });
        startTimeRef.current = Date.now();
      }, 2000);
    } catch {
      setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50 backdrop-blur-md"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            >
              {/* Header mit Gradient */}
              <div className="relative bg-linear-to-br from-teal-500 to-teal-700 px-6 py-4 text-white overflow-hidden">
                <div className="absolute inset-0 bg-grid-white/[0.05] bg-size-[20px_20px]" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">Demo anfragen</h2>
                      <p className="text-xs text-teal-100">Lassen Sie sich Taskilo zeigen</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-white/20 rounded-lg transition-colors backdrop-blur-sm"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 overflow-y-auto max-h-[calc(90vh-90px)]">
                {isSuccess ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", duration: 0.5 }}
                    className="text-center py-12"
                  >
                    <motion.div 
                      className="w-20 h-20 bg-linear-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    >
                      <svg
                        className="w-10 h-10 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </motion.div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">
                      Anfrage erfolgreich!
                    </h3>
                    <p className="text-gray-600 text-lg">
                      Wir melden uns in Kürze bei Ihnen.
                    </p>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-3.5">
                    {/* Intro Text */}
                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-2.5">
                      <p className="text-xs text-gray-700">
                        Wir melden uns <strong>innerhalb von 24 Stunden</strong> bei Ihnen.
                      </p>
                    </div>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs"
                      >
                        {error}
                      </motion.div>
                    )}

                    {/* Honeypot Field - versteckt für Menschen, sichtbar für Bots */}
                    <input
                      type="text"
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      className="absolute left-[-9999px]"
                      tabIndex={-1}
                      autoComplete="off"
                      aria-hidden="true"
                    />

                    {/* Name */}
                    <div>
                      <label htmlFor="name" className="block text-xs font-semibold text-gray-900 mb-1">
                        Ihr Name *
                      </label>
                      <div className="relative group">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
                        <input
                          type="text"
                          id="name"
                          name="name"
                          required
                          value={formData.name}
                          onChange={handleChange}
                          className="w-full pl-9 pr-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all text-gray-900 placeholder-gray-400"
                          placeholder="Max Mustermann"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="email" className="block text-xs font-semibold text-gray-900 mb-1">
                        E-Mail *
                      </label>
                      <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
                        <input
                          type="email"
                          id="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full pl-9 pr-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all text-gray-900 placeholder-gray-400"
                          placeholder="max@beispiel.de"
                        />
                      </div>
                    </div>

                    {/* Company & Phone in Row */}
                    <div className="grid md:grid-cols-2 gap-3">
                      {/* Company */}
                      <div>
                        <label htmlFor="company" className="block text-xs font-semibold text-gray-900 mb-1">
                          Unternehmen *
                        </label>
                        <div className="relative group">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
                          <input
                            type="text"
                            id="company"
                            name="company"
                            required
                            value={formData.company}
                            onChange={handleChange}
                            className="w-full pl-9 pr-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all text-gray-900 placeholder-gray-400"
                            placeholder="Muster GmbH"
                          />
                        </div>
                      </div>

                      {/* Phone */}
                      <div>
                        <label htmlFor="phone" className="block text-xs font-semibold text-gray-900 mb-1">
                          Telefon
                        </label>
                        <div className="relative group">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
                          <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="w-full pl-9 pr-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all text-gray-900 placeholder-gray-400"
                            placeholder="+49 123 456789"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Preferred Date */}
                    <div>
                      <label htmlFor="preferredDate" className="block text-xs font-semibold text-gray-900 mb-1">
                        Wunschtermin
                      </label>
                      <div className="relative group">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
                        <input
                          type="text"
                          id="preferredDate"
                          name="preferredDate"
                          value={formData.preferredDate}
                          onChange={handleChange}
                          className="w-full pl-9 pr-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all text-gray-900 placeholder-gray-400"
                          placeholder="z.B. nächste Woche Dienstag"
                        />
                      </div>
                    </div>

                    {/* Message */}
                    <div>
                      <label htmlFor="message" className="block text-xs font-semibold text-gray-900 mb-1">
                        Nachricht
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        rows={3}
                        value={formData.message}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all resize-none text-gray-900 placeholder-gray-400"
                        placeholder="Spezielle Fragen oder Anforderungen?"
                      />
                    </div>

                    {/* Submit Button */}
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2 text-sm border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-all"
                      >
                        Abbrechen
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-2 text-sm bg-linear-to-r from-teal-500 to-teal-600 text-white rounded-lg hover:from-teal-600 hover:to-teal-700 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-500/30"
                      >
                        {isSubmitting ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Wird gesendet...
                          </span>
                        ) : (
                          'Demo anfragen'
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
