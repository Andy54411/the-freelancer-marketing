/**
 * DSGVO-konformer Video Call Hook
 * Integration von TaskiloVideoService mit React Components
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import TaskiloVideoService, { TaskiloVideoCallOptions } from '@/services/TaskiloVideoService';
import { hasFunctionalConsent } from '@/lib/gtm-dsgvo';

interface UseVideoCallOptions {
  chatId: string;
  userId: string;
  userName: string;
  userEmail?: string;
}

interface VideoCallState {
  isInitiating: boolean;
  isInCall: boolean;
  isConsentModalOpen: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  connectionState: string;
  error: string | null;
}

export function useVideoCall(options: UseVideoCallOptions) {
  const videoServiceRef = useRef<TaskiloVideoService | null>(null);
  
  const [state, setState] = useState<VideoCallState>({
    isInitiating: false,
    isInCall: false,
    isConsentModalOpen: false,
    localStream: null,
    remoteStream: null,
    connectionState: 'disconnected',
    error: null
  });

  // Initialize video service
  useEffect(() => {
    if (!videoServiceRef.current) {
      const videoService = new TaskiloVideoService();
      
      // Setup event handlers
      videoService.onLocalStream = (stream) => {
        setState(prev => ({ ...prev, localStream: stream }));
      };
      
      videoService.onRemoteStream = (stream) => {
        setState(prev => ({ ...prev, remoteStream: stream, isInCall: true }));
      };
      
      videoService.onCallEnded = () => {
        setState(prev => ({
          ...prev,
          isInCall: false,
          isInitiating: false,
          localStream: null,
          remoteStream: null,
          connectionState: 'disconnected'
        }));
      };
      
      videoService.onError = (error) => {
        setState(prev => ({ ...prev, error, isInitiating: false }));
      };
      
      // DSGVO-Consent Handler
      videoService.onConsentRequired = async () => {
        return new Promise((resolve) => {
          setState(prev => ({ ...prev, isConsentModalOpen: true }));
          
          // Store resolve function for later use
          (videoService as any)._consentResolve = resolve;
        });
      };
      
      videoServiceRef.current = videoService;
    }
    
    return () => {
      if (videoServiceRef.current) {
        videoServiceRef.current.endCall();
      }
    };
  }, []);

  // Start video call
  const startCall = useCallback(async () => {
    if (!videoServiceRef.current) return;
    
    // Pre-check: Functional consent required
    if (!hasFunctionalConsent()) {
      setState(prev => ({ 
        ...prev, 
        error: 'Funktionale Cookies sind für Video-Anrufe erforderlich. Bitte akzeptieren Sie die erforderlichen Cookies in den Einstellungen.' 
      }));
      return;
    }
    
    setState(prev => ({ 
      ...prev, 
      isInitiating: true, 
      error: null,
      connectionState: 'connecting'
    }));
    
    try {
      await videoServiceRef.current.startCall(options);
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isInitiating: false,
        connectionState: 'disconnected',
        error: error instanceof Error ? error.message : 'Unbekannter Fehler beim Starten des Video-Anrufs'
      }));
    }
  }, [options]);

  // Join video call
  const joinCall = useCallback(async () => {
    if (!videoServiceRef.current) return;
    
    setState(prev => ({ 
      ...prev, 
      isInitiating: true, 
      error: null,
      connectionState: 'connecting'
    }));
    
    try {
      await videoServiceRef.current.joinCall(options);
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isInitiating: false,
        connectionState: 'disconnected',
        error: error instanceof Error ? error.message : 'Fehler beim Beitreten des Video-Anrufs'
      }));
    }
  }, [options]);

  // End video call
  const endCall = useCallback(async () => {
    if (!videoServiceRef.current) return;
    
    await videoServiceRef.current.endCall();
  }, []);

  // Toggle camera
  const toggleCamera = useCallback(() => {
    if (!videoServiceRef.current) return;
    
    return videoServiceRef.current.toggleCamera();
  }, []);

  // Toggle microphone
  const toggleMicrophone = useCallback(() => {
    if (!videoServiceRef.current) return;
    
    return videoServiceRef.current.toggleMicrophone();
  }, []);

  // Handle consent modal response
  const handleConsentResponse = useCallback((granted: boolean) => {
    setState(prev => ({ ...prev, isConsentModalOpen: false }));
    
    if (videoServiceRef.current && (videoServiceRef.current as any)._consentResolve) {
      (videoServiceRef.current as any)._consentResolve(granted);
      delete (videoServiceRef.current as any)._consentResolve;
    }
    
    if (!granted) {
      setState(prev => ({ 
        ...prev, 
        isInitiating: false,
        connectionState: 'disconnected',
        error: 'Video-Anruf wurde abgebrochen - DSGVO-Zustimmung verweigert'
      }));
    }
  }, []);

  // Get current connection state
  const getConnectionState = useCallback(() => {
    if (!videoServiceRef.current) return 'disconnected';
    return videoServiceRef.current.getConnectionState();
  }, []);

  // Check if call is active
  const isCallActive = useCallback(() => {
    if (!videoServiceRef.current) return false;
    return videoServiceRef.current.isCallActive();
  }, []);

  return {
    // State
    ...state,
    
    // Actions
    startCall,
    joinCall,
    endCall,
    toggleCamera,
    toggleMicrophone,
    handleConsentResponse,
    
    // Utilities
    getConnectionState,
    isCallActive,
    
    // Service reference (for advanced usage)
    videoService: videoServiceRef.current
  };
}