'use client';

import React from 'react';
import { FiFileText, FiUsers, FiAward, FiMail } from 'react-icons/fi';
import { HeroHeader } from '@/components/hero8-header';

export default function PressPage() {
    return (
        <>
            <HeroHeader />
            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <div className="bg-[#14ad9f] text-white py-16">
                    <div className="max-w-4xl mx-auto px-4">
                        <h1 className="text-4xl font-bold mb-4">Presse & Medien</h1>
                        <p className="text-xl opacity-90">
                            Informationen und Ressourcen für Medienvertreter
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-4xl mx-auto px-4 py-12">
                    <div className="space-y-12">
                        {/* About Section */}
                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Über Taskilo</h2>
                            <div className="bg-white rounded-lg shadow-md p-8">
                                <p className="text-gray-700 leading-relaxed mb-4">
                                    Taskilo ist eine innovative Plattform, die lokale Dienstleister mit Kunden verbindet.
                                    Unser Ziel ist es, die Vermittlung von hochwertigen Dienstleistungen zu vereinfachen
                                    und dabei sowohl Anbietern als auch Kunden die bestmögliche Erfahrung zu bieten.
                                </p>
                                <p className="text-gray-700 leading-relaxed">
                                    Mit unserem benutzerfreundlichen System können Kunden schnell und einfach
                                    qualifizierte Dienstleister in ihrer Nähe finden, während Dienstleister
                                    neue Kunden gewinnen und ihr Geschäft ausbauen können.
                                </p>
                            </div>
                        </section>

                        {/* Key Facts */}
                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Wichtige Fakten</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white rounded-lg shadow-md p-6 text-center">
                                    <FiUsers className="text-4xl text-[#14ad9f] mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">Plattform</h3>
                                    <p className="text-gray-600">
                                        Verbindung zwischen lokalen Dienstleistern und Kunden
                                    </p>
                                </div>
                                <div className="bg-white rounded-lg shadow-md p-6 text-center">
                                    <FiAward className="text-4xl text-[#14ad9f] mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">Qualität</h3>
                                    <p className="text-gray-600">
                                        Fokus auf hochwertige Dienstleistungen und Kundenzufriedenheit
                                    </p>
                                </div>
                                <div className="bg-white rounded-lg shadow-md p-6 text-center">
                                    <FiFileText className="text-4xl text-[#14ad9f] mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">Innovation</h3>
                                    <p className="text-gray-600">
                                        Moderne Technologie für einfache Vermittlung
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Press Kit */}
                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Presse-Kit</h2>
                            <div className="bg-white rounded-lg shadow-md p-8">
                                <p className="text-gray-600 mb-6">
                                    Für Medienanfragen und detaillierte Informationen stehen wir gerne zur Verfügung.
                                </p>
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-3">
                                        <FiFileText className="text-[#14ad9f]" />
                                        <span className="text-gray-700">Firmenlogos und Bildmaterial</span>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <FiFileText className="text-[#14ad9f]" />
                                        <span className="text-gray-700">Unternehmensinformationen</span>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <FiFileText className="text-[#14ad9f]" />
                                        <span className="text-gray-700">Statistiken und Zahlen</span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Contact */}
                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Pressekontakt</h2>
                            <div className="bg-[#14ad9f] rounded-lg p-8 text-white">
                                <div className="flex items-center justify-center mb-6">
                                    <FiMail className="text-4xl" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-xl font-semibold mb-4">Medienanfragen</h3>
                                    <p className="mb-6">
                                        Für Interviews, Pressemitteilungen oder weitere Informationen
                                        kontaktieren Sie uns gerne:
                                    </p>
                                    <a
                                        href="mailto:presse@taskilo.de"
                                        className="inline-block bg-white text-[#14ad9f] px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                                    >
                                        presse@taskilo.de
                                    </a>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </>
    );
}
