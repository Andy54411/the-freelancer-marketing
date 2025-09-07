import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/user_model.dart';
import '../../services/chat_service.dart';
import '../../utils/colors.dart';
import '../chat/order_chat_screen.dart';
import '../dashboard/dashboard_layout.dart';

/// Messages/Posteingang Screen
/// Zeigt alle Chats des Benutzers an
class MessagesScreen extends StatefulWidget {
  const MessagesScreen({super.key});

  @override
  State<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends State<MessagesScreen> {
  @override
  Widget build(BuildContext context) {
    return Consumer<TaskiloUser?>(
      builder: (context, user, child) {
        if (user == null) {
          return const Scaffold(
            body: Center(child: Text('Benutzer nicht angemeldet')),
          );
        }

        return DashboardLayout(
          title: 'Nachrichten',
          useGradientBackground: true,
          showBackButton: true,
          onBackPressed: () => Navigator.pop(context),
          showBottomNavigation: false,
          body: _buildMessagesContent(user),
        );
      },
    );
  }

  Widget _buildMessagesContent(TaskiloUser currentUser) {
    return StreamBuilder<List<Map<String, dynamic>>>(
      stream: ChatService.getUserChats(currentUser.uid),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(
            child: CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(TaskiloColors.primary),
            ),
          );
        }

        if (snapshot.hasError) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error, size: 48, color: Colors.red),
                const SizedBox(height: 16),
                Text(
                  'Fehler beim Laden der Nachrichten: ${snapshot.error}',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.red),
                ),
              ],
            ),
          );
        }

        final chats = snapshot.data ?? [];

        if (chats.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.mail_outline,
                  size: 64,
                  color: Colors.white.withValues(alpha: 0.5),
                ),
                const SizedBox(height: 16),
                Text(
                  'Keine Nachrichten',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.white.withValues(alpha: 0.8),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Ihre Chats werden hier angezeigt, sobald Sie mit Anbietern kommunizieren.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.white.withValues(alpha: 0.6),
                  ),
                ),
              ],
            ),
          );
        }

        return ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: chats.length,
          separatorBuilder: (context, index) => const SizedBox(height: 12),
          itemBuilder: (context, index) {
            final chat = chats[index];
            return _buildChatItem(chat, currentUser);
          },
        );
      },
    );
  }

  Widget _buildChatItem(Map<String, dynamic> chat, TaskiloUser currentUser) {
    final customerInfo = chat['customerInfo'] as Map<String, dynamic>? ?? {};
    final providerInfo = chat['providerInfo'] as Map<String, dynamic>? ?? {};
    
    // Bestimme den Chat-Partner
    String partnerName = 'Unbekannt';
    String partnerType = 'Unbekannt';
    String partnerId = '';
    
    if (currentUser.userType == UserType.customer) {
      // Kunde sieht Provider-Info
      partnerName = providerInfo['name'] ?? 'Anbieter';
      partnerType = 'Anbieter';
      partnerId = providerInfo['id'] ?? '';
    } else {
      // Provider sieht Customer-Info
      partnerName = customerInfo['name'] ?? 'Kunde';
      partnerType = 'Kunde';
      partnerId = customerInfo['id'] ?? '';
    }

    final lastMessage = chat['lastMessage'] ?? 'Keine Nachrichten';
    final lastUpdated = chat['lastUpdated'];
    final isMyMessage = chat['lastMessageSenderId'] == currentUser.uid;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => _openChat(chat['id'], partnerId, partnerName),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                // Avatar
                CircleAvatar(
                  radius: 24,
                  backgroundColor: TaskiloColors.primary,
                  child: Text(
                    partnerName.substring(0, 1).toUpperCase(),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                
                // Chat Info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Partner Name und Typ
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              partnerName,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: TaskiloColors.primary.withValues(alpha: 0.3),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              partnerType,
                              style: const TextStyle(
                                fontSize: 10,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      
                      // Letzte Nachricht
                      Row(
                        children: [
                          if (isMyMessage) ...[
                            Icon(
                              Icons.reply,
                              size: 14,
                              color: Colors.white.withValues(alpha: 0.6),
                            ),
                            const SizedBox(width: 4),
                          ],
                          Expanded(
                            child: Text(
                              lastMessage.length > 50 
                                  ? '${lastMessage.substring(0, 50)}...'
                                  : lastMessage,
                              style: TextStyle(
                                fontSize: 14,
                                color: Colors.white.withValues(alpha: 0.8),
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      
                      // Timestamp
                      Text(
                        _formatTimestamp(lastUpdated),
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.white.withValues(alpha: 0.6),
                        ),
                      ),
                    ],
                  ),
                ),
                
                // Unread Indicator (TODO: Implement unread count)
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: TaskiloColors.primary,
                    shape: BoxShape.circle,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _openChat(String chatId, String partnerId, String partnerName) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => OrderChatScreen(
          orderId: chatId,
          providerId: partnerId,
          providerName: partnerName,
        ),
      ),
    );
  }

  String _formatTimestamp(dynamic timestamp) {
    if (timestamp == null) return '';
    
    try {
      DateTime dateTime;
      if (timestamp is DateTime) {
        dateTime = timestamp;
      } else {
        return '';
      }

      final now = DateTime.now();
      final difference = now.difference(dateTime);

      if (difference.inDays > 6) {
        return '${dateTime.day}.${dateTime.month}.${dateTime.year}';
      } else if (difference.inDays > 0) {
        return '${difference.inDays}d';
      } else if (difference.inHours > 0) {
        return '${difference.inHours}h';
      } else if (difference.inMinutes > 0) {
        return '${difference.inMinutes}m';
      } else {
        return 'jetzt';
      }
    } catch (e) {
      return '';
    }
  }
}
