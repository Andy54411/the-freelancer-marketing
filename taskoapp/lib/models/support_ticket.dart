/// Support Ticket Model - basierend auf Web-Version
class SupportTicket {
  final String id;
  final String title;
  final String description;
  final TicketStatus status;
  final TicketPriority priority;
  final String category;
  final String customerEmail;
  final String customerName;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? assignedTo;
  final List<TicketReply> replies;

  const SupportTicket({
    required this.id,
    required this.title,
    required this.description,
    required this.status,
    required this.priority,
    required this.category,
    required this.customerEmail,
    required this.customerName,
    required this.createdAt,
    required this.updatedAt,
    this.assignedTo,
    this.replies = const [],
  });

  factory SupportTicket.fromJson(Map<String, dynamic> json) {
    return SupportTicket(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      status: TicketStatus.fromString(json['status']),
      priority: TicketPriority.fromString(json['priority']),
      category: json['category'] ?? 'general',
      customerEmail: json['customerEmail'] ?? '',
      customerName: json['customerName'] ?? '',
      createdAt: DateTime.parse(json['createdAt'] ?? DateTime.now().toIso8601String()),
      updatedAt: DateTime.parse(json['updatedAt'] ?? DateTime.now().toIso8601String()),
      assignedTo: json['assignedTo'],
      replies: (json['comments'] as List<dynamic>?)
          ?.map((reply) => TicketReply.fromJson(reply))
          .toList() ?? [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'status': status.value,
      'priority': priority.value,
      'category': category,
      'customerEmail': customerEmail,
      'customerName': customerName,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'assignedTo': assignedTo,
    };
  }
}

class TicketReply {
  final String id;
  final String author;
  final TicketAuthorType authorType;
  final String content;
  final DateTime timestamp;
  final bool isInternal;

  const TicketReply({
    required this.id,
    required this.author,
    required this.authorType,
    required this.content,
    required this.timestamp,
    this.isInternal = false,
  });

  factory TicketReply.fromJson(Map<String, dynamic> json) {
    return TicketReply(
      id: json['id'] ?? '',
      author: json['author'] ?? '',
      authorType: TicketAuthorType.fromString(json['authorType']),
      content: json['content'] ?? '',
      timestamp: DateTime.parse(json['timestamp'] ?? DateTime.now().toIso8601String()),
      isInternal: json['isInternal'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'author': author,
      'authorType': authorType.value,
      'content': content,
      'timestamp': timestamp.toIso8601String(),
      'isInternal': isInternal,
    };
  }
}

enum TicketStatus {
  open,
  inProgress,
  resolved,
  closed;

  static TicketStatus fromString(String? value) {
    switch (value) {
      case 'open':
        return TicketStatus.open;
      case 'in-progress':
        return TicketStatus.inProgress;
      case 'resolved':
        return TicketStatus.resolved;
      case 'closed':
        return TicketStatus.closed;
      default:
        return TicketStatus.open;
    }
  }

  String get value {
    switch (this) {
      case TicketStatus.open:
        return 'open';
      case TicketStatus.inProgress:
        return 'in-progress';
      case TicketStatus.resolved:
        return 'resolved';
      case TicketStatus.closed:
        return 'closed';
    }
  }

  String get displayName {
    switch (this) {
      case TicketStatus.open:
        return 'Offen';
      case TicketStatus.inProgress:
        return 'In Bearbeitung';
      case TicketStatus.resolved:
        return 'Gelöst';
      case TicketStatus.closed:
        return 'Geschlossen';
    }
  }
}

enum TicketPriority {
  low,
  medium,
  high,
  urgent;

  static TicketPriority fromString(String? value) {
    switch (value) {
      case 'low':
        return TicketPriority.low;
      case 'medium':
        return TicketPriority.medium;
      case 'high':
        return TicketPriority.high;
      case 'urgent':
        return TicketPriority.urgent;
      default:
        return TicketPriority.medium;
    }
  }

  String get value {
    switch (this) {
      case TicketPriority.low:
        return 'low';
      case TicketPriority.medium:
        return 'medium';
      case TicketPriority.high:
        return 'high';
      case TicketPriority.urgent:
        return 'urgent';
    }
  }

  String get displayName {
    switch (this) {
      case TicketPriority.low:
        return 'Niedrig';
      case TicketPriority.medium:
        return 'Normal';
      case TicketPriority.high:
        return 'Hoch';
      case TicketPriority.urgent:
        return 'Dringend';
    }
  }
}

enum TicketAuthorType {
  admin,
  customer,
  system;

  static TicketAuthorType fromString(String? value) {
    switch (value) {
      case 'admin':
        return TicketAuthorType.admin;
      case 'customer':
        return TicketAuthorType.customer;
      case 'system':
        return TicketAuthorType.system;
      default:
        return TicketAuthorType.customer;
    }
  }

  String get value {
    switch (this) {
      case TicketAuthorType.admin:
        return 'admin';
      case TicketAuthorType.customer:
        return 'customer';
      case TicketAuthorType.system:
        return 'system';
    }
  }
}
