import 'dart:async';
import 'package:flutter/material.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';

class TaskiloVideoService {
  static final TaskiloVideoService _instance = TaskiloVideoService._internal();
  factory TaskiloVideoService() => _instance;
  TaskiloVideoService._internal();

  // WebRTC objects
  RTCPeerConnection? _peerConnection;
  MediaStream? _localStream;
  MediaStream? _remoteStream;

  // Firebase Realtime Database
  final FirebaseDatabase _database = FirebaseDatabase.instance;
  DatabaseReference? _signalingRef;
  StreamSubscription<DatabaseEvent>? _responseListener;
  StreamSubscription<DatabaseEvent>? _signalingListener;

  // Call state
  bool _isInitiator = false;
  String? _currentChatId;
  String? _currentUserId;
  
  // Perfect Negotiation Pattern variables
  bool _isPolite = true;  // Flutter app is always polite (receiver)

  // Event callbacks
  Function(MediaStream)? onLocalStream;
  Function(MediaStream)? onRemoteStream;
  Function()? onCallEnded;
  Function(String)? onError;
  Function(String)? onStateChanged;

  /// Send video call request to company
  Future<void> sendCallRequest({
    required String chatId,
    required String userId,
    required String userName,
    required String companyId,
    String? userEmail,
  }) async {
    try {
      debugPrint('🟡 [VIDEO_SERVICE] Starting sendCallRequest');
      debugPrint('📋 [VIDEO_SERVICE] Parameters:');
      debugPrint('   - chatId: $chatId');
      debugPrint('   - userId: $userId');
      debugPrint('   - userName: $userName');
      debugPrint('   - companyId: $companyId');
      debugPrint('   - userEmail: ${userEmail ?? 'null'}');

      _currentChatId = chatId;
      _currentUserId = userId;

      // Generate unique request ID
      final requestId = '${chatId}_${DateTime.now().millisecondsSinceEpoch}';
      debugPrint('🆔 [VIDEO_SERVICE] Generated requestId: $requestId');

      // Send call request via Firebase Realtime Database (same path as Web)
      debugPrint(
        '🔥 [VIDEO_SERVICE] Getting Firebase Realtime Database reference',
      );
      final requestRef = _database.ref(
        'videoCalls/$chatId/requests/$requestId',
      );
      debugPrint(
        '📍 [VIDEO_SERVICE] Database path: videoCalls/$chatId/requests/$requestId',
      );

      final requestData = {
        'requestId': requestId,
        'requesterId': userId,
        'requesterName': userName,
        'companyId': companyId,
        'chatId': chatId,
        'timestamp': DateTime.now().millisecondsSinceEpoch,
        'status': 'pending',
        'fromUserEmail': userEmail ?? '',
        'type': 'request',
      };

      debugPrint('📝 [VIDEO_SERVICE] Request data to write:');
      requestData.forEach((key, value) => debugPrint('   $key: $value'));

      debugPrint('💾 [VIDEO_SERVICE] Writing to Firebase Realtime Database...');
      await requestRef.set(requestData);
      debugPrint('✅ [VIDEO_SERVICE] Data written successfully to Firebase');

      debugPrint('✅ Call request sent with ID: $requestId');
      onStateChanged?.call('Warte auf Genehmigung...');

      // Listen for response
      debugPrint('👂 [VIDEO_SERVICE] Starting to listen for response');
      _listenForCallResponse(requestId);
      debugPrint('🟢 [VIDEO_SERVICE] sendCallRequest completed successfully');
    } catch (e) {
      debugPrint('💥 [VIDEO_SERVICE] ERROR in sendCallRequest: $e');
      debugPrint('📊 [VIDEO_SERVICE] Error type: ${e.runtimeType}');
      _handleError('Fehler beim Senden der Anfrage', e);
    }
  }

  /// Listen for call request response
  void _listenForCallResponse(String requestId) {
    debugPrint('🟡 [RESPONSE_LISTENER] Starting _listenForCallResponse');
    debugPrint(
      '🆔 [RESPONSE_LISTENER] Listening for response to request: $requestId',
    );

    // Extract chatId from requestId (format: chatId_timestamp)
    final chatId = _currentChatId ?? requestId.split('_')[0];
    debugPrint(
      '📍 [RESPONSE_LISTENER] Database path: videoCalls/$chatId/requests/$requestId',
    );

    final requestRef = _database.ref('videoCalls/$chatId/requests/$requestId');

    // Cancel existing response listener if any
    _responseListener?.cancel();

    _responseListener = requestRef.onValue.listen(
      (DatabaseEvent event) {
        debugPrint('📨 [RESPONSE_LISTENER] Received database event');
        debugPrint('📋 [RESPONSE_LISTENER] Event type: ${event.type}');
        debugPrint(
          '🗂️ [RESPONSE_LISTENER] Snapshot exists: ${event.snapshot.exists}',
        );

        if (event.snapshot.exists) {
          final request = event.snapshot.value;
          debugPrint('📄 [RESPONSE_LISTENER] Raw snapshot value: $request');
          debugPrint(
            '📊 [RESPONSE_LISTENER] Value type: ${request.runtimeType}',
          );

          if (request is Map) {
            final requestMap = Map<String, dynamic>.from(request);
            final status = requestMap['status'] as String?;
            debugPrint('📨 [RESPONSE_LISTENER] Parsed status: $status');
            debugPrint('📋 [RESPONSE_LISTENER] Full request data:');
            requestMap.forEach((key, value) => debugPrint('   $key: $value'));

            if (status == 'approved') {
              debugPrint(
                '✅ [RESPONSE_LISTENER] Request approved - initializing call',
              );
              debugPrint(
                '📱 [RESPONSE_LISTENER] Role: RECEIVER (waiting for OFFER from Web-App)',
              );
              if (onStateChanged != null) {
                onStateChanged!('Anfrage genehmigt - Verbinde...');
              }
              _isInitiator = false; // Join as participant (RECEIVER)
              _initializeCall();
            } else if (status == 'rejected') {
              debugPrint('❌ [RESPONSE_LISTENER] Request rejected');
              if (onStateChanged != null) {
                onStateChanged!('Anfrage abgelehnt');
              }
              if (onError != null) {
                onError!('Die Video-Call-Anfrage wurde abgelehnt');
              }
            } else if (status == 'pending') {
              debugPrint('⏳ [RESPONSE_LISTENER] Request still pending');
            } else {
              debugPrint('❓ [RESPONSE_LISTENER] Unknown status: $status');
            }
          } else {
            debugPrint(
              '⚠️ [RESPONSE_LISTENER] Request data is not a Map: $request',
            );
          }
        } else {
          debugPrint(
            '📭 [RESPONSE_LISTENER] Snapshot does not exist (may be initial state)',
          );
        }
      },
      onError: (error) {
        debugPrint(
          '💥 [RESPONSE_LISTENER] Error listening for response: $error',
        );
        debugPrint('📊 [RESPONSE_LISTENER] Error type: ${error.runtimeType}');
        if (onError != null) {
          onError!('Fehler beim Warten auf Antwort: $error');
        }
      },
    );

    debugPrint('🟢 [RESPONSE_LISTENER] Listener setup completed');
  }

  /// Start a new video call as initiator (company)
  Future<void> startCall({
    required String chatId,
    required String userId,
    required String userName,
    String? userEmail,
  }) async {
    try {
      // CRITICAL FIX: Flutter is ALWAYS receiver (polite) regardless of who starts call
      _isInitiator = false;  // Flutter never initiates WebRTC negotiation
      _isPolite = true;      // Flutter is always polite (defers to Web)
      _currentChatId = chatId;
      _currentUserId = userId;

      debugPrint('🚀 Starting call as company...');
      debugPrint('🌐 [CRITICAL_FIX] Flutter ALWAYS acts as POLITE RECEIVER');
      debugPrint('🌐 [CRITICAL_FIX] Web will handle WebRTC negotiation initiation');
      onStateChanged?.call('Initialisiere Anruf...');

      // Set call as approved
      final responseRef = _database.ref('videoCalls/$chatId/response');
      await responseRef.set({
        'status': 'approved',
        'timestamp': DateTime.now().millisecondsSinceEpoch,
      });

      await _initializeCall();
      onStateChanged?.call('Warte auf Teilnehmer...');
    } catch (e) {
      _handleError('Fehler beim Starten des Anrufs', e);
    }
  }

  /// Approve video call request (company only)
  Future<void> approveCallRequest({
    required String chatId,
    required String userId,
    required String userName,
    String? userEmail,
  }) async {
    try {
      debugPrint('✅ Approving call request...');

      // Approve the request
      final responseRef = _database.ref('videoCalls/$chatId/response');
      await responseRef.set({
        'status': 'approved',
        'approvedBy': userId,
        'timestamp': DateTime.now().millisecondsSinceEpoch,
      });

      // Start the call as initiator
      await startCall(
        chatId: chatId,
        userId: userId,
        userName: userName,
        userEmail: userEmail,
      );
    } catch (e) {
      _handleError('Fehler beim Genehmigen der Anfrage', e);
    }
  }

  /// Reject video call request (company only)
  Future<void> rejectCallRequest(String chatId) async {
    try {
      debugPrint('❌ Rejecting call request...');

      final responseRef = _database.ref('videoCalls/$chatId/response');
      await responseRef.set({
        'status': 'rejected',
        'timestamp': DateTime.now().millisecondsSinceEpoch,
      });

      // Clean up request
      await _database.ref('videoCalls/$chatId/request').remove();
    } catch (e) {
      _handleError('Fehler beim Ablehnen der Anfrage', e);
    }
  }

  /// Listen for incoming call requests (company only)
  void listenForCallRequests(
    String chatId,
    Function(Map<dynamic, dynamic>) onRequest,
  ) {
    final requestRef = _database.ref('videoCalls/$chatId/request');
    requestRef.onValue.listen((DatabaseEvent event) {
      final request = event.snapshot.value as Map<dynamic, dynamic>?;

      if (request != null && request['status'] == 'pending') {
        debugPrint('📞 Incoming call request from: ${request['fromName']}');
        onRequest(request);
      }
    });
  }

  /// Join an existing video call (User sends request first)
  Future<void> joinCall({
    required String chatId,
    required String userId,
    required String userName,
    required String companyId,
    String? userEmail,
  }) async {
    try {
      // CRITICAL FIX: Flutter is ALWAYS receiver (polite) - consistent behavior
      _isInitiator = false;  // Flutter never initiates WebRTC negotiation
      _isPolite = true;      // Flutter is always polite (defers to Web)
      debugPrint('🟡 [JOIN_CALL] Starting joinCall for User (non-initiator)');
      debugPrint('🌐 [CRITICAL_FIX] Flutter ALWAYS acts as POLITE RECEIVER');

      // First, send the call request to the company
      await sendCallRequest(
        chatId: chatId,
        userId: userId,
        userName: userName,
        companyId: companyId,
        userEmail: userEmail,
      );

      // _listenForCallResponse will automatically call _initializeCall()
      // when the request is approved by the company
      debugPrint('✅ [JOIN_CALL] Call request sent, waiting for approval...');
    } catch (e) {
      debugPrint('💥 [JOIN_CALL] Error in joinCall: $e');
      _handleError('Fehler beim Senden der Anruf-Anfrage', e);
    }
  }

  /// Initialize the video call with proper sequencing
  Future<void> _initializeCall() async {
    try {
      debugPrint('🎥 [VIDEO_SERVICE] Initializing call with Perfect Negotiation');
      debugPrint('📋 [VIDEO_SERVICE] Role: isPolite = $_isPolite, isInitiator = $_isInitiator');
      
      debugPrint('🎥 [VIDEO_SERVICE] Requesting user media...');
      // Get user media with explicit constraints
      _localStream = await navigator.mediaDevices.getUserMedia({
        'video': {
          'facingMode': 'user', // Front camera
          'width': {'ideal': 640},
          'height': {'ideal': 480}
        },
        'audio': true,
      });

      debugPrint('✅ [VIDEO_SERVICE] Local stream obtained with:');
      debugPrint('   - Video tracks: ${_localStream!.getVideoTracks().length}');
      debugPrint('   - Audio tracks: ${_localStream!.getAudioTracks().length}');

      if (onLocalStream != null) {
        debugPrint('📤 [VIDEO_SERVICE] Calling onLocalStream callback...');
        onLocalStream!(_localStream!);
        debugPrint('✅ [VIDEO_SERVICE] Local stream sent to UI callback');
      } else {
        debugPrint('⚠️ [VIDEO_SERVICE] No onLocalStream callback set - this is a problem!');
      }
    } catch (e) {
      debugPrint('❌ [VIDEO_SERVICE] Failed to get user media: $e');
      _handleError('Fehler beim Zugriff auf Kamera/Mikrofon', e);
      return;
    }

    // Setup signaling
    await _setupSignaling();

    // Create peer connection
    await _createPeerConnection();

    // Add local stream tracks (Unified Plan compatible)
    if (_localStream != null) {
      for (final track in _localStream!.getTracks()) {
        await _peerConnection!.addTrack(track, _localStream!);
      }
    }

    // CRITICAL FIX: Flutter NEVER creates offers - always waits for Web
    debugPrint('📱 [FLUTTER] ALWAYS acting as RECEIVER - waiting for Web to initiate');
    debugPrint('📱 [FLUTTER] Perfect Negotiation: Flutter is POLITE (defers to Web)');
    debugPrint('📱 [FLUTTER] Web will send offer, Flutter will respond with answer');
    
    // Ensure Web app has time to initialize and send offer
    await Future.delayed(const Duration(milliseconds: 1000));
    debugPrint('📱 [FLUTTER] Ready to receive offers from Web caller');
  }

  /// Setup Firebase Realtime Database signaling
  Future<void> _setupSignaling() async {
    if (_currentChatId == null) return;

    _signalingRef = _database.ref('videoCalls/$_currentChatId/signals');
    debugPrint('🔥 Setting up signaling for chat: $_currentChatId');

    // Listen for incoming signals
    _signalingRef!.onChildAdded.listen((DatabaseEvent event) {
      final signal = event.snapshot.value as Map<dynamic, dynamic>?;
      final signalKey = event.snapshot.key;

      debugPrint(
        '📨 Received signal: ${signal?['type']} from ${signal?['from']}',
      );

      if (signal != null &&
          signalKey != null &&
          signal['from'] != null &&
          signal['from'] != _currentUserId &&
          signal['type'] != null) {
        debugPrint('✅ Processing signal: ${signal['type']}');
        _processSignal(signal, signalKey);
      } else {
        debugPrint('❌ Invalid signal received or own signal, ignoring');
      }
    });
  }

  /// Create WebRTC peer connection
  Future<void> _createPeerConnection() async {
    final configuration = <String, dynamic>{
      'iceServers': [
        {'urls': 'stun:stun.l.google.com:19302'},
        {'urls': 'stun:stun1.l.google.com:19302'},
        {'urls': 'stun:stun2.l.google.com:19302'},
        {'urls': 'stun:stun3.l.google.com:19302'},
        {'urls': 'stun:stun4.l.google.com:19302'},
      ],
      'sdpSemantics': 'unified-plan',
      'iceCandidatePoolSize': 10,
    };

    _peerConnection = await createPeerConnection(configuration);

    // Setup event handlers
    _peerConnection!.onIceCandidate = (RTCIceCandidate candidate) {
      debugPrint('🧊 Generated ICE candidate: ${candidate.candidate}');
      _sendSignal({
        'type': 'ice-candidate',
        'candidate': candidate.toMap(),
        'from': _currentUserId,
        'timestamp': DateTime.now().millisecondsSinceEpoch,
      });
    };

    _peerConnection!.onTrack = (RTCTrackEvent event) {
      if (event.streams.isNotEmpty) {
        _remoteStream = event.streams.first;
        onRemoteStream?.call(_remoteStream!);
        onStateChanged?.call('Verbunden');
      }
    };

    _peerConnection!.onIceConnectionState = (RTCIceConnectionState state) {
      debugPrint('🔗 ICE Connection State: $state');
      onStateChanged?.call(
        'Verbindungsstatus: ${state.toString().split('.').last}',
      );

      if (state == RTCIceConnectionState.RTCIceConnectionStateConnected) {
        onStateChanged?.call('Verbunden!');
      } else if (state ==
              RTCIceConnectionState.RTCIceConnectionStateDisconnected ||
          state == RTCIceConnectionState.RTCIceConnectionStateClosed) {
        endCall();
      }
    };

    _peerConnection!.onConnectionState = (RTCPeerConnectionState state) {
      debugPrint('🔄 Peer Connection State: $state');
    };

    _peerConnection!.onSignalingState = (RTCSignalingState state) {
      debugPrint('📡 Signaling State: $state');
    };
  }



  /// Process incoming signaling data
  Future<void> _processSignal(
    Map<dynamic, dynamic> signal,
    String signalId,
  ) async {
    if (_peerConnection == null) return;

    try {
      final type = signal['type'] as String?;
      if (type == null) {
        debugPrint('Signal type is null, skipping');
        return;
      }

      if (type == 'offer') {
        // Flutter as pure receiver - always accepts offers from Web
        debugPrint('📥 [FLUTTER] 🔥 Receiving OFFER from Web');
        debugPrint('📥 [FLUTTER] Role: PURE RECEIVER (always accepts offers)');
        debugPrint('📥 [FLUTTER] Will create and send answer');
        
        final offerData = signal['offer'] as Map<dynamic, dynamic>?;
        if (offerData == null ||
            offerData['sdp'] == null ||
            offerData['type'] == null) {
          debugPrint('❌ Offer data is incomplete, skipping');
          return;
        }

        final offer = RTCSessionDescription(
          offerData['sdp'] as String,
          offerData['type'] as String,
        );
        await _peerConnection!.setRemoteDescription(offer);
        debugPrint('✅ Remote description set (offer)');

        final answer = await _peerConnection!.createAnswer();
        await _peerConnection!.setLocalDescription(answer);
        debugPrint('✅ Local description set (answer)');

        await _sendSignal({
          'type': 'answer',
          'answer': answer.toMap(),
          'from': _currentUserId,
          'timestamp': DateTime.now().millisecondsSinceEpoch,
        });
        debugPrint('📤 [FLUTTER] 🎉 ANSWER sent to Web-App CALLER!');
      } else if (type == 'answer' && _isInitiator) {
        // Receive answer
        debugPrint('📥 Receiving answer...');
        final answerData = signal['answer'] as Map<dynamic, dynamic>?;
        if (answerData == null ||
            answerData['sdp'] == null ||
            answerData['type'] == null) {
          debugPrint('❌ Answer data is incomplete, skipping');
          return;
        }

        final answer = RTCSessionDescription(
          answerData['sdp'] as String,
          answerData['type'] as String,
        );
        await _peerConnection!.setRemoteDescription(answer);
        debugPrint('✅ Remote description set (answer)');
      } else if (type == 'ice-candidate') {
        // Add ICE candidate
        debugPrint('🧊 Receiving ICE candidate...');
        final candidateMap = signal['candidate'] as Map<dynamic, dynamic>?;
        if (candidateMap == null ||
            candidateMap['candidate'] == null ||
            candidateMap['sdpMid'] == null ||
            candidateMap['sdpMLineIndex'] == null) {
          debugPrint('❌ ICE candidate data is incomplete, skipping');
          return;
        }

        final candidate = RTCIceCandidate(
          candidateMap['candidate'] as String,
          candidateMap['sdpMid'] as String?,
          candidateMap['sdpMLineIndex'] as int,
        );
        await _peerConnection!.addCandidate(candidate);
        debugPrint('✅ ICE candidate added');
      }

      // Remove processed signal
      await _signalingRef!.child(signalId).remove();
    } catch (e) {
      debugPrint('Error processing signal: $e');
    }
  }

  /// Send signaling data via Firebase
  Future<void> _sendSignal(Map<String, dynamic> signal) async {
    if (_signalingRef == null) {
      debugPrint('❌ Cannot send signal: signalingRef is null');
      return;
    }

    try {
      debugPrint('📤 Sending signal: ${signal['type']}');
      await _signalingRef!.push().set(signal);
      debugPrint('✅ Signal sent successfully');
    } catch (e) {
      debugPrint('❌ Error sending signal: $e');
      onError?.call('Fehler beim Senden des Signals: $e');
    }
  }

  /// Cleanup all listeners and callbacks
  void cleanup() {
    debugPrint('🧹 [CLEANUP] Canceling all listeners and clearing callbacks');

    // Cancel Firebase listeners
    _responseListener?.cancel();
    _responseListener = null;

    _signalingListener?.cancel();
    _signalingListener = null;

    // Clear all callbacks to prevent setState after dispose
    onLocalStream = null;
    onRemoteStream = null;
    onCallEnded = null;
    onError = null;
    onStateChanged = null;

    debugPrint('✅ [CLEANUP] All listeners and callbacks cleared');
  }

  /// End the video call
  Future<void> endCall() async {
    try {
      debugPrint('🛑 [END_CALL] Starting call termination...');

      // Close peer connection first
      if (_peerConnection != null) {
        debugPrint('🔌 [END_CALL] Closing peer connection...');
        await _peerConnection?.close();
        _peerConnection = null;
        debugPrint('✅ [END_CALL] Peer connection closed');
      }

      // Stop and dispose local stream
      if (_localStream != null) {
        debugPrint('📹 [END_CALL] Stopping local stream tracks...');
        _localStream?.getTracks().forEach((track) {
          debugPrint('⏹️ [END_CALL] Stopping track: ${track.kind}');
          track.stop();
        });
        _localStream?.dispose();
        _localStream = null;
        debugPrint('✅ [END_CALL] Local stream disposed');
      }

      // Clean up remote stream
      if (_remoteStream != null) {
        debugPrint('📺 [END_CALL] Disposing remote stream...');
        _remoteStream?.dispose();
        _remoteStream = null;
        debugPrint('✅ [END_CALL] Remote stream disposed');
      }

      // Clean up signaling
      if (_signalingRef != null && _currentChatId != null) {
        debugPrint('🗑️ [END_CALL] Removing signaling data...');
        await _database.ref('videoCalls/$_currentChatId').remove();
        _signalingRef = null;
        debugPrint('✅ [END_CALL] Signaling data removed');
      }

      // Cancel all listeners and clear callbacks
      debugPrint('🧹 [END_CALL] Cleaning up listeners...');
      cleanup();

      // Reset state
      _currentChatId = null;
      _currentUserId = null;
      _isInitiator = false;

      debugPrint('🟢 [END_CALL] Call termination completed successfully');
    } catch (e) {
      debugPrint('❌ [END_CALL] Error ending call: $e');
      debugPrint('📊 [END_CALL] Error type: ${e.runtimeType}');
    }
  }

  /// Toggle camera on/off
  Future<bool> toggleCamera() async {
    if (_localStream == null) return false;

    final videoTracks = _localStream!.getVideoTracks();
    if (videoTracks.isNotEmpty) {
      final enabled = !videoTracks.first.enabled;
      videoTracks.first.enabled = enabled;
      return enabled;
    }
    return false;
  }

  /// Toggle microphone on/off
  Future<bool> toggleMicrophone() async {
    if (_localStream == null) return false;

    final audioTracks = _localStream!.getAudioTracks();
    if (audioTracks.isNotEmpty) {
      final enabled = !audioTracks.first.enabled;
      audioTracks.first.enabled = enabled;
      return enabled;
    }
    return false;
  }

  /// Switch camera (front/back)
  Future<void> switchCamera() async {
    if (_localStream == null) return;

    final videoTracks = _localStream!.getVideoTracks();
    if (videoTracks.isNotEmpty) {
      await Helper.switchCamera(videoTracks.first);
    }
  }

  /// Handle errors
  void _handleError(String message, dynamic error) {
    debugPrint('$message: $error');
    onError?.call('$message: ${error.toString()}');
  }

  /// Check if call is active
  bool isCallActive() {
    return _peerConnection != null;
  }

  /// Get current connection state
  String getConnectionState() {
    if (_peerConnection == null) return 'disconnected';
    return _peerConnection!.connectionState?.toString() ?? 'unknown';
  }

  /// Get local stream for UI
  MediaStream? get localStream => _localStream;

  /// Get remote stream for UI
  MediaStream? get remoteStream => _remoteStream;
}
