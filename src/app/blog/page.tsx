'use client';

import React from 'react';
import { FiBookOpen, FiTrendingUp, FiUsers, FiZap } from 'react-icons/fi';
import { HeroHeader } from '@/components/hero8-header';

export default function BlogPage() {
    return (
        <>
            <HeroHeader />
            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <div className="bg-[#14ad9f] text-white py-16">
                    <div className="max-w-4xl mx-auto px-4">
                        <h1 className="text-4xl font-bold mb-4">Taskilo Blog</h1>
                        <p className="text-xl opacity-90">
                            Insights, Tipps und News aus der Welt der Dienstleistungen
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-4xl mx-auto px-4 py-12">
                    <div className="space-y-12">
                        {/* Coming Soon */}
                        <section className="text-center">
                            <div className="bg-white rounded-lg shadow-md p-12">
                                <FiBookOpen className="text-6xl text-[#14ad9f] mx-auto mb-6" />
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">Blog kommt bald!</h2>
                                <p className="text-gray-600 text-lg mb-8">
                                    Wir arbeiten an spannenden Inhalten für dich. Bald findest du hier:
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                                    <div className="text-center">
                                        <FiTrendingUp className="text-3xl text-[#14ad9f] mx-auto mb-3" />
                                        <h3 className="font-semibold mb-2">Branche Insights</h3>
                                        <p className="text-sm text-gray-600">
                                            Trends und Entwicklungen in der Dienstleistungsbranche
                                        </p>
                                    </div>
                                    <div className="text-center">
                                        <FiUsers className="text-3xl text-[#14ad9f] mx-auto mb-3" />
                                        <h3 className="font-semibold mb-2">Success Stories</h3>
                                        <p className="text-sm text-gray-600">
                                            Erfolgsgeschichten unserer Dienstleister und Kunden
                                        </p>
                                    </div>
                                    <div className="text-center">
                                        <FiZap className="text-3xl text-[#14ad9f] mx-auto mb-3" />
                                        <h3 className="font-semibold mb-2">Tipps & Tricks</h3>
                                        <p className="text-sm text-gray-600">
                                            Praktische Ratschläge für bessere Dienstleistungen
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-8 pt-8 border-t border-gray-200">
                                    <p className="text-gray-500">
                                        Möchtest du informiert werden, wenn der Blog online geht?
                                    </p>
                                    <a
                                        href="mailto:blog@taskilo.de"
                                        className="inline-block mt-4 bg-[#14ad9f] text-white px-6 py-3 rounded-lg font-semibold hover:bg-teal-600 transition-colors"
                                    >
                                        Über Updates informieren
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
