import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { 
  Sparkles, 
  Calendar as CalendarIcon,
  Zap,
  CheckCircle,
  ArrowRight,
  Package
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Changelog | Taskilo',
  description: 'Neue Features, Verbesserungen und Bugfixes in Taskilo',
};

export default function ChangelogPage() {
  const updates = [
    {
      date: '23. Dezember 2024',
      version: 'v2.5.0',
      type: 'feature',
      items: [
        {
          type: 'new',
          title: 'Multi-Kalender Verfügbarkeitsprüfung',
          description: 'Prüfe automatisch die Verfügbarkeit über mehrere Kalender hinweg'
        },
        {
          type: 'new',
          title: 'Verbesserte Terminplan-Templates',
          description: 'Neue Vorlagen für häufige Anwendungsfälle'
        },
        {
          type: 'improvement',
          title: 'Schnellere Synchronisation',
          description: 'Kalender-Sync ist jetzt 3x schneller'
        },
        {
          type: 'fix',
          title: 'Zeitzone-Bug behoben',
          description: 'Termine werden nun korrekt in der lokalen Zeitzone angezeigt'
        }
      ]
    },
    {
      date: '10. Dezember 2024',
      version: 'v2.4.2',
      type: 'improvement',
      items: [
        {
          type: 'improvement',
          title: 'Performance-Optimierungen',
          description: 'Dashboard lädt jetzt 40% schneller'
        },
        {
          type: 'improvement',
          title: 'Mobile Navigation verbessert',
          description: 'Optimierte Bedienung auf kleinen Bildschirmen'
        },
        {
          type: 'fix',
          title: 'Benachrichtigungs-Probleme behoben',
          description: 'E-Mail-Benachrichtigungen werden wieder zuverlässig zugestellt'
        }
      ]
    },
    {
      date: '25. November 2024',
      version: 'v2.4.0',
      type: 'feature',
      items: [
        {
          type: 'new',
          title: 'Automatische Rechnungserstellung',
          description: 'Erstelle automatisch Rechnungen nach abgeschlossenen Terminen'
        },
        {
          type: 'new',
          title: 'WhatsApp-Integration',
          description: 'Sende Terminbestätigungen direkt per WhatsApp'
        },
        {
          type: 'improvement',
          title: 'Erweiterte Statistiken',
          description: 'Neue Insights zu Buchungsraten und Kundenbindung'
        }
      ]
    },
    {
      date: '5. November 2024',
      version: 'v2.3.5',
      type: 'fix',
      items: [
        {
          type: 'fix',
          title: 'Kalender-Export behoben',
          description: 'ICS-Dateien werden nun korrekt erstellt'
        },
        {
          type: 'fix',
          title: 'Safari-Kompatibilität',
          description: 'Anzeige-Probleme in Safari behoben'
        },
        {
          type: 'improvement',
          title: 'Sicherheits-Update',
          description: 'Aktualisierung wichtiger Sicherheitskomponenten'
        }
      ]
    }
  ];

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'new':
        return { icon: Sparkles, color: 'text-teal-600 bg-teal-100' };
      case 'improvement':
        return { icon: Zap, color: 'text-blue-600 bg-blue-100' };
      case 'fix':
        return { icon: CheckCircle, color: 'text-green-600 bg-green-100' };
      default:
        return { icon: Package, color: 'text-gray-600 bg-gray-100' };
    }
  };

  const getItemLabel = (type: string) => {
    switch (type) {
      case 'new':
        return { text: 'Neu', color: 'bg-teal-100 text-teal-700' };
      case 'improvement':
        return { text: 'Verbessert', color: 'bg-blue-100 text-blue-700' };
      case 'fix':
        return { text: 'Behoben', color: 'bg-green-100 text-green-700' };
      default:
        return { text: 'Update', color: 'bg-gray-100 text-gray-700' };
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden bg-linear-to-br from-teal-600 to-teal-800 text-white">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-size-[20px_20px]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center max-w-3xl mx-auto">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CalendarIcon className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">
              Changelog
            </h1>
            <p className="text-xl text-teal-100">
              Neue Features, Verbesserungen und Bugfixes
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Subscribe */}
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-6 mb-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">
                Bleib auf dem Laufenden
              </h3>
              <p className="text-sm text-gray-600">
                Erhalte Benachrichtigungen über neue Updates
              </p>
            </div>
            <button className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 font-medium whitespace-nowrap">
              Updates abonnieren
            </button>
          </div>
        </div>

        {/* Updates List */}
        <div className="space-y-12">
          {updates.map((update, updateIndex) => (
            <div key={updateIndex} className="relative">
              {/* Date Header */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 border-t border-gray-200" />
                <div className="text-center">
                  <div className="text-sm font-semibold text-gray-900">{update.date}</div>
                  <div className="text-xs text-gray-500">{update.version}</div>
                </div>
                <div className="flex-1 border-t border-gray-200" />
              </div>

              {/* Update Items */}
              <div className="space-y-4">
                {update.items.map((item, itemIndex) => {
                  const { icon: ItemIcon, color } = getItemIcon(item.type);
                  const label = getItemLabel(item.type);
                  
                  return (
                    <div
                      key={itemIndex}
                      className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                          <ItemIcon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900">{item.title}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${label.color}`}>
                              {label.text}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{item.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Load More */}
        <div className="mt-12 text-center">
          <button className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium">
            Ältere Updates anzeigen
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback */}
        <div className="mt-16 bg-linear-to-r from-teal-50 to-blue-50 rounded-2xl p-8 border border-teal-200">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Hast du Feedback oder Feature-Wünsche?
            </h2>
            <p className="text-gray-600 mb-6">
              Lass uns wissen, was wir verbessern können
            </p>
            <Link
              href="/kontakt"
              className="inline-flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 font-medium"
            >
              Feedback geben
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
