import 'package:flutter/material.dart';
import 'package:html_editor_enhanced/html_editor.dart';

/// Email-HTML-Editor mit Bildern und vollständiger HTML-Unterstützung
class EmailEditor extends StatefulWidget {
  final HtmlEditorController controller;
  final FocusNode focusNode;
  final double? height;
  final bool readOnly;
  final String? placeholder;
  final String? initialHtml;
  final Function()? onInit;

  const EmailEditor({
    super.key,
    required this.controller,
    required this.focusNode,
    this.height = 400,
    this.readOnly = false,
    this.placeholder,
    this.initialHtml,
    this.onInit,
  });

  @override
  State<EmailEditor> createState() => _EmailEditorState();
}

class _EmailEditorState extends State<EmailEditor> {
  @override
  void initState() {
    super.initState();
    if (widget.onInit != null) {
      widget.onInit!();
    }
  }

  @override
  Widget build(BuildContext context) {
    return HtmlEditor(
      controller: widget.controller,
      htmlEditorOptions: HtmlEditorOptions(
        hint: widget.placeholder ?? 'E-Mail schreiben...',
        initialText: widget.initialHtml ?? '',
        shouldEnsureVisible: false,
        adjustHeightForKeyboard: false,
        mobileLongPressDuration: Duration.zero,
        autoAdjustHeight: false,
      ),
      htmlToolbarOptions: const HtmlToolbarOptions(
        toolbarPosition: ToolbarPosition.custom,
        renderBorder: false,
        toolbarItemHeight: 0,
        defaultToolbarButtons: [],
      ),
      otherOptions: OtherOptions(
        height: widget.height ?? 500,
        decoration: const BoxDecoration(),
      ),
      callbacks: Callbacks(onInit: widget.onInit),
      plugins: const [],
    );
  }
}

/// Hilfsfunktionen für den Email-Editor
class EmailEditorUtils {
  /// Fügt HTML-Signatur ein
  static Future<void> insertHtmlSignature(
    HtmlEditorController controller,
    String signatureHtml,
  ) async {
    final currentHtml = await controller.getText();
    final newHtml = currentHtml.isEmpty
        ? '<br><br>$signatureHtml'
        : '$currentHtml<br><br>$signatureHtml';
    controller.setText(newHtml);
  }

  /// Holt HTML-Inhalt
  static Future<String> toHtml(HtmlEditorController controller) async {
    return await controller.getText();
  }

  /// Konvertiert zu Plain Text
  static Future<String> toPlainText(HtmlEditorController controller) async {
    final html = await controller.getText();
    return html
        .replaceAll(RegExp(r'<br\s*/?>'),'\n')
        .replaceAll(RegExp(r'<[^>]*>'), '')
        .replaceAll('&nbsp;', ' ')
        .replaceAll('&amp;', '&')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .trim();
  }

  /// Prüft ob der Editor leer ist
  static Future<bool> isEmpty(HtmlEditorController controller) async {
    final text = await toPlainText(controller);
    return text.isEmpty || text == '\n';
  }

  /// Setzt den Fokus
  static Future<void> focus(HtmlEditorController controller) async {
    controller.setFocus();
  }

  /// Entfernt den Fokus
  static Future<void> unfocus(HtmlEditorController controller) async {
    controller.clearFocus();
  }

  /// Löscht den Inhalt
  static Future<void> clear(HtmlEditorController controller) async {
    controller.clear();
  }
}
