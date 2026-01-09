/**
 * DSGVO-konforme Taskilo Video Service - Native WebRTC Implementation
 * Uses Firebase Realtime Database for signaling with End-to-End encryption
 * Compliant with GDPR/DSGVO requirements
 */

import { app } from '@/firebase/clients';
import { getDatabase, ref, onValue, push, set, update, off, remove, child } from 'firebase/database';
import SimplePeer from 'simple-peer';
import { TaskiloCrypto } from '@/utils/crypto';
import { videoDiagnostics } from '@/utils/video-diagnostics';
import { hasFunctionalConsent } from '@/lib/gtm-dsgvo';

// Get Firebase Realtime Database instance explicitly from the initialized app
const rtdb = getDatabase(app);

// Singleton instance to prevent multiple video calls
let activeVideoCallInstance: TaskiloVideoService | null = null;

export interface TaskiloVideoCallOptions {
  chatId: string;
  userId: string;
  userName: string;
  userEmail?: string;
}

export interface SignalingData {
  type: 'offer' | 'answer' | 'ice-candidate' | 'unknown';
  data?: any;
  offer?: any;
  answer?: any;
  candidate?: any;
  from: string;
  timestamp: number;
  encrypted?: boolean; // DSGVO: Verschlüsselte Signaling-Daten
}

interface DSGVOConsentData {
  dataProcessingConsent: boolean;
  videoRecordingConsent: boolean;
  euProcessingConsent: boolean;
  consentTimestamp: number;
  encryptionKey?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface VideoCallRequest {
  requestId: string;
  requesterId: string;
  requesterName: string;
  companyId: string;
  chatId: string;
  timestamp: number;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  message?: string;
  approvedAt?: number;
  fromUserEmail?: string;
  type?: string;
}

export interface VideoCallRequestListener {
  (request: VideoCallRequest): void;
}

export class TaskiloVideoService {
  private peer: any | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private signalingRef: any = null;
  private requestRef: any = null;
  private requestListeners: any[] = [];
  private isInitiator: boolean = false;
  private callStartTime: number = 0;
  private processedSignals = new Set<string>();
  
  // Perfect Negotiation Pattern variables
  private isPolite: boolean = false;
  private makingOffer: boolean = false;
  private ignoreOffer: boolean = false;
  
  // Call identification
  public chatId?: string;
  
  // DSGVO-konforme Eigenschaften
  private encryptionKey?: string; // E2E-Verschlüsselungsschlüssel
  private consentData?: DSGVOConsentData; // DSGVO-Consent-Daten
  private dsgsvoConsent?: DSGVOConsentData; // DSGVO-Consent-Daten (neue Struktur)
  private callStartTimestamp?: number; // Für automatische Löschung
  
  // Event callbacks
  public onLocalStream?: (stream: MediaStream) => void;
  public onRemoteStream?: (stream: MediaStream) => void;
  public onCallEnded?: () => void;
  public onError?: (error: string) => void;
  public onRequestReceived?: VideoCallRequestListener;
  public onConsentRequired?: () => Promise<boolean>; // DSGVO-Consent-Callback
  public onRequestStatusChange?: (status: string, message?: string) => void;
  /**
   * Start a new video call as initiator
   */
  async startCall(options: TaskiloVideoCallOptions): Promise<void> {
    try {
      videoDiagnostics.startSession('caller', options.chatId);
      this.isInitiator = true;
      this.isPolite = false; // Caller is impolite (priority in negotiation)
      console.log('🌐 [PERFECT_NEG] Web-App is IMPOLITE CALLER (has negotiation priority)');
      await this.initializeCall(options);
    } catch (error) {
      videoDiagnostics.recordError(`Start call failed: ${error}`);
      this.handleError('Fehler beim Starten des Anrufs', error);
    }
  }

  /**
   * Join an existing video call
   */
  async joinCall(options: TaskiloVideoCallOptions): Promise<void> {
    try {
      videoDiagnostics.startSession('caller', options.chatId);  // Web is always caller
      // CRITICAL FIX: Web is ALWAYS initiator (impolite) regardless of join/start  
      this.isInitiator = true;   // Web always initiates WebRTC negotiation
      this.isPolite = false;     // Web is always impolite (has priority)
      console.log('🌐 [CRITICAL_FIX] Web ALWAYS acts as IMPOLITE INITIATOR');
      console.log('🌐 [CRITICAL_FIX] Will create and send OFFER to Flutter');
      await this.initializeCall(options);
    } catch (error) {
      videoDiagnostics.recordError(`Join call failed: ${error}`);
      this.handleError('Fehler beim Beitreten des Anrufs', error);
    }
  }

  /**
   * DSGVO-konforme Initialize the video call
   * Requires explicit user consent for video calls and data processing
   */
  private async initializeCall(options: TaskiloVideoCallOptions): Promise<void> {
    // Prevent multiple instances
    if (activeVideoCallInstance && activeVideoCallInstance !== this) {
      console.warn('🔒 [VIDEO_SERVICE] Preventing duplicate video call instance');
      console.warn('🔒 [VIDEO_SERVICE] Existing instance details:', {
        isActive: activeVideoCallInstance.isCallActive(),
        connectionState: activeVideoCallInstance.getConnectionState(),
        chatId: activeVideoCallInstance.chatId
      });
      console.warn('🔒 [VIDEO_SERVICE] New request details:', {
        chatId: options.chatId,
        userId: options.userId
      });
      
      // Check if it's the same call or a new one
      if (activeVideoCallInstance.chatId === options.chatId) {
        console.log('🔄 [VIDEO_SERVICE] Same chat ID - upgrading existing instance role');
        
        // If existing instance is waiting as RECEIVER, restart as INITIATOR
        if (!activeVideoCallInstance.isInitiator && this.isInitiator) {
          console.log('🔄 [CRITICAL_FIX] Restarting as INITIATOR for approved call');
          
          // End the existing RECEIVER instance cleanly
          await activeVideoCallInstance.endCall();
          activeVideoCallInstance = null;
          
          // Continue with INITIATOR initialization below
          console.log('🚀 [CRITICAL_FIX] Proceeding to create new INITIATOR instance');
        } else {
          // Same role, reuse existing instance
          console.log('🔄 [VIDEO_SERVICE] Same role, reusing existing instance');
          return;
        }
      } else {
        console.log('🆕 [VIDEO_SERVICE] Different chat ID - ending existing call and creating new one');
        await activeVideoCallInstance.endCall();
        activeVideoCallInstance = null;
      }
    }
    // Singleton pattern: Store reference to active instance
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    activeVideoCallInstance = this;
    
    // Set chat ID for instance tracking
    this.chatId = options.chatId;
    
    // 1. DSGVO-Consent-Prüfung
    console.log('🔐 [VIDEO_SERVICE] Starting DSGVO consent check...');
    const consentResult = await this.checkDSGVOConsent();
    if (!consentResult.success) {
      const errorMessage = consentResult.error || 'Video-Anrufe erfordern Ihre ausdrückliche Zustimmung zur Datenverarbeitung.';
      console.warn('⚠️ [DSGVO] Consent check failed:', errorMessage);
      this.handleError('DSGVO-Zustimmung erforderlich', errorMessage);
      return;
    }

    // Prevent multiple initialization
    if (this.peer) {
      console.warn('⚠️ [VIDEO_SERVICE] Call already initialized, skipping');
      return;
    }

    // 2. DSGVO-Daten setzen mit Verschlüsselungsschlüssel
    this.dsgsvoConsent = {
      dataProcessingConsent: true,
      videoRecordingConsent: true,
      euProcessingConsent: true,
      consentTimestamp: Date.now(),
      encryptionKey: TaskiloCrypto.generateChatKey(options.chatId, options.userId),
      userAgent: navigator.userAgent
    };

    // Legacy encryption key for compatibility
    this.encryptionKey = this.dsgsvoConsent.encryptionKey;
    this.callStartTimestamp = Date.now();

    this.callStartTime = Date.now();
    console.log('🕒 [VIDEO_SERVICE] Call start time:', this.callStartTime);

    // Get user media (camera + microphone)
    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });

    videoDiagnostics.updateState({ 
      hasLocalStream: !!this.localStream,
      connectionState: 'initializing' 
    });

    if (this.onLocalStream) {
      this.onLocalStream(this.localStream);
    }

    // Setup signaling
    this.setupSignaling(options.chatId, options.userId);

    // Create peer connection
    console.log('🔧 [WEBRTC] Creating SimplePeer with configuration:', {
      initiator: this.isInitiator,
      trickle: false,
      hasStream: !!this.localStream,
      role: this.isInitiator ? 'CALLER (will generate offer)' : 'RECEIVER (waits for offer)'
    });
    
    this.peer = new SimplePeer({
      initiator: this.isInitiator,
      trickle: false,
      stream: this.localStream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    });
    
    console.log('✅ [WEBRTC] SimplePeer created successfully as', this.isInitiator ? 'CALLER' : 'RECEIVER');

    videoDiagnostics.updateState({ 
      hasPeer: !!this.peer,
      connectionState: 'connecting' 
    });

    this.setupPeerEvents(options);
    
    // Start connection monitoring
    this.startConnectionMonitor();
  }

  /**
   * Setup Firebase Realtime Database signaling
   */
  private setupSignaling(chatId: string, userId: string): void {
    // Cleanup existing listener if any
    if (this.signalingRef) {
      off(this.signalingRef);
    }

    console.log('🔥 [SIGNALING] Setting up signaling for chat:', chatId);
    this.signalingRef = ref(rtdb, `videoCalls/${chatId}/signals`);

    // Listen for signals with improved deduplication
    onValue(this.signalingRef, (snapshot) => {
      const signals = snapshot.val();
      if (!signals) return;

      // Process only truly new signals
      Object.keys(signals).forEach(signalId => {
        // Skip if already processed
        if (this.processedSignals.has(signalId)) {
          return;
        }

        const signal: SignalingData = signals[signalId];
        
        // Don't process our own signals
        if (signal.from === userId) {
          this.processedSignals.add(signalId); // Mark to prevent future checks
          return;
        }

        console.log('📨 [SIGNALING] New signal received:', { type: signal.type, encrypted: signal.encrypted, id: signalId });

        // Mark as processed IMMEDIATELY before any async operations
        this.processedSignals.add(signalId);

        // Process the signal with additional safety check and decryption
        this.processSignalSafe(signal, signalId);
      });
    });
  }

  /**
   * Setup Peer Events
   */
  private setupPeerEvents(options: TaskiloVideoCallOptions): void {
    if (!this.peer) return;

    this.peer.on('signal', (data: any) => {
      console.log('📤 [WEBRTC] Generated local signal:', data.type || 'candidate');
      console.log('🔍 [WEBRTC] Signal details:', {
        type: data.type,
        hasCandidate: !!data.candidate,
        hasSdp: !!data.sdp,
        dataKeys: Object.keys(data)
      });
      
      const signal: any = {
        from: options.userId,
        timestamp: Date.now()
      };

      if (data.type === 'offer') {
        signal.type = 'offer';
        signal.offer = data;
      } else if (data.type === 'answer') {
        signal.type = 'answer';
        signal.answer = data;
      } else if (data.candidate || data.type === 'candidate') {
        signal.type = 'ice-candidate';
        signal.candidate = data;
      } else {
        // Fallback for other types if any
        signal.type = 'unknown';
        signal.data = data;
      }

      this.sendSignal(signal);
      videoDiagnostics.recordSignalSent();
      
      // Track offer sending for response monitoring
      if (data.type === 'offer') {
        this.makingOffer = true;
        console.log('📤 [WEBRTC] 🚨 OFFER SENT - Perfect Negotiation Active');
        console.log('📤 [WEBRTC] Chat ID:', this.chatId);
        console.log('📤 [WEBRTC] Role: isPolite =', this.isPolite, 'isInitiator =', this.isInitiator);
        console.log('📤 [WEBRTC] If no answer arrives within 30 seconds, check if Flutter app is online');
        
        // Reset negotiation state after sending
        setTimeout(() => {
          this.makingOffer = false;
          console.log('🔄 [WEBRTC] Reset makingOffer state');
        }, 100);
        
        // Monitor for missing answer
        setTimeout(() => {
          if (this.peer && !this.peer.connected) {
            console.warn('⚠️ [WEBRTC] 🔥 NO ANSWER RECEIVED after 30 seconds!');
            console.warn('⚠️ [WEBRTC] This usually means:');
            console.warn('   1. Other device is not online/connected');
            console.warn('   2. Other device has not approved the call');
            console.warn('   3. Network/firewall blocking connection');
            console.warn('   4. Other device failed to process the offer');
            console.warn('⚠️ [WEBRTC] Current state:', this.getConnectionState());
          }
        }, 30000);
      }
    });

    this.peer.on('stream', (stream: MediaStream) => {
      console.log('🎥 [WEBRTC] Received remote stream');
      this.remoteStream = stream;
      videoDiagnostics.updateState({ connectionState: 'streaming' });
      if (this.onRemoteStream) {
        this.onRemoteStream(stream);
      }
    });

    this.peer.on('connect', () => {
      console.log('✅ [WEBRTC] 🎉 PEER CONNECTION ESTABLISHED!');
      console.log('✅ [WEBRTC] Connection state:', this.getConnectionState());
      console.log('✅ [WEBRTC] Call duration:', Date.now() - this.callStartTime, 'ms');
      videoDiagnostics.updateState({ 
        peerConnected: true, 
        connectionState: 'connected' 
      });
    });

    this.peer.on('close', () => {
      console.log('🛑 [WEBRTC] Peer connection closed');
      console.log('🛑 [WEBRTC] Final connection state:', this.getConnectionState());
      console.log('🛑 [WEBRTC] Connection duration:', Date.now() - this.callStartTime, 'ms');
      console.log('🛑 [WEBRTC] Role:', this.isInitiator ? 'CALLER' : 'RECEIVER');
      
      // Check if we had a successful connection before closing
      if (this.remoteStream) {
        console.log('✅ [WEBRTC] Connection was successful - remote stream was received');
      } else {
        console.log('❌ [WEBRTC] Connection failed - no remote stream received');
      }
      
      this.endCall();
    });

    this.peer.on('error', (error: any) => {
      console.error('💥 [WEBRTC] Connection Error:', error);
      console.error('💥 [WEBRTC] Error details:', {
        code: error.code,
        message: error.message,
        type: typeof error,
        name: error.name,
        stack: error.stack,
        fullError: error
      });
      
      // Check if it's a user-initiated close (normal behavior)
      if (error.message && error.message.includes('User-Initiated Abort')) {
        console.log('ℹ️ [WEBRTC] Connection was closed by user - this is normal behavior');
        return; // Don't treat as error
      }
      
      // Check if connection was closed normally
      if (error.message && (error.message.includes('Close called') || error.message.includes('Connection closed'))) {
        console.log('ℹ️ [WEBRTC] Connection was closed normally');
        return; // Don't treat as error
      }
      
      // Only handle actual errors
      this.handleError('WebRTC Fehler', error);
    });
  }

  /**
   * Process incoming signaling data with safety checks
   */
  private processSignalSafe(signal: any, signalId: string): void {
    // Double-check: ensure signal hasn't been processed during async operations
    if (this.processedSignals.has(`processed_${signalId}`)) {
      console.log('⚠️ [SIGNALING] Signal processing already started, skipping:', signalId);
      return;
    }

    // Mark as processing started
    this.processedSignals.add(`processed_${signalId}`);

    this.processSignal(signal, signalId);
  }

  /**
   * Process incoming signaling data with DSGVO-compliant decryption
   */
  private async processSignal(signal: any, signalId: string): Promise<void> {
    if (!this.peer) {
      console.warn('⚠️ [SIGNALING] Received signal but peer is not initialized');
      return;
    }

    try {
      console.log('🔄 [SIGNALING] Processing incoming signal:', {
        signalId,
        encrypted: signal.encrypted,
        from: signal.from,
        timestamp: signal.timestamp,
        keys: Object.keys(signal)
      });
      
      // Entschlüssele Signal wenn verschlüsselt
      let decryptedSignal = signal;
      if (signal.encrypted && signal.data && this.encryptionKey) {
        console.log('🔐 [SIGNALING] Decrypting signal...');
        const decryptedData = await TaskiloCrypto.decrypt(signal.data, this.encryptionKey);
        const parsedData = JSON.parse(decryptedData);
        decryptedSignal = {
          ...signal,
          ...parsedData,
          encrypted: false
        };
        console.log('🔓 [SIGNALING] Signal decrypted successfully:', {
          type: decryptedSignal.type,
          hasOffer: !!decryptedSignal.offer,
          hasAnswer: !!decryptedSignal.answer,
          hasCandidate: !!decryptedSignal.candidate
        });
      } else {
        console.log('🔓 [SIGNALING] Processing unencrypted signal:', {
          type: decryptedSignal.type,
          hasData: !!decryptedSignal.data
        });
      }

      console.log('🔄 [SIGNALING] Processing signal type:', decryptedSignal.type);
      console.log('🔄 [SIGNALING] Current peer state:', {
        exists: !!this.peer,
        connected: this.peer?.connected,
        destroyed: this.peer?.destroyed,
        role: this.isInitiator ? 'CALLER' : 'RECEIVER'
      });
      
      if (decryptedSignal.type === 'offer' && decryptedSignal.offer) {
        console.log('📥 [WEBRTC] 🔥 Processing OFFER - Perfect Negotiation Check');
        console.log('📥 [WEBRTC] isPolite:', this.isPolite, 'makingOffer:', this.makingOffer);
        
        const offerCollision = this.makingOffer;
        this.ignoreOffer = !this.isPolite && offerCollision;
        
        if (this.ignoreOffer) {
          console.log('🚫 [WEBRTC] Ignoring offer due to collision (impolite peer)');
          return;
        }
        
        console.log('📥 [WEBRTC] Offer SDP length:', decryptedSignal.offer.sdp?.length || 0);
        this.peer.signal(decryptedSignal.offer);
        console.log('✅ [WEBRTC] Offer processed successfully');
      } else if (decryptedSignal.type === 'answer' && decryptedSignal.answer) {
        console.log('📥 [WEBRTC] 🎉 Processing ANSWER - Connection should establish!');
        console.log('📥 [WEBRTC] Answer SDP length:', decryptedSignal.answer.sdp?.length || 0);
        this.peer.signal(decryptedSignal.answer);
        console.log('✅ [WEBRTC] Answer processed successfully');
      } else if (decryptedSignal.type === 'ice-candidate' && decryptedSignal.candidate) {
        // Sanitize candidate object for simple-peer / RTCPeerConnection
        // Flutter sends extra fields that might confuse simple-peer or the browser
        const candidate = {
          candidate: decryptedSignal.candidate.candidate,
          sdpMid: decryptedSignal.candidate.sdpMid,
          sdpMLineIndex: decryptedSignal.candidate.sdpMLineIndex
        };
        console.log('🧊 [SIGNALING] Adding ICE candidate:', candidate);
        this.peer.signal({ candidate });
      } else if (decryptedSignal.data) {
        // Fallback for legacy/generic format
        console.log('📥 [WEBRTC] Processing generic signal');
        this.peer.signal(decryptedSignal.data);
      } else {
        console.warn('⚠️ [SIGNALING] Unknown signal format:', decryptedSignal);
      }

      // Remove processed signal
      console.log('🗑️ [SIGNALING] Signal processed successfully, removing from database');
      this.removeSignalFromDatabase(signalId);
    } catch (error) {
      console.error('❌ [SIGNALING] Error processing signal:', error);
      console.error('❌ [SIGNALING] Original signal:', JSON.stringify(signal, null, 2));
      videoDiagnostics.recordError(`Signal processing failed: ${error}`);
      // Still remove the signal even if processing failed to prevent loops
      this.removeSignalFromDatabase(signalId);
    }
  }

  /**
   * Remove signal from Firebase database
   */
  private removeSignalFromDatabase(signalId: string): void {
    if (this.signalingRef) {
      console.log('🗑️ [SIGNALING] Removing processed signal:', signalId);
      remove(child(this.signalingRef, signalId));
    }
  }

  /**
   * DSGVO-Consent-Prüfung für Video-Anrufe
   */
  private async checkDSGVOConsent(): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Development: Bypass functional consent check for localhost
      const isDevelopment = process.env.NODE_ENV === 'development' && 
                           typeof window !== 'undefined' && 
                           window.location.hostname === 'localhost';
      
      if (!isDevelopment && !hasFunctionalConsent()) {
        console.warn('⚠️ [DSGVO] Functional consent required for video calls');
        return {
          success: false,
          error: 'Funktionale Cookies müssen für Video-Anrufe aktiviert werden. Bitte akzeptieren Sie die erforderlichen Cookies in den Cookie-Einstellungen.'
        };
      }
      
      if (isDevelopment) {
        console.log('🔧 [DEV] Bypassing functional consent check in development mode');
      }

      // 2. Prüfe spezifische Video-Call-Zustimmung
      if (this.onConsentRequired) {
        console.log('🔐 [DSGVO] Requesting video call consent from user');
        const videoCallConsent = await this.onConsentRequired();
        if (!videoCallConsent) {
          console.warn('⚠️ [DSGVO] Video call consent denied by user');
          return {
            success: false,
            error: 'Video-Anruf wurde abgebrochen. Die DSGVO-Zustimmung zur Datenverarbeitung ist für Video-Anrufe erforderlich.'
          };
        }
        console.log('✅ [DSGVO] Video call consent granted by user');
      } else {
        console.log('ℹ️ [DSGVO] No consent callback configured - assuming consent granted');
      }

      // 3. Speichere Consent-Daten
      this.consentData = {
        dataProcessingConsent: true,
        videoRecordingConsent: true,
        euProcessingConsent: true,
        consentTimestamp: Date.now(),
        userAgent: navigator.userAgent,
        // IP-Adresse wird server-seitig erfasst für DSGVO-Compliance
      };

      console.log('✅ [DSGVO] All consent checks passed successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ [DSGVO] Error checking consent:', error);
      return {
        success: false,
        error: `Fehler bei der DSGVO-Prüfung: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      };
    }
  }

  /**
   * DSGVO-konforme Send encrypted signaling data via Firebase EU servers
   */
  private async sendSignal(signal: SignalingData): Promise<void> {
    if (!this.signalingRef) return;

    // Enforce DSGVO compliance
    if (!this.dsgsvoConsent || !this.dsgsvoConsent.dataProcessingConsent) {
      console.warn('⚠️ [DSGVO] Signal blocked - no data processing consent');
      return;
    }

    try {
      // TEMPORARY FIX: Disable encryption for video calls to fix null signal issue
      // TODO: Implement compatible encryption between Web and Flutter
      console.log('🔧 [DEBUG] Sending unencrypted signal for debugging - original signal:', signal);
      const signalToSend = signal;

      await push(this.signalingRef, signalToSend);
      
      // DSGVO-konformes Logging (keine personenbezogenen Daten)
      console.log('🔒 [SIGNALING] DSGVO-compliant signal sent:', { 
        type: signal.type, 
        timestamp: signal.timestamp,
        encrypted: !!this.dsgsvoConsent?.encryptionKey
      });
      console.log('🔍 [DEBUG] Actual signal sent to Firebase:', JSON.stringify(signalToSend, null, 2));
    } catch (error) {
      console.error('❌ [SIGNALING] Error sending DSGVO-compliant signal:', error);
      this.handleError('Verschlüsselungsfehler', 'Fehler beim Verschlüsseln der Signaling-Daten');
    }
  }

  /**
   * End the video call
   */
  async endCall(): Promise<void> {
    try {
      // Clear processed signals
      this.processedSignals.clear();

      // Close peer connection
      if (this.peer) {
        this.peer.destroy();
        this.peer = null;
      }

      // Stop local stream
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }

      // Clean up remote stream
      this.remoteStream = null;

      // DSGVO-konforme Datenbereinigung
      await this.performDSGVOCleanup();

      // Clear singleton instance
      if (activeVideoCallInstance === this) {
        activeVideoCallInstance = null;
      }

      if (this.onCallEnded) {
        this.onCallEnded();
      }
    } catch (error) {
      console.error('Error ending call:', error);
    }
  }

  /**
   * Manual cleanup method for DSGVO compliance
   */
  cleanup(): void {
    console.log('🧹 [DSGVO] Starting call data cleanup...');
    
    // Clean up WebRTC connection
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    
    // Clear singleton instance
    if (activeVideoCallInstance === this) {
      activeVideoCallInstance = null;
    }
    
    // Clear signal cache
    this.processedSignals.clear();
    console.log('✅ [DSGVO] Signal cache cleared');
    
    console.log('🟢 [DSGVO] Data cleanup completed successfully');
  }

  /**
   * Toggle camera on/off
   */
  toggleCamera(): boolean {
    if (!this.localStream) return false;

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      return videoTrack.enabled;
    }
    return false;
  }

  /**
   * Toggle microphone on/off
   */
  toggleMicrophone(): boolean {
    if (!this.localStream) return false;

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      return audioTrack.enabled;
    }
    return false;
  }

  /**
   * Get the local video stream
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Handle errors
   */
  private handleError(message: string, error: any): void {
    console.error(message, error);
    if (this.onError) {
      this.onError(`${message}: ${error.message || error}`);
    }
  }

  /**
   * Check if call is active
   */
  isCallActive(): boolean {
    return this.peer !== null && !this.peer.destroyed;
  }

  /**
   * Get current connection state
   */
  getConnectionState(): string {
    if (!this.peer) return 'disconnected';
    return this.peer.connected ? 'connected' : 'connecting';
  }

  /**
   * Monitor connection progress and detect issues
   */
  private startConnectionMonitor(): void {
    console.log('🔍 [MONITOR] Starting connection monitoring...');
    
    let checkCount = 0;
    const monitorInterval = setInterval(() => {
      checkCount++;
      
      if (this.peer?.connected) {
        console.log('✅ [MONITOR] Connection established successfully!');
        clearInterval(monitorInterval);
        return;
      }
      
      console.log(`🔍 [MONITOR] Check ${checkCount}/30 - Status:`, {
        hasPeer: !!this.peer,
        connected: this.peer?.connected,
        destroyed: this.peer?.destroyed,
        chatId: this.chatId,
        role: this.isInitiator ? 'CALLER' : 'RECEIVER'
      });
      
      if (checkCount >= 30) { // 30 seconds
        console.error('🚨 [MONITOR] CONNECTION FAILED - No connection after 30 seconds!');
        console.error('🚨 [MONITOR] Diagnostic information:');
        console.error('   - Role:', this.isInitiator ? 'CALLER (sends offer)' : 'RECEIVER (sends answer)');
        console.error('   - Chat ID:', this.chatId);
        console.error('   - Peer exists:', !!this.peer);
        console.error('   - Peer connected:', this.peer?.connected);
        console.error('   - Local stream:', !!this.localStream);
        
        if (this.isInitiator) {
          console.error('🚨 [MONITOR] As CALLER: Check if RECEIVER device is online and approved call');
        } else {
          console.error('🚨 [MONITOR] As RECEIVER: Check if CALLER is still waiting for connection');
        }
        
        clearInterval(monitorInterval);
      }
    }, 1000);
  }

  /**
   * 📞 Send video call request to company
   */
  async sendCallRequest(options: {
    chatId: string;
    companyId: string;
    requesterId: string;
    requesterName: string;
    message?: string;
  }): Promise<string> {
    try {
      console.log('🟡 [WEB_VIDEO_SERVICE] Starting sendCallRequest');
      console.log('📋 [WEB_VIDEO_SERVICE] Parameters:', options);

      const requestId = `request_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('🆔 [WEB_VIDEO_SERVICE] Generated requestId:', requestId);
      
      const requestRef = ref(rtdb, `videoCalls/${options.chatId}/requests/${requestId}`);
      console.log('📍 [WEB_VIDEO_SERVICE] Database path: videoCalls/' + options.chatId + '/requests/' + requestId);

      const requestData: VideoCallRequest = {
        requestId,
        requesterId: options.requesterId,
        requesterName: options.requesterName,
        companyId: options.companyId,
        chatId: options.chatId,
        timestamp: Date.now(),
        status: 'pending',
        message: options.message,
      };

      console.log('📝 [WEB_VIDEO_SERVICE] Request data to write:', requestData);
      console.log('💾 [WEB_VIDEO_SERVICE] Writing to Firebase Realtime Database...');

      await set(requestRef, requestData);
      console.log('✅ [WEB_VIDEO_SERVICE] Data written successfully to Firebase');
      console.log('🌐✅ Video call request sent successfully');

      // Listen for response
      this.listenForRequestResponse(requestId, options.chatId);

      return requestId;
    } catch (error) {
      console.error('🌐❌ Error sending video call request:', error);
      throw error;
    }
  }

  /**
   * 🏢 Listen for incoming video call requests (Company side)
   */
  listenForCallRequests(companyId: string, onRequest: VideoCallRequestListener, chatIds?: string[]): void {
    // Clean up existing listeners first
    this.stopListeningForRequests();

    console.log('🌐🏢 [LISTEN_REQUESTS] Starting listener for company:', companyId, 'ChatIDs count:', chatIds?.length);

    if (chatIds && chatIds.length > 0) {
      console.log('🌐🏢 [LISTEN_REQUESTS] Listening to specific chats:', chatIds);
      // Listen to specific chats (better for security rules)
      chatIds.forEach(chatId => {
        const requestsRef = ref(rtdb, `videoCalls/${chatId}/requests`);
        this.requestListeners.push(requestsRef); // Track listener
        
        onValue(requestsRef, (snapshot) => {
          console.log('🔥 [FIREBASE] Raw Firebase data received for chat:', chatId);
          const requests = snapshot.val();
          console.log('🔥 [FIREBASE] Requests data:', JSON.stringify(requests, null, 2));
          
          if (!requests) {
            console.log('🔥 [FIREBASE] No requests found for chat:', chatId);
            return;
          }

          console.log('🔥 [FIREBASE] Found', Object.keys(requests).length, 'requests');
          Object.keys(requests).forEach(requestId => {
            const request: VideoCallRequest = requests[requestId];
            console.log('🔥 [FIREBASE] Processing request:', requestId, ':', JSON.stringify(request, null, 2));
            
            // Ensure requestId is set (fix for legacy/malformed data)
            if (!request.requestId) {
              request.requestId = requestId;
            }
            
            // Debug log to see what we are finding
            // console.log(`🌐🏢 [LISTEN_DEBUG] Found request ${requestId} in chat ${chatId}. Status: ${request.status}`);

            console.log('🔍 [DEBUG] Processing request:', {
              requestId,
              chatId,
              requestCompanyId: request.companyId,
              targetCompanyId: companyId,
              status: request.status,
              hasRequestId: !!request.requestId,
              hasTimestamp: !!request.timestamp
            });
            
            if (request.companyId === companyId && request.status === 'pending') {
              console.log('✅ [MATCH] Request matches criteria - forwarding to notification handler');
              console.log('🌐🏢📞 [LISTEN_REQUESTS] New matching video call request received (Specific Chat):', request);
              console.log(`🌐🏢📞 [LISTEN_REQUESTS] ID: ${requestId} | Chat: ${chatId}`);
              
              // Ensure all required fields are present before calling callback
              const processedRequest = {
                ...request,
                requestId: request.requestId || requestId,
                timestamp: request.timestamp || Date.now()
              };
              
              console.log('📤 [CALLBACK] Sending processed request to notification component:', processedRequest);
              onRequest(processedRequest);
            } else {
              console.log('❌ [NO_MATCH] Request does not match criteria:', {
                companyMatch: request.companyId === companyId,
                statusMatch: request.status === 'pending'
              });
            }
          });
        }, (error) => {
           console.warn(`🌐🏢 [LISTEN_REQUESTS] Permission denied or error for chat ${chatId}:`, error.message);
        });
      });
    } else {
      console.warn('🌐🏢 [LISTEN_REQUESTS] No chatIds provided. Falling back to root listener (May fail due to permissions).');
      // Fallback: Try to listen to all requests (requires root read permission)
      const requestsRef = ref(rtdb, 'videoCalls');
      this.requestRef = requestsRef;
      
      onValue(requestsRef, (snapshot) => {
        console.log('🌐🏢 [LISTEN_REQUESTS] Received database update (Root)');
        const videoCalls = snapshot.val();
        
        if (!videoCalls) {
          console.log('🌐🏢 [LISTEN_REQUESTS] No video calls data found');
          return;
        }

        let foundRequests = 0;
        Object.keys(videoCalls).forEach(chatId => {
          const chatData = videoCalls[chatId];
          if (!chatData.requests) return;

          Object.keys(chatData.requests).forEach(requestId => {
            const request: VideoCallRequest = chatData.requests[requestId];
            
            // Ensure requestId is set (fix for legacy/malformed data)
            if (!request.requestId) {
              request.requestId = requestId;
            }
            
            if (request.companyId === companyId && request.status === 'pending') {
              console.log('🌐🏢📞 [LISTEN_REQUESTS] New matching video call request received:', request);
              console.log('🌐🏢📞 [LISTEN_REQUESTS] Request IDs:', JSON.stringify({ 
                requestId, 
                chatId, 
                requestChatId: request.chatId 
              }));
              onRequest(request);
              foundRequests++;
            }
          });
        });
        console.log(`🌐🏢 [LISTEN_REQUESTS] Processed update, found ${foundRequests} matching requests`);
      }, (error) => {
        console.error('🌐🏢 [LISTEN_REQUESTS] ROOT LISTENER FAILED (Likely Permission Denied):', error.message);
        console.warn('🌐🏢 [LISTEN_REQUESTS] Please provide chatIds to listen to specific paths.');
      });
    }
  }

  /**
   * 🏢✅ Approve video call request (Company side)
   */
  async approveCallRequest(chatId: string, requestId: string): Promise<void> {
    try {
      console.log('🌐🏢✅ [APPROVE] Approving video call request:', { chatId, requestId });
      console.log('🌐🏢✅ [APPROVE] IDs check:', JSON.stringify({ chatId, requestId }));

      const path = `videoCalls/${chatId}/requests/${requestId}`;
      console.log('🌐🏢✅ [APPROVE] Target path:', path);
      const requestRef = ref(rtdb, path);
      
      // Use update instead of set to avoid reading first and potential race conditions
      await update(requestRef, {
        status: 'approved',
        approvedAt: Date.now(),
      });

      console.log('🌐🏢✅ [APPROVE] Update command sent. Verifying...');
      
      // Verify the write
      const snapshot = await (await import('firebase/database')).get(requestRef);
      const val = snapshot.val();
      console.log('🌐🏢✅ [APPROVE] Verification read:', JSON.stringify(val));

      if (val && val.status === 'approved') {
        console.log('🌐🏢✅ [APPROVE] SUCCESS: Status is approved in DB');
      } else {
        console.error('🌐🏢❌ [APPROVE] FAILURE: Status is NOT approved in DB. Value:', val);
      }

    } catch (error) {
      console.error('🌐🏢❌ [APPROVE] Error approving video call request:', error);
      throw error;
    }
  }

  /**
   * 🏢❌ Reject video call request (Company side)
   */
  async rejectCallRequest(chatId: string, requestId: string, reason?: string): Promise<void> {
    try {
      console.log('🌐🏢❌ [REJECT] Rejecting video call request:', { chatId, requestId, reason });

      const requestRef = ref(rtdb, `videoCalls/${chatId}/requests/${requestId}`);
      
      await update(requestRef, {
        status: 'rejected',
        rejectedAt: Date.now(),
        rejectionReason: reason,
      });

      console.log('🌐🏢❌ [REJECT] Video call request rejected successfully in Firebase');
    } catch (error) {
      console.error('🌐🏢❌ [REJECT] Error rejecting video call request:', error);
      throw error;
    }
  }

  /**
   * 📞👂 Listen for request response (User side)
   */
  private listenForRequestResponse(requestId: string, chatId: string): void {
    const requestRef = ref(rtdb, `videoCalls/${chatId}/requests/${requestId}`);
    
    onValue(requestRef, (snapshot) => {
      const request = snapshot.val();
      if (!request) return;

      if (request.status === 'approved') {
        console.log('🌐📞✅ Video call request approved!');
        if (this.onRequestStatusChange) {
          this.onRequestStatusChange('approved', 'Video-Anruf wurde genehmigt');
        }
        // Clean up listener
        off(requestRef);
      } else if (request.status === 'rejected') {
        console.log('🌐📞❌ Video call request rejected:', request.rejectionReason);
        if (this.onRequestStatusChange) {
          this.onRequestStatusChange('rejected', request.rejectionReason || 'Video-Anruf wurde abgelehnt');
        }
        // Clean up listener
        off(requestRef);
      }
    });
  }

  /**
   * 🧹 Cleanup request listener
   */
  stopListeningForRequests(): void {
    if (this.requestRef) {
      off(this.requestRef);
      this.requestRef = null;
    }
    
    if (this.requestListeners.length > 0) {
      console.log(`🌐🏢 [LISTEN_REQUESTS] Cleaning up ${this.requestListeners.length} specific chat listeners`);
      this.requestListeners.forEach(ref => off(ref));
      this.requestListeners = [];
    }
  }

  /**
   * DSGVO-konforme Datenbereinigung nach Anruf
   */
  private async performDSGVOCleanup(): Promise<void> {
    try {
      console.log('🧹 [DSGVO] Starting call data cleanup...');

      // 1. Signaling-Daten löschen
      if (this.signalingRef) {
        off(this.signalingRef);
        await remove(this.signalingRef);
        this.signalingRef = null;
        console.log('✅ [DSGVO] Signaling data deleted');
      }

      // 2. Verschlüsselungsschlüssel löschen
      if (this.encryptionKey) {
        this.encryptionKey = undefined;
        console.log('✅ [DSGVO] Encryption keys cleared');
      }

      // 3. Consent-Daten löschen (außer Timestamp für Audit)
      if (this.consentData) {
        const auditLog = {
          consentTimestamp: this.consentData.consentTimestamp,
          callDuration: this.callStartTimestamp ? Date.now() - this.callStartTimestamp : 0
        };
        this.consentData = undefined;
        console.log('✅ [DSGVO] Personal data cleared, audit log retained:', auditLog);
      }

      // 4. Verarbeitete Signale löschen
      this.processedSignals.clear();
      console.log('✅ [DSGVO] Signal cache cleared');

      // 5. Timestamps zurücksetzen
      this.callStartTimestamp = undefined;
      this.callStartTime = 0;

      console.log('🟢 [DSGVO] Data cleanup completed successfully');
    } catch (error) {
      console.error('❌ [DSGVO] Error during cleanup:', error);
    }
  }


}

export default TaskiloVideoService;