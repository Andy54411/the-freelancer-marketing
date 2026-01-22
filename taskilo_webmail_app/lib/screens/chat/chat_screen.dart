import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../../theme/app_theme.dart';
import '../../providers/api_provider.dart';

class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({super.key});

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  List<ChatConversation> _conversations = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    timeago.setLocaleMessages('de', timeago.DeMessages());
    _loadConversations();
  }

  Future<void> _loadConversations() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final api = ref.read(apiServiceProvider);
      final result = await api.getChatConversations();
      
      if (result['success'] == true) {
        final conversations = <ChatConversation>[];
        for (final conv in result['conversations'] ?? []) {
          conversations.add(ChatConversation.fromJson(conv));
        }
        setState(() => _conversations = conversations);
      }
    } catch (e) { // Fehler ignorieren 
      setState(() => _error = e.toString());
    }

    setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        title: const Text('Chat'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_comment_outlined),
            onPressed: () {
              // TODO: Neuer Chat
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.chatGreen))
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, size: 48, color: AppColors.error),
                      const SizedBox(height: 16),
                      Text(_error!, style: const TextStyle(color: AppColors.error)),
                      const SizedBox(height: 16),
                      ElevatedButton.icon(
                        onPressed: _loadConversations,
                        icon: const Icon(Icons.refresh),
                        label: const Text('Erneut versuchen'),
                      ),
                    ],
                  ),
                )
              : _conversations.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.chat_bubble_outline, size: 64, color: AppColors.textSecondary),
                          const SizedBox(height: 16),
                          const Text(
                            'Keine Unterhaltungen',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textSecondary,
                            ),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Starten Sie eine neue Unterhaltung',
                            style: TextStyle(color: AppColors.textSecondary),
                          ),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _loadConversations,
                      color: AppColors.chatGreen,
                      child: ListView.builder(
                        itemCount: _conversations.length,
                        itemBuilder: (context, index) {
                          final conversation = _conversations[index];
                          return _ConversationTile(
                            conversation: conversation,
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => ChatDetailScreen(conversation: conversation),
                                ),
                              );
                            },
                          );
                        },
                      ),
                    ),
    );
  }
}

class _ConversationTile extends StatelessWidget {
  final ChatConversation conversation;
  final VoidCallback onTap;

  const _ConversationTile({
    required this.conversation,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      onTap: onTap,
      leading: Stack(
        children: [
          CircleAvatar(
            radius: 24,
            backgroundImage: conversation.avatarUrl != null
                ? NetworkImage(conversation.avatarUrl!)
                : null,
            child: conversation.avatarUrl == null
                ? Text(
                    conversation.name[0].toUpperCase(),
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
                  )
                : null,
          ),
          if (conversation.isOnline)
            Positioned(
              right: 0,
              bottom: 0,
              child: Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  color: AppColors.chatGreen,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.surface, width: 2),
                ),
              ),
            ),
        ],
      ),
      title: Row(
        children: [
          Expanded(
            child: Text(
              conversation.name,
              style: TextStyle(
                fontWeight: conversation.unreadCount > 0 ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
          ),
          if (conversation.lastMessageTime != null)
            Text(
              timeago.format(conversation.lastMessageTime!, locale: 'de'),
              style: TextStyle(
                fontSize: 12,
                color: conversation.unreadCount > 0 ? AppColors.chatGreen : AppColors.textSecondary,
              ),
            ),
        ],
      ),
      subtitle: Text(
        conversation.lastMessage ?? '',
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          color: conversation.unreadCount > 0 ? AppColors.textPrimary : AppColors.textSecondary,
        ),
      ),
      trailing: conversation.unreadCount > 0
          ? Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.chatGreen,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                conversation.unreadCount.toString(),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            )
          : null,
    );
  }
}

// Chat Detail Screen
class ChatDetailScreen extends ConsumerStatefulWidget {
  final ChatConversation conversation;

  const ChatDetailScreen({
    super.key,
    required this.conversation,
  });

  @override
  ConsumerState<ChatDetailScreen> createState() => _ChatDetailScreenState();
}

class _ChatDetailScreenState extends ConsumerState<ChatDetailScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  
  List<ChatMessage> _messages = [];
  bool _isLoading = true;
  bool _isSending = false;

  @override
  void initState() {
    super.initState();
    _loadMessages();
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadMessages() async {
    setState(() => _isLoading = true);

    try {
      final api = ref.read(apiServiceProvider);
      final result = await api.getChatMessages(widget.conversation.id);
      
      if (result['success'] == true) {
        final messages = <ChatMessage>[];
        for (final msg in result['messages'] ?? []) {
          messages.add(ChatMessage.fromJson(msg));
        }
        setState(() => _messages = messages);
        
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (_scrollController.hasClients) {
            _scrollController.animateTo(
              _scrollController.position.maxScrollExtent,
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeOut,
            );
          }
        });
      }
    } catch (e) { // Fehler ignorieren 
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Fehler: ${e.toString()}'),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }

    setState(() => _isLoading = false);
  }

  Future<void> _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;

    _messageController.clear();
    setState(() => _isSending = true);

    try {
      final api = ref.read(apiServiceProvider);
      await api.sendChatMessage(
        conversationId: widget.conversation.id,
        text: text,
      );
      
      await _loadMessages();
    } catch (e) { // Fehler ignorieren 
      _messageController.text = text;
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Fehler: ${e.toString()}'),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }

    setState(() => _isSending = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        title: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundImage: widget.conversation.avatarUrl != null
                  ? NetworkImage(widget.conversation.avatarUrl!)
                  : null,
              child: widget.conversation.avatarUrl == null
                  ? Text(
                      widget.conversation.name[0].toUpperCase(),
                      style: const TextStyle(fontSize: 16),
                    )
                  : null,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.conversation.name,
                    style: const TextStyle(fontSize: 16),
                  ),
                  if (widget.conversation.isOnline)
                    const Text(
                      'Online',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppColors.chatGreen,
                        fontWeight: FontWeight.normal,
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.videocam_outlined),
            onPressed: () {
              // TODO: Video-Anruf
            },
          ),
          IconButton(
            icon: const Icon(Icons.phone_outlined),
            onPressed: () {
              // TODO: Anruf
            },
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: AppColors.chatGreen))
                : _messages.isEmpty
                    ? const Center(
                        child: Text(
                          'Keine Nachrichten',
                          style: TextStyle(color: AppColors.textSecondary),
                        ),
                      )
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.all(16),
                        itemCount: _messages.length,
                        itemBuilder: (context, index) {
                          final message = _messages[index];
                          final showDateSeparator = index == 0 ||
                              !_isSameDay(
                                _messages[index - 1].timestamp,
                                message.timestamp,
                              );

                          return Column(
                            children: [
                              if (showDateSeparator)
                                Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 16),
                                  child: Text(
                                    _formatDate(message.timestamp),
                                    style: const TextStyle(
                                      color: AppColors.textSecondary,
                                      fontSize: 12,
                                    ),
                                  ),
                                ),
                              _MessageBubble(message: message),
                            ],
                          );
                        },
                      ),
          ),
          Container(
            padding: EdgeInsets.only(
              left: 8,
              right: 8,
              top: 8,
              bottom: MediaQuery.of(context).padding.bottom + 8,
            ),
            decoration: const BoxDecoration(
              color: AppColors.surface,
              border: Border(top: BorderSide(color: AppColors.divider)),
            ),
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.attach_file),
                  onPressed: () {
                    // TODO: Datei anhängen
                  },
                  color: AppColors.textSecondary,
                ),
                Expanded(
                  child: TextField(
                    controller: _messageController,
                    decoration: const InputDecoration(
                      hintText: 'Nachricht schreiben...',
                      border: InputBorder.none,
                    ),
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _sendMessage(),
                    maxLines: null,
                  ),
                ),
                IconButton(
                  icon: _isSending
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppColors.chatGreen,
                          ),
                        )
                      : const Icon(Icons.send),
                  onPressed: _isSending ? null : _sendMessage,
                  color: AppColors.chatGreen,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  bool _isSameDay(DateTime date1, DateTime date2) {
    return date1.year == date2.year &&
        date1.month == date2.month &&
        date1.day == date2.day;
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    if (_isSameDay(date, now)) {
      return 'Heute';
    } else if (_isSameDay(date, now.subtract(const Duration(days: 1)))) {
      return 'Gestern';
    } else {
      return '${date.day}.${date.month}.${date.year}';
    }
  }
}

class _MessageBubble extends StatelessWidget {
  final ChatMessage message;

  const _MessageBubble({required this.message});

  @override
  Widget build(BuildContext context) {
    final isMe = message.isMe;

    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        decoration: BoxDecoration(
          color: isMe ? AppColors.chatGreen : AppColors.surface,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(isMe ? 16 : 4),
            bottomRight: Radius.circular(isMe ? 4 : 16),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              message.text,
              style: TextStyle(
                color: isMe ? Colors.white : AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              _formatTime(message.timestamp),
              style: TextStyle(
                fontSize: 11,
                color: isMe ? Colors.white70 : AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatTime(DateTime time) {
    return '${time.hour}:${time.minute.toString().padLeft(2, '0')}';
  }
}

// Models
class ChatConversation {
  final String id;
  final String name;
  final String? avatarUrl;
  final String? lastMessage;
  final DateTime? lastMessageTime;
  final int unreadCount;
  final bool isOnline;

  ChatConversation({
    required this.id,
    required this.name,
    this.avatarUrl,
    this.lastMessage,
    this.lastMessageTime,
    this.unreadCount = 0,
    this.isOnline = false,
  });

  factory ChatConversation.fromJson(Map<String, dynamic> json) {
    return ChatConversation(
      id: json['id'] ?? json['_id'] ?? '',
      name: json['name'] ?? 'Unbekannt',
      avatarUrl: json['avatarUrl'] ?? json['avatar'],
      lastMessage: json['lastMessage'] ?? json['last_message'],
      lastMessageTime: json['lastMessageTime'] != null
          ? DateTime.parse(json['lastMessageTime'])
          : null,
      unreadCount: json['unreadCount'] ?? json['unread_count'] ?? 0,
      isOnline: json['isOnline'] ?? json['is_online'] ?? false,
    );
  }
}

class ChatMessage {
  final String id;
  final String text;
  final DateTime timestamp;
  final bool isMe;

  ChatMessage({
    required this.id,
    required this.text,
    required this.timestamp,
    required this.isMe,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['id'] ?? json['_id'] ?? '',
      text: json['text'] ?? json['message'] ?? '',
      timestamp: DateTime.parse(
        json['timestamp'] ?? json['createdAt'] ?? DateTime.now().toIso8601String(),
      ),
      isMe: json['isMe'] ?? json['is_me'] ?? false,
    );
  }
}
