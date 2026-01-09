/**
 * DSGVO-konforme Video Call Demo Komponente
 * Zeigt die vollständige Integration des TaskiloVideoService mit React
 */

'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Video, VideoOff, Mic, MicOff, Phone, PhoneCall, AlertCircle } from 'lucide-react';
import { useVideoCall } from '@/hooks/useVideoCall';
import VideoCallConsentModal from '@/components/VideoCallConsentModal';

interface VideoCallDemoProps {
  chatId: string;
  userId: string;
  userName: string;
  userEmail?: string;
}

export default function VideoCallDemo({ 
  chatId, 
  userId, 
  userName, 
  userEmail 
}: VideoCallDemoProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicrophoneOn, setIsMicrophoneOn] = useState(true);

  const {
    // State
    isInitiating,
    isInCall,
    isConsentModalOpen,
    localStream,
    remoteStream,
    connectionState,
    error,
    
    // Actions
    startCall,
    joinCall,
    endCall,
    toggleCamera,
    toggleMicrophone,
    handleConsentResponse,
    
    // Utilities
    isCallActive: _isCallActive
  } = useVideoCall({
    chatId,
    userId,
    userName,
    userEmail
  });

  // Setup video elements when streams are available
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleToggleCamera = () => {
    const newState = toggleCamera();
    if (newState !== undefined) {
      setIsCameraOn(newState);
    }
  };

  const handleToggleMicrophone = () => {
    const newState = toggleMicrophone();
    if (newState !== undefined) {
      setIsMicrophoneOn(newState);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          DSGVO-konformer Video-Anruf
        </h2>
        <p className="text-gray-600">
          End-to-End verschlüsselte Video-Kommunikation mit vollständiger DSGVO-Compliance
        </p>
      </div>

      {/* Connection Status */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${
            connectionState === 'connected' ? 'bg-green-500' :
            connectionState === 'connecting' ? 'bg-yellow-500' :
            'bg-gray-500'
          }`} />
          <span className="font-medium">
            Status: {connectionState === 'connected' ? 'Verbunden' : 
                    connectionState === 'connecting' ? 'Verbindung wird hergestellt...' : 
                    'Nicht verbunden'}
          </span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-900">Fehler</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Video Containers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Local Video */}
        <div className="bg-gray-900 rounded-lg overflow-hidden relative">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-64 lg:h-80 object-cover"
          />
          <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
            Ihr Video
          </div>
          {!isCameraOn && (
            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
              <VideoOff className="h-12 w-12 text-gray-400" />
            </div>
          )}
        </div>

        {/* Remote Video */}
        <div className="bg-gray-900 rounded-lg overflow-hidden relative">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-64 lg:h-80 object-cover"
          />
          <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
            Remote Video
          </div>
          {!remoteStream && (
            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
              <div className="text-center">
                <Video className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-400">Warten auf Video-Stream...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-center space-x-4">
          
          {/* Start/Join Call Buttons */}
          {!isInCall && !isInitiating && (
            <>
              <button
                onClick={startCall}
                className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <PhoneCall className="h-5 w-5" />
                <span>Anruf starten</span>
              </button>
              
              <button
                onClick={joinCall}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <Phone className="h-5 w-5" />
                <span>Anruf beitreten</span>
              </button>
            </>
          )}

          {/* Call in Progress Controls */}
          {(isInCall || isInitiating) && (
            <>
              <button
                onClick={handleToggleCamera}
                className={`px-4 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                  isCameraOn 
                    ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    : 'bg-red-100 hover:bg-red-200 text-red-700'
                }`}
              >
                {isCameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                <span>{isCameraOn ? 'Kamera aus' : 'Kamera an'}</span>
              </button>

              <button
                onClick={handleToggleMicrophone}
                className={`px-4 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                  isMicrophoneOn 
                    ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    : 'bg-red-100 hover:bg-red-200 text-red-700'
                }`}
              >
                {isMicrophoneOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                <span>{isMicrophoneOn ? 'Mikrofon aus' : 'Mikrofon an'}</span>
              </button>

              <button
                onClick={endCall}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <Phone className="h-5 w-5" />
                <span>Anruf beenden</span>
              </button>
            </>
          )}

          {/* Loading State */}
          {isInitiating && (
            <div className="flex items-center space-x-3 text-teal-600">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-teal-600"></div>
              <span>Video-Anruf wird initialisiert...</span>
            </div>
          )}
        </div>
      </div>

      {/* DSGVO Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 text-sm mb-2">🛡️ DSGVO-Compliance</h3>
        <ul className="text-blue-800 text-xs space-y-1">
          <li>• Alle Daten werden auf EU-Servern (Firebase europe-west1) verarbeitet</li>
          <li>• End-to-End Verschlüsselung für alle Video- und Audio-Daten</li>
          <li>• Automatische Datenlöschung nach Anruf-Ende</li>
          <li>• Explizite Nutzerzustimmung für jeden Video-Anruf</li>
          <li>• Keine Aufzeichnung oder Speicherung von Video-/Audio-Inhalten</li>
        </ul>
      </div>

      {/* DSGVO Consent Modal */}
      <VideoCallConsentModal
        isOpen={isConsentModalOpen}
        onConsent={handleConsentResponse}
        chatId={chatId}
      />
    </div>
  );
}