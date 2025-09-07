import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../models/support_ticket.dart';

/// Support Service - integriert mit dem Web Support System
/// Verwendet die gleichen APIs wie die Web-Version
class SupportService {
  static const String baseUrl = 'https://taskilo.de/api/company/tickets';
  
  static Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  /// Alle Tickets für eine Kunden-E-Mail laden
  static Future<List<SupportTicket>> getTicketsForCustomer(String customerEmail) async {
    try {
      final uri = Uri.parse('$baseUrl?customerEmail=${Uri.encodeComponent(customerEmail)}');
      final response = await http.get(uri, headers: _headers);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] == true) {
          final ticketsJson = data['tickets'] as List<dynamic>;
          return ticketsJson.map((json) => SupportTicket.fromJson(json)).toList();
        }
      }
      
      throw Exception('Fehler beim Laden der Tickets: ${response.statusCode}');
    } catch (e) {
      throw Exception('Netzwerkfehler beim Laden der Tickets: $e');
    }
  }

  /// Einzelnes Ticket laden
  static Future<SupportTicket?> getTicket(String ticketId) async {
    try {
      final uri = Uri.parse('$baseUrl?id=${Uri.encodeComponent(ticketId)}');
      final response = await http.get(uri, headers: _headers);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] == true && data['ticket'] != null) {
          return SupportTicket.fromJson(data['ticket']);
        }
      }
      
      return null;
    } catch (e) {
      throw Exception('Fehler beim Laden des Tickets: $e');
    }
  }

  /// Neues Ticket erstellen
  static Future<SupportTicket> createTicket({
    required String title,
    required String description,
    required String customerEmail,
    required String customerName,
    TicketPriority priority = TicketPriority.medium,
    String category = 'general',
  }) async {
    try {
      final response = await http.post(
        Uri.parse(baseUrl),
        headers: _headers,
        body: json.encode({
          'title': title,
          'description': description,
          'customerEmail': customerEmail,
          'customerName': customerName,
          'priority': priority.value,
          'category': category,
        }),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = json.decode(response.body);
        if (data['success'] == true && data['ticket'] != null) {
          return SupportTicket.fromJson(data['ticket']);
        }
      }

      throw Exception('Fehler beim Erstellen des Tickets: ${response.statusCode}');
    } catch (e) {
      throw Exception('Netzwerkfehler beim Erstellen des Tickets: $e');
    }
  }

  /// Ticket-Antworten laden
  static Future<List<TicketReply>> getTicketReplies(String ticketId) async {
    try {
      final uri = Uri.parse('$baseUrl/reply?ticketId=${Uri.encodeComponent(ticketId)}');
      final response = await http.get(uri, headers: _headers);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] == true) {
          final repliesJson = data['replies'] as List<dynamic>;
          return repliesJson.map((json) => TicketReply.fromJson(json)).toList();
        }
      }

      throw Exception('Fehler beim Laden der Antworten: ${response.statusCode}');
    } catch (e) {
      throw Exception('Netzwerkfehler beim Laden der Antworten: $e');
    }
  }

  /// Antwort auf Ticket senden
  static Future<void> sendReply({
    required String ticketId,
    required String message,
    required String senderName,
    required String senderEmail,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/reply'),
        headers: _headers,
        body: json.encode({
          'ticketId': ticketId,
          'message': message,
          'senderName': senderName,
          'senderEmail': senderEmail,
        }),
      );

      if (response.statusCode != 200 && response.statusCode != 201) {
        throw Exception('Fehler beim Senden der Antwort: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Netzwerkfehler beim Senden der Antwort: $e');
    }
  }

  /// Helper: Status-Farben für UI
  static Map<String, dynamic> getStatusConfig(TicketStatus status) {
    switch (status) {
      case TicketStatus.open:
        return {
          'color': const Color(0xFFfef2f2), // red-50
          'textColor': const Color(0xFF991b1b), // red-800
          'icon': Icons.error_outline,
        };
      case TicketStatus.inProgress:
        return {
          'color': const Color(0xFFfefce8), // yellow-50
          'textColor': const Color(0xFF92400e), // yellow-800
          'icon': Icons.access_time,
        };
      case TicketStatus.resolved:
        return {
          'color': const Color(0xFFf0fdf4), // green-50
          'textColor': const Color(0xFF166534), // green-800
          'icon': Icons.check_circle_outline,
        };
      case TicketStatus.closed:
        return {
          'color': const Color(0xFFf9fafb), // gray-50
          'textColor': const Color(0xFF374151), // gray-700
          'icon': Icons.check_circle,
        };
    }
  }

  /// Helper: Prioritäts-Farben für UI
  static Map<String, dynamic> getPriorityConfig(TicketPriority priority) {
    switch (priority) {
      case TicketPriority.low:
        return {
          'color': const Color(0xFFf9fafb), // gray-50
          'textColor': const Color(0xFF374151), // gray-700
        };
      case TicketPriority.medium:
        return {
          'color': const Color(0xFFdbeafe), // blue-100
          'textColor': const Color(0xFF1e40af), // blue-800
        };
      case TicketPriority.high:
        return {
          'color': const Color(0xFFfed7aa), // orange-100
          'textColor': const Color(0xFF9a3412), // orange-800
        };
      case TicketPriority.urgent:
        return {
          'color': const Color(0xFFfecaca), // red-100
          'textColor': const Color(0xFF991b1b), // red-800
        };
    }
  }
}
