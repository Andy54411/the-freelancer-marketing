import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../theme/app_theme.dart';
import '../../services/api_service.dart';

class MeetScreen extends StatefulWidget {
  const MeetScreen({super.key});

  @override
  State<MeetScreen> createState() => _MeetScreenState();
}

class _MeetScreenState extends State<MeetScreen> {
  final ApiService _apiService = ApiService();
  final TextEditingController _codeController = TextEditingController();
  
  List<MeetingInfo> _upcomingMeetings = [];
  List<MeetingInfo> _recentMeetings = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadMeetings();
  }

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _loadMeetings() async {
    setState(() => _isLoading = true);

    try {
      final result = await _apiService.getMeetings();
      
      if (result['success'] == true) {
        final upcoming = <MeetingInfo>[];
        final recent = <MeetingInfo>[];
        
        for (final meeting in result['upcoming'] ?? []) {
          upcoming.add(MeetingInfo.fromJson(meeting));
        }
        
        for (final meeting in result['recent'] ?? []) {
          recent.add(MeetingInfo.fromJson(meeting));
        }
        
        setState(() {
          _upcomingMeetings = upcoming;
          _recentMeetings = recent;
        });
      }
    } catch (e) { // Fehler ignorieren 
      // Ignorieren
    }

    setState(() => _isLoading = false);
  }

  Future<void> _createMeeting() async {
    final hasCamera = await Permission.camera.request().isGranted;
    final hasMic = await Permission.microphone.request().isGranted;
    
    if (!hasCamera || !hasMic) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Bitte erlauben Sie Kamera- und Mikrofonzugriff'),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    try {
      final result = await _apiService.createMeeting();
      
      if (result['success'] == true && mounted) {
        final meetingId = result['meetingId'];
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => MeetingRoomScreen(meetingId: meetingId),
          ),
        );
      }
    } catch (e) { // Fehler ignorieren 
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Fehler: ${e.toString()}'),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  Future<void> _joinMeeting() async {
    final code = _codeController.text.trim();
    if (code.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Bitte geben Sie einen Besprechungscode ein'),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    final hasCamera = await Permission.camera.request().isGranted;
    final hasMic = await Permission.microphone.request().isGranted;
    
    if (!hasCamera || !hasMic) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Bitte erlauben Sie Kamera- und Mikrofonzugriff'),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    if (!mounted) return;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => MeetingRoomScreen(meetingId: code),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        title: const Text('Meet'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            onPressed: () {
              // TODO: Settings
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Quick Actions
            Row(
              children: [
                Expanded(
                  child: _ActionButton(
                    icon: Icons.video_call,
                    label: 'Neue Besprechung',
                    color: AppColors.meetPurple,
                    onTap: _createMeeting,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _ActionButton(
                    icon: Icons.keyboard,
                    label: 'Mit Code beitreten',
                    color: AppColors.primary,
                    onTap: () => _showJoinDialog(),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 32),
            
            // Upcoming Meetings
            const Text(
              'Anstehende Besprechungen',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 12),
            
            if (_isLoading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(32),
                  child: CircularProgressIndicator(color: AppColors.meetPurple),
                ),
              )
            else if (_upcomingMeetings.isEmpty)
              Container(
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.divider),
                ),
                child: Column(
                  children: [
                    Icon(Icons.event_available, size: 48, color: AppColors.textSecondary),
                    const SizedBox(height: 16),
                    const Text(
                      'Keine anstehenden Besprechungen',
                      style: TextStyle(color: AppColors.textSecondary),
                    ),
                  ],
                ),
              )
            else
              ...(_upcomingMeetings.map((meeting) => _MeetingCard(
                meeting: meeting,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => MeetingRoomScreen(meetingId: meeting.id),
                    ),
                  );
                },
              ))),
            
            // Recent Meetings
            if (_recentMeetings.isNotEmpty) ...[
              const SizedBox(height: 32),
              const Text(
                'Letzte Besprechungen',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 12),
              ...(_recentMeetings.map((meeting) => _MeetingCard(
                meeting: meeting,
                isRecent: true,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => MeetingRoomScreen(meetingId: meeting.id),
                    ),
                  );
                },
              ))),
            ],
          ],
        ),
      ),
    );
  }

  void _showJoinDialog() {
    _codeController.clear();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Besprechung beitreten'),
        content: TextField(
          controller: _codeController,
          autofocus: true,
          decoration: const InputDecoration(
            labelText: 'Besprechungscode',
            hintText: 'z.B. abc-defg-hij',
            border: OutlineInputBorder(),
          ),
          inputFormatters: [
            FilteringTextInputFormatter.allow(RegExp(r'[a-zA-Z0-9\-]')),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Abbrechen'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _joinMeeting();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.meetPurple,
              foregroundColor: Colors.white,
            ),
            child: const Text('Beitreten'),
          ),
        ],
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: Column(
          children: [
            Icon(icon, size: 32, color: color),
            const SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                fontWeight: FontWeight.w600,
                color: color,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _MeetingCard extends StatelessWidget {
  final MeetingInfo meeting;
  final bool isRecent;
  final VoidCallback onTap;

  const _MeetingCard({
    required this.meeting,
    this.isRecent = false,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        onTap: onTap,
        leading: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: AppColors.meetPurple.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            Icons.video_camera_front,
            color: AppColors.meetPurple,
          ),
        ),
        title: Text(
          meeting.title,
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        subtitle: Text(
          isRecent
              ? 'Zuletzt: ${_formatDate(meeting.startTime)}'
              : _formatDate(meeting.startTime),
          style: const TextStyle(fontSize: 13),
        ),
        trailing: IconButton(
          icon: const Icon(Icons.content_copy),
          onPressed: () {
            Clipboard.setData(ClipboardData(text: meeting.id));
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Besprechungscode wurde kopiert'),
                duration: Duration(seconds: 2),
                behavior: SnackBarBehavior.floating,
              ),
            );
          },
          tooltip: 'Code kopieren',
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final tomorrow = today.add(const Duration(days: 1));
    final meetingDate = DateTime(date.year, date.month, date.day);

    String dateStr;
    if (meetingDate == today) {
      dateStr = 'Heute';
    } else if (meetingDate == tomorrow) {
      dateStr = 'Morgen';
    } else {
      dateStr = '${date.day}.${date.month}.${date.year}';
    }

    return '$dateStr, ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
  }
}

class MeetingRoomScreen extends StatefulWidget {
  final String meetingId;

  const MeetingRoomScreen({
    super.key,
    required this.meetingId,
  });

  @override
  State<MeetingRoomScreen> createState() => _MeetingRoomScreenState();
}

class _MeetingRoomScreenState extends State<MeetingRoomScreen> {
  bool _isMuted = false;
  bool _isVideoOff = false;
  bool _isScreenSharing = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Video Grid (Placeholder)
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.video_camera_front,
                  size: 64,
                  color: Colors.white.withValues(alpha: 0.5),
                ),
                const SizedBox(height: 16),
                Text(
                  'Besprechung: ${widget.meetingId}',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.7),
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Video-Implementierung folgt',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.5),
                  ),
                ),
              ],
            ),
          ),
          
          // Top Bar
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: EdgeInsets.only(
                top: MediaQuery.of(context).padding.top + 8,
                bottom: 8,
                left: 16,
                right: 16,
              ),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.black.withValues(alpha: 0.7),
                    Colors.transparent,
                  ],
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      widget.meetingId,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.flip_camera_ios, color: Colors.white),
                    onPressed: () {
                      // TODO: Switch camera
                    },
                  ),
                ],
              ),
            ),
          ),
          
          // Bottom Controls
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: EdgeInsets.only(
                top: 16,
                bottom: MediaQuery.of(context).padding.bottom + 16,
                left: 24,
                right: 24,
              ),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                  colors: [
                    Colors.black.withValues(alpha: 0.8),
                    Colors.transparent,
                  ],
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _ControlButton(
                    icon: _isMuted ? Icons.mic_off : Icons.mic,
                    label: _isMuted ? 'Stummg.' : 'Mikrofon',
                    isActive: !_isMuted,
                    onTap: () => setState(() => _isMuted = !_isMuted),
                  ),
                  _ControlButton(
                    icon: _isVideoOff ? Icons.videocam_off : Icons.videocam,
                    label: _isVideoOff ? 'Video aus' : 'Video',
                    isActive: !_isVideoOff,
                    onTap: () => setState(() => _isVideoOff = !_isVideoOff),
                  ),
                  _ControlButton(
                    icon: Icons.screen_share,
                    label: 'Teilen',
                    isActive: _isScreenSharing,
                    onTap: () => setState(() => _isScreenSharing = !_isScreenSharing),
                  ),
                  _ControlButton(
                    icon: Icons.chat_bubble_outline,
                    label: 'Chat',
                    onTap: () {
                      // TODO: Open chat
                    },
                  ),
                  _ControlButton(
                    icon: Icons.call_end,
                    label: 'Beenden',
                    isDestructive: true,
                    onTap: () => _endCall(),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _endCall() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Besprechung verlassen'),
        content: const Text('Möchten Sie die Besprechung wirklich verlassen?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Abbrechen'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            child: const Text('Verlassen'),
          ),
        ],
      ),
    );

    if (confirm == true && mounted) {
      Navigator.pop(context);
    }
  }
}

class _ControlButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isActive;
  final bool isDestructive;
  final VoidCallback onTap;

  const _ControlButton({
    required this.icon,
    required this.label,
    this.isActive = true,
    this.isDestructive = false,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final color = isDestructive
        ? AppColors.error
        : isActive
            ? Colors.white
            : Colors.white54;
    
    final bgColor = isDestructive
        ? AppColors.error
        : isActive
            ? Colors.white24
            : Colors.white12;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: bgColor,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 11,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// Model
class MeetingInfo {
  final String id;
  final String title;
  final DateTime startTime;
  final List<String> participants;

  MeetingInfo({
    required this.id,
    required this.title,
    required this.startTime,
    required this.participants,
  });

  factory MeetingInfo.fromJson(Map<String, dynamic> json) {
    return MeetingInfo(
      id: json['id'] ?? json['_id'] ?? json['meetingId'] ?? '',
      title: json['title'] ?? json['name'] ?? 'Besprechung',
      startTime: DateTime.parse(
        json['startTime'] ?? json['start'] ?? DateTime.now().toIso8601String(),
      ),
      participants: (json['participants'] as List?)?.cast<String>() ?? [],
    );
  }
}
