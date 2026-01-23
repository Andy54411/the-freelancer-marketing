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
        // Debug: Prüfe Attachments
        final attachments = msgData['attachments'] as List?;
        debugPrint('=== EMAIL DEBUG ===');
        debugPrint('Attachments count: ${attachments?.length ?? 0}');
        if (attachments != null) {
          for (final att in attachments) {
            debugPrint(
              'Attachment: ${att['filename']}, contentId: ${att['contentId']}, hasData: ${att['data'] != null}',
            );
          }
        }
        final html = msgData['html'] as String?;
        debugPrint('HTML length: ${html?.length ?? 0}');
        if (html != null && html.contains('cid:')) {
          debugPrint('HTML contains CID references!');
        }
        if (html != null && html.contains('src="http')) {
          debugPrint('HTML contains external image URLs!');
        }
        // Zeige erste 500 Zeichen des HTML
        if (html != null) {
          debugPrint(
            'HTML preview: ${html.substring(0, html.length > 500 ? 500 : html.length)}',
          );
        }
        debugPrint('=== END DEBUG ===');

        setState(() {
          _message = EmailMessage.fromJson(msgData);
        });
        _initWebViewIfNeeded();

        // Automatisch als gelesen markieren wenn ungelesen
        if (_message != null && !_message!.isRead) {
          _markAsRead();
        }
      } else {
        setState(() => _error = result['error'] ?? 'Fehler beim Laden');
      }
    } catch (e) {
      // Fehler ignorieren
      setState(() => _error = e.toString());
    }

    setState(() => _isLoading = false);
  }

  Future<void> _markAsRead() async {
    try {
      final result = await _apiService.markAsRead(
        widget.uid,
        true,
        mailbox: widget.mailbox,
      );
      debugPrint('markAsRead result: $result');
    } catch (e) {
      debugPrint('Fehler beim Markieren als gelesen: $e');
    }
  }

  void _initWebViewIfNeeded() {
    if (_message?.bodyHtml != null && _message!.bodyHtml!.isNotEmpty) {
      // Ersetze CID-Referenzen durch Data-URLs
      String processedHtml = _message!.bodyHtml!;

      if (_message!.attachments != null) {
        for (final attachment in _message!.attachments!) {
          if (attachment.contentId != null && attachment.data != null) {
            // CID kann mit oder ohne < > Klammern sein
            final cid = attachment.contentId!.replaceAll(RegExp(r'^<|>$'), '');
            final dataUrl =
                'data:${attachment.contentType};base64,${attachment.data}';

            // Ersetze cid:xxx Referenzen
            processedHtml = processedHtml.replaceAll('cid:$cid', dataUrl);
            processedHtml = processedHtml.replaceAll(
              'cid:${attachment.contentId}',
              dataUrl,
            );
          }
        }
      }

      final htmlWithMeta =
          '''
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
$processedHtml
</body>
</html>
''';

      _webViewController = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setBackgroundColor(Colors.white)
        ..setOnConsoleMessage((message) {
          debugPrint('WebView Console: ${message.message}');
        })
        ..setNavigationDelegate(
          NavigationDelegate(
            onNavigationRequest: (NavigationRequest request) {
              debugPrint(
                'WebView Navigation: ${request.url} isMainFrame=${request.isMainFrame}',
              );

              // Data-URLs und about:blank immer erlauben
              if (request.url.startsWith('data:') ||
                  request.url == 'about:blank') {
                return NavigationDecision.navigate;
              }

              // Externe HTTP-Links nur im Hauptframe abfangen (Klicks auf Links)
              // Ressourcen (Bilder, CSS, etc.) werden nicht als MainFrame Navigation geladen
              if (request.url.startsWith('http') && request.isMainFrame) {
                // Prüfe ob es ein Bild-Request ist (diese kommen nicht als MainFrame)
                launchUrl(
                  Uri.parse(request.url),
                  mode: LaunchMode.externalApplication,
                );
                return NavigationDecision.prevent;
              }

              return NavigationDecision.navigate;
            },
            onPageFinished: (String url) async {
              final height = await _webViewController
                  ?.runJavaScriptReturningResult('document.body.scrollHeight');
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
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
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
      final result = await _apiService.deleteMessage(
        mailbox: widget.mailbox,
        uid: widget.uid,
      );
      if (!mounted) return;
      // Gib die uid zurück, damit die Liste die E-Mail sofort entfernen kann
      if (result['success'] == true) {
        Navigator.pop(context, {'deleted': true, 'uid': widget.uid});
      } else {
        Navigator.pop(context);
      }
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
    await _apiService.markAsUnread(mailbox: widget.mailbox, uid: widget.uid);
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
          tooltip: 'Archivieren',
        ),
        IconButton(
          icon: const Icon(Icons.delete_outline, color: Colors.black87),
          onPressed: _message != null ? _deleteMessage : null,
          tooltip: 'Löschen',
        ),
        IconButton(
          icon: const Icon(Icons.mail_outline, color: Colors.black87),
          onPressed: _message != null ? _markAsUnread : null,
          tooltip: 'Als ungelesen markieren',
        ),
        PopupMenuButton<String>(
          icon: const Icon(Icons.more_vert, color: Colors.black87),
          tooltip: 'Weitere Optionen',
          onSelected: _handleMenuAction,
          itemBuilder: (context) => [
            _buildMenuItem(
              'move',
              Icons.drive_file_move_outlined,
              'Verschieben',
            ),
            _buildMenuItem('label', Icons.label_outline, 'Label ändern in'),
            _buildMenuItem(
              'unimportant',
              Icons.keyboard_double_arrow_right,
              'Als nicht wichtig markieren',
            ),
            const PopupMenuDivider(),
            _buildMenuItem('snooze', Icons.access_time, 'Zurückstellen'),
            _buildMenuItem(
              'add_to_tasks',
              Icons.add_task,
              'Zu Tasks hinzufügen',
            ),
            _buildMenuItem(
              'mute',
              Icons.notifications_off_outlined,
              'Ignorieren',
            ),
            const PopupMenuDivider(),
            _buildMenuItem('print', Icons.print_outlined, 'Alle drucken'),
            _buildMenuItem(
              'original',
              Icons.fullscreen_outlined,
              'Original wiederherstellen',
            ),
            const PopupMenuDivider(),
            PopupMenuItem<String>(
              value: 'spam',
              child: Row(
                children: [
                  Icon(
                    Icons.report_outlined,
                    color: Colors.red.shade600,
                    size: 20,
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'Spam melden',
                    style: TextStyle(color: Colors.red.shade600),
                  ),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }

  PopupMenuItem<String> _buildMenuItem(
    String value,
    IconData icon,
    String label,
  ) {
    return PopupMenuItem<String>(
      value: value,
      child: Row(
        children: [
          Icon(icon, color: Colors.black87, size: 20),
          const SizedBox(width: 12),
          Text(label),
        ],
      ),
    );
  }

  Future<void> _handleMenuAction(String value) async {
    switch (value) {
      case 'move':
        _showMoveDialog();
        break;
      case 'label':
        _showLabelDialog();
        break;
      case 'unimportant':
        await _markAsUnimportant();
        break;
      case 'snooze':
        _showSnoozeDialog();
        break;
      case 'add_to_tasks':
        await _addToTasks();
        break;
      case 'mute':
        await _muteConversation();
        break;
      case 'print':
        await _printEmail();
        break;
      case 'original':
        await _showOriginal();
        break;
      case 'spam':
        await _markAsSpam();
        break;
    }
  }

  void _showMoveDialog() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Verschieben nach',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 16),
            _buildFolderOption('INBOX', Icons.inbox, 'Posteingang'),
            _buildFolderOption('Archive', Icons.archive_outlined, 'Archiv'),
            _buildFolderOption('Drafts', Icons.drafts_outlined, 'Entwürfe'),
            _buildFolderOption('Junk', Icons.report_outlined, 'Spam'),
            _buildFolderOption('Trash', Icons.delete_outline, 'Papierkorb'),
          ],
        ),
      ),
    );
  }

  Widget _buildFolderOption(String folder, IconData icon, String label) {
    return ListTile(
      leading: Icon(icon, color: Colors.black87),
      title: Text(label),
      onTap: () async {
        Navigator.pop(context);
        await _apiService.moveMessage(
          mailbox: widget.mailbox,
          uid: widget.uid,
          targetMailbox: folder,
        );
        if (!mounted) return;
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Verschoben nach $label')));
        Navigator.pop(context, {'moved': true, 'uid': widget.uid});
      },
    );
  }

  void _showLabelDialog() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Label ändern',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 16),
            _buildLabelOption(
              'important',
              Icons.label_important_outline,
              'Wichtig',
              Colors.orange,
            ),
            _buildLabelOption(
              'work',
              Icons.work_outline,
              'Arbeit',
              Colors.blue,
            ),
            _buildLabelOption(
              'personal',
              Icons.person_outline,
              'Persönlich',
              Colors.green,
            ),
            _buildLabelOption(
              'finance',
              Icons.account_balance_outlined,
              'Finanzen',
              Colors.purple,
            ),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.add, color: Colors.black87),
              title: const Text('Neues Label erstellen'),
              onTap: () {
                Navigator.pop(context);
                _showCreateLabelDialog();
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showCreateLabelDialog() {
    final controller = TextEditingController();
    Color selectedColor = Colors.blue;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Neues Label erstellen'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: controller,
                decoration: const InputDecoration(
                  labelText: 'Label-Name',
                  border: OutlineInputBorder(),
                ),
                autofocus: true,
              ),
              const SizedBox(height: 16),
              const Text('Farbe auswählen:'),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children:
                    [
                          Colors.blue,
                          Colors.green,
                          Colors.orange,
                          Colors.purple,
                          Colors.red,
                          Colors.teal,
                        ]
                        .map(
                          (color) => GestureDetector(
                            onTap: () =>
                                setDialogState(() => selectedColor = color),
                            child: Container(
                              width: 32,
                              height: 32,
                              decoration: BoxDecoration(
                                color: color,
                                shape: BoxShape.circle,
                                border: selectedColor == color
                                    ? Border.all(color: Colors.black, width: 2)
                                    : null,
                              ),
                            ),
                          ),
                        )
                        .toList(),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Abbrechen'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (controller.text.isNotEmpty) {
                  final labelText = controller.text;
                  final scaffoldMessenger = ScaffoldMessenger.of(context);
                  Navigator.pop(context);
                  // Label zur E-Mail hinzufügen
                  final result = await _apiService.addLabel(
                    mailbox: widget.mailbox,
                    uid: widget.uid,
                    label: labelText,
                  );
                  if (!mounted) return;
                  if (result['success'] == true) {
                    scaffoldMessenger.showSnackBar(
                      SnackBar(
                        content: Text(
                          'Label "$labelText" erstellt und hinzugefügt',
                        ),
                      ),
                    );
                  } else {
                    scaffoldMessenger.showSnackBar(
                      SnackBar(content: Text('Fehler: ${result['error']}')),
                    );
                  }
                }
              },
              child: const Text('Erstellen'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLabelOption(
    String labelId,
    IconData icon,
    String label,
    Color color,
  ) {
    return ListTile(
      leading: Icon(icon, color: color),
      title: Text(label),
      onTap: () async {
        Navigator.pop(context);
        final result = await _apiService.addLabel(
          mailbox: widget.mailbox,
          uid: widget.uid,
          label: labelId,
        );
        if (!mounted) return;
        if (result['success'] == true) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text('Label "$label" hinzugefügt')));
        } else {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text('Fehler: ${result['error']}')));
        }
      },
    );
  }

  void _showSnoozeDialog() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Zurückstellen bis',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 16),
            _buildSnoozeOption(
              'later_today',
              Icons.access_time,
              'Später heute',
              '18:00',
            ),
            _buildSnoozeOption(
              'tomorrow',
              Icons.wb_sunny_outlined,
              'Morgen',
              '08:00',
            ),
            _buildSnoozeOption(
              'next_week',
              Icons.date_range,
              'Nächste Woche',
              'Mo, 08:00',
            ),
            const Divider(),
            Builder(
              builder: (sheetContext) => ListTile(
                leading: const Icon(Icons.edit_calendar, color: Colors.black87),
                title: const Text('Datum und Uhrzeit auswählen'),
                onTap: () async {
                  Navigator.pop(sheetContext);
                  if (!mounted) return;
                  final date = await showDatePicker(
                    context: this.context,
                    initialDate: DateTime.now().add(const Duration(days: 1)),
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 365)),
                  );
                  if (date != null && mounted) {
                    final time = await showTimePicker(
                      context: this.context,
                      initialTime: const TimeOfDay(hour: 9, minute: 0),
                    );
                    if (time != null && mounted) {
                      final snoozeUntil = DateTime(
                        date.year,
                        date.month,
                        date.day,
                        time.hour,
                        time.minute,
                      );
                      await _snoozeEmail(snoozeUntil);
                    }
                  }
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSnoozeOption(
    String id,
    IconData icon,
    String label,
    String time,
  ) {
    return ListTile(
      leading: Icon(icon, color: Colors.black87),
      title: Text(label),
      trailing: Text(time, style: TextStyle(color: Colors.grey.shade600)),
      onTap: () async {
        Navigator.pop(context);
        DateTime snoozeUntil;
        final now = DateTime.now();
        switch (id) {
          case 'later_today':
            snoozeUntil = DateTime(now.year, now.month, now.day, 18, 0);
            break;
          case 'tomorrow':
            snoozeUntil = DateTime(now.year, now.month, now.day + 1, 8, 0);
            break;
          case 'next_week':
            final daysUntilMonday = (8 - now.weekday) % 7;
            snoozeUntil = DateTime(
              now.year,
              now.month,
              now.day + (daysUntilMonday == 0 ? 7 : daysUntilMonday),
              8,
              0,
            );
            break;
          default:
            return;
        }
        await _snoozeEmail(snoozeUntil);
      },
    );
  }

  Future<void> _snoozeEmail(DateTime until) async {
    final result = await _apiService.snoozeMessage(
      mailbox: widget.mailbox,
      uid: widget.uid,
      until: until,
    );
    if (!mounted) return;
    if (result['success'] == true) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Zurückgestellt bis ${DateFormat('dd.MM.yyyy HH:mm').format(until)}',
          ),
        ),
      );
      Navigator.pop(context, {'snoozed': true, 'uid': widget.uid});
    } else {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Fehler: ${result['error']}')));
    }
  }

  Future<void> _markAsUnimportant() async {
    final result = await _apiService.setImportant(
      mailbox: widget.mailbox,
      uid: widget.uid,
      important: false,
    );
    if (!mounted) return;
    if (result['success'] == true) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Als nicht wichtig markiert')),
      );
    }
  }

  Future<void> _addToTasks() async {
    if (_message == null) return;

    final result = await _apiService.addEmailToTasks(
      mailbox: widget.mailbox,
      uid: widget.uid,
      subject: _message!.subject,
    );
    if (!mounted) return;
    if (result['success'] == true) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Zu Tasks hinzugefügt')));
    } else {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Fehler: ${result['error']}')));
    }
  }

  Future<void> _muteConversation() async {
    final result = await _apiService.muteConversation(
      mailbox: widget.mailbox,
      uid: widget.uid,
    );
    if (!mounted) return;
    if (result['success'] == true) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Konversation wird ignoriert')),
      );
      Navigator.pop(context, {'muted': true, 'uid': widget.uid});
    }
  }

  Future<void> _printEmail() async {
    if (_message == null) return;

    // Öffne Druckvorschau mit E-Mail-Inhalt
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.8,
        maxChildSize: 0.95,
        builder: (context, scrollController) => Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Druckvorschau',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                  ),
                  Row(
                    children: [
                      ElevatedButton.icon(
                        onPressed: () {
                          Navigator.pop(context);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text(
                                'Druckauftrag wird an das System gesendet...',
                              ),
                            ),
                          );
                          // Native Druckdialog würde hier aufgerufen werden
                          // Für Flutter Web/Mobile: printing package verwenden
                        },
                        icon: const Icon(Icons.print, size: 18),
                        label: const Text('Drucken'),
                      ),
                      const SizedBox(width: 8),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: ListView(
                controller: scrollController,
                padding: const EdgeInsets.all(16),
                children: [
                  // Header-Bereich
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _message!.subject,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 12),
                        _buildPrintDetail(
                          'Von:',
                          _message!.from
                              .map(
                                (e) => e.displayName.isNotEmpty
                                    ? '${e.displayName} <${e.email}>'
                                    : e.email,
                              )
                              .join(', '),
                        ),
                        _buildPrintDetail(
                          'An:',
                          _message!.to.map((e) => e.email).join(', '),
                        ),
                        if (_message!.cc != null && _message!.cc!.isNotEmpty)
                          _buildPrintDetail(
                            'Cc:',
                            _message!.cc!.map((e) => e.email).join(', '),
                          ),
                        _buildPrintDetail(
                          'Datum:',
                          DateFormat('dd.MM.yyyy HH:mm').format(_message!.date),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  // E-Mail-Inhalt
                  if (_message!.bodyText != null &&
                      _message!.bodyText!.isNotEmpty)
                    Text(
                      _message!.bodyText!,
                      style: const TextStyle(fontSize: 14, height: 1.6),
                    )
                  else
                    Text(
                      _message!.preview,
                      style: const TextStyle(fontSize: 14, height: 1.6),
                    ),
                  const SizedBox(height: 16),
                  // Anhänge
                  if (_message!.attachments != null &&
                      _message!.attachments!.isNotEmpty) ...[
                    const Divider(),
                    Text(
                      '${_message!.attachments!.length} Anhänge:',
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 8),
                    ...(_message!.attachments!.map(
                      (att) => Padding(
                        padding: const EdgeInsets.symmetric(vertical: 2),
                        child: Text('• ${att.filename}'),
                      ),
                    )),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPrintDetail(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 60,
            child: Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Colors.grey.shade700,
              ),
            ),
          ),
          Expanded(child: Text(value, style: const TextStyle(fontSize: 12))),
        ],
      ),
    );
  }

  Future<void> _showOriginal() async {
    // Zeige Original-Header und Quellcode
    if (_message == null) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.7,
        maxChildSize: 0.9,
        builder: (context, scrollController) => Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Original anzeigen',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: ListView(
                controller: scrollController,
                padding: const EdgeInsets.all(16),
                children: [
                  Text('Message-ID: ${_message!.messageId}'),
                  const SizedBox(height: 8),
                  Text('Von: ${_message!.from.map((e) => e.email).join(", ")}'),
                  const SizedBox(height: 8),
                  Text('An: ${_message!.to.map((e) => e.email).join(", ")}'),
                  const SizedBox(height: 8),
                  Text('Datum: ${_message!.date.toIso8601String()}'),
                  const SizedBox(height: 8),
                  Text('Betreff: ${_message!.subject}'),
                  const SizedBox(height: 16),
                  const Divider(),
                  const Text(
                    'Flags:',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  Text(_message!.flags.join(', ')),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _markAsSpam() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Spam melden'),
        content: const Text(
          'Diese E-Mail als Spam melden und in den Spam-Ordner verschieben?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Abbrechen'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Spam melden'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      final result = await _apiService.markAsSpam(
        mailbox: widget.mailbox,
        uid: widget.uid,
      );
      if (!mounted) return;
      if (result['success'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Als Spam gemeldet und verschoben')),
        );
        Navigator.pop(context, {'spam': true, 'uid': widget.uid});
      } else {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Fehler: ${result['error']}')));
      }
    }
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
                style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
              ),
            ),
          ),

          // Sender Row - Gmail Style
          _buildSenderRow(),

          const SizedBox(height: 8),

          // Divider
          const Divider(height: 1),

          // Email Body
          if (_message!.bodyHtml != null &&
              _message!.bodyHtml!.isNotEmpty &&
              _webViewController != null)
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
          if (_message!.attachments != null &&
              _message!.attachments!.isNotEmpty)
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
                icon: Icon(
                  Icons.emoji_emotions_outlined,
                  color: Colors.grey.shade600,
                  size: 22,
                ),
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
                icon: Icon(
                  Icons.more_vert,
                  color: Colors.grey.shade600,
                  size: 22,
                ),
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
                  const PopupMenuItem(
                    value: 'reply_all',
                    child: Text('Allen antworten'),
                  ),
                  const PopupMenuItem(
                    value: 'forward',
                    child: Text('Weiterleiten'),
                  ),
                ],
              ),
            ],
          ),

          // Expanded recipients
          if (_showRecipients) ...[
            const SizedBox(height: 12),
            _buildRecipientDetail('Von:', senderEmail),
            if (_message!.to.isNotEmpty)
              _buildRecipientDetail(
                'An:',
                _message!.to.map((e) => e.email).join(', '),
              ),
            if (_message!.cc != null && _message!.cc!.isNotEmpty)
              _buildRecipientDetail(
                'Cc:',
                _message!.cc!.map((e) => e.email).join(', '),
              ),
            _buildRecipientDetail(
              'Datum:',
              DateFormat('dd.MM.yyyy, HH:mm').format(_message!.date),
            ),
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
              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontSize: 12, color: Colors.black87),
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
                style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
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
    // Bei Entwürfen zeige "Bearbeiten" statt "Antworten/Weiterleiten"
    final isDraft =
        widget.mailbox.toLowerCase() == 'drafts' ||
        widget.mailbox.toLowerCase() == 'entwürfe' ||
        widget.mailbox.toLowerCase().contains('draft');

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
          child: isDraft ? _buildDraftBottomBar() : _buildNormalBottomBar(),
        ),
      ),
    );
  }

  Widget _buildDraftBottomBar() {
    return Row(
      children: [
        Expanded(
          child: ElevatedButton.icon(
            onPressed: () async {
              // Öffne Entwurf im Compose-Screen zum Bearbeiten
              final result = await EmailComposeScreen.show(
                context,
                draftMessage: _message,
                draftUid: widget.uid,
                mode: ComposeMode.draft,
              );
              // Wenn der Entwurf gesendet oder gelöscht wurde, zurück zur Liste
              if (result == true && mounted) {
                Navigator.pop(context, {'deleted': true, 'uid': widget.uid});
              }
            },
            icon: const Icon(Icons.edit, size: 18),
            label: const Text('Bearbeiten'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF14ad9f),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 12),
            ),
          ),
        ),
        const SizedBox(width: 12),
        OutlinedButton.icon(
          onPressed: _deleteMessage,
          icon: const Icon(Icons.delete_outline, size: 18),
          label: const Text('Löschen'),
          style: OutlinedButton.styleFrom(
            foregroundColor: Colors.red,
            side: const BorderSide(color: Colors.red),
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
          ),
        ),
      ],
    );
  }

  Widget _buildNormalBottomBar() {
    return Row(
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
          icon: Icon(
            Icons.emoji_emotions_outlined,
            color: Colors.grey.shade600,
          ),
          onPressed: () {},
        ),
      ],
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
      } else {}
    } catch (e) {
      // Fehler ignorieren
    }
  }

  String _formatTime(DateTime date) {
    final now = DateTime.now();
    if (date.year == now.year &&
        date.month == now.month &&
        date.day == now.day) {
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
    if (mimeType.contains('word') || mimeType.contains('document')) {
      return Icons.description;
    }
    if (mimeType.contains('sheet') || mimeType.contains('excel')) {
      return Icons.table_chart;
    }
    return Icons.attach_file;
  }
}
