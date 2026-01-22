/// User Model für eingeloggten Webmail-Benutzer
class User {
  final String email;
  final String? displayName;
  final String? avatarUrl;
  final DateTime? lastLogin;

  User({
    required this.email,
    this.displayName,
    this.avatarUrl,
    this.lastLogin,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      email: json['email'] as String,
      displayName: json['displayName'] as String?,
      avatarUrl: json['avatarUrl'] as String?,
      lastLogin: json['lastLogin'] != null
          ? DateTime.parse(json['lastLogin'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'email': email,
      'displayName': displayName,
      'avatarUrl': avatarUrl,
      'lastLogin': lastLogin?.toIso8601String(),
    };
  }

  String get initials {
    if (displayName != null && displayName!.isNotEmpty) {
      final parts = displayName!.split(' ');
      if (parts.length >= 2) {
        return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
      }
      return displayName![0].toUpperCase();
    }
    return email[0].toUpperCase();
  }
}

/// E-Mail Message Model
class EmailMessage {
  final int uid;
  final String messageId;
  final String subject;
  final List<EmailAddress> from;
  final List<EmailAddress> to;
  final List<EmailAddress>? cc;
  final List<EmailAddress>? bcc;
  final DateTime date;
  final List<String> flags;
  final String preview;
  final bool hasAttachments;
  final int? size;
  final String? text;
  final String? html;
  final List<EmailAttachment>? attachments;

  EmailMessage({
    required this.uid,
    required this.messageId,
    required this.subject,
    required this.from,
    required this.to,
    this.cc,
    this.bcc,
    required this.date,
    required this.flags,
    required this.preview,
    required this.hasAttachments,
    this.size,
    this.text,
    this.html,
    this.attachments,
  });

  bool get isRead => flags.contains('\\Seen');
  bool get isStarred => flags.contains('\\Flagged');
  bool get isDraft => flags.contains('\\Draft');
  
  /// Alias für html für Kompatibilität
  String? get bodyHtml => html;
  
  /// Alias für text für Kompatibilität
  String? get bodyText => text;

  factory EmailMessage.fromJson(Map<String, dynamic> json) {
    return EmailMessage(
      uid: json['uid'] as int,
      messageId: json['messageId'] as String,
      subject: json['subject'] as String,
      from: (json['from'] as List)
          .map((e) => EmailAddress.fromJson(e as Map<String, dynamic>))
          .toList(),
      to: (json['to'] as List)
          .map((e) => EmailAddress.fromJson(e as Map<String, dynamic>))
          .toList(),
      cc: json['cc'] != null
          ? (json['cc'] as List)
              .map((e) => EmailAddress.fromJson(e as Map<String, dynamic>))
              .toList()
          : null,
      bcc: json['bcc'] != null
          ? (json['bcc'] as List)
              .map((e) => EmailAddress.fromJson(e as Map<String, dynamic>))
              .toList()
          : null,
      date: DateTime.parse(json['date'] as String),
      flags: List<String>.from(json['flags'] as List),
      preview: json['preview'] as String,
      hasAttachments: json['hasAttachments'] as bool,
      size: json['size'] as int?,
      text: json['text'] as String?,
      html: json['html'] as String?,
      attachments: json['attachments'] != null
          ? (json['attachments'] as List)
              .map((e) => EmailAttachment.fromJson(e as Map<String, dynamic>))
              .toList()
          : null,
    );
  }
}

class EmailAddress {
  final String? name;
  final String address;

  EmailAddress({this.name, required this.address});

  factory EmailAddress.fromJson(Map<String, dynamic> json) {
    return EmailAddress(
      name: json['name'] as String?,
      address: json['address'] as String,
    );
  }

  String get displayName => name ?? address;
  
  /// Alias für address für Kompatibilität
  String get email => address;
}

class EmailAttachment {
  final String filename;
  final String contentType;
  final int size;
  final String? contentId;
  final String? partId;
  final String? data;

  EmailAttachment({
    required this.filename,
    required this.contentType,
    required this.size,
    this.contentId,
    this.partId,
    this.data,
  });

  factory EmailAttachment.fromJson(Map<String, dynamic> json) {
    return EmailAttachment(
      filename: json['filename'] as String,
      contentType: json['contentType'] as String,
      size: json['size'] as int,
      contentId: json['contentId'] as String?,
      partId: json['partId'] as String?,
      data: json['data'] as String?,
    );
  }
  
  /// Alias für contentType für Kompatibilität
  String get mimeType => contentType;
}

/// Mailbox Model
class Mailbox {
  final String path;
  final String name;
  final String delimiter;
  final List<String> flags;
  final String? specialUse;
  final int exists;
  final int unseen;

  Mailbox({
    required this.path,
    required this.name,
    required this.delimiter,
    required this.flags,
    this.specialUse,
    required this.exists,
    required this.unseen,
  });

  factory Mailbox.fromJson(Map<String, dynamic> json) {
    return Mailbox(
      path: json['path'] as String,
      name: json['name'] as String,
      delimiter: json['delimiter'] as String,
      flags: List<String>.from(json['flags'] as List),
      specialUse: json['specialUse'] as String?,
      exists: json['exists'] as int,
      unseen: json['unseen'] as int,
    );
  }

  bool get isInbox => specialUse == '\\Inbox' || path.toLowerCase() == 'inbox';
  bool get isSent => specialUse == '\\Sent';
  bool get isDrafts => specialUse == '\\Drafts';
  bool get isTrash => specialUse == '\\Trash';
  bool get isSpam => specialUse == '\\Junk';
}
