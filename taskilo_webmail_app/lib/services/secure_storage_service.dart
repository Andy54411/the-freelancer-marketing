import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Zentrale Konfiguration für FlutterSecureStorage
/// 
/// Android: Verwendet EncryptedSharedPreferences mit persistenten Einstellungen
/// iOS: Standard Keychain-Zugänglichkeit
class SecureStorageService {
  static SecureStorageService? _instance;
  
  late final FlutterSecureStorage _storage;
  
  SecureStorageService._internal() {
    // Android-Optionen für Persistenz
    // encryptedSharedPreferences ist deprecated - automatische Migration zu custom ciphers
    const androidOptions = AndroidOptions(
      // Stellt sicher, dass Daten auch nach App-Updates erhalten bleiben
      resetOnError: true,
    );
    
    // iOS-Optionen
    const iosOptions = IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
    );
    
    _storage = const FlutterSecureStorage(
      aOptions: androidOptions,
      iOptions: iosOptions,
    );
  }
  
  static SecureStorageService get instance {
    _instance ??= SecureStorageService._internal();
    return _instance!;
  }
  
  /// Storage-Instanz für direkten Zugriff
  FlutterSecureStorage get storage => _storage;
  
  // ==================== Credentials ====================
  
  /// Speichert Login-Credentials
  Future<void> saveCredentials({
    required String email,
    required String password,
  }) async {
    await _storage.write(key: 'user_email', value: email);
    await _storage.write(key: 'user_password', value: password);
    await _storage.write(key: 'login_timestamp', value: DateTime.now().toIso8601String());
  }
  
  /// Lädt gespeicherte Email
  Future<String?> getEmail() async {
    return await _storage.read(key: 'user_email');
  }
  
  /// Lädt gespeichertes Passwort
  Future<String?> getPassword() async {
    return await _storage.read(key: 'user_password');
  }
  
  /// Prüft ob Credentials gespeichert sind
  Future<bool> hasCredentials() async {
    final email = await _storage.read(key: 'user_email');
    final password = await _storage.read(key: 'user_password');
    return email != null && password != null && email.isNotEmpty && password.isNotEmpty;
  }
  
  // ==================== Cookie Auth ====================
  
  /// Speichert Cookie-Auth für WebView-Login
  Future<void> saveCookieAuth({
    required String email,
    required String cookies,
  }) async {
    await _storage.write(key: 'user_email', value: email);
    await _storage.write(key: 'cookie_string', value: cookies);
    await _storage.write(key: 'use_cookie_auth', value: 'true');
    await _storage.write(key: 'login_timestamp', value: DateTime.now().toIso8601String());
  }
  
  /// Prüft ob Cookie-Auth aktiv ist
  Future<bool> hasCookieAuth() async {
    final useCookieAuth = await _storage.read(key: 'use_cookie_auth');
    return useCookieAuth == 'true';
  }
  
  /// Lädt Cookie-String
  Future<String?> getCookies() async {
    return await _storage.read(key: 'cookie_string');
  }
  
  // ==================== Master User ====================
  
  /// Speichert Master-User-Auth
  Future<void> saveMasterUserAuth(String email) async {
    await _storage.write(key: 'user_email', value: email);
    await _storage.write(key: 'auth_mode', value: 'master');
    await _storage.write(key: 'login_timestamp', value: DateTime.now().toIso8601String());
  }
  
  /// Prüft ob Master-User-Auth aktiv ist
  Future<bool> hasMasterUserAuth() async {
    final authMode = await _storage.read(key: 'auth_mode');
    return authMode == 'master';
  }
  
  // ==================== Session ====================
  
  /// Prüft ob Login noch gültig ist (max 30 Tage)
  Future<bool> isSessionValid() async {
    final timestampStr = await _storage.read(key: 'login_timestamp');
    if (timestampStr == null) return false;
    
    final timestamp = DateTime.tryParse(timestampStr);
    if (timestamp == null) return false;
    
    final daysSinceLogin = DateTime.now().difference(timestamp).inDays;
    return daysSinceLogin < 30;
  }
  
  // ==================== Cleanup ====================
  
  /// Löscht alle gespeicherten Daten (Logout)
  Future<void> clearAll() async {
    await _storage.deleteAll();
  }
  
  /// Löscht nur Auth-Daten, behält App-Einstellungen
  Future<void> clearAuth() async {
    await _storage.delete(key: 'user_email');
    await _storage.delete(key: 'user_password');
    await _storage.delete(key: 'cookie_string');
    await _storage.delete(key: 'use_cookie_auth');
    await _storage.delete(key: 'auth_mode');
    await _storage.delete(key: 'login_timestamp');
  }
}
