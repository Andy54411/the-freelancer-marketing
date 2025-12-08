'use client';

import React, { useState } from 'react';
import { X, Video, Shield, Lock, Eye, AlertTriangle } from 'lucide-react';

interface VideoCallConsentModalProps {
  isOpen: boolean;
  onConsent: (granted: boolean) => void;
  callerName?: string;
  chatId: string;
}

export default function VideoCallConsentModal({ 
  isOpen, 
  onConsent, 
  callerName, 
  chatId 
}: VideoCallConsentModalProps) {
  const [dataProcessingConsent, setDataProcessingConsent] = useState(false);
  const [videoRecordingConsent, setVideoRecordingConsent] = useState(false);
  const [euProcessingConsent, setEuProcessingConsent] = useState(false);

  if (!isOpen) return null;

  const allConsentsGiven = dataProcessingConsent && videoRecordingConsent && euProcessingConsent;

  const handleAccept = () => {
    if (allConsentsGiven) {
      onConsent(true);
    }
  };

  const handleReject = () => {
    onConsent(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-teal-600 text-white p-6 rounded-t-2xl relative">
          <button
            onClick={handleReject}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2 rounded-full">
              <Video className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Video-Anruf Zustimmung</h2>
              <p className="text-teal-100 text-sm">
                {callerName ? `Eingehender Anruf von ${callerName}` : 'Video-Anruf starten'}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* DSGVO Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-900 text-sm">DSGVO-konforme Datenverarbeitung</h3>
                <p className="text-blue-700 text-xs mt-1">
                  Ihre Daten werden ausschließlich auf EU-Servern verarbeitet und nach dem Anruf automatisch gelöscht.
                </p>
              </div>
            </div>
          </div>

          {/* Consent Checkboxes */}
          <div className="space-y-4">
            
            {/* Datenverarbeitung */}
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={dataProcessingConsent}
                onChange={(e) => setDataProcessingConsent(e.target.checked)}
                className="mt-1 text-teal-600 focus:ring-teal-500"
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <Lock className="h-4 w-4 text-gray-600" />
                  <span className="font-medium text-sm">Datenverarbeitung zustimmen</span>
                  <span className="text-red-500">*</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Ich stimme der Verarbeitung meiner Video- und Audiodaten für die Durchführung des Video-Anrufs zu. 
                  Alle Daten werden verschlüsselt übertragen und nach dem Anruf automatisch gelöscht.
                </p>
              </div>
            </label>

            {/* Video/Audio */}
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={videoRecordingConsent}
                onChange={(e) => setVideoRecordingConsent(e.target.checked)}
                className="mt-1 text-teal-600 focus:ring-teal-500"
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <Video className="h-4 w-4 text-gray-600" />
                  <span className="font-medium text-sm">Video & Audio Übertragung</span>
                  <span className="text-red-500">*</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Ich erlaube die Übertragung meiner Kamera- und Mikrofondaten für diesen Video-Anruf. 
                  Es findet keine Aufzeichnung statt.
                </p>
              </div>
            </label>

            {/* EU-Verarbeitung */}
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={euProcessingConsent}
                onChange={(e) => setEuProcessingConsent(e.target.checked)}
                className="mt-1 text-teal-600 focus:ring-teal-500"
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-gray-600" />
                  <span className="font-medium text-sm">EU-Datenverarbeitung</span>
                  <span className="text-red-500">*</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Ich bestätige, dass meine Daten ausschließlich auf EU-Servern verarbeitet werden 
                  und den Bestimmungen der DSGVO unterliegen.
                </p>
              </div>
            </label>
          </div>

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold text-amber-900 text-sm">Wichtiger Hinweis</h3>
                <p className="text-amber-700 text-xs mt-1">
                  Ihre Zustimmung ist freiwillig und kann jederzeit widerrufen werden. 
                  Alle Daten werden nach Beendigung des Anrufs automatisch gelöscht.
                </p>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col space-y-3 pt-4 border-t">
            <button
              onClick={handleAccept}
              disabled={!allConsentsGiven}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                allConsentsGiven
                  ? 'bg-teal-600 hover:bg-teal-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {allConsentsGiven ? 'Video-Anruf starten' : 'Alle Zustimmungen erforderlich'}
            </button>
            
            <button
              onClick={handleReject}
              className="w-full py-3 px-4 rounded-lg font-medium bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
            >
              Ablehnen
            </button>
          </div>

          {/* Footer */}
          <div className="text-center pt-4 border-t">
            <p className="text-xs text-gray-500">
              <Eye className="inline h-3 w-3 mr-1" />
              Weitere Informationen in unserer{' '}
              <a href="/privacy" className="text-teal-600 hover:underline">
                Datenschutzerklärung
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}