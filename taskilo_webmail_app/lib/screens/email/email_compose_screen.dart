import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart'; // ✅ Riverpod statt GetX
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import 'package:html_editor_enhanced/html_editor.dart';
import '../../theme/app_theme.dart';
import '../../providers/api_provider.dart'; // ✅ Riverpod Provider
import '../../services/api_service.dart'; // ApiService Import
import '../../models/email_models.dart';
import 'widgets/email_editor.dart';
import 'widgets/email_autocomplete.dart';

enum ComposeMode { newEmail, reply, replyAll, forward, draft }

class EmailComposeScreen extends StatefulWidget {
  final EmailMessage? replyTo;
  final EmailMessage? draftMessage;
  final int? draftUid;
  final ComposeMode mode;

  const EmailComposeScreen({
    super.key,
    this.replyTo,
    this.draftMessage,
    this.draftUid,
    this.mode = ComposeMode.newEmail,
  });

  static Future<bool?> show(
    BuildContext context, {
    EmailMessage? replyTo,
    EmailMessage? draftMessage,
    int? draftUid,
    ComposeMode mode = ComposeMode.newEmail,
  }) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      useSafeArea: true,
      builder: (context) => _ComposeBottomSheet(
        replyTo,
        mode,
        draftMessage: draftMessage,
        draftUid: draftUid,
      ),
    );
  }

  @override
  State<EmailComposeScreen> createState() => _EmailComposeScreenState();
}

class _ComposeBottomSheet extends ConsumerStatefulWidget {
  // ✅ ConsumerStatefulWidget
  final EmailMessage? replyTo;
  final EmailMessage? draftMessage;
  final int? draftUid;
  final ComposeMode mode;

  const _ComposeBottomSheet(
    this.replyTo,
    this.mode, {
    this.draftMessage,
    this.draftUid,
  });

  @override
  ConsumerState<_ComposeBottomSheet> createState() =>
      _ComposeBottomSheetState();
}

class _ComposeBottomSheetState extends ConsumerState<_ComposeBottomSheet> {
  // ✅ ConsumerState

  final _toController = TextEditingController();
  final _ccController = TextEditingController();
  final _bccController = TextEditingController();
  final _subjectController = TextEditingController();
  final _scrollController = ScrollController();

  // HTML Editor Controller
  late final HtmlEditorController _bodyController;
  final FocusNode _editorFocusNode = FocusNode();

  bool _showCcBcc = false;
  bool _isSending = false;
  bool _isLoading = true;
  final List<PlatformFile> _attachments = [];
  String _fromEmail = '';
  String _replyToName = '';
  String? _signatureHtml;

  @override
  void initState() {
    super.initState();
    _bodyController = HtmlEditorController();
    _initializeCompose();
  }

  Future<void> _initializeCompose() async {
    final api = ref.read(apiServiceProvider); // ✅ Riverpod Provider
    final email = await api.getCurrentUserEmail();
    final sig = await api.getSignatureForNewEmail();

    _fromEmail = email ?? '';
    _signatureHtml = sig;

    // Bei Entwürfen: Lade vollständige Nachricht falls nötig
    if (widget.mode == ComposeMode.draft && widget.draftUid != null) {
      await _loadDraftDetails(api);
    }

    _initializeFromReply();

    setState(() => _isLoading = false);
  }

  /// Lädt die vollständigen Entwurf-Details vom Server
  Future<void> _loadDraftDetails(ApiService api) async {
    try {
      final result = await api.getMessage(
        mailbox: 'Drafts',
        uid: widget.draftUid!,
      );

      if (result['success'] == true && result['message'] != null) {
        // Parse die Nachricht aus dem Ergebnis
        final messageData = result['message'] as Map<String, dynamic>;
        _draftFullMessage = EmailMessage.fromJson(messageData);
      }
    } catch (e) {
      debugPrint('Fehler beim Laden des Entwurfs: $e');
    }
  }

  // Vollständige Entwurf-Nachricht nach dem Laden
  EmailMessage? _draftFullMessage;

  void _initializeFromReply() {
    // Bei Entwürfen: Lade die gespeicherten Daten
    if (widget.mode == ComposeMode.draft) {
      // Verwende die vollständige Nachricht falls verfügbar, sonst die ursprüngliche
      final draft = _draftFullMessage ?? widget.draftMessage;
      if (draft == null) return;

      // Empfänger laden
      if (draft.to.isNotEmpty) {
        _toController.text = draft.to.map((e) => e.email).join(', ');
      }

      // CC laden
      if (draft.cc != null && draft.cc!.isNotEmpty) {
        _ccController.text = draft.cc!.map((e) => e.email).join(', ');
        _showCcBcc = true;
      }

      // BCC laden
      if (draft.bcc != null && draft.bcc!.isNotEmpty) {
        _bccController.text = draft.bcc!.map((e) => e.email).join(', ');
        _showCcBcc = true;
      }

      // Betreff laden
      _subjectController.text = draft.subject;

      // Body wird später im HTML-Editor geladen
      return;
    }

    if (widget.replyTo == null) return;

    final original = widget.replyTo!;

    _replyToName = original.from.isNotEmpty
        ? (original.from.first.displayName.isNotEmpty
              ? original.from.first.displayName
              : original.from.first.email.split('@').first)
        : '';

    switch (widget.mode) {
      case ComposeMode.reply:
        _toController.text = original.from.first.email;
        _subjectController.text = original.subject.startsWith('Re:')
            ? original.subject
            : 'Re: ${original.subject}';
        // Body bleibt leer - Signatur wird später hinzugefügt
        break;

      case ComposeMode.replyAll:
        final recipients = <String>[];
        recipients.add(original.from.first.email);
        for (final addr in original.to) {
          if (!recipients.contains(addr.email)) {
            recipients.add(addr.email);
          }
        }
        _toController.text = recipients.join(', ');

        if (original.cc != null && original.cc!.isNotEmpty) {
          _ccController.text = original.cc!.map((e) => e.email).join(', ');
          _showCcBcc = true;
        }

        _subjectController.text = original.subject.startsWith('Re:')
            ? original.subject
            : 'Re: ${original.subject}';
        break;

      case ComposeMode.forward:
        _subjectController.text = original.subject.startsWith('Fwd:')
            ? original.subject
            : 'Fwd: ${original.subject}';
        break;

      case ComposeMode.newEmail:
        break;

      case ComposeMode.draft:
        // Bereits oben behandelt
        break;
    }
  }

  Future<void> _pickFromGallery() async {
    final picker = ImagePicker();
    final images = await picker.pickMultiImage();

    if (images.isNotEmpty) {
      for (final image in images) {
        final file = File(image.path);
        final bytes = await file.readAsBytes();
        setState(() {
          _attachments.add(
            PlatformFile(
              name: image.name,
              path: image.path,
              size: bytes.length,
              bytes: bytes,
            ),
          );
        });
      }
    }
  }

  Future<void> _pickFromCamera() async {
    final picker = ImagePicker();
    final photo = await picker.pickImage(source: ImageSource.camera);

    if (photo != null) {
      final file = File(photo.path);
      final bytes = await file.readAsBytes();
      setState(() {
        _attachments.add(
          PlatformFile(
            name: photo.name,
            path: photo.path,
            size: bytes.length,
            bytes: bytes,
          ),
        );
      });
    }
  }

  Future<void> _pickFiles() async {
    final result = await FilePicker.platform.pickFiles(
      allowMultiple: true,
      type: FileType.any,
    );

    if (result != null) {
      setState(() {
        _attachments.addAll(result.files);
      });
    }
  }

  Future<void> _sendEmail() async {
    if (_toController.text.isEmpty) {
      // ✅ Material SnackBar statt GetX
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Bitte geben Sie mindestens einen Empfänger ein'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    setState(() => _isSending = true);

    try {
      final api = ref.read(apiServiceProvider); // ✅ Riverpod

      // Hole HTML-Inhalt mit Error Handling
      String bodyHtml = '';
      try {
        bodyHtml = await EmailEditorUtils.toHtml(_bodyController);
      } catch (e) {
        // Fallback: Leerer Body bei JavaScript-Fehler
        debugPrint('HTML-Editor Fehler: $e');
        bodyHtml = '';
      }

      final result = await api.sendEmail(
        to: _toController.text.split(',').map((e) => e.trim()).toList(),
        cc: _ccController.text.isNotEmpty
            ? _ccController.text.split(',').map((e) => e.trim()).toList()
            : null,
        bcc: _bccController.text.isNotEmpty
            ? _bccController.text.split(',').map((e) => e.trim()).toList()
            : null,
        subject: _subjectController.text,
        body: bodyHtml,
        isHtml: true,
        attachments: _attachments,
        inReplyTo: widget.replyTo?.messageId,
      );

      if (result['success'] == true) {
        // Bei Entwürfen: Lösche den alten Entwurf nach dem Senden
        if (widget.mode == ComposeMode.draft && widget.draftUid != null) {
          await api.deleteMessage(mailbox: 'Drafts', uid: widget.draftUid!);
        }

        if (!mounted) return;
        Navigator.of(context).pop(true); // ✅ true = E-Mail wurde gesendet
        // ✅ Material SnackBar
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('E-Mail wurde erfolgreich gesendet'),
            backgroundColor: AppColors.success,
          ),
        );
      } else {
        throw Exception(result['error'] ?? 'Senden fehlgeschlagen');
      }
    } catch (e) {
      // Fehler ignorieren
      if (!mounted) return;
      // ✅ Material SnackBar
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: AppColors.error),
      );
    }

    setState(() => _isSending = false);
  }

  Future<void> _saveDraft() async {
    try {
      final api = ref.read(apiServiceProvider); // ✅ Riverpod

      // Hole HTML-Inhalt mit Error Handling
      String bodyHtml = '';
      try {
        bodyHtml = await EmailEditorUtils.toHtml(_bodyController);
      } catch (e) {
        debugPrint('HTML-Editor Fehler beim Speichern: $e');
        bodyHtml = '';
      }

      await api.saveDraft(
        to: _toController.text.split(',').map((e) => e.trim()).toList(),
        cc: _ccController.text.isNotEmpty
            ? _ccController.text.split(',').map((e) => e.trim()).toList()
            : null,
        bcc: _bccController.text.isNotEmpty
            ? _bccController.text.split(',').map((e) => e.trim()).toList()
            : null,
        subject: _subjectController.text,
        body: bodyHtml,
        existingDraftUid: widget.draftUid,
      );

      if (!mounted) return;
      Navigator.of(context).pop(true); // true = Entwurf wurde gespeichert
      // Material SnackBar
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Entwurf wurde gespeichert')),
      );
    } catch (e) {
      // Fehler ignorieren
      if (!mounted) return;
      // ✅ Material SnackBar
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: AppColors.error),
      );
    }
  }

  Future<void> _handleClose() async {
    // Prüfe Content mit Error Handling
    bool hasContent = _toController.text.isNotEmpty;
    try {
      hasContent =
          hasContent || !await EmailEditorUtils.isEmpty(_bodyController);
    } catch (e) {
      debugPrint('Fehler beim Prüfen des Editor-Inhalts: $e');
    }

    if (hasContent) {
      if (!mounted) return;
      final result = await showDialog<String>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Entwurf speichern?'),
          content: const Text(
            'Möchten Sie diese E-Mail als Entwurf speichern?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop('discard'),
              child: const Text('Verwerfen'),
            ),
            TextButton(
              onPressed: () => Navigator.of(ctx).pop('save'),
              child: const Text('Speichern'),
            ),
          ],
        ),
      );

      if (result == 'save') {
        await _saveDraft();
      } else if (result == 'discard') {
        if (!mounted) return;
        Navigator.of(context).pop();
      }
    } else {
      if (!mounted) return;
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.92,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      child: Column(
        children: [
          // Header - iOS Gmail Style
          _buildIOSHeader(),

          // Von - FIXIERT (nicht scrollbar)
          _buildIOSFromField(),

          // An - FIXIERT (nicht scrollbar)
          _buildToRow(),

          // CC/BCC - FIXIERT (nicht scrollbar)
          if (_showCcBcc) ...[_buildCcRow(), _buildBccRow()],

          // Betreff - FIXIERT (nicht scrollbar)
          _buildIOSSubjectField(),

          const Divider(height: 1),

          // Content - Body nimmt kompletten Rest ein
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : Column(
                    children: [
                      // Attachments
                      if (_attachments.isNotEmpty) _buildAttachments(),

                      // Body - nimmt kompletten verfügbaren Platz
                      Expanded(child: _buildBodyField()),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildIOSHeader() {
    return Container(
      height: 56,
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(
          bottom: BorderSide(color: Color(0xFFE5E5E5), width: 0.5),
        ),
      ),
      child: Row(
        children: [
          // X Button links
          GestureDetector(
            onTap: _handleClose,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              child: const Icon(
                Icons.close,
                color: Color(0xFF14ad9f),
                size: 24,
              ),
            ),
          ),

          // Reply-To mit Pfeilen (NUR bei Antworten)
          if (widget.mode == ComposeMode.reply ||
              widget.mode == ComposeMode.replyAll) ...[
            const Icon(Icons.arrow_back, size: 16, color: Color(0xFF8E8E93)),
            const SizedBox(width: 6),
            const Icon(
              Icons.keyboard_arrow_down,
              size: 16,
              color: Color(0xFF8E8E93),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                _replyToName,
                style: const TextStyle(
                  fontSize: 16,
                  color: Colors.black,
                  fontWeight: FontWeight.w500,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ] else
            const Spacer(),

          // Attachment Button
          GestureDetector(
            onTap: _showAttachmentOptions,
            child: Container(
              padding: const EdgeInsets.all(16),
              child: const Icon(
                Icons.attach_file,
                color: Color(0xFF14ad9f),
                size: 22,
              ),
            ),
          ),

          // Send Button
          _isSending
              ? Container(
                  padding: const EdgeInsets.all(16),
                  child: const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      color: Color(0xFF14ad9f),
                    ),
                  ),
                )
              : GestureDetector(
                  onTap: _sendEmail,
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    child: const Icon(
                      Icons.send,
                      color: Color(0xFF14ad9f),
                      size: 24,
                    ),
                  ),
                ),

          // Drei-Punkte-Menü
          GestureDetector(
            onTap: _showComposeMenu,
            child: Container(
              padding: const EdgeInsets.all(8),
              margin: const EdgeInsets.only(right: 8),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFF14ad9f), width: 1.5),
              ),
              child: const Icon(
                Icons.more_horiz,
                color: Color(0xFF14ad9f),
                size: 20,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showAttachmentOptions() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(12)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.symmetric(vertical: 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_library, color: Colors.blue),
              title: const Text('Foto auswählen'),
              onTap: () {
                Navigator.pop(context);
                _pickFromGallery();
              },
            ),
            ListTile(
              leading: const Icon(Icons.camera_alt, color: Colors.green),
              title: const Text('Kamera'),
              onTap: () {
                Navigator.pop(context);
                _pickFromCamera();
              },
            ),
            ListTile(
              leading: const Icon(
                Icons.insert_drive_file,
                color: Colors.orange,
              ),
              title: const Text('Datei'),
              onTap: () {
                Navigator.pop(context);
                _pickFiles();
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showComposeMenu() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(12)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.symmetric(vertical: 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(
                Icons.people_outline,
                color: AppColors.primary,
              ),
              title: const Text('CC/BCC anzeigen'),
              onTap: () {
                Navigator.pop(context);
                setState(() => _showCcBcc = !_showCcBcc);
              },
            ),
            ListTile(
              leading: const Icon(Icons.format_bold, color: AppColors.primary),
              title: const Text('Formatierung'),
              onTap: () {
                Navigator.pop(context);
                _editorFocusNode.requestFocus();
              },
            ),
            ListTile(
              leading: const Icon(
                Icons.save_outlined,
                color: AppColors.primary,
              ),
              title: const Text('Als Entwurf speichern'),
              onTap: () {
                Navigator.pop(context);
                _saveDraft();
              },
            ),
            ListTile(
              leading: const Icon(Icons.delete_outline, color: AppColors.error),
              title: const Text('Verwerfen'),
              onTap: () {
                Navigator.pop(context);
                Navigator.of(context).pop();
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildIOSFromField() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: const BoxDecoration(
        border: Border(
          bottom: BorderSide(color: Color(0xFFCCCCCC), width: 1.0),
        ),
      ),
      child: Row(
        children: [
          const Text(
            'Von',
            style: TextStyle(fontSize: 16, color: Colors.black),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              _fromEmail,
              style: const TextStyle(fontSize: 16, color: Colors.black),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildToRow() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: const BoxDecoration(
        border: Border(
          bottom: BorderSide(color: Color(0xFFCCCCCC), width: 1.0),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          const Text('An', style: TextStyle(fontSize: 16, color: Colors.black)),
          const SizedBox(width: 16),
          Expanded(
            child: EmailAutocomplete(
              controller: _toController,
              label: '',
              showLabel: false,
            ),
          ),
          if (!_showCcBcc) ...[
            const SizedBox(width: 12),
            GestureDetector(
              onTap: () => setState(() => _showCcBcc = true),
              child: const Text(
                'Cc/Bcc',
                style: TextStyle(fontSize: 16, color: Color(0xFF14ad9f)),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildCcRow() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: const BoxDecoration(
        border: Border(
          bottom: BorderSide(color: Color(0xFFCCCCCC), width: 1.0),
        ),
      ),
      child: Row(
        children: [
          const Text('Cc', style: TextStyle(fontSize: 16, color: Colors.black)),
          const SizedBox(width: 16),
          Expanded(
            child: EmailAutocomplete(
              controller: _ccController,
              label: '',
              showLabel: false,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBccRow() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: const BoxDecoration(
        border: Border(
          bottom: BorderSide(color: Color(0xFFCCCCCC), width: 1.0),
        ),
      ),
      child: Row(
        children: [
          const Text(
            'Bcc',
            style: TextStyle(fontSize: 16, color: Colors.black),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: EmailAutocomplete(
              controller: _bccController,
              label: '',
              showLabel: false,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildIOSSubjectField() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: const BoxDecoration(
        border: Border(
          bottom: BorderSide(color: Color(0xFFCCCCCC), width: 1.0),
        ),
      ),
      child: TextField(
        controller: _subjectController,
        style: const TextStyle(fontSize: 16, color: Colors.black),
        decoration: const InputDecoration(
          border: InputBorder.none,
          enabledBorder: InputBorder.none,
          focusedBorder: InputBorder.none,
          disabledBorder: InputBorder.none,
          errorBorder: InputBorder.none,
          focusedErrorBorder: InputBorder.none,
          isDense: true,
          contentPadding: EdgeInsets.zero,
          hintText: 'Betreff',
          hintStyle: TextStyle(color: Color(0xFFCCCCCC), fontSize: 16),
        ),
      ),
    );
  }

  Widget _buildAttachments() {
    return Container(
      padding: const EdgeInsets.all(12),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: _attachments.asMap().entries.map((entry) {
          final index = entry.key;
          final file = entry.value;
          return Chip(
            label: Text(file.name, style: const TextStyle(fontSize: 12)),
            deleteIcon: const Icon(Icons.close, size: 16),
            onDeleted: () => setState(() => _attachments.removeAt(index)),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildBodyField() {
    // Bei Entwürfen: Lade den gespeicherten Body
    if (widget.mode == ComposeMode.draft) {
      // Verwende die vollständige Nachricht falls verfügbar
      final draft = _draftFullMessage ?? widget.draftMessage;
      final draftBody =
          draft?.html ?? draft?.text?.replaceAll('\n', '<br>') ?? '';

      return LayoutBuilder(
        builder: (context, constraints) {
          return EmailEditor(
            controller: _bodyController,
            focusNode: _editorFocusNode,
            placeholder: 'E-Mail schreiben...',
            initialHtml: draftBody,
            height: constraints.maxHeight,
          );
        },
      );
    }

    final sig = _signatureHtml != null && _signatureHtml!.isNotEmpty
        ? '<br><br>$_signatureHtml'
        : '';

    // Original-Nachricht bei Antworten/Weiterleiten - nahtlos ohne sichtbare Layer
    String quotedContent = '';
    if (widget.replyTo != null &&
        (widget.mode == ComposeMode.reply ||
            widget.mode == ComposeMode.replyAll)) {
      final originalEmail = widget.replyTo!;
      final senderName = originalEmail.from.isNotEmpty
          ? originalEmail.from.first.displayName
          : 'Unbekannt';
      final dateStr =
          '${originalEmail.date.day}.${originalEmail.date.month}.${originalEmail.date.year} um ${originalEmail.date.hour}:${originalEmail.date.minute.toString().padLeft(2, '0')}';

      final originalBody =
          originalEmail.html ??
          originalEmail.text?.replaceAll('\n', '<br>') ??
          '';

      quotedContent =
          '''
<br><br>
<div style="font-size:11px;color:#888;">
Am $dateStr schrieb $senderName:
</div>
<br>
$originalBody
''';
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        return EmailEditor(
          controller: _bodyController,
          focusNode: _editorFocusNode,
          placeholder: 'E-Mail schreiben...',
          initialHtml: '$sig$quotedContent',
          height: constraints.maxHeight,
        );
      },
    );
  }

  @override
  void dispose() {
    _toController.dispose();
    _ccController.dispose();
    _bccController.dispose();
    _subjectController.dispose();
    _scrollController.dispose();
    _editorFocusNode.dispose();
    super.dispose();
  }
}

// Static EmailComposeScreen wrapper
class _EmailComposeScreenState extends State<EmailComposeScreen> {
  @override
  Widget build(BuildContext context) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Navigator.of(context).pop();
      EmailComposeScreen.show(
        context,
        replyTo: widget.replyTo,
        mode: widget.mode,
      );
    });

    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }
}

/// Custom Painter für gestrichelte Border
class DashedBorderPainter extends CustomPainter {
  final Color color;
  final double strokeWidth;
  final double dashWidth;
  final double dashSpace;
  final double borderRadius;

  DashedBorderPainter({
    required this.color,
    required this.strokeWidth,
    required this.dashWidth,
    required this.dashSpace,
    required this.borderRadius,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke;

    final path = Path();
    final rrect = RRect.fromRectAndRadius(
      Rect.fromLTWH(0, 0, size.width, size.height),
      Radius.circular(borderRadius),
    );

    path.addRRect(rrect);

    final dashPath = _createDashedPath(path);
    canvas.drawPath(dashPath, paint);
  }

  Path _createDashedPath(Path source) {
    final path = Path();
    final metrics = source.computeMetrics();

    for (final metric in metrics) {
      double distance = 0;
      while (distance < metric.length) {
        final nextDash = distance + dashWidth;
        final segment = metric.extractPath(distance, nextDash);
        path.addPath(segment, Offset.zero);
        distance = nextDash + dashSpace;
      }
    }

    return path;
  }

  @override
  bool shouldRepaint(DashedBorderPainter oldDelegate) => false;
}
