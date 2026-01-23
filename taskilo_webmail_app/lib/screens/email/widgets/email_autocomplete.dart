import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dart:async';
import '../../../providers/api_provider.dart';
import '../../../theme/app_theme.dart';

/// Professionelles E-Mail-Autocomplete-Widget mit Debouncing
///
/// Features:
/// - Debounced Suche (500ms)
/// - Kontakte von Hetzner (CardDAV + E-Mail-Header)
/// - Chips für mehrere Empfänger
/// - Keyboard-Navigation
/// - Accessibility
class EmailAutocomplete extends ConsumerStatefulWidget {
  final TextEditingController controller;
  final String label;
  final bool showLabel;
  final Function(String)? onEmailAdded;

  const EmailAutocomplete({
    super.key,
    required this.controller,
    this.label = 'An',
    this.showLabel = true,
    this.onEmailAdded,
  });

  @override
  ConsumerState<EmailAutocomplete> createState() => _EmailAutocompleteState();
}

class _EmailAutocompleteState extends ConsumerState<EmailAutocomplete> {
  final FocusNode _focusNode = FocusNode();
  final LayerLink _layerLink = LayerLink();
  OverlayEntry? _overlayEntry;

  List<Map<String, dynamic>> _suggestions = [];
  bool _isLoading = false;
  int _selectedIndex = -1;
  Timer? _debounceTimer;
  String _lastQuery = '';

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onTextChanged);
    _focusNode.addListener(_onFocusChanged);
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onTextChanged);
    _focusNode.removeListener(_onFocusChanged);
    _focusNode.dispose();
    _debounceTimer?.cancel();
    _removeOverlay();
    super.dispose();
  }

  void _onTextChanged() {
    final text = widget.controller.text;
    debugPrint('[EmailAutocomplete] _onTextChanged - text: "$text" (length: ${text.length})');
    
    // Nur suchen wenn sich der Text geändert hat
    if (text == _lastQuery) {
      debugPrint('[EmailAutocomplete] Text unchanged, skipping');
      return;
    }
    _lastQuery = text;

    // Cancel previous timer
    _debounceTimer?.cancel();

    // Kein Text oder zu kurz - verberge Overlay
    if (text.isEmpty || text.length < 2) {
      debugPrint('[EmailAutocomplete] Text too short or empty, clearing suggestions');
      setState(() {
        _suggestions = [];
        _selectedIndex = -1;
      });
      _removeOverlay();
      return;
    }

    // Debounce: Warte 500ms
    debugPrint('[EmailAutocomplete] Starting debounce timer (500ms)...');
    _debounceTimer = Timer(const Duration(milliseconds: 500), () {
      debugPrint('[EmailAutocomplete] Debounce timer fired!');
      _searchContacts(text);
    });
  }

  void _onFocusChanged() {
    if (!_focusNode.hasFocus) {
      // Delay um Click auf Suggestion zu erlauben
      Future.delayed(const Duration(milliseconds: 200), () {
        if (mounted) {
          _removeOverlay();
        }
      });
    } else if (_suggestions.isNotEmpty) {
      _showOverlay();
    }
  }

  Future<void> _searchContacts(String query) async {
    debugPrint(
      '[EmailAutocomplete] _searchContacts START - query: "$query", length: ${query.length}',
    );

    if (query.length < 2) {
      debugPrint('[EmailAutocomplete] Query too short, aborting');
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      debugPrint('[EmailAutocomplete] Getting API service...');
      final api = ref.read(apiServiceProvider);
      debugPrint('[EmailAutocomplete] Calling api.searchContacts()...');
      final contacts = await api.searchContacts(query);
      debugPrint('[EmailAutocomplete] Got ${contacts.length} contacts');

      if (contacts.isNotEmpty) {
        debugPrint('[EmailAutocomplete] First contact: ${contacts.first}');
      }

      if (!mounted) {
        debugPrint('[EmailAutocomplete] Widget not mounted, aborting');
        return;
      }

      setState(() {
        _suggestions = contacts;
        _selectedIndex = -1;
        _isLoading = false;
      });

      if (contacts.isNotEmpty && _focusNode.hasFocus) {
        debugPrint(
          '[EmailAutocomplete] Showing overlay with ${contacts.length} contacts',
        );
        _showOverlay();
      } else {
        debugPrint('[EmailAutocomplete] Removing overlay (empty or no focus');
        _removeOverlay();
      }
    } catch (e, stackTrace) {
      debugPrint('[EmailAutocomplete] ERROR: $e');
      debugPrint('[EmailAutocomplete] Stack: $stackTrace');
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _suggestions = [];
      });
      _removeOverlay();
    }
  }

  void _showOverlay() {
    _removeOverlay();

    // Berechne die Position des TextField
    final RenderBox? renderBox = context.findRenderObject() as RenderBox?;
    final double fieldHeight = renderBox?.size.height ?? 48;

    _overlayEntry = OverlayEntry(
      builder: (context) => Positioned(
        width: MediaQuery.of(context).size.width - 32,
        child: CompositedTransformFollower(
          link: _layerLink,
          showWhenUnlinked: false,
          offset: Offset(0, fieldHeight + 8), // Dynamischer Offset basierend auf Feldgröße
          targetAnchor: Alignment.bottomLeft,
          followerAnchor: Alignment.topLeft,
          child: Material(
            elevation: 8,
            borderRadius: BorderRadius.circular(12),
            child: Container(
              constraints: const BoxConstraints(maxHeight: 280),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade300),
              ),
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(vertical: 8),
                shrinkWrap: true,
                itemCount: _suggestions.length,
                itemBuilder: (context, index) {
                  final contact = _suggestions[index];
                  
                  // Extract email from CardDAV format: emails: [{value: ..., label: ...}]
                  String? email;
                  if (contact['email'] != null) {
                    email = contact['email'] as String;
                  } else if (contact['emails'] != null && (contact['emails'] as List).isNotEmpty) {
                    final emailsList = contact['emails'] as List;
                    email = emailsList[0]['value'] as String?;
                  }
                  
                  if (email == null || email.isEmpty) return const SizedBox.shrink();
                  
                  // Extract name
                  String? name = contact['name'] as String?;
                  if (name == null || name.isEmpty) {
                    name = contact['displayName'] as String?;
                  }
                  if (name == null || name.isEmpty) {
                    final firstName = contact['firstName'] as String?;
                    final lastName = contact['lastName'] as String?;
                    if (firstName != null || lastName != null) {
                      name = '${firstName ?? ''} ${lastName ?? ''}'.trim();
                    }
                  }
                  
                  final type = contact['type'] as String?;
                  final isSelected = index == _selectedIndex;

                  return InkWell(
                    onTap: () => _selectContact(contact),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                      color: isSelected
                          ? AppColors.primary.withValues(alpha: 0.1)
                          : null,
                      child: Row(
                        children: [
                          // Avatar
                          CircleAvatar(
                            radius: 20,
                            backgroundColor: AppColors.primary.withValues(
                              alpha: 0.2,
                            ),
                            child: const Icon(
                              Icons.person,
                              color: AppColors.primary,
                              size: 20,
                            ),
                          ),
                          const SizedBox(width: 12),
                          // Name & Email
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (name != null && name.isNotEmpty)
                                  Text(
                                    name,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w500,
                                      fontSize: 14,
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                Text(
                                  email,
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: name != null && name.isNotEmpty
                                        ? Colors.grey.shade600
                                        : Colors.black87,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                          // Badge für gespeicherte Kontakte
                          if (type == 'carddav')
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: AppColors.success.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text(
                                'Gespeichert',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: AppColors.success,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        ),
      ),
    );

    Overlay.of(context).insert(_overlayEntry!);
  }

  void _removeOverlay() {
    _overlayEntry?.remove();
    _overlayEntry = null;
  }

  void _selectContact(Map<String, dynamic> contact) {
    // Extract email from CardDAV format
    String? email;
    if (contact['email'] != null) {
      email = contact['email'] as String;
    } else if (contact['emails'] != null && (contact['emails'] as List).isNotEmpty) {
      final emailsList = contact['emails'] as List;
      email = emailsList[0]['value'] as String?;
    }
    
    if (email == null || email.isEmpty) return;
    
    // Extract name
    String? name = contact['name'] as String?;
    if (name == null || name.isEmpty) {
      name = contact['displayName'] as String?;
    }
    if (name == null || name.isEmpty) {
      final firstName = contact['firstName'] as String?;
      final lastName = contact['lastName'] as String?;
      if (firstName != null || lastName != null) {
        name = '${firstName ?? ''} ${lastName ?? ''}'.trim();
      }
    }

    // Format: "Name <email>" oder nur "email"
    final formatted = name != null && name.isNotEmpty
        ? '$name <$email>'
        : email;

    widget.controller.text = formatted;
    widget.onEmailAdded?.call(email);

    setState(() {
      _suggestions = [];
      _selectedIndex = -1;
    });

    _removeOverlay();
    _focusNode.unfocus();
  }

  @override
  Widget build(BuildContext context) {
    return CompositedTransformTarget(
      link: _layerLink,
      child: TextField(
        controller: widget.controller,
        focusNode: _focusNode,
        style: const TextStyle(fontSize: 16, color: Colors.black),
        decoration: InputDecoration(
          labelText: widget.showLabel && widget.label.isNotEmpty ? widget.label : null,
          hintText: 'E-Mail-Adresse eingeben...',
          suffixIcon: _isLoading
              ? const Padding(
                  padding: EdgeInsets.all(12),
                  child: SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                )
              : null,
          border: InputBorder.none,
          enabledBorder: InputBorder.none,
          focusedBorder: InputBorder.none,
          disabledBorder: InputBorder.none,
          errorBorder: InputBorder.none,
          focusedErrorBorder: InputBorder.none,
          isDense: true,
          contentPadding: EdgeInsets.zero,
        ),
        keyboardType: TextInputType.emailAddress,
        textInputAction: TextInputAction.next,
      ),
    );
  }
}

/// Widget für E-Mail-Chips (mehrere Empfänger)
class EmailChipInput extends ConsumerStatefulWidget {
  final List<String> emails;
  final Function(String) onAdd;
  final Function(String) onRemove;
  final String label;

  const EmailChipInput({
    super.key,
    required this.emails,
    required this.onAdd,
    required this.onRemove,
    this.label = 'An',
  });

  @override
  ConsumerState<EmailChipInput> createState() => _EmailChipInputState();
}

class _EmailChipInputState extends ConsumerState<EmailChipInput> {
  final TextEditingController _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _addEmail(String email) {
    if (email.isNotEmpty && !widget.emails.contains(email)) {
      widget.onAdd(email);
      _controller.clear();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Chips
        if (widget.emails.isNotEmpty)
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: widget.emails.map((email) {
              return Chip(
                label: Text(email),
                deleteIcon: const Icon(Icons.close, size: 18),
                onDeleted: () => widget.onRemove(email),
                backgroundColor: AppColors.primary.withValues(alpha: 0.1),
                labelStyle: const TextStyle(
                  color: AppColors.primary,
                  fontSize: 13,
                ),
              );
            }).toList(),
          ),
        if (widget.emails.isNotEmpty) const SizedBox(height: 8),
        // Autocomplete Input
        EmailAutocomplete(
          controller: _controller,
          label: widget.label,
          onEmailAdded: _addEmail,
        ),
      ],
    );
  }
}
