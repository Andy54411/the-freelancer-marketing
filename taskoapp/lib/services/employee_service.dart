import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'employee_auth_service.dart';

/// Employee Service für Taskilo
/// Verwaltet Zeiterfassung, Dienstplan und Abwesenheitsanträge
class EmployeeService {
  // API Base URL - 10.0.2.2 ist localhost für Android-Emulator
  static String get _baseUrl {
    if (kDebugMode) {
      // Für Android-Emulator: 10.0.2.2 = Host localhost
      return 'http://10.0.2.2:3000/api';
    }
    return 'https://taskilo.de/api';
  }

  // ===== ZEITERFASSUNG =====

  /// Holt den aktuellen Zeiterfassungs-Status
  static Future<TimeTrackingStatus> getTimeTrackingStatus() async {
    final companyId = EmployeeAuthService.companyId;
    final employeeId = EmployeeAuthService.currentSession?.employeeId;

    debugPrint('📊 getTimeTrackingStatus - companyId: $companyId, employeeId: $employeeId');

    if (companyId == null || employeeId == null) {
      debugPrint('❌ getTimeTrackingStatus: Nicht eingeloggt');
      return TimeTrackingStatus.notLoggedIn();
    }

    try {
      final url = '$_baseUrl/companies/$companyId/employees/time-entries?employeeId=$employeeId&status=ACTIVE';
      debugPrint('📡 Fetching time status from: $url');
      
      final response = await http.get(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
      );

      debugPrint('📡 Status response: ${response.statusCode}');
      debugPrint('📡 Status body: ${response.body}');

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        final entries = data['entries'] as List;
        debugPrint('📊 Active entries found: ${entries.length}');
        
        if (entries.isNotEmpty) {
          final activeEntry = entries.first;
          debugPrint('✅ Active entry found: $activeEntry');
          
          // Prüfe ob aktuell in Pause
          final isOnBreak = activeEntry['isOnBreak'] == true;
          DateTime? breakStartTime;
          if (isOnBreak && activeEntry['breakStartTime'] != null) {
            try {
              breakStartTime = DateTime.parse(activeEntry['breakStartTime']);
            } catch (e) {
              debugPrint('⚠️ Could not parse breakStartTime: $e');
            }
          }
          final totalBreakMinutes = activeEntry['breakTime'] ?? 0;
          
          return TimeTrackingStatus(
            isTracking: true,
            currentEntry: TimeEntry.fromJson(activeEntry),
            startTime: DateTime.parse('${activeEntry['date']}T${activeEntry['startTime']}'),
            isOnBreak: isOnBreak,
            breakStartTime: breakStartTime,
            totalBreakMinutes: totalBreakMinutes,
          );
        }
      }
      debugPrint('📊 No active entries - isTracking: false');
      return TimeTrackingStatus(isTracking: false);
    } catch (e) {
      debugPrint('❌ Error getting time tracking status: $e');
      return TimeTrackingStatus(isTracking: false, error: e.toString());
    }
  }

  /// Stempelt ein (Clock In)
  static Future<TimeTrackingResult> clockIn({
    String? projectName,
    String? description,
    String? location,
  }) async {
    final companyId = EmployeeAuthService.companyId;
    final employeeId = EmployeeAuthService.currentSession?.employeeId;

    debugPrint('🕐 Clock In - companyId: $companyId, employeeId: $employeeId');

    if (companyId == null || employeeId == null) {
      debugPrint('❌ Clock In failed: Nicht eingeloggt');
      return TimeTrackingResult.failure('Nicht eingeloggt');
    }

    try {
      final url = '$_baseUrl/companies/$companyId/employees/time-entries';
      debugPrint('📡 Calling API: $url');
      
      final response = await http.post(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'action': 'clock-in',
          'employeeId': employeeId,
          'projectName': projectName,
          'description': description,
          'location': location,
        }),
      );

      debugPrint('📡 Response status: ${response.statusCode}');
      debugPrint('📡 Response body: ${response.body}');

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        debugPrint('✅ Clock In successful');
        return TimeTrackingResult.success(
          message: 'Erfolgreich eingestempelt',
          entry: TimeEntry.fromJson(data['entry']),
        );
      } else {
        debugPrint('❌ Clock In failed: ${data['error']}');
        return TimeTrackingResult.failure(data['error'] ?? 'Fehler beim Einstempeln');
      }
    } catch (e) {
      debugPrint('❌ Clock In exception: $e');
      return TimeTrackingResult.failure('Ein Fehler ist aufgetreten: $e');
    }
  }

  /// Stempelt aus (Clock Out)
  static Future<TimeTrackingResult> clockOut() async {
    final companyId = EmployeeAuthService.companyId;
    final employeeId = EmployeeAuthService.currentSession?.employeeId;

    if (companyId == null || employeeId == null) {
      return TimeTrackingResult.failure('Nicht eingeloggt');
    }

    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/companies/$companyId/employees/time-entries'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'action': 'clock-out',
          'employeeId': employeeId,
        }),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        final totalHours = (data['summary']?['totalHours'] as num?)?.toDouble();
        return TimeTrackingResult.success(
          message: 'Erfolgreich ausgestempelt',
          totalHours: totalHours,
        );
      } else {
        return TimeTrackingResult.failure(data['error'] ?? 'Fehler beim Ausstempeln');
      }
    } catch (e) {
      return TimeTrackingResult.failure('Ein Fehler ist aufgetreten: $e');
    }
  }

  /// Startet Pause
  static Future<bool> startBreak() async {
    final companyId = EmployeeAuthService.companyId;
    final employeeId = EmployeeAuthService.currentSession?.employeeId;

    debugPrint('☕ startBreak - companyId: $companyId, employeeId: $employeeId');

    if (companyId == null || employeeId == null) {
      debugPrint('❌ startBreak: Nicht eingeloggt');
      return false;
    }

    try {
      final url = '$_baseUrl/companies/$companyId/employees/time-entries';
      debugPrint('📡 Calling break-start: $url');
      
      final response = await http.post(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'action': 'break-start',
          'employeeId': employeeId,
        }),
      );

      debugPrint('📡 Break-start response: ${response.statusCode} - ${response.body}');
      final data = jsonDecode(response.body);
      return data['success'] == true;
    } catch (e) {
      debugPrint('❌ startBreak exception: $e');
      return false;
    }
  }

  /// Beendet Pause
  static Future<int> endBreak() async {
    final companyId = EmployeeAuthService.companyId;
    final employeeId = EmployeeAuthService.currentSession?.employeeId;

    debugPrint('☕ endBreak - companyId: $companyId, employeeId: $employeeId');

    if (companyId == null || employeeId == null) {
      debugPrint('❌ endBreak: Nicht eingeloggt');
      return 0;
    }

    try {
      final url = '$_baseUrl/companies/$companyId/employees/time-entries';
      debugPrint('📡 Calling break-end: $url');
      
      final response = await http.post(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'action': 'break-end',
          'employeeId': employeeId,
        }),
      );

      debugPrint('📡 Break-end response: ${response.statusCode} - ${response.body}');
      final data = jsonDecode(response.body);
      return data['breakMinutes'] ?? 0;
    } catch (e) {
      debugPrint('❌ endBreak exception: $e');
      return 0;
    }
  }

  /// Holt Wochen-Statistiken (Schichten + Arbeitszeit)
  static Future<Map<String, dynamic>> getWeeklyStats() async {
    final companyId = EmployeeAuthService.companyId;
    final employeeId = EmployeeAuthService.currentSession?.employeeId;

    debugPrint('📊 getWeeklyStats called - companyId: $companyId, employeeId: $employeeId');

    if (companyId == null || employeeId == null) {
      return {'totalHours': 0.0, 'shiftsCount': 0};
    }

    try {
      // Berechne Wochenstart (Montag) und -ende (Sonntag)
      final now = DateTime.now();
      final weekday = now.weekday;
      final monday = now.subtract(Duration(days: weekday - 1));
      final sunday = monday.add(const Duration(days: 6));
      
      final startDate = '${monday.year}-${monday.month.toString().padLeft(2, '0')}-${monday.day.toString().padLeft(2, '0')}';
      final endDate = '${sunday.year}-${sunday.month.toString().padLeft(2, '0')}-${sunday.day.toString().padLeft(2, '0')}';

      debugPrint('📊 Weekly stats date range: $startDate to $endDate');

      // Hole Schichten aus dem Schedule (geplante Arbeitszeit)
      final scheduleUrl = '$_baseUrl/companies/$companyId/employees/schedule?employeeId=$employeeId&startDate=$startDate&endDate=$endDate';
      
      final scheduleResponse = await http.get(
        Uri.parse(scheduleUrl),
        headers: {'Content-Type': 'application/json'},
      );

      final scheduleData = jsonDecode(scheduleResponse.body);
      debugPrint('📊 Schedule response: ${scheduleResponse.statusCode}');

      double totalHours = 0.0;
      int shiftsCount = 0;

      if (scheduleResponse.statusCode == 200 && scheduleData['success'] == true) {
        final summary = scheduleData['summary'];
        totalHours = (summary['totalHours'] ?? 0).toDouble();
        shiftsCount = summary['totalShifts'] ?? 0;
        debugPrint('📊 From schedule: $totalHours hours, $shiftsCount shifts');
      }

      return {
        'totalHours': totalHours,
        'shiftsCount': shiftsCount,
      };
    } catch (e) {
      debugPrint('❌ getWeeklyStats exception: $e');
      return {'totalHours': 0.0, 'shiftsCount': 0};
    }
  }

  /// Holt Statistiken des letzten Monats
  static Future<Map<String, dynamic>> getLastMonthStats() async {
    final companyId = EmployeeAuthService.companyId;
    final employeeId = EmployeeAuthService.currentSession?.employeeId;

    if (companyId == null || employeeId == null) {
      return {'totalHours': 0.0};
    }

    try {
      // Berechne letzten Monat
      final now = DateTime.now();
      final lastMonth = DateTime(now.year, now.month - 1, 1);
      final lastMonthEnd = DateTime(now.year, now.month, 0); // Letzter Tag des Vormonats
      
      final startDate = '${lastMonth.year}-${lastMonth.month.toString().padLeft(2, '0')}-01';
      final endDate = '${lastMonthEnd.year}-${lastMonthEnd.month.toString().padLeft(2, '0')}-${lastMonthEnd.day.toString().padLeft(2, '0')}';

      final scheduleUrl = '$_baseUrl/companies/$companyId/employees/schedule?employeeId=$employeeId&startDate=$startDate&endDate=$endDate';
      
      final scheduleResponse = await http.get(
        Uri.parse(scheduleUrl),
        headers: {'Content-Type': 'application/json'},
      );

      final scheduleData = jsonDecode(scheduleResponse.body);

      if (scheduleResponse.statusCode == 200 && scheduleData['success'] == true) {
        final summary = scheduleData['summary'];
        return {
          'totalHours': (summary['totalHours'] ?? 0).toDouble(),
        };
      }

      return {'totalHours': 0.0};
    } catch (e) {
      debugPrint('❌ getLastMonthStats exception: $e');
      return {'totalHours': 0.0};
    }
  }

  /// Holt Zeiteinträge-Historie
  static Future<List<TimeEntry>> getTimeEntries({
    String? startDate,
    String? endDate,
  }) async {
    final companyId = EmployeeAuthService.companyId;
    final employeeId = EmployeeAuthService.currentSession?.employeeId;

    debugPrint('📋 getTimeEntries called - companyId: $companyId, employeeId: $employeeId');

    if (companyId == null || employeeId == null) {
      debugPrint('📋 Missing companyId or employeeId');
      return [];
    }

    try {
      String url = '$_baseUrl/companies/$companyId/employees/time-entries?employeeId=$employeeId';
      if (startDate != null) url += '&startDate=$startDate';
      if (endDate != null) url += '&endDate=$endDate';

      debugPrint('📋 TimeEntries URL: $url');

      final response = await http.get(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
      );

      debugPrint('📋 TimeEntries response: ${response.statusCode} - ${response.body.substring(0, response.body.length.clamp(0, 500))}');

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        final entries = (data['entries'] as List)
            .map((e) => TimeEntry.fromJson(e))
            .toList();
        debugPrint('📋 Parsed ${entries.length} time entries');
        return entries;
      }
      return [];
    } catch (e) {
      debugPrint('❌ Error loading time entries: $e');
      return [];
    }
  }

  // ===== DIENSTPLAN =====

  /// Holt Dienstplan für aktuelle Woche
  static Future<ScheduleData> getSchedule({
    String? startDate,
    String? endDate,
  }) async {
    final companyId = EmployeeAuthService.companyId;
    final employeeId = EmployeeAuthService.currentSession?.employeeId;

    debugPrint('📅 getSchedule called - companyId: $companyId, employeeId: $employeeId');

    if (companyId == null || employeeId == null) {
      debugPrint('📅 Schedule: Missing companyId or employeeId');
      return ScheduleData.empty();
    }

    try {
      String url = '$_baseUrl/companies/$companyId/employees/schedule?employeeId=$employeeId';
      if (startDate != null) url += '&startDate=$startDate';
      if (endDate != null) url += '&endDate=$endDate';

      debugPrint('📅 Schedule URL: $url');

      final response = await http.get(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
      );

      debugPrint('📅 Schedule response: ${response.statusCode} - ${response.body}');

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        return ScheduleData.fromJson(data);
      }
      return ScheduleData.empty();
    } catch (e) {
      debugPrint('📅 Error loading schedule: $e');
      return ScheduleData.empty();
    }
  }

  /// Bestätigt eine Schicht
  static Future<bool> confirmShift(String shiftId) async {
    final companyId = EmployeeAuthService.companyId;
    final employeeId = EmployeeAuthService.currentSession?.employeeId;

    if (companyId == null || employeeId == null) return false;

    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/companies/$companyId/employees/schedule'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'action': 'confirm',
          'shiftId': shiftId,
          'employeeId': employeeId,
        }),
      );

      final data = jsonDecode(response.body);
      return data['success'] == true;
    } catch (e) {
      return false;
    }
  }

  /// Beantragt Schichttausch
  static Future<bool> requestShiftSwap(String shiftId, String reason) async {
    final companyId = EmployeeAuthService.companyId;
    final employeeId = EmployeeAuthService.currentSession?.employeeId;

    if (companyId == null || employeeId == null) return false;

    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/companies/$companyId/employees/schedule'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'action': 'request-swap',
          'shiftId': shiftId,
          'employeeId': employeeId,
          'reason': reason,
        }),
      );

      final data = jsonDecode(response.body);
      return data['success'] == true;
    } catch (e) {
      return false;
    }
  }

  // ===== ABWESENHEIT =====

  /// Holt Abwesenheitsanträge und Urlaubskontingent
  static Future<AbsenceData> getAbsenceData({String? status}) async {
    final companyId = EmployeeAuthService.companyId;
    final employeeId = EmployeeAuthService.currentSession?.employeeId;

    if (companyId == null || employeeId == null) {
      return AbsenceData.empty();
    }

    try {
      String url = '$_baseUrl/companies/$companyId/employees/absence?employeeId=$employeeId';
      if (status != null) url += '&status=$status';

      final response = await http.get(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        return AbsenceData.fromJson(data);
      }
      return AbsenceData.empty();
    } catch (e) {
      debugPrint('Error loading absence data: $e');
      return AbsenceData.empty();
    }
  }

  /// Erstellt einen Abwesenheitsantrag
  static Future<AbsenceRequestResult> createAbsenceRequest({
    required String type,
    required String startDate,
    required String endDate,
    String? reason,
    String? notes,
    bool halfDay = false,
  }) async {
    final companyId = EmployeeAuthService.companyId;
    final employeeId = EmployeeAuthService.currentSession?.employeeId;

    if (companyId == null || employeeId == null) {
      return AbsenceRequestResult.failure('Nicht eingeloggt');
    }

    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/companies/$companyId/employees/absence'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'employeeId': employeeId,
          'type': type,
          'startDate': startDate,
          'endDate': endDate,
          'reason': reason,
          'notes': notes,
          'halfDay': halfDay,
        }),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        return AbsenceRequestResult.success(
          message: 'Antrag erfolgreich eingereicht',
          request: AbsenceRequest.fromJson(data['request']),
        );
      } else {
        return AbsenceRequestResult.failure(data['error'] ?? 'Fehler beim Einreichen');
      }
    } catch (e) {
      return AbsenceRequestResult.failure('Ein Fehler ist aufgetreten: $e');
    }
  }

  /// Storniert einen Antrag
  static Future<bool> cancelAbsenceRequest(String requestId) async {
    final companyId = EmployeeAuthService.companyId;
    final employeeId = EmployeeAuthService.currentSession?.employeeId;

    if (companyId == null || employeeId == null) return false;

    try {
      final response = await http.patch(
        Uri.parse('$_baseUrl/companies/$companyId/employees/absence'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'requestId': requestId,
          'action': 'cancel',
          'employeeId': employeeId,
        }),
      );

      final data = jsonDecode(response.body);
      return data['success'] == true;
    } catch (e) {
      return false;
    }
  }
}

// ===== DATA MODELS =====

class TimeEntry {
  final String id;
  final String date;
  final String startTime;
  final String? endTime;
  final int? duration;
  final int breakTime;
  final String description;
  final String status;
  final String? projectName;

  TimeEntry({
    required this.id,
    required this.date,
    required this.startTime,
    this.endTime,
    this.duration,
    required this.breakTime,
    required this.description,
    required this.status,
    this.projectName,
  });

  factory TimeEntry.fromJson(Map<String, dynamic> json) {
    return TimeEntry(
      id: json['id'] ?? '',
      date: json['date'] ?? '',
      startTime: json['startTime'] ?? '',
      endTime: json['endTime'],
      duration: json['duration'],
      breakTime: json['breakTime'] ?? 0,
      description: json['description'] ?? '',
      status: json['status'] ?? 'ACTIVE',
      projectName: json['projectName'],
    );
  }

  String get formattedDuration {
    if (duration == null) return '-';
    final hours = duration! ~/ 60;
    final minutes = duration! % 60;
    return '${hours}h ${minutes}min';
  }
}

class TimeTrackingStatus {
  final bool isTracking;
  final TimeEntry? currentEntry;
  final DateTime? startTime;
  final String? error;
  final bool isLoggedIn;
  final bool isOnBreak;
  final DateTime? breakStartTime;
  final int totalBreakMinutes;

  TimeTrackingStatus({
    required this.isTracking,
    this.currentEntry,
    this.startTime,
    this.error,
    this.isLoggedIn = true,
    this.isOnBreak = false,
    this.breakStartTime,
    this.totalBreakMinutes = 0,
  });

  factory TimeTrackingStatus.notLoggedIn() {
    return TimeTrackingStatus(isTracking: false, isLoggedIn: false, isOnBreak: false);
  }

  Duration get elapsedDuration {
    if (startTime == null) return Duration.zero;
    return DateTime.now().difference(startTime!);
  }
}

class TimeTrackingResult {
  final bool success;
  final String? message;
  final String? error;
  final TimeEntry? entry;
  final double? totalHours;

  TimeTrackingResult._({
    required this.success,
    this.message,
    this.error,
    this.entry,
    this.totalHours,
  });

  factory TimeTrackingResult.success({String? message, TimeEntry? entry, double? totalHours}) {
    return TimeTrackingResult._(success: true, message: message, entry: entry, totalHours: totalHours);
  }

  factory TimeTrackingResult.failure(String error) {
    return TimeTrackingResult._(success: false, error: error);
  }
}

class Shift {
  final String id;
  final String date;
  final String startTime;
  final String endTime;
  final String position;
  final String department;
  final String status;
  final String? notes;

  Shift({
    required this.id,
    required this.date,
    required this.startTime,
    required this.endTime,
    required this.position,
    required this.department,
    required this.status,
    this.notes,
  });

  factory Shift.fromJson(Map<String, dynamic> json) {
    return Shift(
      id: json['id'] ?? '',
      date: json['date'] ?? '',
      startTime: json['startTime'] ?? '',
      endTime: json['endTime'] ?? '',
      position: json['position'] ?? '',
      department: json['department'] ?? '',
      status: json['status'] ?? 'PLANNED',
      notes: json['notes'],
    );
  }
}

class ScheduleData {
  final List<Shift> shifts;
  final Map<String, List<Shift>> scheduleByDate;
  final int totalShifts;
  final double totalHours;
  final String weekStart;
  final String weekEnd;

  ScheduleData({
    required this.shifts,
    required this.scheduleByDate,
    required this.totalShifts,
    required this.totalHours,
    required this.weekStart,
    required this.weekEnd,
  });

  factory ScheduleData.fromJson(Map<String, dynamic> json) {
    final shiftsJson = json['shifts'] as List? ?? [];
    debugPrint('📅 Parsing ${shiftsJson.length} shifts from JSON');
    final shifts = shiftsJson.map((s) {
      debugPrint('📅 Parsing shift: $s');
      return Shift.fromJson(s);
    }).toList();
    debugPrint('📅 Parsed shifts: ${shifts.length}');
    
    final scheduleMap = <String, List<Shift>>{};
    final scheduleJson = json['schedule'] as Map<String, dynamic>? ?? {};
    scheduleJson.forEach((date, shiftsList) {
      scheduleMap[date] = (shiftsList as List).map((s) => Shift.fromJson(s)).toList();
    });

    final summary = json['summary'] ?? {};
    final result = ScheduleData(
      shifts: shifts,
      scheduleByDate: scheduleMap,
      totalShifts: summary['totalShifts'] ?? 0,
      totalHours: (summary['totalHours'] ?? 0).toDouble(),
      weekStart: summary['weekStart'] ?? '',
      weekEnd: summary['weekEnd'] ?? '',
    );
    debugPrint('📅 ScheduleData created: ${result.shifts.length} shifts, ${result.totalHours}h');
    return result;
  }

  factory ScheduleData.empty() {
    return ScheduleData(
      shifts: [],
      scheduleByDate: {},
      totalShifts: 0,
      totalHours: 0,
      weekStart: '',
      weekEnd: '',
    );
  }
}

class AbsenceRequest {
  final String id;
  final String type;
  final String startDate;
  final String endDate;
  final int days;
  final String status;
  final String? reason;
  final String? notes;
  final String requestedAt;

  AbsenceRequest({
    required this.id,
    required this.type,
    required this.startDate,
    required this.endDate,
    required this.days,
    required this.status,
    this.reason,
    this.notes,
    required this.requestedAt,
  });

  factory AbsenceRequest.fromJson(Map<String, dynamic> json) {
    return AbsenceRequest(
      id: json['id'] ?? '',
      type: json['type'] ?? '',
      startDate: json['startDate'] ?? '',
      endDate: json['endDate'] ?? '',
      days: json['days'] ?? 0,
      status: json['status'] ?? 'PENDING',
      reason: json['reason'],
      notes: json['notes'],
      requestedAt: json['requestedAt'] ?? '',
    );
  }

  String get typeLabel {
    switch (type) {
      case 'VACATION': return 'Urlaub';
      case 'SICK': return 'Krankheit';
      case 'PERSONAL': return 'Persönlich';
      case 'TRAINING': return 'Weiterbildung';
      default: return 'Sonstiges';
    }
  }

  String get statusLabel {
    switch (status) {
      case 'PENDING': return 'Ausstehend';
      case 'APPROVED': return 'Genehmigt';
      case 'REJECTED': return 'Abgelehnt';
      case 'CANCELLED': return 'Storniert';
      default: return status;
    }
  }
}

class VacationBalance {
  final int totalDays;
  final int usedDays;
  final int remainingDays;
  final int pendingDays;

  VacationBalance({
    required this.totalDays,
    required this.usedDays,
    required this.remainingDays,
    required this.pendingDays,
  });

  factory VacationBalance.fromJson(Map<String, dynamic> json) {
    return VacationBalance(
      totalDays: json['totalDays'] ?? 30,
      usedDays: json['usedDays'] ?? 0,
      remainingDays: json['remainingDays'] ?? 30,
      pendingDays: json['pendingDays'] ?? 0,
    );
  }
}

class AbsenceData {
  final List<AbsenceRequest> requests;
  final VacationBalance vacation;
  final int pending;
  final int approved;
  final int rejected;

  AbsenceData({
    required this.requests,
    required this.vacation,
    required this.pending,
    required this.approved,
    required this.rejected,
  });

  factory AbsenceData.fromJson(Map<String, dynamic> json) {
    final requestsJson = json['requests'] as List? ?? [];
    final summary = json['summary'] ?? {};
    
    return AbsenceData(
      requests: requestsJson.map((r) => AbsenceRequest.fromJson(r)).toList(),
      vacation: VacationBalance.fromJson(json['vacation'] ?? {}),
      pending: summary['pending'] ?? 0,
      approved: summary['approved'] ?? 0,
      rejected: summary['rejected'] ?? 0,
    );
  }

  factory AbsenceData.empty() {
    return AbsenceData(
      requests: [],
      vacation: VacationBalance(totalDays: 30, usedDays: 0, remainingDays: 30, pendingDays: 0),
      pending: 0,
      approved: 0,
      rejected: 0,
    );
  }
}

class AbsenceRequestResult {
  final bool success;
  final String? message;
  final String? error;
  final AbsenceRequest? request;

  AbsenceRequestResult._({
    required this.success,
    this.message,
    this.error,
    this.request,
  });

  factory AbsenceRequestResult.success({String? message, AbsenceRequest? request}) {
    return AbsenceRequestResult._(success: true, message: message, request: request);
  }

  factory AbsenceRequestResult.failure(String error) {
    return AbsenceRequestResult._(success: false, error: error);
  }
}
