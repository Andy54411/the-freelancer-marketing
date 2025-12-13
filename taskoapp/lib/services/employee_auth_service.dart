import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:firebase_auth/firebase_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Employee Authentication Service für Taskilo
/// Verwaltet den separaten Login-Bereich für Mitarbeiter
class EmployeeAuthService {
  static final FirebaseAuth _auth = FirebaseAuth.instance;
  
  // API Base URL
  static const String _baseUrl = 'https://taskilo.de/api';
  // static const String _baseUrl = 'http://localhost:3000/api'; // Für lokale Entwicklung
  
  // Gespeicherte Mitarbeiterdaten
  static EmployeeSession? _currentSession;
  static String? _companyId;

  // ===== AUTHENTICATION =====

  /// Prüft ob Mitarbeiter eingeloggt ist
  static bool get isLoggedIn => _currentSession != null && _auth.currentUser != null;

  /// Gibt die aktuelle Session zurück
  static EmployeeSession? get currentSession => _currentSession;

  /// Gibt die Company ID zurück
  static String? get companyId => _companyId;

  /// Initialisiert den Service und lädt gespeicherte Session
  static Future<void> initialize() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _companyId = prefs.getString('employee_company_id');
      final sessionJson = prefs.getString('employee_session');
      
      if (sessionJson != null && _companyId != null) {
        _currentSession = EmployeeSession.fromJson(jsonDecode(sessionJson));
        debugPrint('✅ Employee session restored: ${_currentSession?.employeeName}');
      }
    } catch (e) {
      debugPrint('⚠️ Error loading employee session: $e');
    }
  }

  /// Holt Unternehmensinformationen für Login-Screen
  static Future<CompanyLoginInfo?> getCompanyInfo(String companyId) async {
    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/companies/$companyId/employees/auth'),
        headers: {'Content-Type': 'application/json'},
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          return CompanyLoginInfo.fromJson(data);
        }
      }
      return null;
    } catch (e) {
      debugPrint('Error getting company info: $e');
      return null;
    }
  }

  /// Login mit E-Mail und Passwort
  static Future<EmployeeLoginResult> login({
    required String companyId,
    required String email,
    required String password,
  }) async {
    try {
      debugPrint('🔄 Employee login attempt for: $email');

      // 1. Authentifiziere über Firebase Auth
      final credential = await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );

      if (credential.user == null) {
        return EmployeeLoginResult.failure('Login fehlgeschlagen');
      }

      // 2. Validiere bei unserem API
      final response = await http.post(
        Uri.parse('$_baseUrl/companies/$companyId/employees/auth'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'action': 'login',
          'email': email,
          'password': password,
        }),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        // Speichere Session
        _currentSession = EmployeeSession(
          employeeId: data['employee']['id'],
          employeeName: '${data['employee']['firstName']} ${data['employee']['lastName']}',
          email: data['employee']['email'],
          position: data['employee']['position'],
          department: data['employee']['department'],
          avatar: data['employee']['avatar'],
          permissions: EmployeePermissions.fromJson(data['employee']['permissions'] ?? {}),
          companyName: data['company']['name'],
          companyLogo: data['company']['logo'],
        );
        _companyId = companyId;

        // Speichere in SharedPreferences
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('employee_company_id', companyId);
        await prefs.setString('employee_session', jsonEncode(_currentSession!.toJson()));

        debugPrint('✅ Employee login successful: ${_currentSession!.employeeName}');
        return EmployeeLoginResult.success(_currentSession!);
      } else if (data['requiresRegistration'] == true) {
        return EmployeeLoginResult.requiresRegistration(data['employeeId']);
      } else {
        // Firebase logout wenn API-Validierung fehlschlägt
        await _auth.signOut();
        return EmployeeLoginResult.failure(data['error'] ?? 'Login fehlgeschlagen');
      }
    } on FirebaseAuthException catch (e) {
      return EmployeeLoginResult.failure(_getAuthErrorMessage(e.code));
    } catch (e) {
      debugPrint('❌ Employee login error: $e');
      return EmployeeLoginResult.failure('Ein Fehler ist aufgetreten: $e');
    }
  }

  /// Registrierung für App-Zugang
  static Future<EmployeeLoginResult> register({
    required String companyId,
    required String employeeId,
    required String email,
    required String password,
    String? pin,
  }) async {
    try {
      debugPrint('🔄 Employee registration for: $email');

      final response = await http.post(
        Uri.parse('$_baseUrl/companies/$companyId/employees/auth'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'action': 'register',
          'employeeId': employeeId,
          'email': email,
          'password': password,
          'pin': pin,
        }),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        // Login mit Custom Token
        await _auth.signInWithCustomToken(data['customToken']);

        _currentSession = EmployeeSession(
          employeeId: data['employee']['id'],
          employeeName: '${data['employee']['firstName']} ${data['employee']['lastName']}',
          email: data['employee']['email'],
          position: data['employee']['position'],
          department: data['employee']['department'],
          permissions: EmployeePermissions.defaults(),
        );
        _companyId = companyId;

        // Speichere Session
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('employee_company_id', companyId);
        await prefs.setString('employee_session', jsonEncode(_currentSession!.toJson()));

        debugPrint('✅ Employee registration successful');
        return EmployeeLoginResult.success(_currentSession!);
      } else {
        return EmployeeLoginResult.failure(data['error'] ?? 'Registrierung fehlgeschlagen');
      }
    } catch (e) {
      debugPrint('❌ Employee registration error: $e');
      return EmployeeLoginResult.failure('Ein Fehler ist aufgetreten: $e');
    }
  }

  /// PIN-Login für schnellen Zugang
  static Future<EmployeeLoginResult> loginWithPin({
    required String companyId,
    required String employeeId,
    required String pin,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/companies/$companyId/employees/auth'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'action': 'verify-pin',
          'employeeId': employeeId,
          'pin': pin,
        }),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        await _auth.signInWithCustomToken(data['customToken']);
        
        _currentSession = EmployeeSession(
          employeeId: data['employee']['id'],
          employeeName: '${data['employee']['firstName']} ${data['employee']['lastName']}',
          email: '',
          position: '',
          department: '',
          permissions: EmployeePermissions.defaults(),
        );
        _companyId = companyId;

        return EmployeeLoginResult.success(_currentSession!);
      } else {
        return EmployeeLoginResult.failure(data['error'] ?? 'PIN ungültig');
      }
    } catch (e) {
      return EmployeeLoginResult.failure('Ein Fehler ist aufgetreten');
    }
  }

  /// Logout
  static Future<void> logout() async {
    try {
      await _auth.signOut();
      _currentSession = null;
      _companyId = null;

      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('employee_company_id');
      await prefs.remove('employee_session');

      debugPrint('✅ Employee logged out');
    } catch (e) {
      debugPrint('⚠️ Error during logout: $e');
    }
  }

  // ===== HELPER METHODS =====

  static String _getAuthErrorMessage(String code) {
    switch (code) {
      case 'user-not-found':
        return 'Kein Benutzer mit dieser E-Mail gefunden';
      case 'wrong-password':
        return 'Falsches Passwort';
      case 'invalid-email':
        return 'Ungültige E-Mail-Adresse';
      case 'user-disabled':
        return 'Dieses Konto wurde deaktiviert';
      case 'too-many-requests':
        return 'Zu viele Versuche. Bitte später erneut versuchen';
      default:
        return 'Login fehlgeschlagen: $code';
    }
  }
}

// ===== DATA MODELS =====

class EmployeeSession {
  final String employeeId;
  final String employeeName;
  final String email;
  final String position;
  final String department;
  final String? avatar;
  final EmployeePermissions permissions;
  final String? companyName;
  final String? companyLogo;

  EmployeeSession({
    required this.employeeId,
    required this.employeeName,
    required this.email,
    required this.position,
    required this.department,
    this.avatar,
    required this.permissions,
    this.companyName,
    this.companyLogo,
  });

  factory EmployeeSession.fromJson(Map<String, dynamic> json) {
    return EmployeeSession(
      employeeId: json['employeeId'] ?? '',
      employeeName: json['employeeName'] ?? '',
      email: json['email'] ?? '',
      position: json['position'] ?? '',
      department: json['department'] ?? '',
      avatar: json['avatar'],
      permissions: EmployeePermissions.fromJson(json['permissions'] ?? {}),
      companyName: json['companyName'],
      companyLogo: json['companyLogo'],
    );
  }

  Map<String, dynamic> toJson() => {
    'employeeId': employeeId,
    'employeeName': employeeName,
    'email': email,
    'position': position,
    'department': department,
    'avatar': avatar,
    'permissions': permissions.toJson(),
    'companyName': companyName,
    'companyLogo': companyLogo,
  };
}

class EmployeePermissions {
  final bool timeTracking;
  final bool schedule;
  final bool absenceRequest;
  final bool documents;

  EmployeePermissions({
    required this.timeTracking,
    required this.schedule,
    required this.absenceRequest,
    required this.documents,
  });

  factory EmployeePermissions.fromJson(Map<String, dynamic> json) {
    return EmployeePermissions(
      timeTracking: json['timeTracking'] ?? true,
      schedule: json['schedule'] ?? true,
      absenceRequest: json['absenceRequest'] ?? true,
      documents: json['documents'] ?? false,
    );
  }

  factory EmployeePermissions.defaults() {
    return EmployeePermissions(
      timeTracking: true,
      schedule: true,
      absenceRequest: true,
      documents: false,
    );
  }

  Map<String, dynamic> toJson() => {
    'timeTracking': timeTracking,
    'schedule': schedule,
    'absenceRequest': absenceRequest,
    'documents': documents,
  };
}

class CompanyLoginInfo {
  final String companyId;
  final String companyName;
  final String? logo;
  final String primaryColor;
  final bool emailPasswordEnabled;
  final bool pinEnabled;
  final bool qrCodeEnabled;

  CompanyLoginInfo({
    required this.companyId,
    required this.companyName,
    this.logo,
    required this.primaryColor,
    required this.emailPasswordEnabled,
    required this.pinEnabled,
    required this.qrCodeEnabled,
  });

  factory CompanyLoginInfo.fromJson(Map<String, dynamic> json) {
    final company = json['company'] ?? {};
    final loginMethods = json['loginMethods'] ?? {};
    
    return CompanyLoginInfo(
      companyId: company['id'] ?? '',
      companyName: company['name'] ?? '',
      logo: company['logo'],
      primaryColor: company['primaryColor'] ?? '#14ad9f',
      emailPasswordEnabled: loginMethods['emailPassword'] ?? true,
      pinEnabled: loginMethods['pin'] ?? true,
      qrCodeEnabled: loginMethods['qrCode'] ?? false,
    );
  }
}

class EmployeeLoginResult {
  final bool success;
  final EmployeeSession? session;
  final String? error;
  final bool requiresRegistration;
  final String? employeeIdForRegistration;

  EmployeeLoginResult._({
    required this.success,
    this.session,
    this.error,
    this.requiresRegistration = false,
    this.employeeIdForRegistration,
  });

  factory EmployeeLoginResult.success(EmployeeSession session) {
    return EmployeeLoginResult._(success: true, session: session);
  }

  factory EmployeeLoginResult.failure(String error) {
    return EmployeeLoginResult._(success: false, error: error);
  }

  factory EmployeeLoginResult.requiresRegistration(String employeeId) {
    return EmployeeLoginResult._(
      success: false,
      requiresRegistration: true,
      employeeIdForRegistration: employeeId,
      error: 'App-Zugang nicht aktiviert',
    );
  }
}
