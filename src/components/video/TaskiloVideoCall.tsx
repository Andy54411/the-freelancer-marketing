'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Video, VideoOff, Mic, MicOff, PhoneOff } from 'lucide-react';
import TaskiloVideoService from '@/services/TaskiloVideoService';

import { useCookieConsentContext } from '@/contexts/CookieConsentContext';

interface TaskiloVideoCallProps {
  chatId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  isInitiator: boolean;
  isOpen: boolean;
  onClose: () => void;
}

const TaskiloVideoCall: React.FC<TaskiloVideoCallProps> = ({
  chatId,
  userId,
  userName,
  userEmail,
  isInitiator,
  isOpen,
  onClose,
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const videoService = useRef<TaskiloVideoService | null>(null);
  
  const [isConnected, setIsConnected] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [connectionState, setConnectionState] = useState('Initialisiere...');
  const [error, setError] = useState<string | null>(null);
  const [hasLocalStream, setHasLocalStream] = useState(false);
  
  // Synchronized stream management
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [videoElementsReady, setVideoElementsReady] = useState(false);

  const { consent, isFunctionalAllowed } = useCookieConsentContext();

  useEffect(() => {
    if (isOpen && chatId && userId) {
      // Prüfe zunächst ob funktionale Cookies erlaubt sind
      if (!isFunctionalAllowed()) {
        setError('Funktionale Cookies sind für Video-Anrufe erforderlich. Bitte akzeptieren Sie die Cookies in den Einstellungen.');
        return;
      }
      
      initializeCall();
    }

    return () => {
      cleanup();
    };
  }, [isOpen, chatId, userId, isFunctionalAllowed]);

  const initializeCall = async () => {
    try {
      videoService.current = new TaskiloVideoService();

      // Setup event handlers with synchronized stream management
      videoService.current.onLocalStream = (stream: MediaStream) => {
        console.log('🎥 [WEB_UI] ✅ RECEIVED LOCAL STREAM');
        console.log('🎥 [WEB_UI] Stream ID:', stream.id);
        console.log('🎥 [WEB_UI] Video tracks:', stream.getVideoTracks().length);
        console.log('🎥 [WEB_UI] Audio tracks:', stream.getAudioTracks().length);
        
        console.log('🔧 [DEBUG_STATE] Setting LOCAL STREAM states...');
        setLocalStream(stream);
        setIsCameraOn(stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled);
        setHasLocalStream(true);
        setConnectionState('Verbindet...'); // ✅ Update UI Status
        console.log('🔧 [DEBUG_STATE] LOCAL STREAM states set!');
      };

      videoService.current.onRemoteStream = (stream: MediaStream) => {
        console.log('🎥 [WEB_UI] ✅ RECEIVED REMOTE STREAM');
        console.log('🎥 [WEB_UI] Stream ID:', stream.id);
        console.log('🎥 [WEB_UI] Video tracks:', stream.getVideoTracks().length);
        console.log('🎥 [WEB_UI] Audio tracks:', stream.getAudioTracks().length);
        
        console.log('🔧 [DEBUG_STATE] FORCE SETTING ALL CONNECTION STATES...');
        setRemoteStream(stream);
        setIsConnected(true);
        setConnectionState('Verbunden'); // ✅ Setze Connection State wenn Remote Stream empfangen
        setError(null); // ✅ Clear any errors
        
        // 🚨 FORCE UI UPDATE durch setTimeout
        setTimeout(() => {
          console.log('🔧 [DEBUG_STATE] FORCE RE-RENDER triggered');
          setIsConnected(true); // Force re-render
        }, 100);
        
        console.log('🔧 [DEBUG_STATE] REMOTE STREAM states set - UI should update NOW!');
      };

      videoService.current.onCallEnded = () => {
        setIsConnected(false);
        setConnectionState('Anruf beendet');
        onClose();
      };

      videoService.current.onError = (errorMessage: string) => {
        setError(errorMessage);
        setConnectionState('Fehler');
      };

      // DSGVO-Consent ist bereits über Cookie-System abgedeckt
      // Kein zusätzliches Modal erforderlich
      videoService.current.onConsentRequired = async () => {
        // Direkt true zurückgeben, da Consent bereits über Cookie-System geprüft wurde
        return Promise.resolve(true);
      };

      // Start or join call
      const options = {
        chatId,
        userId,
        userName,
        userEmail,
      };

      if (isInitiator) {
        setConnectionState('Startet Anruf...');
        await videoService.current.startCall(options);
      } else {
        setConnectionState('Tritt Anruf bei...');
        await videoService.current.joinCall(options);
      }

      // ✅ Connection State wird jetzt über onRemoteStream gesetzt
    } catch (err) {
      setError(`Initialisierung fehlgeschlagen: ${err}`);
      setConnectionState('Fehler');
    }
  };

  // Synchronized video element management
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      console.log('🎥 [SYNC] Setting local stream to video element');
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.muted = true;
      localVideoRef.current.play().catch(console.warn);
    }
  }, [localStream]);
  
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      console.log('🎥 [SYNC] Setting remote stream to video element');
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(console.warn);
    }
  }, [remoteStream]);

  useEffect(() => {
    setVideoElementsReady(!!localVideoRef.current && !!remoteVideoRef.current);
  }, [localVideoRef.current, remoteVideoRef.current]);

  const cleanup = async () => {
    if (videoService.current) {
      await videoService.current.endCall();
      videoService.current = null;
    }
    setIsConnected(false);
    setHasLocalStream(false);
    setConnectionState('Getrennt');
    setError(null);
    setLocalStream(null);
    setRemoteStream(null);
  };

  const handleEndCall = async () => {
    await cleanup();
    onClose();
  };

  // Kein separates Consent-Modal mehr erforderlich - wird über Cookie-System abgewickelt

  const toggleCamera = async () => {
    if (videoService.current) {
      const enabled = videoService.current.toggleCamera();
      setIsCameraOn(enabled);
    }
  };

  const toggleMicrophone = async () => {
    if (videoService.current) {
      const enabled = videoService.current.toggleMicrophone();
      setIsMicOn(enabled);
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[95vw] h-[85vh] p-0">
        <DialogTitle className="sr-only">
          Taskilo Video-Gespräch mit {userName}
        </DialogTitle>
        
        <div className="flex flex-col h-full bg-gray-900 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gray-800 px-4 py-3 flex justify-between items-center">
            <div className="text-white">
              <h3 className="font-semibold">Video-Gespräch</h3>
              <p className="text-sm text-gray-300">
                {connectionState}
                {connectionState === 'Verbunden' && ' 🟢'}
                {connectionState === 'Verbindet...' && ' 🟡'}
                {connectionState === 'Fehler' && ' 🔴'}
              </p>
              {(connectionState === 'Verbindet...' || connectionState === 'Startet Anruf...' || connectionState === 'Tritt Anruf bei...') && (
                <p className="text-xs text-yellow-400 mt-1">
                  💡 Prüfe Browser-Konsole für detaillierte Logs
                </p>
              )}
            </div>
            {error && (
              <div className="text-red-400 text-sm bg-red-900/20 px-3 py-1 rounded">
                {error}
              </div>
            )}
          </div>

          {/* Video Area */}
          <div className="flex-1 relative bg-black">
            {/* Remote Video (Main) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              muted={false}
              controls={false}
              className={`w-full h-full object-cover ${
                (isConnected && remoteStream) ? 'block' : 'hidden'
              }`}
              onLoadedMetadata={() => {
                console.log('🎥 [WEB_UI] Remote video metadata loaded');
              }}
              onCanPlay={() => {
                console.log('🎥 [WEB_UI] Remote video can play');
              }}
              onPlay={() => {
                console.log('🎥 [WEB_UI] Remote video started playing');
              }}
              onError={(e) => {
                console.error('🎥 [WEB_UI] Remote video error:', e);
              }}
            />
            
            {/* Debug info for remote video */}
            {(isConnected && remoteStream) && (
              <div className="absolute bottom-4 left-4 text-sm text-white bg-black/50 px-2 py-1 rounded">
                Remote Video - Connected ✅
              </div>
            )}

            {/* Waiting State - NUR wenn kein Remote Stream */}
            {!remoteStream ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#14ad9f] mx-auto mb-4"></div>
                  <p className="text-lg">{connectionState}</p>
                  {isInitiator && (
                    <p className="text-sm text-gray-300 mt-2">
                      Warte auf den anderen Teilnehmer...
                    </p>
                  )}
                  {/* DEBUG INFO */}
                  <div className="text-xs text-gray-400 mt-2">
                    Debug: remoteStream={remoteStream ? 'YES' : 'NO'}, isConnected={isConnected ? 'YES' : 'NO'}
                  </div>
                </div>
              </div>
            ) : (
              // 🎥 REMOTE STREAM ACTIVE - SHOW CONNECTED STATE
              <div className="absolute bottom-4 left-4 text-sm text-white bg-green-600/80 px-3 py-2 rounded">
                🎥 VERBUNDEN - Remote Video läuft
              </div>
            )}

            {/* Local Video (Picture-in-Picture) - ALWAYS visible */}
            <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-600">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted={true}
                controls={false}
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }} /* Mirror effect for better UX */
                onLoadedMetadata={() => {
                  console.log('🎥 [WEB_UI] Local video metadata loaded');
                  if (localVideoRef.current) {
                    console.log('🎥 [WEB_UI] Local video dimensions:', {
                      videoWidth: localVideoRef.current.videoWidth,
                      videoHeight: localVideoRef.current.videoHeight
                    });
                  }
                }}
                onCanPlay={() => {
                  console.log('🎥 [WEB_UI] Local video can play');
                }}
                onPlay={() => {
                  console.log('🎥 [WEB_UI] Local video started playing');
                }}
                onError={(e) => {
                  console.error('🎥 [WEB_UI] Local video error:', e);
                }}
                onLoadStart={() => {
                  console.log('🎥 [WEB_UI] Local video load started');
                }}
              />
              
              {/* Show placeholder only when no local stream */}
              {!localStream && (
                <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2"></div>
                    <div className="text-xs">Kamera lädt...</div>
                  </div>
                </div>
              )}
              
              {/* Show camera off when stream exists but camera is off */}
              {localStream && !isCameraOn && (
                <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
                  <VideoOff className="h-8 w-8 text-gray-400" />
                </div>
              )}
              
              {/* Debug info overlay */}
              <div className="absolute bottom-1 left-1 text-xs text-white bg-black/50 px-1 rounded">
                Local {hasLocalStream ? '✅' : '⏳'}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-gray-800 px-6 py-4">
            <div className="flex justify-center items-center space-x-4">
              {/* Camera Toggle */}
              <Button
                variant={isCameraOn ? "default" : "secondary"}
                size="lg"
                onClick={toggleCamera}
                className={`rounded-full w-12 h-12 p-0 ${
                  isCameraOn 
                    ? 'bg-gray-600 hover:bg-gray-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isCameraOn ? (
                  <Video className="h-5 w-5 text-white" />
                ) : (
                  <VideoOff className="h-5 w-5 text-white" />
                )}
              </Button>

              {/* Microphone Toggle */}
              <Button
                variant={isMicOn ? "default" : "secondary"}
                size="lg"
                onClick={toggleMicrophone}
                className={`rounded-full w-12 h-12 p-0 ${
                  isMicOn 
                    ? 'bg-gray-600 hover:bg-gray-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isMicOn ? (
                  <Mic className="h-5 w-5 text-white" />
                ) : (
                  <MicOff className="h-5 w-5 text-white" />
                )}
              </Button>

              {/* End Call */}
              <Button
                variant="destructive"
                size="lg"
                onClick={handleEndCall}
                className="rounded-full w-12 h-12 p-0 bg-red-600 hover:bg-red-700"
              >
                <PhoneOff className="h-5 w-5 text-white" />
              </Button>
            </div>

            {/* Connection Info */}
            <div className="text-center mt-3">
              <p className="text-xs text-gray-400">
                {videoService.current?.getConnectionState() || 'Nicht verbunden'}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* DSGVO Consent wird über das allgemeine Cookie-System abgewickelt */}
    </>
  );
};

export default TaskiloVideoCall;