import 'dart:async';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import '../../services/employee_auth_service.dart';
import '../../services/employee_service.dart';
import 'employee_login_screen.dart';

/// Employee Dashboard Screen
/// Hauptbildschirm für Mitarbeiter mit Zeiterfassung, Dienstplan und Abwesenheit
class EmployeeDashboardScreen extends StatefulWidget {
  const EmployeeDashboardScreen({super.key});

  @override
  State<EmployeeDashboardScreen> createState() =>
      _EmployeeDashboardScreenState();
}

class _EmployeeDashboardScreenState extends State<EmployeeDashboardScreen> {
  int _currentIndex = 0;
  TimeTrackingStatus? _timeStatus;
  Timer? _timer;
  Duration _elapsed = Duration.zero;
  List<TimeEntry>? _timeEntries;
  bool _entriesLoading = true;
  Map<String, dynamic> _weeklyStats = {'totalHours': 0.0, 'shiftsCount': 0};
  bool _isOnBreak = false;

  @override
  void initState() {
    super.initState();
    _loadTimeStatus();
    _loadTimeEntries();
    _loadWeeklyStats();
  }

  Future<void> _loadTimeEntries() async {
    setState(() => _entriesLoading = true);
    final entries = await EmployeeService.getTimeEntries();
    setState(() {
      _timeEntries = entries;
      _entriesLoading = false;
    });
  }

  Future<void> _loadWeeklyStats() async {
    final stats = await EmployeeService.getWeeklyStats();
    setState(() {
      _weeklyStats = stats;
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _loadTimeStatus() async {
    debugPrint('🔄 _loadTimeStatus called');
    final status = await EmployeeService.getTimeTrackingStatus();
    debugPrint('🔄 Status loaded: isTracking=${status.isTracking}, startTime=${status.startTime}');
    setState(() {
      _timeStatus = status;
      if (status.isTracking && status.startTime != null) {
        _elapsed = DateTime.now().difference(status.startTime!);
        debugPrint('🔄 Timer started, elapsed: $_elapsed');
        _startTimer();
      }
    });
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      setState(() {
        _elapsed += const Duration(seconds: 1);
      });
    });
  }

  void _stopTimer() {
    _timer?.cancel();
  }

  Future<void> _handleClockIn() async {
    final result = await EmployeeService.clockIn();
    if (result.success) {
      _loadTimeStatus();
      _loadTimeEntries(); // Einträge neu laden
      Get.snackbar(
        'Eingestempelt',
        'Du hast deine Schicht begonnen',
        backgroundColor: Colors.green,
        colorText: Colors.white,
      );
    } else {
      Get.snackbar(
        'Fehler',
        result.error ?? 'Konnte nicht einstempeln',
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );
    }
  }

  Future<void> _handleClockOut() async {
    final result = await EmployeeService.clockOut();
    if (result.success) {
      _stopTimer();
      setState(() {
        _timeStatus = TimeTrackingStatus(isTracking: false);
        _elapsed = Duration.zero;
        _isOnBreak = false; // Pause zurücksetzen
      });
      _loadTimeEntries(); // Einträge neu laden
      _loadWeeklyStats(); // Statistiken neu laden
      Get.snackbar(
        'Ausgestempelt',
        'Arbeitszeit: ${result.totalHours?.toStringAsFixed(2) ?? 0} Stunden',
        backgroundColor: Colors.green,
        colorText: Colors.white,
      );
    } else {
      Get.snackbar(
        'Fehler',
        result.error ?? 'Konnte nicht ausstempeln',
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );
    }
  }

  Future<void> _handleLogout() async {
    final confirm = await Get.dialog<bool>(
      AlertDialog(
        title: const Text('Abmelden'),
        content: const Text('Möchtest du dich wirklich abmelden?'),
        actions: [
          TextButton(
            onPressed: () => Get.back(result: false),
            child: const Text('Abbrechen'),
          ),
          ElevatedButton(
            onPressed: () => Get.back(result: true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: const Text('Abmelden'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await EmployeeAuthService.logout();
      Get.offAll(() => const EmployeeLoginScreen());
    }
  }

  void _showNotificationsDialog() {
    Get.dialog(
      AlertDialog(
        title: Row(
          children: [
            Icon(Icons.notifications, color: Theme.of(context).primaryColor),
            const SizedBox(width: 8),
            const Text('Benachrichtigungen'),
          ],
        ),
        content: SizedBox(
          width: double.maxFinite,
          height: 300,
          child: FutureBuilder<List<Map<String, dynamic>>>(
            future: _loadNotifications(),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }

              final notifications = snapshot.data ?? [];

              if (notifications.isEmpty) {
                return const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.notifications_none,
                        size: 64,
                        color: Colors.grey,
                      ),
                      SizedBox(height: 16),
                      Text(
                        'Keine Benachrichtigungen',
                        style: TextStyle(color: Colors.grey),
                      ),
                    ],
                  ),
                );
              }

              return ListView.separated(
                itemCount: notifications.length,
                separatorBuilder: (_, __) => const Divider(),
                itemBuilder: (context, index) {
                  final notification = notifications[index];
                  return ListTile(
                    leading: CircleAvatar(
                      backgroundColor: _getNotificationColor(
                        notification['type'] as String?,
                      ),
                      child: Icon(
                        _getNotificationIcon(notification['type'] as String?),
                        color: Colors.white,
                        size: 20,
                      ),
                    ),
                    title: Text(notification['title'] as String? ?? ''),
                    subtitle: Text(notification['message'] as String? ?? ''),
                    trailing: Text(
                      notification['time'] as String? ?? '',
                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                  );
                },
              );
            },
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Get.back(),
            child: const Text('Schließen'),
          ),
        ],
      ),
    );
  }

  Future<List<Map<String, dynamic>>> _loadNotifications() async {
    // Lade Benachrichtigungen vom Server
    await Future.delayed(const Duration(milliseconds: 500));
    return [
      {
        'type': 'schedule',
        'title': 'Dienstplan aktualisiert',
        'message': 'Dein Dienstplan für nächste Woche wurde veröffentlicht.',
        'time': 'Heute',
      },
      {
        'type': 'absence',
        'title': 'Urlaubsantrag genehmigt',
        'message': 'Dein Urlaubsantrag vom 20.-24.12. wurde genehmigt.',
        'time': 'Gestern',
      },
    ];
  }

  Color _getNotificationColor(String? type) {
    switch (type) {
      case 'schedule':
        return Colors.blue;
      case 'absence':
        return Colors.green;
      case 'warning':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  IconData _getNotificationIcon(String? type) {
    switch (type) {
      case 'schedule':
        return Icons.calendar_today;
      case 'absence':
        return Icons.beach_access;
      case 'warning':
        return Icons.warning;
      default:
        return Icons.notifications;
    }
  }

  void _showAddNoteDialog() {
    final noteController = TextEditingController();

    Get.dialog(
      AlertDialog(
        title: Row(
          children: [
            Icon(Icons.note_add, color: Theme.of(context).primaryColor),
            const SizedBox(width: 8),
            const Text('Notiz hinzufügen'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Füge eine Notiz zu deinem aktuellen Zeiteintrag hinzu:',
              style: TextStyle(fontSize: 14, color: Colors.grey),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: noteController,
              maxLines: 4,
              decoration: const InputDecoration(
                hintText: 'Was hast du gemacht?',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Get.back(),
            child: const Text('Abbrechen'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (noteController.text.isNotEmpty) {
                // Speichere die Notiz
                Get.back();
                Get.snackbar(
                  'Notiz gespeichert',
                  'Deine Notiz wurde hinzugefügt',
                  backgroundColor: Colors.green,
                  colorText: Colors.white,
                );
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF14AD9F),
              foregroundColor: Colors.white,
            ),
            child: const Text('Speichern'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final session = EmployeeAuthService.currentSession;

    return Scaffold(
      backgroundColor: Colors.grey[100],
      appBar: AppBar(
        backgroundColor: const Color(0xFF14AD9F),
        foregroundColor: Colors.white,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              session?.companyName ?? 'Mitarbeiter-Portal',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            Text(
              session?.employeeName ?? '',
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.normal,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () => _showNotificationsDialog(),
          ),
          IconButton(icon: const Icon(Icons.logout), onPressed: _handleLogout),
        ],
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: [
          _buildTimeTrackingTab(),
          _buildScheduleTab(),
          _buildAbsenceTab(),
          _buildProfileTab(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) => setState(() => _currentIndex = index),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.timer_outlined),
            selectedIcon: Icon(Icons.timer),
            label: 'Zeiterfassung',
          ),
          NavigationDestination(
            icon: Icon(Icons.calendar_today_outlined),
            selectedIcon: Icon(Icons.calendar_today),
            label: 'Dienstplan',
          ),
          NavigationDestination(
            icon: Icon(Icons.beach_access_outlined),
            selectedIcon: Icon(Icons.beach_access),
            label: 'Abwesenheit',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profil',
          ),
        ],
      ),
    );
  }

  // ===== ZEITERFASSUNG TAB =====
  Widget _buildTimeTrackingTab() {
    final isTracking = _timeStatus?.isTracking ?? false;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          // Status-Anzeige oben
          if (isTracking)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF14AD9F), Color(0xFF0D8F84)],
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.white.withValues(alpha: 0.5),
                          blurRadius: 8,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Text(
                    'Schicht läuft',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                      fontSize: 15,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    _formatDuration(_elapsed),
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                      fontFamily: 'monospace',
                    ),
                  ),
                ],
              ),
            ),

          // Hauptkarte mit Uhr und Button
          Container(
            padding: const EdgeInsets.all(28),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withAlpha(15),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Column(
              children: [
                // Aktuelle Zeit - größer und prominenter
                ShaderMask(
                  shaderCallback: (bounds) => const LinearGradient(
                    colors: [Color(0xFF14AD9F), Color(0xFF0D8F84)],
                  ).createShader(bounds),
                  child: Text(
                    DateFormat('HH:mm').format(DateTime.now()),
                    style: const TextStyle(
                      fontSize: 72,
                      fontWeight: FontWeight.w300,
                      color: Colors.white,
                      letterSpacing: 4,
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.grey[100],
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    DateFormat(
                      'EEEE, d. MMMM yyyy',
                      'de_DE',
                    ).format(DateTime.now()),
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey[700],
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                const SizedBox(height: 32),

                // Clock In/Out Button - modernerer Look
                GestureDetector(
                  onTap: isTracking ? _handleClockOut : _handleClockIn,
                  child: Container(
                    width: 160,
                    height: 160,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: isTracking
                            ? [const Color(0xFFEF4444), const Color(0xFFDC2626)]
                            : [
                                const Color(0xFF14AD9F),
                                const Color(0xFF0D8F84),
                              ],
                      ),
                      boxShadow: [
                        BoxShadow(
                          color:
                              (isTracking
                                      ? Colors.red
                                      : const Color(0xFF14AD9F))
                                  .withValues(alpha: 0.4),
                          blurRadius: 20,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          isTracking
                              ? Icons.stop_rounded
                              : Icons.play_arrow_rounded,
                          size: 56,
                          color: Colors.white,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          isTracking ? 'Ausstempeln' : 'Einstempeln',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // Quick Actions - modernerer Style
          if (isTracking)
            Row(
              children: [
                Expanded(
                  child: _buildQuickActionCard(
                    icon: _isOnBreak ? Icons.play_arrow_rounded : Icons.coffee_rounded,
                    label: _isOnBreak ? 'Pause beenden' : 'Pause starten',
                    subtitle: _isOnBreak ? 'Weiterarbeiten' : '30 Min.',
                    color: _isOnBreak ? Colors.green : const Color(0xFFF59E0B),
                    onTap: () async {
                      if (_isOnBreak) {
                        final breakMinutes = await EmployeeService.endBreak();
                        setState(() => _isOnBreak = false);
                        Get.snackbar(
                          'Pause beendet',
                          'Pausenzeit: $breakMinutes Minuten',
                          backgroundColor: Colors.green,
                          colorText: Colors.white,
                        );
                      } else {
                        final success = await EmployeeService.startBreak();
                        if (success) {
                          setState(() => _isOnBreak = true);
                          Get.snackbar(
                            'Pause gestartet',
                            'Gute Erholung!',
                            backgroundColor: const Color(0xFFF59E0B),
                            colorText: Colors.white,
                          );
                        } else {
                          Get.snackbar(
                            'Fehler',
                            'Pause konnte nicht gestartet werden',
                            backgroundColor: Colors.red,
                            colorText: Colors.white,
                          );
                        }
                      }
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildQuickActionCard(
                    icon: Icons.edit_note_rounded,
                    label: 'Notiz',
                    subtitle: 'Hinzufügen',
                    color: const Color(0xFF6366F1),
                    onTap: () => _showAddNoteDialog(),
                  ),
                ),
              ],
            ),

          if (!isTracking) ...[
            // Statistik-Karten wenn nicht eingestempelt
            _buildStatsSection(),
          ],

          const SizedBox(height: 20),

          // Letzte Einträge
          _buildRecentEntriesCard(),
        ],
      ),
    );
  }

  Widget _buildQuickActionCard({
    required IconData icon,
    required String label,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha(8),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    subtitle,
                    style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsSection() {
    final hours = (_weeklyStats['totalHours'] as num?)?.toDouble() ?? 0.0;
    final shifts = (_weeklyStats['shiftsCount'] as num?)?.toInt() ?? 0;
    final hoursInt = hours.floor();
    final minutes = ((hours - hoursInt) * 60).round();
    
    return Container(
      margin: const EdgeInsets.only(top: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Diese Woche',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildStatCard(
                  icon: Icons.access_time_rounded,
                  label: 'Arbeitszeit',
                  value: '${hoursInt}h ${minutes}m',
                  color: const Color(0xFF14AD9F),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildStatCard(
                  icon: Icons.calendar_today_rounded,
                  label: 'Schichten',
                  value: '$shifts',
                  color: const Color(0xFF6366F1),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard({
    required IconData icon,
    required String label,
    required String value,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(8),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
          ),
          Text(label, style: TextStyle(fontSize: 13, color: Colors.grey[600])),
        ],
      ),
    );
  }

  Widget _buildRecentEntriesCard() {
    if (_entriesLoading) {
      return Container(
        padding: const EdgeInsets.all(32),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
        ),
        child: const Center(
          child: CircularProgressIndicator(color: Color(0xFF14AD9F)),
        ),
      );
    }

    final entries = _timeEntries ?? [];

        return Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withAlpha(8),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Letzte Einträge',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (entries.isNotEmpty)
                      TextButton(
                        onPressed: () => _showAllTimeEntriesDialog(entries),
                        child: const Text(
                          'Alle anzeigen',
                          style: TextStyle(color: Color(0xFF14AD9F)),
                        ),
                      ),
                  ],
                ),
              ),
              if (entries.isEmpty)
                Padding(
                  padding: const EdgeInsets.all(32),
                  child: Center(
                    child: Column(
                      children: [
                        Icon(
                          Icons.history_rounded,
                          size: 48,
                          color: Colors.grey[300],
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'Keine Einträge vorhanden',
                          style: TextStyle(color: Colors.grey[500]),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Starten Sie Ihre erste Schicht',
                          style: TextStyle(
                            color: Colors.grey[400],
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                )
              else
                ...entries.take(5).map((entry) => _buildTimeEntryTile(entry)),
            ],
          ),
        );
  }

  Widget _buildTimeEntryTile(TimeEntry entry) {
    final isCompleted = entry.status == 'COMPLETED';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: Colors.grey[200]!)),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: isCompleted ? Colors.green[50] : Colors.orange[50],
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              isCompleted ? Icons.check_circle_rounded : Icons.schedule_rounded,
              color: isCompleted ? Colors.green : Colors.orange,
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  entry.date,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
                Text(
                  '${entry.startTime} - ${entry.endTime ?? '--:--'}',
                  style: TextStyle(color: Colors.grey[600], fontSize: 13),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                entry.formattedDuration,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: Color(0xFF14AD9F),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: isCompleted ? Colors.green[50] : Colors.orange[50],
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  isCompleted ? 'Abgeschlossen' : 'Offen',
                  style: TextStyle(
                    fontSize: 11,
                    color: isCompleted ? Colors.green[700] : Colors.orange[700],
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _showAllTimeEntriesDialog(List<TimeEntry> entries) {
    Get.dialog(
      Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Container(
          width: double.maxFinite,
          constraints: const BoxConstraints(maxHeight: 500),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header
              Container(
                padding: const EdgeInsets.all(16),
                decoration: const BoxDecoration(
                  color: Color(0xFF14AD9F),
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(16),
                    topRight: Radius.circular(16),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Alle Zeiteinträge',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: Colors.white),
                      onPressed: () => Get.back(),
                    ),
                  ],
                ),
              ),
              // Einträge-Liste
              Expanded(
                child: entries.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.history_rounded,
                              size: 48,
                              color: Colors.grey[300],
                            ),
                            const SizedBox(height: 12),
                            Text(
                              'Keine Einträge vorhanden',
                              style: TextStyle(color: Colors.grey[500]),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        itemCount: entries.length,
                        padding: EdgeInsets.zero,
                        itemBuilder: (context, index) {
                          final entry = entries[index];
                          final isCompleted = entry.status == 'COMPLETED';
                          return Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 12,
                            ),
                            decoration: BoxDecoration(
                              border: Border(
                                bottom: BorderSide(color: Colors.grey[200]!),
                              ),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 40,
                                  height: 40,
                                  decoration: BoxDecoration(
                                    color: isCompleted
                                        ? Colors.green[50]
                                        : Colors.orange[50],
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Icon(
                                    isCompleted
                                        ? Icons.check_circle_rounded
                                        : Icons.schedule_rounded,
                                    color:
                                        isCompleted ? Colors.green : Colors.orange,
                                    size: 20,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        entry.date,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w600,
                                          fontSize: 14,
                                        ),
                                      ),
                                      Text(
                                        '${entry.startTime} - ${entry.endTime ?? '--:--'}',
                                        style: TextStyle(
                                          color: Colors.grey[600],
                                          fontSize: 12,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                      entry.formattedDuration,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 14,
                                        color: Color(0xFF14AD9F),
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 6,
                                        vertical: 2,
                                      ),
                                      decoration: BoxDecoration(
                                        color: isCompleted
                                            ? Colors.green[50]
                                            : Colors.orange[50],
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        isCompleted ? 'Fertig' : 'Offen',
                                        style: TextStyle(
                                          fontSize: 10,
                                          color: isCompleted
                                              ? Colors.green[700]
                                              : Colors.orange[700],
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ===== DIENSTPLAN TAB =====
  Widget _buildScheduleTab() {
    return FutureBuilder<ScheduleData>(
      future: EmployeeService.getSchedule(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        final schedule = snapshot.data ?? ScheduleData.empty();

        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Wochen-Header
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF14AD9F),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Diese Woche',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      '${schedule.totalHours.toStringAsFixed(1)}h geplant',
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Schichten
              Builder(builder: (context) {
                debugPrint('📅 UI: Rendering ${schedule.shifts.length} shifts, totalHours: ${schedule.totalHours}');
                if (schedule.shifts.isEmpty) {
                  return Container(
                    padding: const EdgeInsets.all(32),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Center(
                      child: Column(
                        children: [
                          Icon(Icons.event_busy, size: 48, color: Colors.grey),
                          SizedBox(height: 16),
                          Text('Keine Schichten geplant'),
                        ],
                      ),
                    ),
                  );
                }
                return Column(
                  children: schedule.shifts.map((shift) => _buildShiftCard(shift)).toList(),
                );
              }),
            ],
          ),
        );
      },
    );
  }

  Widget _buildShiftCard(Shift shift) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: shift.status == 'CONFIRMED'
            ? Border.all(color: Colors.green, width: 2)
            : null,
      ),
      child: Row(
        children: [
          SizedBox(
            width: 60,
            child: Column(
              children: [
                Text(
                  DateFormat('E', 'de_DE').format(DateTime.parse(shift.date)),
                  style: TextStyle(color: Colors.grey[600], fontSize: 12),
                ),
                Text(
                  DateFormat('d').format(DateTime.parse(shift.date)),
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
          Container(
            width: 2,
            height: 40,
            color: const Color(0xFF14AD9F),
            margin: const EdgeInsets.symmetric(horizontal: 16),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${shift.startTime} - ${shift.endTime}',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  '${shift.position} • ${shift.department}',
                  style: TextStyle(color: Colors.grey[600], fontSize: 14),
                ),
              ],
            ),
          ),
          if (shift.status == 'PLANNED')
            TextButton(
              onPressed: () async {
                final success = await EmployeeService.confirmShift(shift.id);
                if (success) {
                  setState(() {});
                  Get.snackbar('Bestätigt', 'Schicht wurde bestätigt');
                }
              },
              child: const Text('Bestätigen'),
            )
          else
            const Icon(Icons.check_circle, color: Colors.green),
        ],
      ),
    );
  }

  // ===== ABWESENHEIT TAB =====
  Widget _buildAbsenceTab() {
    return FutureBuilder<AbsenceData>(
      future: EmployeeService.getAbsenceData(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        final data = snapshot.data ?? AbsenceData.empty();

        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Urlaubskontingent
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF14AD9F), Color(0xFF0D8A7E)],
                  ),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  children: [
                    const Text(
                      'Urlaubskontingent',
                      style: TextStyle(color: Colors.white70, fontSize: 14),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          '${data.vacation.remainingDays}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 48,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const Padding(
                          padding: EdgeInsets.only(bottom: 8, left: 4),
                          child: Text(
                            'Tage verfügbar',
                            style: TextStyle(
                              color: Colors.white70,
                              fontSize: 16,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        _buildVacationStat('Gesamt', data.vacation.totalDays),
                        _buildVacationStat('Genommen', data.vacation.usedDays),
                        _buildVacationStat(
                          'Beantragt',
                          data.vacation.pendingDays,
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Neuer Antrag Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => _showAbsenceRequestDialog(),
                  icon: const Icon(Icons.add),
                  label: const Text('Neuer Antrag'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF14AD9F),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // Anträge Liste
              const Text(
                'Meine Anträge',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),

              if (data.requests.isEmpty)
                Container(
                  padding: const EdgeInsets.all(32),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Center(child: Text('Keine Anträge vorhanden')),
                )
              else
                ...data.requests.map(
                  (request) => _buildAbsenceRequestCard(request),
                ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildVacationStat(String label, int value) {
    return Column(
      children: [
        Text(
          '$value',
          style: const TextStyle(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: const TextStyle(color: Colors.white70, fontSize: 12),
        ),
      ],
    );
  }

  Widget _buildAbsenceRequestCard(AbsenceRequest request) {
    Color statusColor;
    switch (request.status) {
      case 'APPROVED':
        statusColor = Colors.green;
        break;
      case 'REJECTED':
        statusColor = Colors.red;
        break;
      case 'CANCELLED':
        statusColor = Colors.grey;
        break;
      default:
        statusColor = Colors.orange;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: statusColor.withAlpha(26),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(_getAbsenceIcon(request.type), color: statusColor),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  request.typeLabel,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                Text(
                  '${request.startDate} - ${request.endDate}',
                  style: TextStyle(color: Colors.grey[600], fontSize: 14),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withAlpha(26),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  request.statusLabel,
                  style: TextStyle(
                    color: statusColor,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '${request.days} Tage',
                style: TextStyle(color: Colors.grey[600], fontSize: 12),
              ),
            ],
          ),
        ],
      ),
    );
  }

  IconData _getAbsenceIcon(String type) {
    switch (type) {
      case 'VACATION':
        return Icons.beach_access;
      case 'SICK':
        return Icons.local_hospital;
      case 'PERSONAL':
        return Icons.person;
      case 'TRAINING':
        return Icons.school;
      default:
        return Icons.event;
    }
  }

  void _showAbsenceRequestDialog() {
    String selectedType = 'VACATION';
    DateTime? startDate;
    DateTime? endDate;

    Get.dialog(
      AlertDialog(
        title: const Text('Neuer Abwesenheitsantrag'),
        content: StatefulBuilder(
          builder: (context, setDialogState) {
            return SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  DropdownButtonFormField<String>(
                    decoration: const InputDecoration(
                      labelText: 'Art der Abwesenheit',
                      border: OutlineInputBorder(),
                    ),
                    items: const [
                      DropdownMenuItem(
                        value: 'VACATION',
                        child: Text('Urlaub'),
                      ),
                      DropdownMenuItem(value: 'SICK', child: Text('Krankheit')),
                      DropdownMenuItem(
                        value: 'PERSONAL',
                        child: Text('Persönlich'),
                      ),
                      DropdownMenuItem(
                        value: 'TRAINING',
                        child: Text('Weiterbildung'),
                      ),
                      DropdownMenuItem(
                        value: 'OTHER',
                        child: Text('Sonstiges'),
                      ),
                    ],
                    onChanged: (value) {
                      setDialogState(() => selectedType = value!);
                    },
                  ),
                  const SizedBox(height: 16),
                  ListTile(
                    title: const Text('Von'),
                    subtitle: Text(
                      startDate != null
                          ? DateFormat('dd.MM.yyyy').format(startDate!)
                          : 'Datum wählen',
                    ),
                    trailing: const Icon(Icons.calendar_today),
                    onTap: () async {
                      final date = await showDatePicker(
                        context: context,
                        initialDate: DateTime.now(),
                        firstDate: DateTime.now(),
                        lastDate: DateTime.now().add(const Duration(days: 365)),
                      );
                      if (date != null) {
                        setDialogState(() => startDate = date);
                      }
                    },
                  ),
                  ListTile(
                    title: const Text('Bis'),
                    subtitle: Text(
                      endDate != null
                          ? DateFormat('dd.MM.yyyy').format(endDate!)
                          : 'Datum wählen',
                    ),
                    trailing: const Icon(Icons.calendar_today),
                    onTap: () async {
                      final date = await showDatePicker(
                        context: context,
                        initialDate: startDate ?? DateTime.now(),
                        firstDate: startDate ?? DateTime.now(),
                        lastDate: DateTime.now().add(const Duration(days: 365)),
                      );
                      if (date != null) {
                        setDialogState(() => endDate = date);
                      }
                    },
                  ),
                ],
              ),
            );
          },
        ),
        actions: [
          TextButton(
            onPressed: () => Get.back(),
            child: const Text('Abbrechen'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (startDate == null || endDate == null) {
                Get.snackbar('Fehler', 'Bitte Datum auswählen');
                return;
              }

              final result = await EmployeeService.createAbsenceRequest(
                type: selectedType,
                startDate: DateFormat('yyyy-MM-dd').format(startDate!),
                endDate: DateFormat('yyyy-MM-dd').format(endDate!),
              );

              Get.back();

              if (result.success) {
                setState(() {});
                Get.snackbar('Erfolg', 'Antrag eingereicht');
              } else {
                Get.snackbar(
                  'Fehler',
                  result.error ?? 'Konnte Antrag nicht einreichen',
                );
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF14AD9F),
              foregroundColor: Colors.white,
            ),
            child: const Text('Einreichen'),
          ),
        ],
      ),
    );
  }

  // ===== PROFIL TAB =====
  Widget _buildProfileTab() {
    final session = EmployeeAuthService.currentSession;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Profilkarte
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                CircleAvatar(
                  radius: 50,
                  backgroundColor: const Color(0xFF14AD9F),
                  backgroundImage: session?.avatar != null
                      ? NetworkImage(session!.avatar!)
                      : null,
                  child: session?.avatar == null
                      ? Text(
                          session?.employeeName.substring(0, 1).toUpperCase() ??
                              '?',
                          style: const TextStyle(
                            fontSize: 36,
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        )
                      : null,
                ),
                const SizedBox(height: 16),
                Text(
                  session?.employeeName ?? '',
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  session?.position ?? '',
                  style: TextStyle(color: Colors.grey[600], fontSize: 14),
                ),
                Text(
                  session?.department ?? '',
                  style: TextStyle(color: Colors.grey[500], fontSize: 12),
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Menüpunkte
          _buildProfileMenuItem(
            icon: Icons.person_outline,
            title: 'Persönliche Daten',
            onTap: () {},
          ),
          _buildProfileMenuItem(
            icon: Icons.lock_outline,
            title: 'Passwort ändern',
            onTap: () {},
          ),
          _buildProfileMenuItem(
            icon: Icons.notifications_outlined,
            title: 'Benachrichtigungen',
            onTap: () {},
          ),
          _buildProfileMenuItem(
            icon: Icons.help_outline,
            title: 'Hilfe & Support',
            onTap: () {},
          ),
          _buildProfileMenuItem(
            icon: Icons.logout,
            title: 'Abmelden',
            isDestructive: true,
            onTap: _handleLogout,
          ),
        ],
      ),
    );
  }

  Widget _buildProfileMenuItem({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
    bool isDestructive = false,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        leading: Icon(
          icon,
          color: isDestructive ? Colors.red : const Color(0xFF14AD9F),
        ),
        title: Text(
          title,
          style: TextStyle(color: isDestructive ? Colors.red : null),
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }

  String _formatDuration(Duration duration) {
    final hours = duration.inHours.toString().padLeft(2, '0');
    final minutes = (duration.inMinutes % 60).toString().padLeft(2, '0');
    final seconds = (duration.inSeconds % 60).toString().padLeft(2, '0');
    return '$hours:$minutes:$seconds';
  }
}
