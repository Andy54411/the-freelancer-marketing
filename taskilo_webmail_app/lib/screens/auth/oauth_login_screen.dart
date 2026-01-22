import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../theme/app_theme.dart';
import 'provider_selection_screen.dart';

/// OAuth Login Screen - WebView für OAuth Provider (Google, Outlook, etc.)
class OAuthLoginScreen extends StatefulWidget {
  final EmailProvider provider;

  const OAuthLoginScreen({super.key, required this.provider});

  @override
  State<OAuthLoginScreen> createState() => _OAuthLoginScreenState();
}

class _OAuthLoginScreenState extends State<OAuthLoginScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;
  String _currentUrl = '';

  @override
  void initState() {
    super.initState();
    _initWebView();
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
            // Prüfe ob OAuth-Callback empfangen
            _checkOAuthCallback(url);
          },
          onWebResourceError: (WebResourceError error) {
            setState(() {
              _isLoading = false;
            });
          },
        ),
      )
      ..loadRequest(Uri.parse(_getOAuthUrl()));
  }

  void _checkOAuthCallback(String url) {
    // Prüfe ob OAuth-Redirect mit Code empfangen
    if (url.contains('code=') || url.contains('access_token=')) {
    }
  }

  String _getOAuthUrl() {
    switch (widget.provider.id) {
      case 'google':
        return 'https://accounts.google.com/';
      case 'outlook':
      case 'office365':
        return 'https://login.microsoftonline.com/';
      case 'yahoo':
        return 'https://login.yahoo.com/';
      default:
        return widget.provider.oauthUrl ?? 'https://accounts.google.com/';
    }
  }

  String _getDisplayUrl() {
    if (_currentUrl.isEmpty) return _getOAuthUrl();
    try {
      final uri = Uri.parse(_currentUrl);
      return uri.host;
    } catch (e) { // Fehler ignorieren 
      return _currentUrl;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade400,
      body: SafeArea(
        child: Column(
          children: [
            // Header mit URL-Leiste
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
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          if (_currentUrl.startsWith('https'))
                            Icon(Icons.lock, size: 14, color: Colors.grey.shade600),
                          const SizedBox(width: 4),
                          Text(
                            _getDisplayUrl(),
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.grey.shade700,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => _controller.reload(),
                    icon: const Icon(Icons.refresh),
                  ),
                ],
              ),
            ),
            
            // Loading Indicator
            if (_isLoading)
              LinearProgressIndicator(
                backgroundColor: Colors.grey.shade200,
                valueColor: AlwaysStoppedAnimation<Color>(_getProviderColor()),
              ),
            
            // WebView Content
            Expanded(
              child: WebViewWidget(controller: _controller),
            ),
            
            // Footer Navigation
            Container(
              color: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  IconButton(
                    onPressed: () async {
                      if (await _controller.canGoBack()) {
                        _controller.goBack();
                      }
                    },
                    icon: const Icon(Icons.chevron_left),
                  ),
                  IconButton(
                    onPressed: () async {
                      if (await _controller.canGoForward()) {
                        _controller.goForward();
                      }
                    },
                    icon: const Icon(Icons.chevron_right),
                  ),
                  IconButton(
                    onPressed: () {},
                    icon: const Icon(Icons.ios_share),
                  ),
                  IconButton(
                    onPressed: () => _controller.reload(),
                    icon: const Icon(Icons.refresh),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _getProviderColor() {
    switch (widget.provider.id) {
      case 'google':
        return const Color(0xFF4285F4);
      case 'outlook':
      case 'office365':
        return const Color(0xFF0078D4);
      case 'yahoo':
        return const Color(0xFF6001D2);
      default:
        return AppColors.primary;
    }
  }
}
