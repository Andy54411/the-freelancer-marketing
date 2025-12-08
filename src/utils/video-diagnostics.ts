/**
 * Video Call Diagnostic System
 * Helps identify connection issues and provides troubleshooting info
 */

export interface VideoCallDiagnostics {
  timestamp: number;
  role: 'caller' | 'receiver';
  chatId: string;
  connectionState: string;
  hasLocalStream: boolean;
  hasPeer: boolean;
  peerConnected: boolean;
  signalsSent: number;
  signalsReceived: number;
  errors: string[];
  suggestions: string[];
}

export class VideoCallDiagnosticCollector {
  private static instance: VideoCallDiagnosticCollector;
  private diagnostics: VideoCallDiagnostics[] = [];
  private currentSession: Partial<VideoCallDiagnostics> = {};

  static getInstance(): VideoCallDiagnosticCollector {
    if (!VideoCallDiagnosticCollector.instance) {
      VideoCallDiagnosticCollector.instance = new VideoCallDiagnosticCollector();
    }
    return VideoCallDiagnosticCollector.instance;
  }

  startSession(role: 'caller' | 'receiver', chatId: string): void {
    this.currentSession = {
      timestamp: Date.now(),
      role,
      chatId,
      connectionState: 'starting',
      hasLocalStream: false,
      hasPeer: false,
      peerConnected: false,
      signalsSent: 0,
      signalsReceived: 0,
      errors: [],
      suggestions: []
    };

    console.log('🔍 [DIAGNOSTICS] Session started:', {
      role,
      chatId,
      timestamp: new Date().toLocaleTimeString()
    });
  }

  updateState(updates: Partial<VideoCallDiagnostics>): void {
    this.currentSession = { ...this.currentSession, ...updates };
    
    // Auto-generate suggestions based on current state
    this.generateSuggestions();
  }

  recordSignalSent(): void {
    this.currentSession.signalsSent = (this.currentSession.signalsSent || 0) + 1;
    console.log('📤 [DIAGNOSTICS] Signal sent, total:', this.currentSession.signalsSent);
  }

  recordSignalReceived(): void {
    this.currentSession.signalsReceived = (this.currentSession.signalsReceived || 0) + 1;
    console.log('📥 [DIAGNOSTICS] Signal received, total:', this.currentSession.signalsReceived);
  }

  recordError(error: string): void {
    if (!this.currentSession.errors) this.currentSession.errors = [];
    this.currentSession.errors.push(error);
    console.error('❌ [DIAGNOSTICS] Error recorded:', error);
    this.generateSuggestions();
  }

  private generateSuggestions(): void {
    const suggestions: string[] = [];
    const session = this.currentSession;

    // No local stream
    if (!session.hasLocalStream) {
      suggestions.push('Kamera/Mikrofon-Berechtigung prüfen');
      suggestions.push('Browser-Berechtigungen überprüfen');
    }

    // No peer connection
    if (!session.hasPeer) {
      suggestions.push('WebRTC-Unterstützung im Browser prüfen');
    }

    // Signals not flowing
    if (session.role === 'caller' && (session.signalsSent || 0) === 0) {
      suggestions.push('Offer-Signal wird nicht generiert - WebRTC Problem');
    }

    if (session.role === 'receiver' && (session.signalsReceived || 0) === 0) {
      suggestions.push('Keine Offers empfangen - andere Person ist offline oder hat nicht approved');
    }

    if (session.role === 'caller' && (session.signalsSent || 0) > 0 && (session.signalsReceived || 0) === 0) {
      suggestions.push('🚨 HAUPTPROBLEM: Offer gesendet, aber keine Answer empfangen');
      suggestions.push('→ Andere Person ist nicht online oder hat Call nicht approved');
      suggestions.push('→ Netzwerk/Firewall blockiert Verbindung');
      suggestions.push('→ Andere App (Flutter) hat Fehler beim Answer generieren');
    }

    // Connection timeout
    const elapsed = Date.now() - (session.timestamp || 0);
    if (elapsed > 30000 && !session.peerConnected) {
      suggestions.push('Verbindungs-Timeout - möglicherweise Netzwerk-/NAT-Problem');
      suggestions.push('STUN/TURN Server könnten benötigt werden');
    }

    this.currentSession.suggestions = suggestions;
  }

  endSession(): VideoCallDiagnostics {
    const finalDiagnostics = { ...this.currentSession } as VideoCallDiagnostics;
    this.diagnostics.push(finalDiagnostics);
    
    // Print comprehensive diagnostic report
    this.printDiagnosticReport(finalDiagnostics);
    
    return finalDiagnostics;
  }

  private printDiagnosticReport(diagnostics: VideoCallDiagnostics): void {
    console.log('\n🔍 [DIAGNOSTIC REPORT] =================================');
    console.log('📅 Timestamp:', new Date(diagnostics.timestamp).toLocaleString());
    console.log('👤 Role:', diagnostics.role?.toUpperCase());
    console.log('💬 Chat ID:', diagnostics.chatId);
    console.log('🔗 Connection State:', diagnostics.connectionState);
    console.log('📹 Local Stream:', diagnostics.hasLocalStream ? '✅' : '❌');
    console.log('🤝 Peer Created:', diagnostics.hasPeer ? '✅' : '❌');
    console.log('🔗 Peer Connected:', diagnostics.peerConnected ? '✅' : '❌');
    console.log('📤 Signals Sent:', diagnostics.signalsSent);
    console.log('📥 Signals Received:', diagnostics.signalsReceived);
    
    if (diagnostics.errors?.length) {
      console.log('❌ Errors:');
      diagnostics.errors.forEach(error => console.log('   -', error));
    }
    
    if (diagnostics.suggestions?.length) {
      console.log('💡 Suggestions:');
      diagnostics.suggestions.forEach(suggestion => console.log('   -', suggestion));
    }
    
    console.log('================================================\n');
  }

  getCurrentDiagnostics(): Partial<VideoCallDiagnostics> {
    return { ...this.currentSession };
  }

  getLastDiagnostics(): VideoCallDiagnostics | null {
    return this.diagnostics[this.diagnostics.length - 1] || null;
  }

  getAllDiagnostics(): VideoCallDiagnostics[] {
    return [...this.diagnostics];
  }
}

// Export singleton instance
export const videoDiagnostics = VideoCallDiagnosticCollector.getInstance();