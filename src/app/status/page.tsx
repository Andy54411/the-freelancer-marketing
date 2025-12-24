import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { 
  Activity, 
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  Server,
  Database,
  Mail,
  Calendar
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Status-Seite | Taskilo',
  description: 'Aktuelle Status-Informationen zu allen Taskilo-Services',
};

export default function StatusPage() {
  const services = [
    {
      name: 'Webseite',
      status: 'operational',
      icon: Activity,
      uptime: '99.98%'
    },
    {
      name: 'API',
      status: 'operational',
      icon: Server,
      uptime: '99.95%'
    },
    {
      name: 'Datenbank',
      status: 'operational',
      icon: Database,
      uptime: '99.99%'
    },
    {
      name: 'E-Mail Service',
      status: 'operational',
      icon: Mail,
      uptime: '99.97%'
    },
    {
      name: 'Kalender Service',
      status: 'operational',
      icon: Calendar,
      uptime: '99.96%'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'text-green-600 bg-green-100';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100';
      case 'outage':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return CheckCircle;
      case 'degraded':
        return AlertCircle;
      case 'outage':
        return XCircle;
      default:
        return Clock;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'operational':
        return 'Alle Systeme betriebsbereit';
      case 'degraded':
        return 'Eingeschränkte Leistung';
      case 'outage':
        return 'Dienst nicht verfügbar';
      default:
        return 'Status unbekannt';
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-white to-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Activity className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Taskilo Status
          </h1>
          <p className="text-lg text-gray-600">
            Aktuelle Verfügbarkeit unserer Services
          </p>
        </div>

        {/* Overall Status */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <span className="text-lg font-semibold text-green-800">
              Alle Systeme betriebsbereit
            </span>
          </div>
          <p className="text-sm text-green-700 text-center mt-2">
            Letzte Aktualisierung: {new Date().toLocaleString('de-DE')}
          </p>
        </div>

        {/* Services List */}
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
          {services.map((service) => {
            const StatusIcon = getStatusIcon(service.status);
            return (
              <div key={service.name} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <service.icon className="w-6 h-6 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{service.name}</h3>
                      <p className="text-sm text-gray-600">Uptime: {service.uptime}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${getStatusColor(service.status)}`}>
                    <StatusIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {getStatusText(service.status)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Incident History */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Vorfallhistorie</h2>
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <div className="text-center text-gray-500">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="font-medium text-gray-900 mb-2">Keine Vorfälle in den letzten 90 Tagen</p>
              <p className="text-sm">Unsere Services laufen stabil und zuverlässig</p>
            </div>
          </div>
        </div>

        {/* Subscribe */}
        <div className="mt-12 bg-teal-50 border border-teal-200 rounded-lg p-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              Bleib auf dem Laufenden
            </h2>
            <p className="text-gray-600 mb-6">
              Abonniere Updates und erhalte Benachrichtigungen bei Statusänderungen
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <input
                type="email"
                placeholder="deine@email.de"
                className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 font-medium">
                Abonnieren
              </button>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link
            href="/kontakt"
            className="text-teal-600 hover:text-teal-700 font-medium"
          >
            ← Zurück zum Kontakt
          </Link>
        </div>
      </div>
    </div>
  );
}
