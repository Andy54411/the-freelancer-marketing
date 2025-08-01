import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../core/models/time_tracking_model.dart';
import '../../core/services/time_tracking_service.dart';

class TimeTrackingScreen extends StatefulWidget {
  final String? orderId;
  
  const TimeTrackingScreen({super.key, this.orderId});

  @override
  State<TimeTrackingScreen> createState() => _TimeTrackingScreenState();
}

class _TimeTrackingScreenState extends State<TimeTrackingScreen> {
  final TimeTrackingService _timeTrackingService = TimeTrackingService();
  final TextEditingController _descriptionController = TextEditingController();
  
  List<TimeTrackingModel> _timeEntries = [];
  TimeTrackingModel? _activeSession;
  bool _isLoading = true;
  
  DateTime? _sessionStartTime;
  Duration _currentSessionDuration = Duration.zero;
  
  @override
  void initState() {
    super.initState();
    _loadTimeEntries();
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _loadTimeEntries() async {
    setState(() => _isLoading = true);
    
    try {
      final userId = Provider.of<AuthProvider>(context, listen: false).user?.id;
      if (userId == null) return;

      final entries = await _timeTrackingService.getTimeEntriesForProvider(userId);
      
      setState(() {
        _timeEntries = entries;
        _activeSession = entries.firstWhere(
          (entry) => entry.status == 'active',
          orElse: () => TimeTrackingModel.empty(),
        );
        
        if (_activeSession?.id.isNotEmpty == true) {
          _sessionStartTime = _activeSession!.startTime;
          _updateCurrentDuration();
        }
        
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Fehler beim Laden der Zeiterfassung: $e')),
        );
      }
    }
  }

  void _updateCurrentDuration() {
    if (_sessionStartTime != null) {
      setState(() {
        _currentSessionDuration = DateTime.now().difference(_sessionStartTime!);
      });
    }
  }

  Future<void> _startTimeTracking() async {
    if (widget.orderId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Keine Auftrags-ID verfügbar')),
      );
      return;
    }

    try {
      final userId = Provider.of<AuthProvider>(context, listen: false).user?.id;
      if (userId == null) return;

      await _timeTrackingService.startTimeTracking(
        orderId: widget.orderId!,
        providerId: userId,
      );
      
      setState(() {
        _sessionStartTime = DateTime.now();
        _currentSessionDuration = Duration.zero;
      });
      
      _loadTimeEntries();
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Zeiterfassung gestartet')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Fehler beim Starten: $e')),
      );
    }
  }

  Future<void> _stopTimeTracking() async {
    if (_activeSession?.id.isEmpty != false) return;

    try {
      await _timeTrackingService.stopTimeTracking(
        timeTrackingId: _activeSession!.id,
        description: _descriptionController.text.trim(),
      );
      
      setState(() {
        _sessionStartTime = null;
        _currentSessionDuration = Duration.zero;
        _activeSession = null;
      });
      
      _descriptionController.clear();
      _loadTimeEntries();
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Zeiterfassung beendet')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Fehler beim Beenden: $e')),
      );
    }
  }

  String _formatDuration(Duration duration) {
    final hours = duration.inHours;
    final minutes = duration.inMinutes.remainder(60);
    final seconds = duration.inSeconds.remainder(60);
    
    return '${hours.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: const Text(
          'Zeiterfassung',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        backgroundColor: const Color(0xFF14AD9F),
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF14AD9F)))
          : Column(
              children: [
                _buildActiveSessionCard(),
                const SizedBox(height: 16),
                Expanded(child: _buildTimeEntriesList()),
              ],
            ),
    );
  }

  Widget _buildActiveSessionCard() {
    final isActive = _activeSession?.id.isNotEmpty == true;
    
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isActive 
              ? [const Color(0xFF14AD9F), const Color(0xFF129488)]
              : [Colors.grey[300]!, Colors.grey[400]!],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Icon(
                isActive ? Icons.play_circle_filled : Icons.play_circle_outline,
                color: Colors.white,
                size: 32,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  isActive ? 'Aktive Zeiterfassung' : 'Zeiterfassung starten',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (isActive) ...[
            Text(
              _formatDuration(_currentSessionDuration),
              style: const TextStyle(
                color: Colors.white,
                fontSize: 32,
                fontWeight: FontWeight.bold,
                fontFamily: 'monospace',
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _descriptionController,
              decoration: InputDecoration(
                hintText: 'Beschreibung der Tätigkeit...',
                hintStyle: TextStyle(color: Colors.white.withOpacity(0.7)),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: Colors.white.withOpacity(0.5)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: Colors.white.withOpacity(0.5)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: const BorderSide(color: Colors.white),
                ),
                fillColor: Colors.white.withOpacity(0.2),
                filled: true,
              ),
              style: const TextStyle(color: Colors.white),
              maxLines: 2,
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _stopTimeTracking,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red[600],
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                icon: const Icon(Icons.stop),
                label: const Text('Zeit stoppen'),
              ),
            ),
          ] else ...[
            const Text(
              '00:00:00',
              style: TextStyle(
                color: Colors.white,
                fontSize: 32,
                fontWeight: FontWeight.bold,
                fontFamily: 'monospace',
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: widget.orderId != null ? _startTimeTracking : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: const Color(0xFF14AD9F),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                icon: const Icon(Icons.play_arrow),
                label: Text(
                  widget.orderId != null 
                      ? 'Zeit starten' 
                      : 'Auftrag erforderlich',
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildTimeEntriesList() {
    if (_timeEntries.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.access_time, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              'Keine Zeiteinträge',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w500),
            ),
            Text(
              'Starten Sie die Zeiterfassung für einen Auftrag',
              style: TextStyle(color: Colors.grey),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              const Text(
                'Zeiteinträge',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const Spacer(),
              Text(
                'Gesamt: ${_calculateTotalHours().toStringAsFixed(1)}h',
                style: const TextStyle(
                  color: Color(0xFF14AD9F),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: _timeEntries.length,
            itemBuilder: (context, index) {
              final entry = _timeEntries[index];
              return _buildTimeEntryCard(entry);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildTimeEntryCard(TimeTrackingModel entry) {
    final isActive = entry.status == 'active';
    
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  isActive ? Icons.radio_button_checked : Icons.check_circle_outline,
                  color: isActive ? const Color(0xFF14AD9F) : Colors.green,
                  size: 20,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Auftrag: ${entry.orderId}',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
                _buildStatusChip(entry.status),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.access_time, size: 16, color: Colors.grey[600]),
                const SizedBox(width: 4),
                Text(
                  '${entry.totalHours.toStringAsFixed(1)} Stunden',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                const Spacer(),
                if (entry.hourlyRate != null) ...[
                  Icon(Icons.euro, size: 16, color: Colors.grey[600]),
                  const SizedBox(width: 4),
                  Text(
                    '${(entry.totalHours * entry.hourlyRate!).toStringAsFixed(2)}',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF14AD9F),
                    ),
                  ),
                ],
              ],
            ),
            if (entry.description?.isNotEmpty == true) ...[
              const SizedBox(height: 8),
              Text(
                entry.description!,
                style: TextStyle(color: Colors.grey[700]),
              ),
            ],
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.schedule, size: 14, color: Colors.grey[500]),
                const SizedBox(width: 4),
                Text(
                  '${_formatDate(entry.startTime)} - ${entry.endTime != null ? _formatDate(entry.endTime!) : 'Laufend'}',
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusChip(String status) {
    Color backgroundColor;
    Color textColor;
    String displayText;

    switch (status) {
      case 'active':
        backgroundColor = Colors.blue[100]!;
        textColor = Colors.blue[800]!;
        displayText = 'Aktiv';
        break;
      case 'completed':
        backgroundColor = Colors.green[100]!;
        textColor = Colors.green[800]!;
        displayText = 'Abgeschlossen';
        break;
      case 'approved':
        backgroundColor = Colors.purple[100]!;
        textColor = Colors.purple[800]!;
        displayText = 'Genehmigt';
        break;
      case 'rejected':
        backgroundColor = Colors.red[100]!;
        textColor = Colors.red[800]!;
        displayText = 'Abgelehnt';
        break;
      default:
        backgroundColor = Colors.grey[100]!;
        textColor = Colors.grey[800]!;
        displayText = status;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        displayText,
        style: TextStyle(
          color: textColor,
          fontSize: 12,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  double _calculateTotalHours() {
    return _timeEntries
        .where((entry) => entry.status != 'active')
        .fold(0.0, (sum, entry) => sum + entry.totalHours);
  }

  String _formatDate(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}.${date.month.toString().padLeft(2, '0')}.${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }
}
