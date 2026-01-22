import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../theme/app_theme.dart';
import '../../services/api_service.dart';
import '../../models/email_models.dart';
import 'email_compose_screen.dart';

class EmailDetailScreen extends StatefulWidget {
  final int uid;
  final String mailbox;

  const EmailDetailScreen({
    super.key,
    required this.uid,
    required this.mailbox,
  });

  @override
  State<EmailDetailScreen> createState() => _EmailDetailScreenState();
}

class _EmailDetailScreenState extends State<EmailDetailScreen> {
  final ApiService _apiService = ApiService();
  
  EmailMessage? _message;
  bool _isLoading = true;
  String? _error;
  WebViewController? _webViewController;
  double _webViewHeight = 300;
  bool _showRecipients = false;

  @override
  void initState() {
    super.initState();
    _loadMessage();
  }

  Future<void> _loadMessage() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final result = await _apiService.getMessage(
        mailbox: widget.mailbox,
        uid: widget.uid,
      );
      
      if (result['success'] == true) {
        final msgData = result['message'] as Map<String, dynamic>;
        setState(() {
          _message = EmailMessage.fromJson(msgData);
        });
        _initWebViewIfNeeded();
      } else {
        setState(() => _error = result['error'] ?? 'Fehler beim Laden');
      }
    } catch (e) { // Fehler ignorieren 
      setState(() => _error = e.toString());
    }

    setState(() => _isLoading = false);
  }

  void _initWebViewIfNeeded() {
    if (_message?.bodyHtml != null && _message!.bodyHtml!.isNotEmpty) {
      final htmlWithMeta = '''
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    body { margin: 0; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-user-select: none; user-select: none; }
    img { max-width: 100%; height: auto; pointer-events: none; }
    a { color: #1a73e8; }
    input, textarea, button, [contenteditable] { pointer-events: none !important; }
  </style>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      document.querySelectorAll('input, textarea, button, [contenteditable]').forEach(function(el) {
        el.setAttribute('tabindex', '-1');
        el.blur();
      });
      document.activeElement.blur();
    });
  </script>
</head>
<body>
${_message!.bodyHtml}
</body>
</html>
''';

      _webViewController = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setBackgroundColor(Colors.white)
        ..setOnConsoleMessage((message) {})
        ..setNavigationDelegate(
          NavigationDelegate(
            onNavigationRequest: (NavigationRequest request) {
              if (request.url.startsWith('http')) {
                launchUrl(Uri.parse(request.url), mode: LaunchMode.externalApplication);
                return NavigationDecision.prevent;
              }
              return NavigationDecision.navigate;
            },
            onPageFinished: (String url) async {
              final height = await _webViewController?.runJavaScriptReturningResult(
                'document.body.scrollHeight'
              );
              if (height != null && mounted) {
                final h = double.tryParse(height.toString()) ?? 300;
                setState(() {
                  _webViewHeight = h + 40;
                });
              }
            },
          ),
        )
        ..loadHtmlString(htmlWithMeta);
      
      setState(() {});
    }
  }

  Future<void> _deleteMessage() async {
    final confirm = await showDialog<bool>(context: context, builder: (context) => 
      AlertDialog(
        title: const Text('E-Mail löschen'),
        content: const Text('Möchten Sie diese E-Mail wirklich löschen?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Abbrechen'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            child: const Text('Löschen'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await _apiService.deleteMessage(
        mailbox: widget.mailbox,
        uid: widget.uid,
      );
      if (!mounted) return;
      Navigator.pop(context);
    }
  }

  Future<void> _toggleStar() async {
    if (_message == null) return;
    
    await _apiService.toggleStar(
      mailbox: widget.mailbox,
      uid: widget.uid,
      starred: !_message!.isStarred,
    );
    
    final updatedFlags = List<String>.from(_message!.flags);
    if (_message!.isStarred) {
      updatedFlags.remove('\\Flagged');
    } else {
      updatedFlags.add('\\Flagged');
    }
    
    setState(() {
      _message = EmailMessage(
        uid: _message!.uid,
        messageId: _message!.messageId,
        subject: _message!.subject,
        from: _message!.from,
        to: _message!.to,
        cc: _message!.cc,
        bcc: _message!.bcc,
        date: _message!.date,
        flags: updatedFlags,
        hasAttachments: _message!.hasAttachments,
        preview: _message!.preview,
        text: _message!.text,
        html: _message!.html,
        attachments: _message!.attachments,
      );
    });
  }

  Future<void> _archiveMessage() async {
    await _apiService.moveMessage(
      mailbox: widget.mailbox,
      uid: widget.uid,
      targetMailbox: 'Archive',
    );
    if (!mounted) return;
    Navigator.pop(context);
  }

  Future<void> _markAsUnread() async {
    await _apiService.markAsUnread(
      mailbox: widget.mailbox,
      uid: widget.uid,
    );
    if (!mounted) return;
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: _buildGmailAppBar(),
      body: _buildBody(),
      bottomNavigationBar: _message != null ? _buildBottomBar() : null,
    );
  }

  PreferredSizeWidget _buildGmailAppBar() {
    return AppBar(
      backgroundColor: Colors.white,
      elevation: 0,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back, color: Colors.black87),
        onPressed: () => Navigator.pop(context),
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.archive_outlined, color: Colors.black87),
          onPressed: _message != null ? _archiveMessage : null,
        ),
        IconButton(
          icon: const Icon(Icons.delete_outline, color: Colors.black87),
          onPressed: _message != null ? _deleteMessage : null,
        ),
        IconButton(
          icon: const Icon(Icons.mail_outline, color: Colors.black87),
          onPressed: _message != null ? _markAsUnread : null,
        ),
        PopupMenuButton<String>(
          icon: const Icon(Icons.more_vert, color: Colors.black87),
          onSelected: (value) {
            switch (value) {
              case 'spam':
                // Mark as spam
                break;
              case 'print':
                // Print
                break;
            }
          },
          itemBuilder: (context) => [
            const PopupMenuItem(value: 'spam', child: Text('Als Spam melden')),
            const PopupMenuItem(value: 'print', child: Text('Drucken')),
          ],
        ),
      ],
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: Color(0xFF1a73e8)),
      );
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: AppColors.error),
            const SizedBox(height: 16),
            Text(_error!, style: const TextStyle(color: AppColors.error)),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadMessage,
              child: const Text('Erneut versuchen'),
            ),
          ],
        ),
      );
    }

    if (_message == null) {
      return const Center(child: Text('E-Mail nicht gefunden'));
    }

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Subject mit Stern
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 8, 0),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    _message!.subject,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w400,
                      color: Colors.black87,
                      height: 1.3,
                    ),
                  ),
                ),
                IconButton(
                  icon: Icon(
                    _message!.isStarred ? Icons.star : Icons.star_border,
                    color: _message!.isStarred ? Colors.amber : Colors.grey,
                    size: 24,
                  ),
                  onPressed: _toggleStar,
                ),
              ],
            ),
          ),
          
          // Label
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.grey.shade200,
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                _getMailboxLabel(widget.mailbox),
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey.shade700,
                ),
              ),
            ),
          ),
          
          // Sender Row - Gmail Style
          _buildSenderRow(),
          
          const SizedBox(height: 8),
          
          // Divider
          const Divider(height: 1),
          
          // Email Body
          if (_message!.bodyHtml != null && _message!.bodyHtml!.isNotEmpty && _webViewController != null)
            SizedBox(
              height: _webViewHeight,
              child: WebViewWidget(controller: _webViewController!),
            )
          else if (_message!.bodyText != null && _message!.bodyText!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                _message!.bodyText!,
                style: const TextStyle(
                  fontSize: 14,
                  height: 1.5,
                  color: Colors.black87,
                ),
              ),
            )
          else
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Kein Inhalt',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey,
                  fontStyle: FontStyle.italic,
                ),
              ),
            ),
          
          // Attachments
          if (_message!.attachments != null && _message!.attachments!.isNotEmpty)
            _buildAttachments(),
          
          const SizedBox(height: 80), // Space for bottom bar
        ],
      ),
    );
  }

  Widget _buildSenderRow() {
    final sender = _message!.from.isNotEmpty ? _message!.from.first : null;
    final senderName = sender?.displayName.isNotEmpty == true 
        ? sender!.displayName 
        : sender?.email ?? 'Unbekannt';
    final senderEmail = sender?.email ?? '';
    final initial = senderName.isNotEmpty ? senderName[0].toUpperCase() : 'U';
    
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              // Avatar
              CircleAvatar(
                radius: 20,
                backgroundColor: _getAvatarColor(senderName),
                child: Text(
                  initial,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              
              // Name and Time
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            senderName,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: Colors.black87,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          _formatTime(_message!.date),
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    GestureDetector(
                      onTap: () {
                        setState(() {
                          _showRecipients = !_showRecipients;
                        });
                      },
                      child: Row(
                        children: [
                          Text(
                            'an mich',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey.shade600,
                            ),
                          ),
                          Icon(
                            _showRecipients 
                                ? Icons.keyboard_arrow_up 
                                : Icons.keyboard_arrow_down,
                            size: 16,
                            color: Colors.grey.shade600,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              
              // Action buttons
              IconButton(
                icon: Icon(Icons.emoji_emotions_outlined, 
                    color: Colors.grey.shade600, size: 22),
                onPressed: () {},
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
              ),
              IconButton(
                icon: Icon(Icons.reply, color: Colors.grey.shade600, size: 22),
                onPressed: () => EmailComposeScreen.show(
                  context,
                  replyTo: _message,
                  mode: ComposeMode.reply,
                ),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
              ),
              PopupMenuButton<String>(
                icon: Icon(Icons.more_vert, color: Colors.grey.shade600, size: 22),
                padding: EdgeInsets.zero,
                onSelected: (value) {
                  switch (value) {
                    case 'reply_all':
                      EmailComposeScreen.show(
                        context,
                        replyTo: _message,
                        mode: ComposeMode.replyAll,
                      );
                      break;
                    case 'forward':
                      EmailComposeScreen.show(
                        context,
                        replyTo: _message,
                        mode: ComposeMode.forward,
                      );
                      break;
                  }
                },
                itemBuilder: (context) => [
                  const PopupMenuItem(value: 'reply_all', child: Text('Allen antworten')),
                  const PopupMenuItem(value: 'forward', child: Text('Weiterleiten')),
                ],
              ),
            ],
          ),
          
          // Expanded recipients
          if (_showRecipients) ...[
            const SizedBox(height: 12),
            _buildRecipientDetail('Von:', senderEmail),
            if (_message!.to.isNotEmpty)
              _buildRecipientDetail('An:', _message!.to.map((e) => e.email).join(', ')),
            if (_message!.cc != null && _message!.cc!.isNotEmpty)
              _buildRecipientDetail('Cc:', _message!.cc!.map((e) => e.email).join(', ')),
            _buildRecipientDetail('Datum:', DateFormat('dd.MM.yyyy, HH:mm').format(_message!.date)),
          ],
        ],
      ),
    );
  }

  Widget _buildRecipientDetail(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(left: 52, bottom: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 50,
            child: Text(
              label,
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey.shade600,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 12,
                color: Colors.black87,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAttachments() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Divider(height: 1),
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${_message!.attachments!.length} Anhänge',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey.shade600,
                ),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _message!.attachments!.map((attachment) {
                  return InkWell(
                    onTap: () => _downloadAttachment(attachment),
                    child: Container(
                      width: 100,
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.grey.shade300),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        children: [
                          Icon(
                            _getAttachmentIcon(attachment.mimeType),
                            size: 32,
                            color: Colors.grey.shade600,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            attachment.filename,
                            style: const TextStyle(fontSize: 11),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildBottomBar() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 4,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => EmailComposeScreen.show(
                    context,
                    replyTo: _message,
                    mode: ComposeMode.reply,
                  ),
                  icon: const Icon(Icons.reply, size: 18),
                  label: const Text('Antworten'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.black87,
                    side: BorderSide(color: Colors.grey.shade300),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => EmailComposeScreen.show(
                    context,
                    replyTo: _message,
                    mode: ComposeMode.forward,
                  ),
                  icon: const Icon(Icons.forward, size: 18),
                  label: const Text('Weiterleiten'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.black87,
                    side: BorderSide(color: Colors.grey.shade300),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                icon: Icon(Icons.emoji_emotions_outlined, 
                    color: Colors.grey.shade600),
                onPressed: () {},
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _downloadAttachment(EmailAttachment attachment) async {
    final url = _apiService.getAttachmentUrl(
      uid: widget.uid,
      attachmentId: attachment.partId ?? attachment.filename,
      mailbox: widget.mailbox,
    );

    try {
      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
      }
    } catch (e) { // Fehler ignorieren 
    }
  }

  String _formatTime(DateTime date) {
    final now = DateTime.now();
    if (date.year == now.year && date.month == now.month && date.day == now.day) {
      return DateFormat('HH:mm').format(date);
    } else if (date.year == now.year) {
      return DateFormat('dd. MMM.', 'de').format(date);
    }
    return DateFormat('dd.MM.yyyy').format(date);
  }

  String _getMailboxLabel(String mailbox) {
    switch (mailbox.toLowerCase()) {
      case 'inbox':
        return 'Posteingang';
      case 'sent':
        return 'Gesendet';
      case 'drafts':
        return 'Entwürfe';
      case 'trash':
        return 'Papierkorb';
      case 'spam':
      case 'junk':
        return 'Spam';
      case 'archive':
        return 'Archiv';
      default:
        return mailbox;
    }
  }

  Color _getAvatarColor(String name) {
    final colors = [
      const Color(0xFF1a73e8), // Google Blue
      const Color(0xFF34a853), // Google Green
      const Color(0xFFea4335), // Google Red
      const Color(0xFFfbbc04), // Google Yellow
      const Color(0xFF673ab7), // Purple
      const Color(0xFF00acc1), // Cyan
      const Color(0xFFff7043), // Deep Orange
      const Color(0xFF5c6bc0), // Indigo
    ];
    final index = name.hashCode.abs() % colors.length;
    return colors[index];
  }

  IconData _getAttachmentIcon(String mimeType) {
    if (mimeType.startsWith('image/')) return Icons.image;
    if (mimeType.startsWith('video/')) return Icons.video_file;
    if (mimeType.startsWith('audio/')) return Icons.audio_file;
    if (mimeType.contains('pdf')) return Icons.picture_as_pdf;
    if (mimeType.contains('word') || mimeType.contains('document')) return Icons.description;
    if (mimeType.contains('sheet') || mimeType.contains('excel')) return Icons.table_chart;
    return Icons.attach_file;
  }
}
