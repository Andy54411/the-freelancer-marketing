import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';

/// ✅ MODERN 2026: Riverpod Provider für ApiService (Singleton)
final apiServiceProvider = Provider<ApiService>((ref) {
  return ApiService();
});

/// ✅ Auth-Status Provider
final authStateProvider = StreamProvider<bool>((ref) async* {
  final api = ref.watch(apiServiceProvider);
  
  // Initial check
  yield await api.isLoggedInAsync();
  
  // Stream würde sich bei Änderungen automatisch aktualisieren
  // Für jetzt: Nur initialer Wert
});

/// ✅ Current User Email Provider
final currentUserEmailProvider = FutureProvider<String?>((ref) async {
  final api = ref.watch(apiServiceProvider);
  return await api.getCurrentUserEmail();
});

/// ✅ User Profile Provider mit Auto-Refresh
final userProfileProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiServiceProvider);
  final result = await api.getProfile();
  
  if (result['success'] == true && result['profile'] != null) {
    return result['profile'] as Map<String, dynamic>;
  }
  
  throw Exception(result['error'] ?? 'Profil konnte nicht geladen werden');
});

/// ✅ Mailboxes Provider
final mailboxesProvider = FutureProvider<List<String>>((ref) async {
  final api = ref.watch(apiServiceProvider);
  final result = await api.getMailboxes();
  
  if (result['success'] == true && result['mailboxes'] != null) {
    return (result['mailboxes'] as List).map((e) => e.toString()).toList();
  }
  
  return ['INBOX', 'Sent', 'Drafts', 'Trash'];
});

/// ✅ Messages Provider mit Pagination
final messagesProvider = FutureProvider.family.autoDispose<
    Map<String, dynamic>,
    ({String mailbox, int page})
>((ref, params) async {
  final api = ref.watch(apiServiceProvider);
  return await api.getMessages(
    mailbox: params.mailbox,
    page: params.page,
  );
});

/// ✅ Single Message Provider
final messageDetailProvider = FutureProvider.family.autoDispose<
    Map<String, dynamic>,
    ({String mailbox, int uid})
>((ref, params) async {
  final api = ref.watch(apiServiceProvider);
  return await api.getMessage(
    mailbox: params.mailbox,
    uid: params.uid,
  );
});
