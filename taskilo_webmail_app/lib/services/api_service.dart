import 'package:dio/dio.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:logger/logger.dart';
import 'package:flutter/foundation.dart';
import 'package:taskilo_webmail/services/secure_storage_service.dart';

/// API Service für Kommunikation mit dem Hetzner Webmail-Proxy
class ApiService {
  static const String baseUrl = 'https://mail.taskilo.de/webmail-api/api';
  static const String vercelBaseUrl = 'https://taskilo.de/api/webmail';

  final Dio _dio;
  final SecureStorageService _storageService;
  final Logger _logger;

  String? _userEmail;
  String? _userPassword;
  String? _apiKey;
  String? _cookieString;
  bool _useCookieAuth = false;
  bool _useMasterUser = false;

  // Signatur-Cache
  Map<String, dynamic>? _cachedSettings;
  List<Map<String, dynamic>> _signatures = [];
  String? _defaultSignature;

  /// Getter für Cookie-Auth Status
  bool get useCookieAuth => _useCookieAuth;

  /// Getter für Master-User Status
  bool get useMasterUser => _useMasterUser;

  /// Getter für Cookie-String (für Debug)
  String? get cookieString => _cookieString;

  ApiService._internal()
    : _dio = Dio(),
      _storageService = SecureStorageService.instance,
      _logger = Logger() {
    _dio.options.baseUrl = baseUrl;
    _dio.options.connectTimeout = const Duration(seconds: 30);
    _dio.options.receiveTimeout = const Duration(seconds: 30);

    // API-Key wird lazy in _getApiKey() geladen

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // Bei Password-Auth: Email + Passwort prüfen
          // Bei Master-User oder Cookie-Auth: Nur Email prüfen
          if (_userEmail == null) {
            if (!_useMasterUser && !_useCookieAuth) {
              return handler.reject(
                DioException(
                  requestOptions: options,
                  error: 'Nicht eingeloggt',
                  type: DioExceptionType.cancel,
                ),
              );
            }
          }
          final apiKey = _getApiKey();
          if (apiKey != null) {
            options.headers['X-API-Key'] = apiKey;
          }
          if (_userEmail != null) {
            options.headers['X-User-Id'] = _userEmail;
          }
          return handler.next(options);
        },
        onError: (error, handler) {
          if (error.type != DioExceptionType.cancel) {
            _logger.e('API Error: ${error.message}');
            _logger.e('URL: ${error.requestOptions.uri}');
          }
          return handler.next(error);
        },
      ),
    );
  }

  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;

  /// Lädt API-Key lazy aus .env mit Fallback
  String? _getApiKey() {
    if (_apiKey != null) return _apiKey;
    try {
      _apiKey = dotenv.env['WEBMAIL_API_KEY'];
    } catch (e) {
      // Fallback wenn dotenv nicht geladen
      _apiKey =
          '2b5f0cfb074fb7eac0eaa3a7a562ba0a390e2efd0b115d6fa317e932e609e076';
    }
    return _apiKey;
  }

  /// Initialisiert den Service mit gespeicherten Credentials
  Future<bool> initialize() async {
    try {
      _userEmail = await _storageService.getEmail();
      _userPassword = await _storageService.getPassword();

      // Prüfe ob Cookie-Auth gespeichert wurde
      if (await _storageService.hasCookieAuth()) {
        _cookieString = await _storageService.getCookies();
        _useCookieAuth = true;
        _getApiKey();
        _logger.i('Cookie-Auth wiederhergestellt für: $_userEmail');
        return _userEmail != null;
      }

      // Prüfe ob Master-User-Auth gespeichert wurde
      if (await _storageService.hasMasterUserAuth() && _userEmail != null) {
        _useMasterUser = true;
        _getApiKey();
        _logger.i('Master-User-Auth wiederhergestellt für: $_userEmail');
        return true;
      }

      // Prüfe ob normale Auth verfügbar
      if (_userEmail != null && _userPassword != null) {
        _getApiKey();
        _logger.i('Password-Auth initialisiert für: $_userEmail');
        return true;
      }

      _getApiKey();
      _logger.w('Keine Auth-Credentials gefunden');
      return false;
    } catch (e) {
      _logger.e('Failed to initialize: $e');
      return false;
    }
  }

  /// Initialisiert mit Cookies aus WebView-Login (für Taskilo-Accounts)
  Future<bool> initializeWithCookies(String cookies, String userEmail) async {
    _cookieString = cookies;
    _userEmail = userEmail;
    _useCookieAuth = true;

    // Speichere für Persistenz mit korrekten Android-Optionen
    await _storageService.saveCookieAuth(email: userEmail, cookies: cookies);

    _logger.i('Cookie-Auth initialisiert für: $userEmail');
    return true;
  }

  /// Initialisiert mit Master-User-Route (für Taskilo-Accounts ohne Passwort)
  void initializeWithMasterUser(String userEmail) {
    _userEmail = userEmail;
    _userPassword = null;
    _useCookieAuth = false;
    _useMasterUser = true;

    _logger.i('Master-User-Auth initialisiert für: $userEmail');
  }

  /// Login mit E-Mail und Passwort - validiert durch IMAP-Verbindung
  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      // Validiere Credentials durch Abrufen der Mailboxen
      // Dies stellt eine echte IMAP-Verbindung her
      final response = await _dio.post(
        '/mailboxes',
        data: {'email': email, 'password': password},
      );

      if (response.data['success'] == true) {
        _userEmail = email;
        _userPassword = password;

        // Speichere mit korrekten Android-Optionen für Persistenz
        await _storageService.saveCredentials(email: email, password: password);

        return {'success': true, 'mailboxes': response.data['mailboxes']};
      }

      return {
        'success': false,
        'error': response.data['error'] ?? 'Anmeldung fehlgeschlagen',
      };
    } on DioException catch (e) {
      String errorMessage = 'Verbindungsfehler';

      if (e.response?.statusCode == 401) {
        errorMessage = 'Ungültige E-Mail oder Passwort';
      } else if (e.response?.data != null &&
          e.response?.data['error'] != null) {
        errorMessage = e.response?.data['error'];
      } else if (e.type == DioExceptionType.connectionTimeout) {
        errorMessage = 'Verbindung zum Server fehlgeschlagen';
      } else if (e.type == DioExceptionType.connectionError) {
        errorMessage = 'Keine Internetverbindung';
      }

      return {'success': false, 'error': errorMessage};
    }
  }

  /// Logout
  Future<void> logout() async {
    _userEmail = null;
    _userPassword = null;
    _apiKey = null;
    await _storageService.clearAll();
  }

  /// Teste Verbindung
  Future<Map<String, dynamic>> testConnection(
    String email,
    String password,
  ) async {
    try {
      final response = await _dio.post(
        '/test-connection',
        data: {'email': email, 'password': password},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {
        'success': false,
        'error': e.response?.data?['error'] ?? 'Verbindungsfehler',
      };
    }
  }

  // ==================== EMAIL ====================

  /// Hole Mailboxen
  Future<Map<String, dynamic>> getMailboxes() async {
    if (!isLoggedIn) {
      return {'success': false, 'error': 'Nicht eingeloggt'};
    }
    try {
      // Master-User oder Cookie-Auth: Nutze Master-User-Route
      if (_useMasterUser || _useCookieAuth) {
        final response = await _dio.post(
          '/mailboxes/master',
          data: {'email': _userEmail},
        );
        return response.data as Map<String, dynamic>;
      }
      // Password-Auth: Normaler IMAP-Endpoint
      final response = await _dio.post('/mailboxes', data: _authData);
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// Hole E-Mails
  Future<Map<String, dynamic>> getMessages({
    String mailbox = 'INBOX',
    int page = 1,
    int limit = 50,
  }) async {
    if (!isLoggedIn) {
      return {'success': false, 'error': 'Nicht eingeloggt', 'messages': []};
    }
    try {
      // Master-User oder Cookie-Auth: Nutze Master-User-Route
      if (_useMasterUser || _useCookieAuth) {
        final response = await _dio.post(
          '/messages/master',
          data: {
            'email': _userEmail,
            'mailbox': mailbox,
            'page': page,
            'limit': limit,
          },
        );
        return response.data as Map<String, dynamic>;
      }
      // Password-Auth: Normaler IMAP-Endpoint
      final response = await _dio.post(
        '/messages',
        data: {..._authData, 'mailbox': mailbox, 'page': page, 'limit': limit},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message, 'messages': []};
    }
  }

  /// Hole einzelne E-Mail
  Future<Map<String, dynamic>> getMessage({
    required String mailbox,
    required int uid,
  }) async {
    if (!isLoggedIn) {
      return {'success': false, 'error': 'Nicht eingeloggt'};
    }
    try {
      // Master-User oder Cookie-Auth: Nutze Master-User-Route
      if (_useMasterUser || _useCookieAuth) {
        final response = await _dio.post(
          '/message/master',
          data: {'email': _userEmail, 'mailbox': mailbox, 'uid': uid},
        );
        return response.data as Map<String, dynamic>;
      }
      // Password-Auth: Normaler IMAP-Endpoint
      final response = await _dio.post(
        '/message',
        data: {..._authData, 'mailbox': mailbox, 'uid': uid},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  // ==================== E-MAIL AKTIONEN ====================

  /// Sende E-Mail
  Future<Map<String, dynamic>> sendEmail({
    required List<String> to,
    required String subject,
    String? text,
    String? html,
    String? body,
    bool isHtml = false,
    List<String>? cc,
    List<String>? bcc,
    List<dynamic>? attachments,
    String? inReplyTo,
    String? references,
  }) async {
    try {
      // Validierung
      if (to.isEmpty) {
        return {
          'success': false,
          'error': 'Mindestens ein Empfänger erforderlich',
        };
      }

      // Wenn isHtml=true und body übergeben wird, setze es als html
      final String? htmlContent = isHtml ? (html ?? body) : html;
      final String? textContent = isHtml ? text : (text ?? body);

      // Wenn Attachments vorhanden: FormData verwenden
      if (attachments != null && attachments.isNotEmpty) {
        final formData = FormData();

        // Auth-Daten - NUR bei Password-Auth
        if (!_useCookieAuth && !_useMasterUser && _userPassword != null) {
          formData.fields.add(MapEntry('email', _userEmail ?? ''));
          formData.fields.add(MapEntry('password', _userPassword!));
        }

        // E-Mail-Daten
        formData.fields.add(
          MapEntry('to', to.length == 1 ? to.first : to.join(',')),
        );
        formData.fields.add(MapEntry('subject', subject));
        if (textContent != null) {
          formData.fields.add(MapEntry('text', textContent));
        }
        if (htmlContent != null) {
          formData.fields.add(MapEntry('html', htmlContent));
        }
        if (cc != null && cc.isNotEmpty) {
          formData.fields.add(MapEntry('cc', cc.join(',')));
        }
        if (bcc != null && bcc.isNotEmpty) {
          formData.fields.add(MapEntry('bcc', bcc.join(',')));
        }
        if (inReplyTo != null) {
          formData.fields.add(MapEntry('inReplyTo', inReplyTo));
        }
        if (references != null) {
          formData.fields.add(MapEntry('references', references));
        }

        // Attachments hinzufügen
        for (var attachment in attachments) {
          if (attachment is Map<String, dynamic>) {
            // Aus file_picker: {path, bytes, name}
            final bytes = attachment['bytes'] as List<int>?;
            final name = attachment['name'] as String? ?? 'attachment';

            if (bytes != null) {
              formData.files.add(
                MapEntry(
                  'attachments',
                  MultipartFile.fromBytes(bytes, filename: name),
                ),
              );
            } else if (attachment['path'] != null) {
              // Fallback: Aus Dateipfad
              formData.files.add(
                MapEntry(
                  'attachments',
                  await MultipartFile.fromFile(
                    attachment['path'] as String,
                    filename: name,
                  ),
                ),
              );
            }
          }
        }

        final response = await _dio.post(
          _useMasterUser || _useCookieAuth ? '/send/master' : '/send',
          data: formData,
        );

        if (response.data is Map<String, dynamic>) {
          return response.data as Map<String, dynamic>;
        }

        return {'success': true};
      }

      // Ohne Attachments: JSON senden (schneller)
      final endpoint = _useMasterUser || _useCookieAuth
          ? '/send/master'
          : '/send';
      final response = await _dio.post(
        endpoint,
        data: {
          ..._authData,
          'to': to.length == 1 ? to.first : to,
          'subject': subject,
          'text': textContent,
          'html': htmlContent,
          if (cc != null && cc.isNotEmpty) 'cc': cc,
          if (bcc != null && bcc.isNotEmpty) 'bcc': bcc,
          if (inReplyTo != null) 'inReplyTo': inReplyTo,
          if (references != null) 'references': references,
        },
      );

      if (response.data is Map<String, dynamic>) {
        return response.data as Map<String, dynamic>;
      }

      return {'success': true};
    } on DioException catch (e) {
      // Detaillierte Fehlerausgabe
      final errorMsg =
          e.response?.data?['error'] ??
          e.response?.data?['message'] ??
          e.message ??
          'E-Mail konnte nicht gesendet werden';

      // Auth-Fehler erkennen
      if (errorMsg.toString().toLowerCase().contains('authentication') ||
          errorMsg.toString().toLowerCase().contains('auth') ||
          errorMsg.toString().toLowerCase().contains('sasl') ||
          errorMsg.toString().toLowerCase().contains('login')) {
        return {
          'success': false,
          'error': 'Anmeldefehler: Bitte melden Sie sich erneut an',
          'authError': true,
        };
      }

      return {'success': false, 'error': errorMsg};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  /// Markiere E-Mail als gelesen/ungelesen
  Future<Map<String, dynamic>> markAsRead(
    int uid,
    bool read, {
    String mailbox = 'INBOX',
  }) async {
    try {
      final response = await _dio.post(
        '/actions',
        data: {
          ..._authData,
          'action': read ? 'markRead' : 'markUnread',
          'mailbox': mailbox,
          'uid': uid,
          'read': read,
        },
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// Lösche E-Mail
  Future<Map<String, dynamic>> deleteMessage({
    required String mailbox,
    required int uid,
  }) async {
    try {
      final response = await _dio.post(
        '/actions',
        data: {
          ..._authData,
          'action': 'delete',
          'mailbox': mailbox,
          'uid': uid,
        },
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// Verschiebe E-Mail in anderen Ordner
  Future<Map<String, dynamic>> moveMessage({
    required String mailbox,
    required int uid,
    required String targetMailbox,
  }) async {
    try {
      final response = await _dio.post(
        '/actions',
        data: {
          ..._authData,
          'action': 'move',
          'mailbox': mailbox,
          'uid': uid,
          'targetMailbox': targetMailbox,
        },
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// Markiere E-Mail als ungelesen
  Future<Map<String, dynamic>> markAsUnread({
    required String mailbox,
    required int uid,
  }) async {
    try {
      final response = await _dio.post(
        '/actions',
        data: {
          ..._authData,
          'action': 'markUnread',
          'mailbox': mailbox,
          'uid': uid,
        },
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// Markiere E-Mail als Spam und verschiebe in Junk-Ordner
  Future<Map<String, dynamic>> markAsSpam({
    required String mailbox,
    required int uid,
  }) async {
    try {
      final response = await _dio.post(
        '/actions',
        data: {
          ..._authData,
          'action': 'markSpam',
          'mailbox': mailbox,
          'uid': uid,
          'targetMailbox': 'Junk',
        },
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// Setze Wichtig-Flag für E-Mail
  Future<Map<String, dynamic>> setImportant({
    required String mailbox,
    required int uid,
    required bool important,
  }) async {
    try {
      final response = await _dio.post(
        '/actions',
        data: {
          ..._authData,
          'action': important ? 'markImportant' : 'markUnimportant',
          'mailbox': mailbox,
          'uid': uid,
        },
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// Zurückstellen (Snooze) einer E-Mail
  Future<Map<String, dynamic>> snoozeMessage({
    required String mailbox,
    required int uid,
    required DateTime until,
  }) async {
    try {
      final response = await _dio.post(
        '/actions',
        data: {
          ..._authData,
          'action': 'snooze',
          'mailbox': mailbox,
          'uid': uid,
          'snoozeUntil': until.toIso8601String(),
        },
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// E-Mail zu Tasks hinzufügen
  Future<Map<String, dynamic>> addEmailToTasks({
    required String mailbox,
    required int uid,
    required String subject,
  }) async {
    try {
      final response = await _dio.post(
        '/tasks/from-email',
        data: {..._authData, 'mailbox': mailbox, 'uid': uid, 'title': subject},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// Konversation ignorieren (Mute)
  Future<Map<String, dynamic>> muteConversation({
    required String mailbox,
    required int uid,
  }) async {
    try {
      final response = await _dio.post(
        '/actions',
        data: {..._authData, 'action': 'mute', 'mailbox': mailbox, 'uid': uid},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// Label zu E-Mail hinzufügen
  Future<Map<String, dynamic>> addLabel({
    required String mailbox,
    required int uid,
    required String label,
  }) async {
    try {
      final response = await _dio.post(
        '/actions',
        data: {
          ..._authData,
          'action': 'addLabel',
          'mailbox': mailbox,
          'uid': uid,
          'label': label,
        },
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// Label von E-Mail entfernen
  Future<Map<String, dynamic>> removeLabel({
    required String mailbox,
    required int uid,
    required String label,
  }) async {
    try {
      final response = await _dio.post(
        '/actions',
        data: {
          ..._authData,
          'action': 'removeLabel',
          'mailbox': mailbox,
          'uid': uid,
          'label': label,
        },
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// Suche E-Mails
  Future<Map<String, dynamic>> searchMessages({
    required String query,
    String mailbox = 'INBOX',
    int page = 1,
    int limit = 50,
  }) async {
    try {
      // Der Webmail-Proxy nutzt /api/search/quick für einfache Suche
      final response = await _dio.post(
        '/search/quick',
        data: {..._authData, 'mailbox': mailbox, 'term': query, 'limit': limit},
      );

      if (response.data is Map<String, dynamic>) {
        final data = response.data as Map<String, dynamic>;

        // Wandle results in messages um für Konsistenz
        if (data['success'] == true && data['results'] != null) {
          return {
            'success': true,
            'messages': data['results'],
            'total': (data['results'] as List).length,
          };
        }
      }

      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {
        'success': false,
        'error': e.response?.data?['error'] ?? e.message ?? 'Suchfehler',
        'messages': [],
      };
    }
  }

  /// Hole Attachment als Download-URL
  Future<Map<String, dynamic>> getAttachment({
    required String mailbox,
    required int uid,
    required String attachmentId,
  }) async {
    try {
      final response = await _dio.post(
        '/message/$uid/attachment/$attachmentId',
        data: {..._authData, 'mailbox': mailbox},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// Hole Attachment Download-URL
  String getAttachmentUrl({
    required int uid,
    required String attachmentId,
    required String mailbox,
  }) {
    return '$baseUrl/message/$uid/attachment/$attachmentId?email=$_userEmail&password=${Uri.encodeComponent(_userPassword ?? '')}&mailbox=$mailbox';
  }

  // ==================== DRIVE ====================

  /// Hole Speicherinfo
  Future<Map<String, dynamic>> getDriveStorage() async {
    try {
      final response = await _dio.get('/drive/storage');
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// Hole Ordnerinhalt
  Future<Map<String, dynamic>> getDriveFolder([String? folderId]) async {
    try {
      final path = folderId != null && folderId != 'root'
          ? '/drive/folders/$folderId/contents'
          : '/drive/folders';
      final response = await _dio.get(
        path,
        queryParameters: {'userId': _userEmail},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// Erstelle Ordner
  Future<Map<String, dynamic>> createDriveFolder({
    required String name,
    String? parentId,
  }) async {
    try {
      final response = await _dio.post(
        '/drive/folders',
        data: {'userId': _userEmail, 'name': name, 'parentId': parentId},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// Lade Datei herunter (gibt URL zurück)
  String getDriveFileUrl(String fileId) {
    return '$baseUrl/drive/files/$fileId/download?userId=$_userEmail';
  }

  /// Hole Thumbnail-URL
  String getDriveThumbnailUrl(String fileId) {
    return '$baseUrl/drive/files/$fileId/thumbnail?userId=$_userEmail';
  }

  /// Upload Datei zu Drive
  Future<Map<String, dynamic>> uploadDriveFile({
    required String fileName,
    required List<int> fileBytes,
    String? parentId,
  }) async {
    try {
      final formData = FormData.fromMap({
        'userId': _userEmail,
        'parentId': parentId,
        'file': MultipartFile.fromBytes(fileBytes, filename: fileName),
      });
      final response = await _dio.post('/drive/files', data: formData);
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// Suche in Drive
  Future<Map<String, dynamic>> searchDrive(String query) async {
    try {
      final response = await _dio.get(
        '/drive/search',
        queryParameters: {'userId': _userEmail, 'query': query},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// Lösche Drive-Element
  Future<Map<String, dynamic>> deleteDriveItem(
    String itemId, {
    bool isFolder = false,
  }) async {
    try {
      final path = isFolder ? '/drive/folders/$itemId' : '/drive/files/$itemId';
      final response = await _dio.delete(
        path,
        queryParameters: {'userId': _userEmail},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// Umbenennen Drive-Element
  Future<Map<String, dynamic>> renameDriveItem(
    String itemId,
    String newName, {
    bool isFolder = false,
  }) async {
    try {
      final path = isFolder ? '/drive/folders/$itemId' : '/drive/files/$itemId';
      final response = await _dio.put(
        path,
        data: {'userId': _userEmail, 'name': newName},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// Teilen Drive-Element
  Future<Map<String, dynamic>> shareDriveItem(
    String itemId,
    List<String> emails, {
    bool isFolder = false,
  }) async {
    try {
      final response = await _dio.post(
        '/drive/share',
        data: {
          'userId': _userEmail,
          'itemId': itemId,
          'isFolder': isFolder,
          'emails': emails,
        },
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  // ==================== TASKS ====================

  /// Hole Tasks einer Liste
  Future<Map<String, dynamic>> getTasks(String listId) async {
    try {
      final response = await _dio.get(
        '/tasks/lists/$listId/tasks',
        queryParameters: {'userId': _userEmail},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// Erstelle Task in Liste
  Future<Map<String, dynamic>> createTask({
    required String listId,
    required String title,
    String? notes,
    DateTime? dueDate,
    int? priority,
  }) async {
    try {
      final response = await _dio.post(
        '/tasks/lists/$listId/tasks',
        data: {
          'userId': _userEmail,
          'title': title,
          'notes': notes,
          'dueDate': dueDate?.toIso8601String(),
          'priority': priority,
        },
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// Update Task in Liste
  Future<Map<String, dynamic>> updateTask({
    required String listId,
    required String taskId,
    String? title,
    String? notes,
    DateTime? dueDate,
    int? priority,
    bool? completed,
  }) async {
    try {
      final response = await _dio.put(
        '/tasks/lists/$listId/tasks/$taskId',
        data: {
          'userId': _userEmail,
          if (title != null) 'title': title,
          if (notes != null) 'notes': notes,
          if (dueDate != null) 'dueDate': dueDate.toIso8601String(),
          if (priority != null) 'priority': priority,
          if (completed != null) 'completed': completed,
        },
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  // ==================== CALENDAR ====================

  /// Hole Kalender-Events
  Future<Map<String, dynamic>> getCalendarEvents({
    DateTime? start,
    DateTime? end,
  }) async {
    try {
      final response = await _dio.get(
        '/calendar/events',
        queryParameters: {
          'userId': _userEmail,
          if (start != null) 'start': start.toIso8601String(),
          if (end != null) 'end': end.toIso8601String(),
        },
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  // ==================== PHOTOS ====================

  /// Hole Fotos
  Future<Map<String, dynamic>> getPhotos({int page = 1, int limit = 50}) async {
    try {
      final response = await _dio.get(
        '/photos',
        queryParameters: {'userId': _userEmail, 'page': page, 'limit': limit},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// Hole Foto-Alben
  Future<Map<String, dynamic>> getPhotoAlbums() async {
    try {
      final response = await _dio.get(
        '/photos/albums',
        queryParameters: {'userId': _userEmail},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// Suche Fotos
  Future<Map<String, dynamic>> searchPhotos(String query) async {
    try {
      final response = await _dio.get(
        '/photos/search',
        queryParameters: {'userId': _userEmail, 'query': query},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// Album erstellen
  Future<Map<String, dynamic>> createPhotoAlbum(String name) async {
    try {
      final response = await _dio.post(
        '/photos/albums',
        data: {'userId': _userEmail, 'name': name},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// Fotos eines Albums laden
  Future<Map<String, dynamic>> getAlbumPhotos(String albumId) async {
    try {
      final response = await _dio.get(
        '/photos/albums/$albumId',
        queryParameters: {'userId': _userEmail},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// Foto hochladen
  Future<Map<String, dynamic>> uploadPhoto({
    required String fileName,
    required List<int> fileBytes,
    String? albumId,
  }) async {
    try {
      final formData = FormData.fromMap({
        'userId': _userEmail,
        if (albumId != null) 'albumId': albumId,
        'file': MultipartFile.fromBytes(fileBytes, filename: fileName),
      });
      final response = await _dio.post('/photos/upload', data: formData);
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// Foto löschen
  Future<Map<String, dynamic>> deletePhoto(String photoId) async {
    try {
      final response = await _dio.delete(
        '/photos/$photoId',
        queryParameters: {'userId': _userEmail},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// Foto teilen (generiert Share-Link)
  Future<Map<String, dynamic>> sharePhoto(String photoId) async {
    try {
      final response = await _dio.post(
        '/photos/$photoId/share',
        data: {'userId': _userEmail},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  // ==================== CHAT ====================

  /// Hole Chat-Konversationen
  Future<Map<String, dynamic>> getChatConversations() async {
    try {
      final response = await _dio.get(
        '/chat/conversations',
        queryParameters: {'userId': _userEmail},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// Hole Chat-Nachrichten
  Future<Map<String, dynamic>> getChatMessages(String conversationId) async {
    try {
      final response = await _dio.get(
        '/chat/conversations/$conversationId/messages',
        queryParameters: {'userId': _userEmail},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// Sende Chat-Nachricht
  Future<Map<String, dynamic>> sendChatMessage({
    required String conversationId,
    required String text,
  }) async {
    try {
      final response = await _dio.post(
        '/chat/conversations/$conversationId/messages',
        data: {'userId': _userEmail, 'text': text},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  // ==================== MEET ====================

  /// Hole Meetings
  Future<Map<String, dynamic>> getMeetings() async {
    try {
      final response = await _dio.get(
        '/meet/meetings',
        queryParameters: {'userId': _userEmail},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// Erstelle neues Meeting
  Future<Map<String, dynamic>> createMeeting({String? title}) async {
    try {
      final response = await _dio.post(
        '/meet/meetings',
        data: {'userId': _userEmail, 'title': title},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  // ==================== TASK LISTS ====================

  /// Hole Task-Listen
  Future<Map<String, dynamic>> getTaskLists() async {
    try {
      final response = await _dio.get(
        '/tasks/lists',
        queryParameters: {'userId': _userEmail},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// Erstelle Task-Liste
  Future<Map<String, dynamic>> createTaskList(String name) async {
    try {
      final response = await _dio.post(
        '/tasks/lists',
        data: {'userId': _userEmail, 'name': name},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// Lösche Task
  Future<Map<String, dynamic>> deleteTask({
    required String listId,
    required String taskId,
  }) async {
    try {
      final response = await _dio.delete(
        '/tasks/lists/$listId/tasks/$taskId',
        queryParameters: {'userId': _userEmail},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  // ==================== CALENDAR EVENTS ====================

  /// Erstelle Kalender-Event
  Future<Map<String, dynamic>> createCalendarEvent({
    required String title,
    required DateTime start,
    required DateTime end,
    bool isAllDay = false,
    String? location,
    String? description,
    String? color,
  }) async {
    try {
      final response = await _dio.post(
        '/calendar/events',
        data: {
          'userId': _userEmail,
          'title': title,
          'start': start.toIso8601String(),
          'end': end.toIso8601String(),
          'isAllDay': isAllDay,
          'location': location,
          'description': description,
          'color': color,
        },
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// Update Kalender-Event
  Future<Map<String, dynamic>> updateCalendarEvent({
    required String eventId,
    String? title,
    DateTime? start,
    DateTime? end,
    bool? isAllDay,
    String? location,
    String? description,
    String? color,
  }) async {
    try {
      final response = await _dio.put(
        '/calendar/events/$eventId',
        data: {
          'userId': _userEmail,
          if (title != null) 'title': title,
          if (start != null) 'start': start.toIso8601String(),
          if (end != null) 'end': end.toIso8601String(),
          if (isAllDay != null) 'isAllDay': isAllDay,
          if (location != null) 'location': location,
          if (description != null) 'description': description,
          if (color != null) 'color': color,
        },
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// Lösche Kalender-Event
  Future<Map<String, dynamic>> deleteCalendarEvent(String eventId) async {
    try {
      final response = await _dio.delete(
        '/calendar/events/$eventId',
        queryParameters: {'userId': _userEmail},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  // ==================== DRIVE STORAGE INFO ====================

  /// Hole Drive Storage Info
  Future<Map<String, dynamic>> getDriveStorageInfo() async {
    try {
      final response = await _dio.get(
        '/drive/storage',
        queryParameters: {'userId': _userEmail},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  // ==================== EMAIL EXTENDED ====================

  /// Toggle Star/Flag
  Future<Map<String, dynamic>> toggleStar({
    required String mailbox,
    required int uid,
    required bool starred,
  }) async {
    try {
      final response = await _dio.post(
        '/actions',
        data: {
          ..._authData,
          'action': 'flag',
          'mailbox': mailbox,
          'uid': uid,
          'flagged': starred,
        },
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// Speichere Entwurf
  Future<Map<String, dynamic>> saveDraft({
    required List<String> to,
    List<String>? cc,
    List<String>? bcc,
    required String subject,
    required String body,
  }) async {
    try {
      final response = await _dio.post(
        '/actions',
        data: {
          ..._authData,
          'action': 'saveDraft',
          'draft': {
            'to': to.isNotEmpty ? to.join(', ') : '',
            'cc': cc != null && cc.isNotEmpty ? cc : null,
            'bcc': bcc != null && bcc.isNotEmpty ? bcc : null,
            'subject': subject,
            'html': body,
          },
        },
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {
        'success': false,
        'error':
            e.response?.data?['error'] ??
            e.message ??
            'Entwurf konnte nicht gespeichert werden',
      };
    }
  }

  // ==================== PRIVATE ====================

  Map<String, dynamic> get _authData => {
    'email': _userEmail,
    'password': _userPassword,
  };

  String? get userEmail => _userEmail;

  /// Prüft ob eingeloggt - unterstützt Password-Auth, Cookie-Auth und Master-User
  bool get isLoggedIn =>
      (_userEmail != null && _userPassword != null) ||
      (_userEmail != null && _useCookieAuth) ||
      (_userEmail != null && _useMasterUser);

  /// Prüfe ob eingeloggt (als Future)
  Future<bool> isLoggedInAsync() async {
    await initialize();
    return isLoggedIn;
  }

  // ==================== CONTACTS ====================

  /// Hole alle Kontakte (CardDAV + E-Mail-Header)
  Future<Map<String, dynamic>> getContacts({String? search}) async {
    try {
      _logger.i('[getContacts] Start - search: $search');
      _logger.d(
        '[getContacts] Auth: email=$_userEmail, hasPwd=${_userPassword != null}, cookieAuth=$_useCookieAuth, masterUser=$_useMasterUser',
      );

      // Nutze search endpoint wenn Suchbegriff vorhanden
      if (search != null && search.isNotEmpty) {
        _logger.i('[getContacts] Using /contacts/search endpoint');
        final response = await _dio.post(
          '/contacts/search',
          data: {..._authData, 'query': search},
        );
        _logger.i(
          '[getContacts] Response: ${response.statusCode}, contacts: ${response.data['total'] ?? 0}',
        );
        return response.data as Map<String, dynamic>;
      }

      // Alle Kontakte abrufen
      _logger.i('[getContacts] Using /contacts endpoint');
      _logger.d('[getContacts] Auth data: ${_authData.keys.toList()}');
      final response = await _dio.post('/contacts', data: _authData);
      _logger.i(
        '[getContacts] Response: ${response.statusCode}, contacts: ${response.data['total'] ?? 0}',
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      _logger.e('[getContacts] DioException: ${e.message}');
      _logger.e(
        '[getContacts] Response: ${e.response?.statusCode} - ${e.response?.data}',
      );
      return {
        'success': false,
        'error':
            e.response?.data?['error'] ??
            e.message ??
            'Kontakte konnten nicht geladen werden',
      };
    } catch (e) {
      _logger.e('[getContacts] Error: $e');
      return {'success': false, 'error': 'Unerwarteter Fehler: $e'};
    }
  }

  /// Suche Kontakte mit Debouncing (für Autocomplete)
  Future<List<Map<String, dynamic>>> searchContacts(String query) async {
    if (query.isEmpty || query.length < 2) {
      return [];
    }

    try {
      final result = await getContacts(search: query);

      if (result['success'] == true && result['contacts'] is List) {
        return (result['contacts'] as List)
            .map((c) => c as Map<String, dynamic>)
            .toList();
      }

      return [];
    } catch (e) {
      debugPrint('Fehler beim Suchen der Kontakte: $e');
      return [];
    }
  }

  // ==================== PROFILE ====================

  /// Hole Benutzerprofil von Hetzner MongoDB
  Future<Map<String, dynamic>> getProfile() async {
    if (_userEmail == null) {
      return {'success': false, 'error': 'Nicht eingeloggt'};
    }
    try {
      final response = await _dio.get(
        '/profile/${Uri.encodeComponent(_userEmail!)}',
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// Avatar-URL vom Hetzner-Server
  String? getAvatarUrl() {
    if (_userEmail == null) return null;
    return '$baseUrl/profile/avatar/${Uri.encodeComponent(_userEmail!)}';
  }

  /// Avatar hochladen (Base64)
  Future<Map<String, dynamic>> uploadAvatar(String base64Image) async {
    if (_userEmail == null) {
      return {'success': false, 'error': 'Nicht eingeloggt'};
    }
    try {
      final response = await _dio.post(
        '/profile/avatar',
        data: {'email': _userEmail, 'image': base64Image},
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// Profil aktualisieren
  Future<Map<String, dynamic>> updateProfile({
    String? displayName,
    String? firstName,
    String? lastName,
    String? phone,
    String? status,
    String? customStatus,
  }) async {
    if (_userEmail == null) {
      return {'success': false, 'error': 'Nicht eingeloggt'};
    }
    try {
      final response = await _dio.put(
        '/profile/${Uri.encodeComponent(_userEmail!)}',
        data: {
          if (displayName != null) 'displayName': displayName,
          if (firstName != null) 'firstName': firstName,
          if (lastName != null) 'lastName': lastName,
          if (phone != null) 'phone': phone,
          if (status != null) 'status': status,
          if (customStatus != null) 'customStatus': customStatus,
        },
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      return {'success': false, 'error': e.message};
    }
  }

  /// Aktuelle Benutzer-E-Mail abrufen
  Future<String?> getCurrentUserEmail() async {
    return _userEmail;
  }

  /// Prüft ob Signatur vorhanden
  bool get hasSignature =>
      _defaultSignature != null && _defaultSignature!.isNotEmpty;

  /// Gibt die Signatur zurück
  String? get signature => _defaultSignature;

  /// Alle Signaturen abrufen
  List<Map<String, dynamic>> get signatures => _signatures;

  /// Benutzereinstellungen vom Server abrufen (inkl. Signaturen)
  Future<Map<String, dynamic>> getSettings({bool forceRefresh = false}) async {
    if (_userEmail == null) {
      return {'success': false, 'error': 'Nicht eingeloggt'};
    }

    // Cache nutzen wenn vorhanden und kein Refresh erzwungen
    if (!forceRefresh && _cachedSettings != null) {
      return {'success': true, 'settings': _cachedSettings};
    }

    try {
      final response = await _dio.get(
        '/settings/${Uri.encodeComponent(_userEmail!)}',
      );
      final data = response.data as Map<String, dynamic>;

      if (data['success'] == true && data['settings'] != null) {
        _cachedSettings = data['settings'] as Map<String, dynamic>;

        // Signaturen extrahieren
        final signaturesData = _cachedSettings!['signatures'];
        if (signaturesData is List) {
          _signatures = signaturesData
              .map((s) => s as Map<String, dynamic>)
              .toList();

          // Default-Signatur für neue E-Mails finden
          final defaultSigId =
              _cachedSettings!['defaultSignatureNewEmail'] as String?;
          if (defaultSigId != null && defaultSigId.isNotEmpty) {
            final defaultSig = _signatures.firstWhere(
              (s) => s['id'] == defaultSigId,
              orElse: () => <String, dynamic>{},
            );
            _defaultSignature = defaultSig['content'] as String?;
          } else if (_signatures.isNotEmpty) {
            // Fallback: Erste Signatur mit isDefault=true oder einfach die erste
            final defaultSig = _signatures.firstWhere(
              (s) => s['isDefault'] == true,
              orElse: () => _signatures.first,
            );
            _defaultSignature = defaultSig['content'] as String?;
          }
        }

        // Legacy: Einfache signature-Feld als Fallback
        if (_defaultSignature == null || _defaultSignature!.isEmpty) {
          _defaultSignature = _cachedSettings!['signature'] as String?;
        }

        _logger.d(
          '[ApiService] Settings geladen, ${_signatures.length} Signaturen gefunden',
        );
      }

      return data;
    } on DioException catch (e) {
      _logger.e('[ApiService] Fehler beim Laden der Settings: ${e.message}');
      return {'success': false, 'error': e.message};
    }
  }

  /// Signatur für eine neue E-Mail abrufen
  Future<String?> getSignatureForNewEmail() async {
    if (_defaultSignature == null) {
      await getSettings();
    }
    return _defaultSignature;
  }

  /// Signatur für Antwort abrufen
  Future<String?> getSignatureForReply() async {
    if (_cachedSettings == null) {
      await getSettings();
    }

    final replySigId = _cachedSettings?['defaultSignatureReply'] as String?;
    if (replySigId != null && replySigId.isNotEmpty && _signatures.isNotEmpty) {
      final replySig = _signatures.firstWhere(
        (s) => s['id'] == replySigId,
        orElse: () => <String, dynamic>{},
      );
      return replySig['content'] as String?;
    }

    // Fallback auf Default-Signatur
    return _defaultSignature;
  }

  /// Company Logo URL aus Einstellungen/API abrufen
  Future<String?> getCompanyLogoUrl() async {
    try {
      if (_cachedSettings == null) {
        await getSettings();
      }

      // Prüfe ob Logo URL in Settings gespeichert ist
      final logoUrl = _cachedSettings?['companyLogoUrl'] as String?;
      if (logoUrl != null && logoUrl.isNotEmpty) {
        return logoUrl;
      }

      // Versuche Logo von Taskilo API zu holen
      final response = await _dio.get('/user/profile');
      if (response.statusCode == 200) {
        final userData = response.data;
        final companyLogo = userData['companyLogo'] as String?;
        if (companyLogo != null && companyLogo.isNotEmpty) {
          return companyLogo;
        }
      }

      return null;
    } catch (e) {
      _logger.e('Fehler beim Laden des Company Logos: $e');
      return null;
    }
  }
}
