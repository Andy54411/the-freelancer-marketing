import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'firebase_functions_service.dart';

/// Time Tracking Service für Taskilo
/// Implementiert Zeiterfassung für B2B-Projekte und stundenbasierte Abrechnung
class TimeTrackingService {
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  static final FirebaseAuth _auth = FirebaseAuth.instance;
  
  // Aktuelle Timer-Session
  static TimeTrackingSession? _currentSession;
  static Timer? _timer;
  static StreamController<Duration>? _durationController;

  // ===== TIME TRACKING MANAGEMENT =====

  /// Startet eine neue Zeiterfassungs-Session
  static Future<TimeTrackingResult> startTracking({
    required String orderId,
    required String taskDescription,
    String? notes,
  }) async {
    try {
      if (_currentSession != null) {
        return TimeTrackingResult.failure('Eine andere Session läuft bereits. Stoppe sie zuerst.');
      }

      debugPrint('🔄 Starting time tracking for order: $orderId');

      // 1. Erstelle Session via Firebase Function
      final result = await FirebaseFunctionsService.startTimeTracking(
        orderId: orderId,
        taskDescription: taskDescription,
      );

      if (!result['success']) {
        return TimeTrackingResult.failure('Failed to start tracking: ${result['error']}');
      }

      // 2. Erstelle lokale Session
      _currentSession = TimeTrackingSession(
        sessionId: result['sessionId'],
        orderId: orderId,
        taskDescription: taskDescription,
        startTime: DateTime.parse(result['startTime']),
        notes: notes,
      );

      // 3. Starte lokalen Timer
      _startLocalTimer();

      debugPrint('✅ Time tracking started: ${_currentSession!.sessionId}');
      
      return TimeTrackingResult.success(
        sessionId: _currentSession!.sessionId,
        startTime: _currentSession!.startTime,
      );

    } catch (e) {
      debugPrint('❌ Time tracking start error: $e');
      return TimeTrackingResult.failure('Failed to start tracking: $e');
    }
  }

  /// Stoppt die aktuelle Zeiterfassungs-Session
  static Future<TimeTrackingResult> stopTracking({
    String? finalNotes,
  }) async {
    try {
      if (_currentSession == null) {
        return TimeTrackingResult.failure('Keine aktive Session gefunden.');
      }

      final sessionId = _currentSession!.sessionId;
      debugPrint('🔄 Stopping time tracking: $sessionId');

      // 1. Stoppe lokalen Timer
      _stopLocalTimer();

      // 2. Beende Session via Firebase Function
      final result = await FirebaseFunctionsService.stopTimeTracking(
        sessionId: sessionId,
        notes: finalNotes ?? _currentSession!.notes,
      );

      if (!result['success']) {
        return TimeTrackingResult.failure('Failed to stop tracking: ${result['error']}');
      }

      // 3. Speichere finale Daten
      final totalHours = result['totalHours'] as double;
      final totalAmount = result['totalAmount'] as double;

      // 4. Reset lokale Session
      final completedSession = _currentSession!.copyWith(
        endTime: DateTime.now(),
        totalHours: totalHours,
        totalAmount: totalAmount,
        notes: finalNotes ?? _currentSession!.notes,
      );
      
      _currentSession = null;

      debugPrint('✅ Time tracking stopped: ${totalHours}h = €${totalAmount.toStringAsFixed(2)}');
      
      return TimeTrackingResult.success(
        sessionId: completedSession.sessionId,
        startTime: completedSession.startTime,
        endTime: completedSession.endTime,
        totalHours: totalHours,
        totalAmount: totalAmount,
      );

    } catch (e) {
      debugPrint('❌ Time tracking stop error: $e');
      return TimeTrackingResult.failure('Failed to stop tracking: $e');
    }
  }

  /// Pausiert die aktuelle Session (optional)
  static Future<void> pauseTracking() async {
    if (_currentSession != null) {
      _stopLocalTimer();
      _currentSession = _currentSession!.copyWith(isPaused: true);
      debugPrint('⏸️ Time tracking paused');
    }
  }

  /// Resumed eine pausierte Session
  static Future<void> resumeTracking() async {
    if (_currentSession != null && _currentSession!.isPaused) {
      _startLocalTimer();
      _currentSession = _currentSession!.copyWith(isPaused: false);
      debugPrint('▶️ Time tracking resumed');
    }
  }

  // ===== SESSION MANAGEMENT =====

  /// Holt aktuelle Session-Info
  static TimeTrackingSession? getCurrentSession() {
    return _currentSession;
  }

  /// Prüft ob gerade getrackt wird
  static bool get isTracking => _currentSession != null && !_currentSession!.isPaused;

  /// Stream für Live-Duration Updates
  static Stream<Duration> get durationStream {
    _durationController ??= StreamController<Duration>.broadcast();
    return _durationController!.stream;
  }

  /// Aktuelle elapsed Zeit
  static Duration get currentDuration {
    if (_currentSession == null) return Duration.zero;
    return DateTime.now().difference(_currentSession!.startTime);
  }

  // ===== HISTORY & ANALYTICS =====

  /// Lädt Time Tracking History für einen Order
  static Future<List<TimeTrackingSession>> getTrackingHistory({
    required String orderId,
  }) async {
    try {
      final sessions = await FirebaseFunctionsService.getTimeTrackingHistory(
        orderId: orderId,
      );

      return sessions.map((data) => TimeTrackingSession.fromMap(data)).toList();
    } catch (e) {
      debugPrint('Error loading tracking history: $e');
      return [];
    }
  }

  /// Lädt alle Sessions für aktuellen User
  static Future<List<TimeTrackingSession>> getUserTrackingSessions({
    String? status,
    int? limit,
  }) async {
    try {
      final user = _auth.currentUser;
      if (user == null) return [];

      final query = _firestore
          .collection('timeTrackingSessions')
          .where('userId', isEqualTo: user.uid)
          .orderBy('startTime', descending: true);

      if (limit != null) {
        final snapshot = await query.limit(limit).get();
        return snapshot.docs
            .map((doc) => TimeTrackingSession.fromMap(doc.data()))
            .toList();
      } else {
        final snapshot = await query.get();
        return snapshot.docs
            .map((doc) => TimeTrackingSession.fromMap(doc.data()))
            .toList();
      }
    } catch (e) {
      debugPrint('Error loading user tracking sessions: $e');
      return [];
    }
  }

  /// Berechnet Gesamt-Statistiken
  static Future<TrackingStats> getTrackingStats({
    String? timeframe = '30d',
  }) async {
    try {
      final sessions = await getUserTrackingSessions(limit: 100);
      
      // Filter nach Timeframe
      final now = DateTime.now();
      final cutoffDate = timeframe == '7d' 
          ? now.subtract(const Duration(days: 7))
          : timeframe == '30d'
              ? now.subtract(const Duration(days: 30))
              : now.subtract(const Duration(days: 365));

      final filteredSessions = sessions
          .where((s) => s.startTime.isAfter(cutoffDate))
          .toList();

      // Berechne Statistiken
      final totalHours = filteredSessions
          .fold<double>(0.0, (acc, session) => acc + (session.totalHours ?? 0.0));
      
      final totalAmount = filteredSessions
          .fold<double>(0.0, (acc, session) => acc + (session.totalAmount ?? 0.0));

      final totalSessions = filteredSessions.length;
      final averageSessionLength = totalSessions > 0 ? totalHours / totalSessions : 0.0;

      return TrackingStats(
        totalHours: totalHours,
        totalAmount: totalAmount,
        totalSessions: totalSessions,
        averageSessionLength: averageSessionLength,
        timeframe: timeframe!,
      );

    } catch (e) {
      debugPrint('Error calculating tracking stats: $e');
      return TrackingStats.empty();
    }
  }

  // ===== PRIVATE HELPERS =====

  static void _startLocalTimer() {
    _timer?.cancel();
    _durationController ??= StreamController<Duration>.broadcast();
    
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_currentSession != null && !_currentSession!.isPaused) {
        final duration = DateTime.now().difference(_currentSession!.startTime);
        _durationController!.add(duration);
      }
    });
  }

  static void _stopLocalTimer() {
    _timer?.cancel();
    _timer = null;
  }

  /// Cleanup Resources
  static void dispose() {
    _timer?.cancel();
    _durationController?.close();
    _currentSession = null;
  }
}

// ===== DATA MODELS =====

class TimeTrackingSession {
  final String sessionId;
  final String orderId;
  final String taskDescription;
  final DateTime startTime;
  final DateTime? endTime;
  final double? totalHours;
  final double? totalAmount;
  final String? notes;
  final bool isPaused;

  TimeTrackingSession({
    required this.sessionId,
    required this.orderId,
    required this.taskDescription,
    required this.startTime,
    this.endTime,
    this.totalHours,
    this.totalAmount,
    this.notes,
    this.isPaused = false,
  });

  TimeTrackingSession copyWith({
    String? sessionId,
    String? orderId,
    String? taskDescription,
    DateTime? startTime,
    DateTime? endTime,
    double? totalHours,
    double? totalAmount,
    String? notes,
    bool? isPaused,
  }) {
    return TimeTrackingSession(
      sessionId: sessionId ?? this.sessionId,
      orderId: orderId ?? this.orderId,
      taskDescription: taskDescription ?? this.taskDescription,
      startTime: startTime ?? this.startTime,
      endTime: endTime ?? this.endTime,
      totalHours: totalHours ?? this.totalHours,
      totalAmount: totalAmount ?? this.totalAmount,
      notes: notes ?? this.notes,
      isPaused: isPaused ?? this.isPaused,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'sessionId': sessionId,
      'orderId': orderId,
      'taskDescription': taskDescription,
      'startTime': startTime.toIso8601String(),
      'endTime': endTime?.toIso8601String(),
      'totalHours': totalHours,
      'totalAmount': totalAmount,
      'notes': notes,
      'isPaused': isPaused,
    };
  }

  factory TimeTrackingSession.fromMap(Map<String, dynamic> map) {
    return TimeTrackingSession(
      sessionId: map['sessionId'] ?? '',
      orderId: map['orderId'] ?? '',
      taskDescription: map['taskDescription'] ?? '',
      startTime: DateTime.parse(map['startTime']),
      endTime: map['endTime'] != null ? DateTime.parse(map['endTime']) : null,
      totalHours: map['totalHours']?.toDouble(),
      totalAmount: map['totalAmount']?.toDouble(),
      notes: map['notes'],
      isPaused: map['isPaused'] ?? false,
    );
  }

  Duration get duration {
    final end = endTime ?? DateTime.now();
    return end.difference(startTime);
  }

  bool get isActive => endTime == null;
}

class TimeTrackingResult {
  final bool success;
  final String? sessionId;
  final DateTime? startTime;
  final DateTime? endTime;
  final double? totalHours;
  final double? totalAmount;
  final String? error;

  TimeTrackingResult.success({
    required this.sessionId,
    required this.startTime,
    this.endTime,
    this.totalHours,
    this.totalAmount,
  }) : success = true, error = null;

  TimeTrackingResult.failure(this.error)
      : success = false,
        sessionId = null,
        startTime = null,
        endTime = null,
        totalHours = null,
        totalAmount = null;
}

class TrackingStats {
  final double totalHours;
  final double totalAmount;
  final int totalSessions;
  final double averageSessionLength;
  final String timeframe;

  TrackingStats({
    required this.totalHours,
    required this.totalAmount,
    required this.totalSessions,
    required this.averageSessionLength,
    required this.timeframe,
  });

  factory TrackingStats.empty() {
    return TrackingStats(
      totalHours: 0.0,
      totalAmount: 0.0,
      totalSessions: 0,
      averageSessionLength: 0.0,
      timeframe: '30d',
    );
  }

  double get averageHourlyRate {
    return totalHours > 0 ? totalAmount / totalHours : 0.0;
  }
}
