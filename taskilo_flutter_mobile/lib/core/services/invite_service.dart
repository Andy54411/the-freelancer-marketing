import 'package:cloud_functions/cloud_functions.dart';

class InviteService {
  final FirebaseFunctions _functions = FirebaseFunctions.instance;

  // Create invite code
  Future<Map<String, dynamic>> createInviteCode({
    required String role, // 'support' or 'master'
    String? recipientEmail,
  }) async {
    try {
      final callable = _functions.httpsCallable('createInviteCode');
      final result = await callable.call({
        'role': role,
        'recipientEmail': recipientEmail,
      });

      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      throw Exception('Failed to create invite code: $e');
    }
  }

  // Delete invite code
  Future<Map<String, dynamic>> deleteInviteCode({
    required String codeId,
  }) async {
    try {
      final callable = _functions.httpsCallable('deleteInviteCode');
      final result = await callable.call({
        'codeId': codeId,
      });

      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      throw Exception('Failed to delete invite code: $e');
    }
  }

  // Validate invite code format
  bool isValidInviteCode(String code) {
    // Check if code matches expected format (nanoid typically generates 21 character strings)
    return RegExp(r'^[A-Za-z0-9_-]{10,30}$').hasMatch(code);
  }

  // Generate shareable invite link
  String generateInviteLink(String inviteCode, {String? baseUrl}) {
    final url = baseUrl ?? 'https://taskilo.de';
    return '$url/invite/$inviteCode';
  }

  // Parse invite code from link
  String? parseInviteCodeFromLink(String link) {
    final uri = Uri.tryParse(link);
    if (uri == null) return null;
    
    final pathSegments = uri.pathSegments;
    if (pathSegments.length >= 2 && pathSegments[pathSegments.length - 2] == 'invite') {
      return pathSegments.last;
    }
    
    return null;
  }

  // Get role display name
  String getRoleDisplayName(String role) {
    switch (role.toLowerCase()) {
      case 'master':
        return 'Administrator';
      case 'support':
        return 'Support-Mitarbeiter';
      default:
        return role;
    }
  }

  // Get role description
  String getRoleDescription(String role) {
    switch (role.toLowerCase()) {
      case 'master':
        return 'Vollzugriff auf alle Funktionen und Administrationsrechte';
      case 'support':
        return 'Zugriff auf Support-Funktionen und Kundenhilfe';
      default:
        return 'Standard-Benutzerrolle';
    }
  }

  // Check if user can create invites for role
  bool canCreateInviteForRole(String userRole, String targetRole) {
    switch (userRole.toLowerCase()) {
      case 'master':
        return ['master', 'support'].contains(targetRole.toLowerCase());
      case 'support':
        return targetRole.toLowerCase() == 'support';
      default:
        return false;
    }
  }

  // Generate invite email content
  Map<String, String> generateInviteEmailContent({
    required String inviteCode,
    required String role,
    required String inviterName,
    String? recipientName,
    String? customMessage,
  }) {
    final roleDisplay = getRoleDisplayName(role);
    final roleDescription = getRoleDescription(role);
    final inviteLink = generateInviteLink(inviteCode);
    
    final greeting = recipientName != null 
        ? 'Hallo $recipientName,'
        : 'Hallo,';
    
    final subject = 'Einladung zu Taskilo als $roleDisplay';
    
    final body = '''
$greeting

$inviterName hat Sie zu Taskilo als $roleDisplay eingeladen.

Rolle: $roleDisplay
Beschreibung: $roleDescription

${customMessage ?? ''}

Um die Einladung anzunehmen, klicken Sie auf den folgenden Link:
$inviteLink

Oder geben Sie den Einladungscode manuell ein: $inviteCode

Diese Einladung ist nur einmalig verwendbar und läuft nach 7 Tagen ab.

Bei Fragen wenden Sie sich an unser Support-Team.

Viele Grüße,
Das Taskilo Team
''';

    return {
      'subject': subject,
      'body': body,
      'inviteLink': inviteLink,
    };
  }

  // Validate invite expiration
  bool isInviteExpired(DateTime createdAt, {int expirationDays = 7}) {
    final expirationDate = createdAt.add(Duration(days: expirationDays));
    return DateTime.now().isAfter(expirationDate);
  }

  // Format invite creation date
  String formatInviteDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);
    
    if (difference.inDays == 0) {
      if (difference.inHours == 0) {
        return 'vor ${difference.inMinutes} Minuten';
      }
      return 'vor ${difference.inHours} Stunden';
    } else if (difference.inDays == 1) {
      return 'gestern';
    } else if (difference.inDays < 7) {
      return 'vor ${difference.inDays} Tagen';
    } else {
      return '${date.day}.${date.month}.${date.year}';
    }
  }

  // Get invite status
  String getInviteStatus(Map<String, dynamic> invite) {
    final createdAt = invite['createdAt'] as DateTime?;
    final usedAt = invite['usedAt'] as DateTime?;
    final isActive = invite['isActive'] as bool? ?? true;
    
    if (usedAt != null) {
      return 'verwendet';
    }
    
    if (!isActive) {
      return 'deaktiviert';
    }
    
    if (createdAt != null && isInviteExpired(createdAt)) {
      return 'abgelaufen';
    }
    
    return 'aktiv';
  }

  // Get invite status color
  String getInviteStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'aktiv':
        return '#14AD9F'; // Green
      case 'verwendet':
        return '#6B7280'; // Gray
      case 'abgelaufen':
        return '#EF4444'; // Red
      case 'deaktiviert':
        return '#F59E0B'; // Orange
      default:
        return '#6B7280'; // Gray
    }
  }
}
