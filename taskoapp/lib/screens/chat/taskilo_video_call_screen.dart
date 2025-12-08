import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import '../../services/taskilo_video_service.dart';

class TaskiloVideoCallScreen extends StatefulWidget {
  final String chatId;
  final String userId;
  final String userName;
  final String? userEmail;
  final String? companyId; // Required for users joining a call
  final bool isInitiator;

  const TaskiloVideoCallScreen({
    super.key,
    required this.chatId,
    required this.userId,
    required this.userName,
    this.userEmail,
    this.companyId,
    required this.isInitiator,
  });

  @override
  State<TaskiloVideoCallScreen> createState() => _TaskiloVideoCallScreenState();
}

class _TaskiloVideoCallScreenState extends State<TaskiloVideoCallScreen> {
  final TaskiloVideoService _videoService = TaskiloVideoService();
  final RTCVideoRenderer _localRenderer = RTCVideoRenderer();
  final RTCVideoRenderer _remoteRenderer = RTCVideoRenderer();

  bool _isConnected = false;
  bool _isCameraOn = true;
  bool _isMicOn = true;
  String _connectionState = 'Initialisiere...';
  String? _errorMessage;
  bool _isNavigating = false; // Guard to prevent multiple navigation calls

  @override
  void initState() {
    super.initState();
    _initializeRenderers();
    _setupVideoService();
    _startCall();
  }

  @override
  void dispose() {
    debugPrint('🧹 [SCREEN_DISPOSE] Starting TaskiloVideoCallScreen disposal');

    // End the call first (this handles the proper cleanup sequence)
    _videoService.endCall();
    debugPrint('✅ [SCREEN_DISPOSE] Video call ended');

    // Then clean up video renderers
    _localRenderer.dispose();
    _remoteRenderer.dispose();
    debugPrint('✅ [SCREEN_DISPOSE] Video renderers disposed');

    super.dispose();
    debugPrint('🟢 [SCREEN_DISPOSE] TaskiloVideoCallScreen disposal complete');
  }

  Future<void> _initializeRenderers() async {
    try {
      debugPrint('🔧 [SCREEN] Initializing video renderers...');
      await _localRenderer.initialize();
      await _remoteRenderer.initialize();
      debugPrint('✅ [SCREEN] Video renderers initialized successfully');
    } catch (e) {
      debugPrint('❌ [SCREEN] Failed to initialize renderers: $e');
    }
  }

  /// Safe navigation that prevents multiple calls
  void _safeNavigateBack() {
    if (_isNavigating || !mounted) return;

    _isNavigating = true;
    debugPrint('🚪 [SCREEN] Safe navigation back initiated');

    try {
      if (Navigator.of(context).canPop()) {
        Navigator.of(context).pop();
        debugPrint('✅ [SCREEN] Navigation completed successfully');
      } else {
        debugPrint('⚠️ [SCREEN] Cannot pop - no routes to pop');
      }
    } catch (e) {
      debugPrint('❌ [SCREEN] Navigation error: $e');
    }
  }

  void _setupVideoService() {
    _videoService.onLocalStream = (MediaStream stream) {
      debugPrint('📹 [SCREEN] Received local stream with ${stream.getVideoTracks().length} video tracks');
      if (mounted) {
        setState(() {
          _localRenderer.srcObject = stream;
          _isCameraOn = stream.getVideoTracks().isNotEmpty && 
                       stream.getVideoTracks().first.enabled;
          debugPrint('✅ [SCREEN] Local stream assigned to renderer, camera: $_isCameraOn');
        });
      }
    };

    _videoService.onRemoteStream = (MediaStream stream) {
      debugPrint('📺 [SCREEN] Received remote stream with ${stream.getVideoTracks().length} video tracks');
      if (mounted) {
        setState(() {
          _remoteRenderer.srcObject = stream;
          _isConnected = true;
          _connectionState = 'Verbunden';
          debugPrint('✅ [SCREEN] Remote stream assigned and connected!');
        });
      }
    };

    _videoService.onCallEnded = () {
      debugPrint('📱 [SCREEN] Call ended by service callback');
      if (mounted && !_isNavigating) {
        // Use a slight delay to ensure all cleanup is complete
        Future.microtask(() {
          _safeNavigateBack();
        });
      }
    };

    _videoService.onError = (String error) {
      if (mounted) {
        setState(() {
          _errorMessage = error;
          _connectionState = 'Fehler';
        });
      }
    };

    _videoService.onStateChanged = (String state) {
      if (mounted) {
        setState(() {
          _connectionState = state;
        });
      }
    };
  }

  Future<void> _startCall() async {
    try {
      if (widget.isInitiator) {
        await _videoService.startCall(
          chatId: widget.chatId,
          userId: widget.userId,
          userName: widget.userName,
          userEmail: widget.userEmail,
        );
      } else {
        if (widget.companyId == null) {
          throw Exception('Company ID is required for joining a call');
        }
        await _videoService.joinCall(
          chatId: widget.chatId,
          userId: widget.userId,
          userName: widget.userName,
          companyId: widget.companyId!,
          userEmail: widget.userEmail,
        );
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Fehler beim Starten des Anrufs: $e';
        _connectionState = 'Fehler';
      });
    }
  }

  Future<void> _endCall() async {
    debugPrint('📱 [SCREEN] User initiated call end');

    if (_isNavigating) {
      debugPrint('⚠️ [SCREEN] Already navigating, skipping end call');
      return;
    }

    try {
      // End the video call service
      await _videoService.endCall();
      debugPrint('✅ [SCREEN] Video service ended successfully');

      // Navigate back to previous screen
      _safeNavigateBack();
    } catch (e) {
      debugPrint('❌ [SCREEN] Error during call end: $e');
      // Even if there's an error, try to navigate back
      _safeNavigateBack();
    }
  }

  Future<void> _toggleCamera() async {
    final enabled = await _videoService.toggleCamera();
    setState(() {
      _isCameraOn = enabled;
    });
  }

  Future<void> _toggleMicrophone() async {
    final enabled = await _videoService.toggleMicrophone();
    setState(() {
      _isMicOn = enabled;
    });
  }

  Future<void> _switchCamera() async {
    await _videoService.switchCamera();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false, // We handle the navigation ourselves
      onPopInvokedWithResult: (didPop, result) async {
        if (!didPop && !_isNavigating) {
          debugPrint('📱 [SCREEN] Back button pressed - ending call');
          await _endCall();
        }
      },
      child: Scaffold(
        backgroundColor: Colors.black,
        appBar: AppBar(
          backgroundColor: Colors.black87,
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Taskilo Video-Call',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
              ),
              Text(
                _connectionState,
                style: TextStyle(color: Colors.white70, fontSize: 12),
              ),
            ],
          ),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: Colors.white),
            onPressed: _endCall,
          ),
          actions: [
            if (_errorMessage != null)
              Padding(
                padding: const EdgeInsets.only(right: 16.0),
                child: Center(
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.red.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      'Fehler',
                      style: TextStyle(color: Colors.red[300], fontSize: 12),
                    ),
                  ),
                ),
              ),
          ],
        ),
        body: Stack(
          children: [
            // Remote Video (Main)
            SizedBox(
              width: double.infinity,
              height: double.infinity,
              child: _isConnected
                  ? RTCVideoView(
                      _remoteRenderer,
                      objectFit:
                          RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
                    )
                  : ColoredBox(
                      color: Colors.black,
                      child: Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            CircularProgressIndicator(
                              color: const Color(0xFF14AD9F),
                            ),
                            const SizedBox(height: 20),
                            Text(
                              _connectionState,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 18,
                              ),
                            ),
                            if (widget.isInitiator && !_isConnected) ...[
                              const SizedBox(height: 10),
                              const Text(
                                'Warte auf den anderen Teilnehmer...',
                                style: TextStyle(
                                  color: Colors.white70,
                                  fontSize: 14,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
            ),

            // Local Video (Picture-in-Picture)
            Positioned(
              top: 20,
              right: 20,
              child: Container(
                width: 120,
                height: 160,
                decoration: BoxDecoration(
                  color: Colors.black54,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white24, width: 2),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: _localRenderer.srcObject != null && _isCameraOn
                      ? RTCVideoView(
                          _localRenderer,
                          mirror: true,
                          objectFit:
                              RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
                        )
                      : Container(
                          color: Colors.grey[800],
                          child: Center(
                            child: _localRenderer.srcObject == null
                                ? Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      CircularProgressIndicator(
                                        color: const Color(0xFF14AD9F),
                                        strokeWidth: 2,
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        'Kamera lädt...',
                                        style: TextStyle(
                                          color: Colors.white60,
                                          fontSize: 10,
                                        ),
                                      ),
                                    ],
                                  )
                                : Icon(
                                    Icons.videocam_off,
                                    color: Colors.white60,
                                    size: 30,
                                  ),
                          ),
                        ),
                ),
              ),
            ),

            // Camera Switch Button (on local video)
            Positioned(
              top: 30,
              right: 30,
              child: GestureDetector(
                onTap: _switchCamera,
                child: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: Colors.black45,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Icon(
                    Icons.flip_camera_ios,
                    color: Colors.white,
                    size: 16,
                  ),
                ),
              ),
            ),

            // Controls at the bottom
            Positioned(
              bottom: 40,
              left: 0,
              right: 0,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 40),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    // Camera Toggle
                    GestureDetector(
                      onTap: _toggleCamera,
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: _isCameraOn ? Colors.black54 : Colors.red,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          _isCameraOn ? Icons.videocam : Icons.videocam_off,
                          color: Colors.white,
                          size: 28,
                        ),
                      ),
                    ),

                    // Microphone Toggle
                    GestureDetector(
                      onTap: _toggleMicrophone,
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: _isMicOn ? Colors.black54 : Colors.red,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          _isMicOn ? Icons.mic : Icons.mic_off,
                          color: Colors.white,
                          size: 28,
                        ),
                      ),
                    ),

                    // End Call
                    GestureDetector(
                      onTap: _endCall,
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: const BoxDecoration(
                          color: Colors.red,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.call_end,
                          color: Colors.white,
                          size: 28,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Connection info
            Positioned(
              bottom: 10,
              left: 0,
              right: 0,
              child: Center(
                child: Text(
                  _videoService.getConnectionState(),
                  style: const TextStyle(color: Colors.white60, fontSize: 10),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
