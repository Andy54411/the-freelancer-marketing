import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../services/api_service.dart';
import '../../services/secure_storage_service.dart';
import '../../theme/app_theme.dart';
import '../../router/app_router.dart';
import 'provider_selection_screen.dart';

class LoginScreen extends StatefulWidget {
  final EmailProvider? provider;
  final String? prefilledEmail;

  const LoginScreen({super.key, this.provider, this.prefilledEmail});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  late final WebViewController _controller;
  final SecureStorageService _storageService = SecureStorageService.instance;
  bool _isLoading = true;
  String _currentUrl = '';
  bool _loginDetected = false;
  Timer? _cookieCheckTimer;

  @override
  void initState() {
    super.initState();
    _initWebView();
    _startCookieCheckTimer();
  }

  /// Periodischer Cookie-Check alle 2 Sekunden
  void _startCookieCheckTimer() {
    _cookieCheckTimer = Timer.periodic(const Duration(seconds: 2), (timer) {
      if (!_loginDetected && _currentUrl.contains('taskilo.de')) {
        _checkLoginSuccess(_currentUrl);
      }
    });
  }

  void _initWebView() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (String url) {
            setState(() {
              _isLoading = true;
              _currentUrl = url;
            });
          },
          onPageFinished: (String url) {
            setState(() {
              _isLoading = false;
              _currentUrl = url;
            });
            _dismissCookieBanner();
            _checkLoginSuccess(url);
          },
          onWebResourceError: (WebResourceError error) {
            setState(() {
              _isLoading = false;
            });
          },
        ),
      )
      ..loadRequest(Uri.parse('https://taskilo.de/webmail'));
  }

  Future<void> _dismissCookieBanner() async {
    // Cookie-Banner automatisch akzeptieren
    await _controller.runJavaScript('''
      (function() {
        // Versuche verschiedene Selektoren für den Akzeptieren-Button
        var selectors = [
          'button[data-cookie-accept]',
          'button.cookie-accept',
          '[data-testid="cookie-accept"]',
          'button:contains("Alle akzeptieren")',
          'button:contains("Akzeptieren")',
          '.cookie-banner button',
          '.cookie-consent button',
          '#cookie-accept',
          '.cc-accept',
          '.cc-allow'
        ];
        
        for (var i = 0; i < selectors.length; i++) {
          try {
            var btn = document.querySelector(selectors[i]);
            if (btn) {
              btn.click();
              return;
            }
          } catch (e) {}
        }
        
        // Fallback: Suche nach Button mit Text
        var buttons = document.querySelectorAll('button');
        for (var j = 0; j < buttons.length; j++) {
          var text = buttons[j].innerText || buttons[j].textContent;
          if (text && (text.includes('Alle akzeptieren') || text.includes('Akzeptieren') || text.includes('Accept'))) {
            buttons[j].click();
            return;
          }
        }
      })();
    ''');
  }

  Future<void> _checkLoginSuccess(String url) async {
    if (_loginDetected) return;
    
    // Prüfe ob wir auf einer Taskilo-Webmail-Seite sind
    if (!url.contains('taskilo.de')) return;
    
    // Cookies auslesen via JavaScript
    String? cookieString;
    try {
      final cookieResult = await _controller.runJavaScriptReturningResult('document.cookie');
      if (cookieResult is String) {
        cookieString = cookieResult.replaceAll('"', '').replaceAll("'", '');
      }
    } catch (e) { // Fehler ignorieren 
      debugPrint('Cookie-Auslesen fehlgeschlagen: $e');
      return;
    }
    
    debugPrint('Cookies gefunden: $cookieString');
    
    if (cookieString == null || cookieString.isEmpty) return;
    
    // webmail_session Cookie suchen (enthält Base64-encoded {email, password})
    final sessionMatch = RegExp(r'webmail_session=([^;]+)').firstMatch(cookieString);
    if (sessionMatch == null) {
      debugPrint('Kein webmail_session Cookie gefunden');
      return;
    }
    
    debugPrint('webmail_session Cookie gefunden!');
    _loginDetected = true;
    
    // Session-Cookie dekodieren um E-Mail UND Passwort zu extrahieren
    String userEmail = '';
    String userPassword = '';
    try {
      final sessionValue = sessionMatch.group(1)!;
      debugPrint('Session Value (encoded): ${sessionValue.substring(0, 20)}...');
      
      // URI-Dekodierung falls nötig
      String decoded = sessionValue;
      try {
        decoded = Uri.decodeComponent(sessionValue);
      } catch (e) { // Fehler ignorieren 
        // Bereits dekodiert oder kein URI-Encoding
      }
      
      // Base64 dekodieren
      final bytes = base64Decode(decoded);
      final jsonStr = utf8.decode(bytes);
      final sessionData = jsonDecode(jsonStr);
      userEmail = sessionData['email'] ?? '';
      userPassword = sessionData['password'] ?? '';
      debugPrint('Email extrahiert: $userEmail');
    } catch (e) { // Fehler ignorieren 
      debugPrint('Session-Dekodierung fehlgeschlagen: $e');
      _loginDetected = false;
      return;
    }
    
    if (userEmail.isEmpty || userPassword.isEmpty) {
      debugPrint('Email oder Passwort leer');
      _loginDetected = false;
      return;
    }
    
    // ApiService mit echten Credentials initialisieren
    final apiService = ApiService();
    final loginResult = await apiService.login(userEmail, userPassword);
    
    debugPrint('API Login Ergebnis: ${loginResult['success']}');
    
    if (loginResult['success'] != true) {
      // Login fehlgeschlagen - trotzdem Credentials speichern für Retry
      await _storageService.saveCredentials(email: userEmail, password: userPassword);
    }
    
    
    if (mounted) {
      context.go(AppRouter.home);
    }
  }

  String _getDisplayUrl() {
    if (_currentUrl.isEmpty) return 'taskilo.de';
    try {
      final uri = Uri.parse(_currentUrl);
      return uri.host;
    } catch (e) { // Fehler ignorieren 
      return _currentUrl;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.provider?.id == 'imap') {
      return _buildImapLoginForm();
    }

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            Container(
              color: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close),
                  ),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.lock,
                            size: 14,
                            color: Colors.green.shade700,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            _getDisplayUrl(),
                            style: const TextStyle(fontSize: 14),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 48),
                ],
              ),
            ),
            if (_isLoading)
              LinearProgressIndicator(
                backgroundColor: Colors.grey.shade200,
                valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
              ),
            Expanded(child: WebViewWidget(controller: _controller)),
          ],
        ),
      ),
    );
  }

  Widget _buildImapLoginForm() {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('IMAP Konfiguration'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: const Center(child: Text('IMAP-Konfiguration - In Entwicklung')),
    );
  }

  @override
  void dispose() {
    _cookieCheckTimer?.cancel();
    super.dispose();
  }
}
