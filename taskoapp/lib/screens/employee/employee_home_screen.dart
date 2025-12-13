import 'dart:async';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import '../../services/employee_auth_service.dart';
import '../../services/employee_service.dart';
import 'employee_login_screen.dart';

/// Modernes Employee Home Screen
/// Basiert auf dem Referenz-Design mit 5-Tage Vorschau, Einsätze, Arbeitszeiten etc.
class EmployeeHomeScreen extends StatefulWidget {
  const EmployeeHomeScreen({super.key});

  @override
  State<EmployeeHomeScreen> createState() => _EmployeeHomeScreenState();
}

class _EmployeeHomeScreenState extends State<EmployeeHomeScreen> {
  int _currentIndex = 0;
  ScheduleData? _scheduleData;
  Map<String, dynamic> _weeklyStats = {'totalHours': 0.0, 'shiftsCount': 0};
  Map<String, dynamic> _lastMonthStats = {'totalHours': 0.0};
  TimeTrackingStatus? _timeStatus;
  Timer? _timer;
  Duration _elapsed = Duration.zero;
  Duration _breakElapsed = Duration.zero;

  @override
  void initState() {
    super.initState();
    _loadAllData();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _loadAllData() async {
    await Future.wait([
      _loadSchedule(),
      _loadWeeklyStats(),
      _loadLastMonthStats(),
      _loadTimeStatus(),
    ]);
  }

  Future<void> _loadSchedule() async {
    final schedule = await EmployeeService.getSchedule();
    setState(() => _scheduleData = schedule);
  }

  Future<void> _loadWeeklyStats() async {
    final stats = await EmployeeService.getWeeklyStats();
    setState(() => _weeklyStats = stats);
  }

  Future<void> _loadLastMonthStats() async {
    final stats = await EmployeeService.getLastMonthStats();
    setState(() => _lastMonthStats = stats);
  }

  Future<void> _loadTimeStatus() async {
    final status = await EmployeeService.getTimeTrackingStatus();
    setState(() {
      _timeStatus = status;
      if (status.isTracking && status.startTime != null) {
        _elapsed = DateTime.now().difference(status.startTime!);
        // Wenn auf Pause, berechne auch die Pause-Dauer
        if (status.isOnBreak && status.breakStartTime != null) {
          _breakElapsed = DateTime.now().difference(status.breakStartTime!);
        } else {
          _breakElapsed = Duration.zero;
        }
        _startTimer();
      }
    });
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      setState(() {
        _elapsed += const Duration(seconds: 1);
        // Wenn auf Pause, zähle auch die Pause-Zeit hoch
        if (_timeStatus?.isOnBreak == true) {
          _breakElapsed += const Duration(seconds: 1);
        }
      });
    });
  }
  
  Future<void> _startBreak() async {
    final success = await EmployeeService.startBreak();
    if (success) {
      await _loadTimeStatus();
    }
  }
  
  Future<void> _endBreak() async {
    await EmployeeService.endBreak();
    await _loadTimeStatus();
  }

  String get _employeeName {
    final session = EmployeeAuthService.currentSession;
    return session?.employeeName ?? 'Mitarbeiter';
  }

  String get _companyName {
    final session = EmployeeAuthService.currentSession;
    return session?.companyName ?? '';
  }

  String _formatHoursMinutes(double hours) {
    final hoursInt = hours.floor();
    final minutes = ((hours - hoursInt) * 60).round();
    return '$hoursInt:${minutes.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _buildBody(),
      bottomNavigationBar: _buildBottomNavigation(),
      floatingActionButton: _currentIndex == 0 ? _buildClockButton() : null,
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
    );
  }

  Widget _buildBody() {
    switch (_currentIndex) {
      case 0:
        return _buildHomeTab();
      case 1:
        return _buildScheduleTab();
      case 2:
        return const SizedBox(); // Placeholder für FAB
      case 3:
        return _buildNotificationsTab();
      case 4:
        return _buildProfileTab();
      default:
        return _buildHomeTab();
    }
  }

  // ===== HOME TAB =====
  Widget _buildHomeTab() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF14AD9F), Color(0xFFE8F5F3)],
          stops: [0.0, 0.3],
        ),
      ),
      child: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadAllData,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header mit Begrüßung
                _buildHeader(),
                const SizedBox(height: 20),
                
                // 5-Tage Vorschau
                _buildFiveDayPreview(),
                const SizedBox(height: 16),
                
                // Letzter & Nächster Einsatz
                _buildShiftCards(),
                const SizedBox(height: 16),
                
                // Ereignisse
                _buildEventsCard(),
                const SizedBox(height: 16),
                
                // Arbeitszeiten (Monate)
                _buildWorkingHoursSection(),
                const SizedBox(height: 16),
                
                // Dokumente
                _buildDocumentsSection(),
                const SizedBox(height: 16),
                
                // Urlaub & Abwesenheit
                _buildVacationSection(),
                const SizedBox(height: 100), // Space für FAB
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Hey ${_employeeName.split(' ').first}!',
              style: const TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            if (_companyName.isNotEmpty)
              Text(
                _companyName,
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.white.withValues(alpha: 0.8),
                ),
              ),
          ],
        ),
        Row(
          children: [
            IconButton(
              onPressed: () => _showNotificationsDialog(),
              icon: const Icon(Icons.notifications_outlined, color: Colors.white),
            ),
            IconButton(
              onPressed: () => _handleLogout(),
              icon: const Icon(Icons.logout, color: Colors.white),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildFiveDayPreview() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 8),
            child: Text(
              '5-Tage Vorschau',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Colors.grey,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: List.generate(5, (index) {
              final date = DateTime.now().add(Duration(days: index));
              final hasShift = _hasShiftOnDate(date);
              final isToday = index == 0;
              
              return _buildDayPreviewItem(
                label: index == 0 ? 'Heute' : index == 1 ? 'Morgen' : DateFormat('E', 'de_DE').format(date),
                day: date.day.toString(),
                hasShift: hasShift,
                isToday: isToday,
              );
            }),
          ),
        ],
      ),
    );
  }

  Widget _buildDayPreviewItem({
    required String label,
    required String day,
    required bool hasShift,
    required bool isToday,
  }) {
    return Column(
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: isToday ? const Color(0xFF14AD9F) : Colors.grey[600],
            fontWeight: isToday ? FontWeight.bold : FontWeight.normal,
          ),
        ),
        const SizedBox(height: 4),
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: isToday ? const Color(0xFF14AD9F).withValues(alpha: 0.1) : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Center(
            child: Text(
              day,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: isToday ? const Color(0xFF14AD9F) : Colors.black87,
              ),
            ),
          ),
        ),
        const SizedBox(height: 4),
        hasShift
            ? const Icon(Icons.calendar_today, size: 14, color: Color(0xFF14AD9F))
            : const Text('–', style: TextStyle(color: Colors.grey)),
      ],
    );
  }

  bool _hasShiftOnDate(DateTime date) {
    if (_scheduleData == null) return false;
    final dateStr = DateFormat('yyyy-MM-dd').format(date);
    return _scheduleData!.shifts.any((s) => s.date == dateStr);
  }

  Shift? _getShiftOnDate(DateTime date) {
    if (_scheduleData == null) return null;
    final dateStr = DateFormat('yyyy-MM-dd').format(date);
    try {
      return _scheduleData!.shifts.firstWhere((s) => s.date == dateStr);
    } catch (_) {
      return null;
    }
  }

  Widget _buildShiftCards() {
    final todayShift = _getShiftOnDate(DateTime.now());
    final tomorrowShift = _getShiftOnDate(DateTime.now().add(const Duration(days: 1)));
    
    // Finde letzten abgeschlossenen Einsatz
    final now = DateTime.now();
    Shift? lastShift;
    for (final shift in _scheduleData?.shifts ?? []) {
      final shiftDate = DateTime.tryParse(shift.date);
      if (shiftDate != null && shiftDate.isBefore(now)) {
        lastShift = shift;
        break;
      }
    }
    
    // Finde nächsten Einsatz
    Shift? nextShift = todayShift ?? tomorrowShift;
    if (nextShift == null) {
      for (final shift in _scheduleData?.shifts ?? []) {
        final shiftDate = DateTime.tryParse(shift.date);
        if (shiftDate != null && shiftDate.isAfter(now)) {
          nextShift = shift;
          break;
        }
      }
    }

    return Row(
      children: [
        Expanded(
          child: _buildInfoCard(
            title: 'Letzter Einsatz',
            subtitle: lastShift != null 
                ? _formatShiftDate(lastShift.date)
                : 'Kein Einsatz',
            value: lastShift != null 
                ? _formatDuration(lastShift.startTime, lastShift.endTime)
                : '–',
            unit: 'Stunden',
            icon: Icons.access_time_outlined,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildInfoCard(
            title: 'Nächster Einsatz',
            subtitle: nextShift != null 
                ? _formatShiftDate(nextShift.date)
                : 'Kein Einsatz',
            value: nextShift != null 
                ? '${nextShift.startTime} - ${nextShift.endTime}'
                : '–',
            unit: 'Uhr',
            icon: Icons.calendar_today_outlined,
          ),
        ),
      ],
    );
  }

  String _formatShiftDate(String dateStr) {
    final date = DateTime.tryParse(dateStr);
    if (date == null) return dateStr;
    
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final tomorrow = today.add(const Duration(days: 1));
    final shiftDay = DateTime(date.year, date.month, date.day);
    
    if (shiftDay == today) return 'Heute';
    if (shiftDay == tomorrow) return 'Morgen';
    return DateFormat('E dd.MM.', 'de_DE').format(date);
  }

  String _formatDuration(String startTime, String endTime) {
    try {
      final start = DateFormat('HH:mm').parse(startTime);
      final end = DateFormat('HH:mm').parse(endTime);
      final diff = end.difference(start);
      final hours = diff.inMinutes / 60;
      return '${hours.floor()}:${(diff.inMinutes % 60).toString().padLeft(2, '0')}';
    } catch (_) {
      return '–';
    }
  }

  Widget _buildInfoCard({
    required String title,
    required String subtitle,
    required String value,
    required String unit,
    required IconData icon,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: Color(0xFF14AD9F),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: TextStyle(
              fontSize: 13,
              color: Colors.grey[600],
            ),
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: Text(
                        value,
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Colors.black87,
                        ),
                      ),
                    ),
                    Text(
                      unit,
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[500],
                      ),
                    ),
                  ],
                ),
              ),
              Icon(icon, color: Colors.grey[400], size: 20),
            ],
          ),
        ],
      ),
    );
  }

  List<Map<String, dynamic>> _generateEvents() {
    final events = <Map<String, dynamic>>[];
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    
    if (_scheduleData == null) return events;
    
    for (final shift in _scheduleData!.shifts) {
      try {
        final shiftDate = DateTime.parse(shift.date);
        final shiftDateOnly = DateTime(shiftDate.year, shiftDate.month, shiftDate.day);
        
        // Heutige Schicht
        if (shiftDateOnly.isAtSameMomentAs(today)) {
          events.add({
            'icon': Icons.work_outline,
            'color': const Color(0xFF14AD9F),
            'title': 'Schicht heute',
            'subtitle': '${shift.startTime} - ${shift.endTime} Uhr',
            'priority': 0,
          });
        }
        // Morgige Schicht
        else if (shiftDateOnly.difference(today).inDays == 1) {
          events.add({
            'icon': Icons.schedule,
            'color': Colors.blue,
            'title': 'Schicht morgen',
            'subtitle': '${shift.startTime} - ${shift.endTime} Uhr',
            'priority': 1,
          });
        }
        // Neue Schichten diese Woche (noch nicht bestätigt)
        else if (shiftDateOnly.isAfter(today) && 
                 shiftDateOnly.difference(today).inDays <= 7 &&
                 shift.status != 'confirmed') {
          events.add({
            'icon': Icons.notification_important,
            'color': Colors.orange,
            'title': 'Neue Schicht: ${DateFormat('EEEE', 'de_DE').format(shiftDate)}',
            'subtitle': '${shift.startTime} - ${shift.endTime} Uhr',
            'priority': 2,
          });
        }
      } catch (e) {
        // Datum konnte nicht geparst werden
      }
    }
    
    // Aktive Zeiterfassung mit Pause-Status
    if (_timeStatus?.isTracking == true) {
      final isOnBreak = _timeStatus?.isOnBreak ?? false;
      final statusText = isOnBreak 
          ? 'In Pause (${_formatHoursMinutes(_breakElapsed.inMinutes / 60.0)})'
          : 'Seit ${_formatHoursMinutes(_elapsed.inMinutes / 60.0)} Stunden';
      events.insert(0, {
        'icon': isOnBreak ? Icons.coffee : Icons.timer,
        'color': isOnBreak ? Colors.orange : const Color(0xFF14AD9F),
        'title': isOnBreak ? 'Pause aktiv' : 'Zeiterfassung aktiv',
        'subtitle': statusText,
        'priority': -1,
        'isTimeTracking': true,
      });
    }
    
    // Sortiere nach Priorität
    events.sort((a, b) => (a['priority'] as int).compareTo(b['priority'] as int));
    
    return events.take(5).toList(); // Max 5 Ereignisse
  }
  
  Widget _buildEventsCard() {
    final events = _generateEvents();
    
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Ereignisse',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Colors.grey,
                ),
              ),
              if (events.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFF14AD9F).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${events.length}',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF14AD9F),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          if (events.isEmpty)
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Text(
                  'Keine Ereignisse',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey[500],
                  ),
                ),
              ),
            )
          else
            ...events.map((event) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: (event['color'] as Color).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      event['icon'] as IconData,
                      color: event['color'] as Color,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          event['title'] as String,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: Colors.black87,
                          ),
                        ),
                        Text(
                          event['subtitle'] as String,
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            )),
        ],
      ),
    );
  }

  Widget _buildWorkingHoursSection() {
    final now = DateTime.now();
    final currentMonth = DateFormat('MMMM', 'de_DE').format(now);
    final lastMonth = DateFormat('MMMM', 'de_DE').format(DateTime(now.year, now.month - 1));
    
    final totalHours = (_weeklyStats['totalHours'] as num?)?.toDouble() ?? 0.0;
    final hoursInt = totalHours.floor();
    final minutes = ((totalHours - hoursInt) * 60).round();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.only(left: 4),
          child: Text(
            'Arbeitszeiten',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Color(0xFF14AD9F),
            ),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildMonthCard(
                month: currentMonth,
                hours: '$hoursInt:${minutes.toString().padLeft(2, '0')}',
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildMonthCard(
                month: lastMonth,
                hours: _formatHoursMinutes(_lastMonthStats['totalHours'] ?? 0.0),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildMonthCard({required String month, required String hours}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            month,
            style: TextStyle(
              fontSize: 13,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    hours,
                    style: const TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                  ),
                  Text(
                    'Stunden',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[500],
                    ),
                  ),
                ],
              ),
              Icon(Icons.bar_chart_rounded, color: Colors.grey[400], size: 24),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDocumentsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.only(left: 4),
          child: Text(
            'Dokumente',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Color(0xFF14AD9F),
            ),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildDocumentCard(label: 'Neu', count: 0),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildDocumentCard(label: 'Angefragt', count: 0),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildDocumentCard({required String label, required int count}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                count.toString(),
                style: const TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
              ),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[500],
                ),
              ),
            ],
          ),
          Icon(Icons.description_outlined, color: Colors.grey[400], size: 24),
        ],
      ),
    );
  }

  Widget _buildVacationSection() {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Nächster Urlaub',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Colors.grey,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    'Kein Urlaub geplant.',
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey[500],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Abwesenheitsanträge',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Colors.grey,
                    ),
                  ),
                  const Text(
                    'offen',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '0',
                            style: TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.bold,
                              color: Colors.black87,
                            ),
                          ),
                          Text(
                            'Anträge',
                            style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey,
                          ),
                        ),
                      ],
                    ),
                    Icon(Icons.flight_takeoff, color: Colors.grey[400], size: 24),
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
      ),
    );
  }

  // ===== SCHEDULE TAB =====
  Widget _buildScheduleTab() {
    return Container(
      color: const Color(0xFFF5F5F5),
      child: SafeArea(
        child: Column(
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(16),
              color: const Color(0xFF14AD9F),
              child: const Row(
                children: [
                  Text(
                    'Dienstplan',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
            // Content
            Expanded(
              child: _scheduleData == null || _scheduleData!.shifts.isEmpty
                  ? const Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.event_busy, size: 64, color: Colors.grey),
                          SizedBox(height: 16),
                          Text(
                            'Keine Schichten geplant',
                            style: TextStyle(color: Colors.grey, fontSize: 16),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _scheduleData!.shifts.length,
                      itemBuilder: (context, index) {
                        final shift = _scheduleData!.shifts[index];
                        return _buildShiftListItem(shift);
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildShiftListItem(Shift shift) {
    final date = DateTime.tryParse(shift.date);
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
            width: 50,
            child: Column(
              children: [
                Text(
                  date != null ? DateFormat('E', 'de_DE').format(date) : '',
                  style: TextStyle(color: Colors.grey[600], fontSize: 12),
                ),
                Text(
                  date?.day.toString() ?? '',
                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
          Container(
            width: 3,
            height: 40,
            margin: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: const Color(0xFF14AD9F),
              borderRadius: BorderRadius.circular(2),
            ),
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
                  style: TextStyle(color: Colors.grey[600], fontSize: 13),
                ),
              ],
            ),
          ),
          shift.status == 'CONFIRMED'
              ? const Icon(Icons.check_circle, color: Colors.green)
              : const Icon(Icons.schedule, color: Colors.orange),
        ],
      ),
    );
  }

  // ===== NOTIFICATIONS TAB =====
  Widget _buildNotificationsTab() {
    return Container(
      color: const Color(0xFFF5F5F5),
      child: SafeArea(
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              color: const Color(0xFF14AD9F),
              child: const Row(
                children: [
                  Text(
                    'Benachrichtigungen',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
            const Expanded(
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.notifications_none, size: 64, color: Colors.grey),
                    SizedBox(height: 16),
                    Text(
                      'Keine Benachrichtigungen',
                      style: TextStyle(color: Colors.grey, fontSize: 16),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ===== PROFILE TAB =====
  Widget _buildProfileTab() {
    return Container(
      color: const Color(0xFFF5F5F5),
      child: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(24),
                color: const Color(0xFF14AD9F),
                child: Column(
                  children: [
                    CircleAvatar(
                      radius: 50,
                      backgroundColor: Colors.white,
                      child: Text(
                        _employeeName.isNotEmpty ? _employeeName[0].toUpperCase() : 'M',
                        style: const TextStyle(
                          fontSize: 40,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF14AD9F),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      _employeeName,
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    Text(
                      _companyName,
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.white.withValues(alpha: 0.8),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              _buildProfileMenuItem(Icons.person_outline, 'Persönliche Daten'),
              _buildProfileMenuItem(Icons.lock_outline, 'Passwort ändern'),
              _buildProfileMenuItem(Icons.help_outline, 'Hilfe'),
              _buildProfileMenuItem(Icons.info_outline, 'Über'),
              const SizedBox(height: 16),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: ElevatedButton(
                  onPressed: _handleLogout,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red,
                    foregroundColor: Colors.white,
                    minimumSize: const Size(double.infinity, 50),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text('Abmelden'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProfileMenuItem(IconData icon, String title) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        leading: Icon(icon, color: const Color(0xFF14AD9F)),
        title: Text(title),
        trailing: const Icon(Icons.chevron_right, color: Colors.grey),
        onTap: () {},
      ),
    );
  }

  // ===== BOTTOM NAVIGATION =====
  Widget _buildBottomNavigation() {
    return BottomAppBar(
      shape: const CircularNotchedRectangle(),
      notchMargin: 8,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildNavItem(0, Icons.home_outlined, Icons.home, 'Home'),
          _buildNavItem(1, Icons.calendar_today_outlined, Icons.calendar_today, 'Kalender'),
          const SizedBox(width: 48), // Space für FAB
          _buildNavItem(3, Icons.notifications_outlined, Icons.notifications, 'Meldungen'),
          _buildNavItem(4, Icons.person_outline, Icons.person, 'Profil'),
        ],
      ),
    );
  }

  Widget _buildNavItem(int index, IconData icon, IconData activeIcon, String label) {
    final isActive = _currentIndex == index;
    return InkWell(
      onTap: () => setState(() => _currentIndex = index),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isActive ? activeIcon : icon,
              color: isActive ? const Color(0xFF14AD9F) : Colors.grey,
            ),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                color: isActive ? const Color(0xFF14AD9F) : Colors.grey,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildClockButton() {
    final isTracking = _timeStatus?.isTracking ?? false;
    final isOnBreak = _timeStatus?.isOnBreak ?? false;
    
    if (!isTracking) {
      // Nicht eingestempelt - einfacher Play-Button
      return FloatingActionButton(
        onPressed: _handleClockIn,
        backgroundColor: const Color(0xFF14AD9F),
        child: const Icon(
          Icons.play_arrow,
          size: 32,
          color: Colors.white,
        ),
      );
    }
    
    // Eingestempelt - expandierter Button mit Pause/Stop
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Aktive Zeit-Anzeige
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          margin: const EdgeInsets.only(bottom: 8),
          decoration: BoxDecoration(
            color: isOnBreak ? Colors.orange : const Color(0xFF14AD9F),
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: (isOnBreak ? Colors.orange : const Color(0xFF14AD9F)).withValues(alpha: 0.3),
                blurRadius: 8,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                isOnBreak ? Icons.coffee : Icons.timer,
                color: Colors.white,
                size: 16,
              ),
              const SizedBox(width: 6),
              Text(
                isOnBreak 
                  ? 'Pause: ${_formatElapsedTime(_breakElapsed)}'
                  : _formatElapsedTime(_elapsed),
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
        // Buttons
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Pause/Fortsetzen Button
            FloatingActionButton.small(
              heroTag: 'break_btn',
              onPressed: isOnBreak ? _endBreak : _startBreak,
              backgroundColor: isOnBreak ? Colors.green : Colors.orange,
              child: Icon(
                isOnBreak ? Icons.play_arrow : Icons.pause,
                color: Colors.white,
              ),
            ),
            const SizedBox(width: 16),
            // Stop Button
            FloatingActionButton(
              heroTag: 'stop_btn',
              onPressed: _handleClockOut,
              backgroundColor: Colors.red,
              child: const Icon(
                Icons.stop,
                size: 32,
                color: Colors.white,
              ),
            ),
          ],
        ),
      ],
    );
  }
  
  String _formatElapsedTime(Duration duration) {
    final hours = duration.inHours;
    final minutes = duration.inMinutes.remainder(60);
    final seconds = duration.inSeconds.remainder(60);
    return '${hours.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  // ===== ACTIONS =====
  
  /// Prüft ob heute eine Schicht geplant ist
  bool _hasTodayShift() {
    if (_scheduleData == null) return false;
    
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    
    for (final shift in _scheduleData!.shifts) {
      try {
        final shiftDate = DateTime.parse(shift.date);
        final shiftDateOnly = DateTime(shiftDate.year, shiftDate.month, shiftDate.day);
        if (shiftDateOnly.isAtSameMomentAs(today)) {
          return true;
        }
      } catch (_) {}
    }
    return false;
  }
  
  Future<void> _handleClockIn() async {
    debugPrint('🟢 _handleClockIn called');
    
    // Prüfe ob heute eine Schicht vorhanden ist
    if (!_hasTodayShift()) {
      // Keine Schicht - Dialog für Grundangabe anzeigen
      final reason = await _showNoShiftReasonDialog();
      if (reason == null || reason.isEmpty) {
        // Benutzer hat abgebrochen
        return;
      }
      
      // Mit Grund einstempeln
      final result = await EmployeeService.clockIn(description: reason);
      debugPrint('🟢 ClockIn (mit Grund) result: success=${result.success}, error=${result.error}');
      if (result.success) {
        Get.snackbar('Eingestempelt', 'Schicht außerplanmäßig gestartet');
        _loadAllData();
      } else {
        Get.snackbar('Fehler', result.error ?? 'Unbekannter Fehler');
      }
      return;
    }
    
    // Schicht vorhanden - normal einstempeln
    final result = await EmployeeService.clockIn();
    debugPrint('🟢 ClockIn result: success=${result.success}, error=${result.error}');
    if (result.success) {
      Get.snackbar('Eingestempelt', 'Schicht gestartet');
      _loadAllData();
    } else {
      Get.snackbar('Fehler', result.error ?? 'Unbekannter Fehler');
    }
  }
  
  Future<String?> _showNoShiftReasonDialog() async {
    final reasonController = TextEditingController();
    
    return await Get.dialog<String>(
      AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.orange.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.warning_amber_rounded, color: Colors.orange),
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: Text(
                'Keine Schicht geplant',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Für heute ist keine Schicht eingetragen. Bitte gib einen Grund für das Einstempeln an:',
              style: TextStyle(color: Colors.grey, fontSize: 14),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: reasonController,
              maxLines: 3,
              decoration: InputDecoration(
                hintText: 'z.B. Vertretung für Max, Überstunden, ...',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFF14AD9F), width: 2),
                ),
              ),
              autofocus: true,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Get.back(result: null),
            child: const Text('Abbrechen'),
          ),
          ElevatedButton(
            onPressed: () {
              final reason = reasonController.text.trim();
              if (reason.isEmpty) {
                Get.snackbar(
                  'Grund erforderlich', 
                  'Bitte gib einen Grund an',
                  backgroundColor: Colors.orange,
                  colorText: Colors.white,
                );
                return;
              }
              Get.back(result: reason);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF14AD9F),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('Einstempeln'),
          ),
        ],
      ),
    );
  }

  Future<void> _handleClockOut() async {
    debugPrint('🔴 _handleClockOut called');
    final result = await EmployeeService.clockOut();
    debugPrint('🔴 ClockOut result: success=${result.success}, error=${result.error}');
    if (result.success) {
      _timer?.cancel();
      setState(() {
        _timeStatus = TimeTrackingStatus(isTracking: false);
        _elapsed = Duration.zero;
      });
      Get.snackbar('Ausgestempelt', 'Schicht beendet');
      _loadAllData();
    } else {
      Get.snackbar('Fehler', result.error ?? 'Unbekannter Fehler');
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
    setState(() => _currentIndex = 3);
  }
}
