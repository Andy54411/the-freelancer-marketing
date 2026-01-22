import 'package:flutter/material.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../../theme/app_theme.dart';
import '../../services/api_service.dart';
import '../../models/email_models.dart';
import 'email_detail_screen.dart';
import 'email_compose_screen.dart';

class EmailListScreen extends StatefulWidget {
  const EmailListScreen({super.key});

  @override
  State<EmailListScreen> createState() => _EmailListScreenState();
}

class _EmailListScreenState extends State<EmailListScreen> {
  final ApiService _apiService = ApiService();
  
  List<Mailbox> _mailboxes = [];
  List<EmailMessage> _messages = [];
  String _currentMailbox = 'INBOX';
  bool _isLoading = true;
  String? _error;
  bool _isSearching = false;
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    timeago.setLocaleMessages('de', timeago.DeMessages());
    _loadData();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      // Lade Mailboxen
      final mailboxResult = await _apiService.getMailboxes();
      if (mailboxResult['success'] == true) {
        _mailboxes = (mailboxResult['mailboxes'] as List)
            .map((e) => Mailbox.fromJson(e as Map<String, dynamic>))
            .toList();
      }

      // Lade Nachrichten
      await _loadMessages();
    } catch (e) { // Fehler ignorieren 
      setState(() => _error = e.toString());
    }

    setState(() => _isLoading = false);
  }

  Future<void> _loadMessages() async {
    final result = await _apiService.getMessages(mailbox: _currentMailbox);
    if (result['success'] == true) {
      setState(() {
        _messages = (result['messages'] as List)
            .map((e) => EmailMessage.fromJson(e as Map<String, dynamic>))
            .toList();
      });
    }
  }

  Future<void> _searchMessages(String query) async {
    if (query.isEmpty) {
      _loadMessages();
      return;
    }

    setState(() {
      _isLoading = true;
      _searchQuery = query;
    });

    try {
      final result = await _apiService.searchMessages(
        query: query,
        mailbox: _currentMailbox,
      );
      if (result['success'] == true) {
        setState(() {
          _messages = (result['messages'] as List)
              .map((e) => EmailMessage.fromJson(e as Map<String, dynamic>))
              .toList();
        });
      }
    } catch (e) { // Fehler ignorieren 
      setState(() => _error = e.toString());
    }

    setState(() => _isLoading = false);
  }

  void _toggleSearch() {
    setState(() {
      _isSearching = !_isSearching;
      if (!_isSearching) {
        _searchController.clear();
        _searchQuery = '';
        _loadMessages();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        title: _isSearching
            ? TextField(
                controller: _searchController,
                autofocus: true,
                decoration: const InputDecoration(
                  hintText: 'E-Mails durchsuchen...',
                  border: InputBorder.none,
                  hintStyle: TextStyle(color: AppColors.textSecondary),
                ),
                onSubmitted: _searchMessages,
              )
            : Text(_searchQuery.isNotEmpty ? 'Suche: $_searchQuery' : 'E-Mail'),
        actions: [
          IconButton(
            icon: Icon(_isSearching ? Icons.close : Icons.search),
            onPressed: _toggleSearch,
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
      ),
      drawer: _buildDrawer(),
      body: _buildBody(),
      floatingActionButton: FloatingActionButton(
        heroTag: 'emailListFab',
        onPressed: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const EmailComposeScreen()),
        ),
        backgroundColor: AppColors.emailRed,
        child: const Icon(Icons.edit, color: Colors.white),
      ),
    );
  }

  Widget _buildDrawer() {
    return Drawer(
      child: SafeArea(
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  Icon(Icons.mail, color: AppColors.emailRed, size: 28),
                  const SizedBox(width: 12),
                  const Text(
                    'Mail',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            const Divider(),
            Expanded(
              child: ListView(
                padding: EdgeInsets.zero,
                children: _mailboxes.map((mailbox) {
                  final isSelected = mailbox.path == _currentMailbox;
                  return ListTile(
                    leading: Icon(
                      _getMailboxIcon(mailbox),
                      color: isSelected ? AppColors.emailRed : AppColors.textSecondary,
                    ),
                    title: Text(
                      _getMailboxName(mailbox),
                      style: TextStyle(
                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                        color: isSelected ? AppColors.emailRed : AppColors.textPrimary,
                      ),
                    ),
                    trailing: mailbox.unseen > 0
                        ? Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.emailRed,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              '${mailbox.unseen}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          )
                        : null,
                    selected: isSelected,
                    onTap: () {
                      setState(() => _currentMailbox = mailbox.path);
                      Navigator.pop(context);
                      _loadMessages();
                    },
                  );
                }).toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.emailRed),
      );
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: AppColors.error),
            const SizedBox(height: 16),
            Text(_error!, style: const TextStyle(color: AppColors.error)),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadData,
              child: const Text('Erneut versuchen'),
            ),
          ],
        ),
      );
    }

    if (_messages.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inbox, size: 64, color: AppColors.textSecondary),
            const SizedBox(height: 16),
            const Text(
              'Keine E-Mails',
              style: TextStyle(
                fontSize: 18,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      color: AppColors.emailRed,
      child: ListView.builder(
        itemCount: _messages.length,
        itemBuilder: (context, index) {
          final message = _messages[index];
          return _EmailListItem(
            message: message,
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => EmailDetailScreen(
                  uid: message.uid,
                  mailbox: _currentMailbox,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  IconData _getMailboxIcon(Mailbox mailbox) {
    if (mailbox.isInbox) return Icons.inbox;
    if (mailbox.isSent) return Icons.send;
    if (mailbox.isDrafts) return Icons.drafts;
    if (mailbox.isTrash) return Icons.delete;
    if (mailbox.isSpam) return Icons.report;
    return Icons.folder;
  }

  String _getMailboxName(Mailbox mailbox) {
    if (mailbox.isInbox) return 'Posteingang';
    if (mailbox.isSent) return 'Gesendet';
    if (mailbox.isDrafts) return 'Entwürfe';
    if (mailbox.isTrash) return 'Papierkorb';
    if (mailbox.isSpam) return 'Spam';
    return mailbox.name;
  }
}

class _EmailListItem extends StatelessWidget {
  final EmailMessage message;
  final VoidCallback onTap;

  const _EmailListItem({
    required this.message,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isUnread = !message.isRead;
    
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: isUnread ? AppColors.primary.withValues(alpha: 0.05) : AppColors.surface,
          border: const Border(
            bottom: BorderSide(color: AppColors.divider),
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Avatar
            CircleAvatar(
              radius: 20,
              backgroundColor: AppColors.primary.withValues(alpha: 0.2),
              child: Text(
                message.from.first.displayName[0].toUpperCase(),
                style: TextStyle(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            const SizedBox(width: 12),
            
            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Sender & Time
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          message.from.first.displayName,
                          style: TextStyle(
                            fontWeight: isUnread ? FontWeight.w600 : FontWeight.normal,
                            color: AppColors.textPrimary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Text(
                        timeago.format(message.date, locale: 'de'),
                        style: TextStyle(
                          fontSize: 12,
                          color: isUnread ? AppColors.primary : AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  
                  // Subject
                  Text(
                    message.subject,
                    style: TextStyle(
                      fontWeight: isUnread ? FontWeight.w500 : FontWeight.normal,
                      color: AppColors.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  
                  // Preview
                  Text(
                    message.preview,
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            
            // Indicators
            if (message.hasAttachments || message.isStarred) ...[
              const SizedBox(width: 8),
              Column(
                children: [
                  if (message.isStarred)
                    const Icon(Icons.star, size: 18, color: Colors.amber),
                  if (message.hasAttachments)
                    const Icon(Icons.attach_file, size: 18, color: AppColors.textSecondary),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
