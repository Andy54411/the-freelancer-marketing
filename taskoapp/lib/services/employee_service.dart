import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'employee_auth_service.dart';

/// Employee Service für Taskilo
/// Verwaltet Zeiterfassung, Dienstplan und Abwesenheitsanträge
class EmployeeService {
  // API Base URL
  static const String _baseUrl = 'https://taskilo.de/api';
  // static const String _baseUrl = 'http://localhost:3000/api'; // Für lokale Entwicklung

  // ===== ZEITERFASSUNG =====

  /// Holt den aktuellen Zeiterfassungs-Status
  static Future<TimeTrackingStatus> getTimeTrackingStatus() async {
    final companyId = EmployeeAuthService.companyId;
    final employeeId = EmployeeAuthService.currentSession?.employeeId;

    if (companyId == null || employeeId == null) {
      return TimeTrackingStatus.notLoggedIn();
    }

    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/companies/$companyId/employees/time-entries?employeeId=$employeeId&status=ACTIVE'),
        headers: {'Content-Type': 'application/json'},
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        final entries = data['entries'] as List;
        if (entries.isNotEmpty) {
          final activeEntry = entries.first;
          return TimeTrackingStatus(
            isTracking: true,
            currentEntry: TimeEntry.fromJson(activeEntry),
            startTime: DateTime.parse('${activeEntry['date']}T${activeEntry['startTime']}'),
          );
        }
      }
      return TimeTrackingStatus(isTracking: false);
    } catch (e) {
      debugPrint('Error getting time tracking status: $e');
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

    if (companyId == null || employeeId == null) {
      return TimeTrackingResult.failure('Nicht eingeloggt');
    }

    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/companies/$companyId/employees/time-entries'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'action': 'clock-in',
          'employeeId': employeeId,
          'projectName': projectName,
          'description': description,
          'location': location,
        }),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        return TimeTrackingResult.success(
          message: 'Erfolgreich eingestempelt',
          entry: TimeEntry.fromJson(data['entry']),
        );
      } else {
        return TimeTrackingResult.failure(data['error'] ?? 'Fehler beim Einstempeln');
      }
    } catch (e) {
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
        return TimeTrackingResult.success(
          message: 'Erfolgreich ausgestempelt',
          totalHours: data['summary']['totalHours'],
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

    if (companyId == null || employeeId == null) return false;

    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/companies/$companyId/employees/time-entries'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'action': 'break-start',
          'employeeId': employeeId,
        }),
      );

      final data = jsonDecode(response.body);
      return data['success'] == true;
    } catch (e) {
      return false;
    }
  }

  /// Beendet Pause
  static Future<int> endBreak() async {
    final companyId = EmployeeAuthService.companyId;
    final employeeId = EmployeeAuthService.currentSession?.employeeId;

    if (companyId == null || employeeId == null) return 0;

    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/companies/$companyId/employees/time-entries'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'action': 'break-end',
          'employeeId': employeeId,
        }),
      );

      final data = jsonDecode(response.body);
      return data['breakMinutes'] ?? 0;
    } catch (e) {
      return 0;
    }
  }

  /// Holt Zeiteinträge-Historie
  static Future<List<TimeEntry>> getTimeEntries({
    String? startDate,
    String? endDate,
  }) async {
    final companyId = EmployeeAuthService.companyId;
    final employeeId = EmployeeAuthService.currentSession?.employeeId;

    if (companyId == null || employeeId == null) return [];

    try {
      String url = '$_baseUrl/companies/$companyId/employees/time-entries?employeeId=$employeeId';
      if (startDate != null) url += '&startDate=$startDate';
      if (endDate != null) url += '&endDate=$endDate';

      final response = await http.get(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        return (data['entries'] as List)
            .map((e) => TimeEntry.fromJson(e))
            .toList();
      }
      return [];
    } catch (e) {
      debugPrint('Error loading time entries: $e');
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

    if (companyId == null || employeeId == null) {
      return ScheduleData.empty();
    }

    try {
      String url = '$_baseUrl/companies/$companyId/employees/schedule?employeeId=$employeeId';
      if (startDate != null) url += '&startDate=$startDate';
      if (endDate != null) url += '&endDate=$endDate';

      final response = await http.get(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        return ScheduleData.fromJson(data);
      }
      return ScheduleData.empty();
    } catch (e) {
      debugPrint('Error loading schedule: $e');
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

  TimeTrackingStatus({
    required this.isTracking,
    this.currentEntry,
    this.startTime,
    this.error,
    this.isLoggedIn = true,
  });

  factory TimeTrackingStatus.notLoggedIn() {
    return TimeTrackingStatus(isTracking: false, isLoggedIn: false);
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
    final shifts = shiftsJson.map((s) => Shift.fromJson(s)).toList();
    
    final scheduleMap = <String, List<Shift>>{};
    final scheduleJson = json['schedule'] as Map<String, dynamic>? ?? {};
    scheduleJson.forEach((date, shiftsList) {
      scheduleMap[date] = (shiftsList as List).map((s) => Shift.fromJson(s)).toList();
    });

    final summary = json['summary'] ?? {};
    return ScheduleData(
      shifts: shifts,
      scheduleByDate: scheduleMap,
      totalShifts: summary['totalShifts'] ?? 0,
      totalHours: (summary['totalHours'] ?? 0).toDouble(),
      weekStart: summary['weekStart'] ?? '',
      weekEnd: summary['weekEnd'] ?? '',
    );
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
