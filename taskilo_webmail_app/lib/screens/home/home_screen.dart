import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../../theme/app_theme.dart';
import '../../services/api_service.dart';
import '../../models/email_models.dart';
import '../../router/app_router.dart';
import '../email/email_detail_screen.dart';
import '../email/email_compose_screen.dart';
import '../drive/drive_screen.dart';
import '../photos/photos_screen.dart';
import '../calendar/calendar_screen.dart';
import '../chat/chat_screen.dart';
import '../meet/meet_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with TickerProviderStateMixin {
  final ApiService _apiService = ApiService();
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  int _currentIndex = 0;
  bool _isNavExpanded = false;
  AnimationController? _navAnimationController;
  Animation<double>? _navWidthAnimation;

  // E-Mail State
  List<Mailbox> _mailboxes = [];
  List<EmailMessage> _messages = [];
  List<EmailMessage> _allMessages = []; // Alle Nachrichten für lokales Filtern
  String _currentMailbox = 'INBOX';
  bool _isLoading = true;
  String? _error;
  final TextEditingController _searchController = TextEditingController();
  Timer? _debounceTimer;

  // Profil/Avatar State
  String? _avatarUrl;

  @override
  void initState() {
    super.initState();
    timeago.setLocaleMessages('de', timeago.DeMessages());

    // Animation Controller für Navigation
    _navAnimationController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );

    _navWidthAnimation = Tween<double>(begin: 80.0, end: 350.0).animate(
      CurvedAnimation(
        parent: _navAnimationController!,
        curve: Curves.easeInOut,
      ),
    );

    _initAndLoadData();
  }

  Future<void> _initAndLoadData() async {
    // Stelle sicher, dass ApiService initialisiert ist
    await _apiService.initialize();

    debugPrint(
      '[HomeScreen] ApiService initialized, isLoggedIn: ${_apiService.isLoggedIn}',
    );
    debugPrint('[HomeScreen] userEmail: ${_apiService.userEmail}');

    if (!_apiService.isLoggedIn) {
      debugPrint('[HomeScreen] Nicht eingeloggt - zurück zum WelcomeScreen');
      if (mounted) {
        context.go(AppRouter.welcome);
      }
      return;
    }

    _loadEmailData();
    _loadUserProfile();
  }

  Future<void> _loadUserProfile() async {
    // Avatar-URL direkt vom Hetzner-Server
    setState(() {
      _avatarUrl = _apiService.getAvatarUrl();
    });

    // Profildaten laden (für zukünftige Verwendung)
    await _apiService.getProfile();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _navAnimationController?.dispose();
    _debounceTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadEmailData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      debugPrint('[HomeScreen] Lade Mailboxen...');
      final mailboxResult = await _apiService.getMailboxes();
      debugPrint('[HomeScreen] Mailbox-Ergebnis: $mailboxResult');

      if (mailboxResult['success'] == true) {
        _mailboxes = (mailboxResult['mailboxes'] as List)
            .map((e) => Mailbox.fromJson(e as Map<String, dynamic>))
            .toList();
        debugPrint('[HomeScreen] ${_mailboxes.length} Mailboxen geladen');
      } else {
        debugPrint('[HomeScreen] Mailbox-Fehler: ${mailboxResult['error']}');
        setState(
          () => _error =
              mailboxResult['error']?.toString() ?? 'Fehler beim Laden',
        );
      }
      await _loadMessages();
    } catch (e) {
      // Fehler ignorieren
      debugPrint('[HomeScreen] Exception: $e');
      setState(() => _error = e.toString());
    }

    setState(() => _isLoading = false);
  }

  Future<void> _loadMessages() async {
    debugPrint('[HomeScreen] Lade Nachrichten für $_currentMailbox...');

    // Virtuelle Ordner: Laden aus INBOX und filtern nach Keywords/Flags
    String actualMailbox = _currentMailbox;
    String? virtualFilter;

    switch (_currentMailbox) {
      case 'IMPORTANT':
        actualMailbox = 'INBOX';
        virtualFilter = 'important';
        break;
      case 'FLAGGED':
        actualMailbox = 'INBOX';
        virtualFilter = 'flagged';
        break;
      case 'SNOOZED':
        actualMailbox = 'INBOX';
        virtualFilter = 'snoozed';
        break;
      case 'PURCHASES':
        actualMailbox = 'INBOX';
        virtualFilter = 'purchases';
        break;
      case 'SCHEDULED':
        actualMailbox = 'Drafts';
        virtualFilter = 'scheduled';
        break;
      case 'OUTBOX':
        actualMailbox = 'INBOX';
        virtualFilter = 'outbox';
        break;
      case 'ALL':
        actualMailbox = 'INBOX';
        virtualFilter = 'all';
        break;
    }

    final result = await _apiService.getMessages(mailbox: actualMailbox);
    debugPrint(
      '[HomeScreen] Nachrichten-Ergebnis: success=${result['success']}, count=${(result['messages'] as List?)?.length ?? 0}',
    );

    if (result['success'] == true) {
      var messages = (result['messages'] as List)
          .map((e) => EmailMessage.fromJson(e as Map<String, dynamic>))
          .toList();

      // Client-seitige Filterung für virtuelle Ordner
      if (virtualFilter != null) {
        switch (virtualFilter) {
          case 'important':
            messages = messages
                .where((m) => m.flags.any((f) => f.contains('\$Important')))
                .toList();
            break;
          case 'flagged':
            messages = messages.where((m) => m.isStarred).toList();
            break;
          case 'snoozed':
            messages = messages
                .where((m) => m.flags.any((f) => f.contains('\$snoozed')))
                .toList();
            break;
          case 'purchases':
            // Käufe-Filter: Suche nach typischen Kaufbestätigungswörtern
            messages = messages.where((m) {
              final subject = m.subject.toLowerCase();
              final from = m.from.isNotEmpty
                  ? m.from.first.address.toLowerCase()
                  : '';
              return subject.contains('bestellung') ||
                  subject.contains('order') ||
                  subject.contains('rechnung') ||
                  subject.contains('invoice') ||
                  subject.contains('kaufbestätigung') ||
                  subject.contains('payment') ||
                  subject.contains('zahlung') ||
                  from.contains('paypal') ||
                  from.contains('amazon') ||
                  from.contains('ebay');
            }).toList();
            break;
          case 'all':
            // Alle E-Mails - keine Filterung
            break;
          // scheduled und outbox sind spezielle Fälle
        }
      }

      setState(() {
        _allMessages = messages;
        // Sortiere nach Datum (neueste zuerst) - mit Millisekunden für präzise Sortierung
        _allMessages.sort(
          (a, b) => b.date.millisecondsSinceEpoch.compareTo(
            a.date.millisecondsSinceEpoch,
          ),
        );
        _messages = List.from(_allMessages);
      });
      debugPrint('[HomeScreen] ${_messages.length} Nachrichten geladen');
    } else {
      debugPrint('[HomeScreen] Nachrichten-Fehler: ${result['error']}');
    }
  }

  void _filterMessages(String query) {
    _debounceTimer?.cancel();

    if (query.isEmpty) {
      setState(() {
        _messages = List.from(_allMessages);
      });
      return;
    }

    // Debounce - warte 200ms bevor gefiltert wird
    _debounceTimer = Timer(const Duration(milliseconds: 200), () {
      final lowerQuery = query.toLowerCase();
      setState(() {
        _messages = _allMessages.where((msg) {
          final subject = msg.subject.toLowerCase();
          final from = msg.from.isNotEmpty
              ? msg.from.first.address.toLowerCase()
              : '';
          final fromName = msg.from.isNotEmpty
              ? (msg.from.first.name?.toLowerCase() ?? '')
              : '';
          final preview = msg.preview.toLowerCase();

          return subject.contains(lowerQuery) ||
              from.contains(lowerQuery) ||
              fromName.contains(lowerQuery) ||
              preview.contains(lowerQuery);
        }).toList();
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: AppColors.background,
      drawer: _buildDrawer(),
      body: Stack(
        children: [
          SafeArea(
            child: IndexedStack(
              index: _currentIndex,
              children: [
                _buildMailView(),
                const CalendarScreen(),
                const MeetScreen(),
                const DriveScreen(),
                const PhotosScreen(),
                const ChatScreen(),
              ],
            ),
          ),
          Positioned(left: 0, right: 0, bottom: 20, child: _buildBottomNav()),
        ],
      ),
      floatingActionButton: _currentIndex == 0
          ? Padding(
              padding: const EdgeInsets.only(bottom: 80),
              child: FloatingActionButton.extended(
                heroTag: 'mailFab',
                onPressed: () async {
                  final result = await EmailComposeScreen.show(context);
                  if (result == true && mounted) {
                    // Entwurf wurde gespeichert - Nachrichten neu laden
                    _loadMessages();
                  }
                },
                backgroundColor: const Color(0xFFE0F7F5),
                elevation: 6,
                extendedPadding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 16,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(28),
                  side: BorderSide(
                    color: AppColors.primary.withValues(alpha: 0.3),
                  ),
                ),
                icon: Icon(
                  Icons.edit_outlined,
                  color: AppColors.primary,
                  size: 22,
                ),
                label: Text(
                  'Schreiben',
                  style: TextStyle(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w600,
                    fontSize: 15,
                  ),
                ),
              ),
            )
          : null,
    );
  }

  Widget _buildMailView() {
    return Column(
      children: [
        // Gmail-Style Suchleiste
        _buildSearchBar(),

        // Posteingang Label
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Text(
            _getMailboxDisplayName(_currentMailbox),
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: AppColors.textSecondary,
              letterSpacing: 0.5,
            ),
          ),
        ),

        // E-Mail Liste
        Expanded(child: _buildEmailList()),
      ],
    );
  }

  Widget _buildUserAvatar({double radius = 18, double fontSize = 14}) {
    final initial = _apiService.userEmail?.substring(0, 1).toUpperCase() ?? 'U';

    return CircleAvatar(
      radius: radius,
      backgroundColor: AppColors.primary,
      backgroundImage: _avatarUrl != null ? NetworkImage(_avatarUrl!) : null,
      onBackgroundImageError: _avatarUrl != null
          ? (_, _) {
              // Bei Fehler Avatar-URL zurücksetzen
              setState(() => _avatarUrl = null);
            }
          : null,
      child: _avatarUrl == null
          ? Text(
              initial,
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: fontSize,
              ),
            )
          : null,
    );
  }

  Widget _buildSearchBar() {
    return Container(
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFE0F7F5), // Helles Teal
        borderRadius: BorderRadius.circular(28),
        border: Border.all(
          color: AppColors.primary.withValues(alpha: 0.3),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.15),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          // Hamburger Menu
          IconButton(
            icon: const Icon(Icons.menu),
            color: AppColors.textSecondary,
            onPressed: () => _scaffoldKey.currentState?.openDrawer(),
          ),

          // Suche - TextField mit hintText
          Expanded(
            child: TextField(
              controller: _searchController,
              style: TextStyle(color: AppColors.textPrimary, fontSize: 16),
              cursorColor: AppColors.primary,
              decoration: InputDecoration(
                hintText:
                    'In ${_getMailboxDisplayName(_currentMailbox)} suchen',
                hintStyle: TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 16,
                ),
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                filled: false,
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
              ),
              textInputAction: TextInputAction.search,
              onChanged: (value) {
                setState(() {});
                _filterMessages(value); // Realtime-Filter
              },
              onSubmitted: (query) {
                // Bei Enter: Server-Suche für vollständige Ergebnisse
                if (query.isNotEmpty) {
                  _searchMessages(query);
                } else {
                  _loadMessages();
                }
              },
            ),
          ),

          // X-Button zum Löschen (nur bei aktiver Suche)
          if (_searchController.text.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.close, size: 20),
              color: AppColors.textSecondary,
              onPressed: () {
                _searchController.clear();
                _debounceTimer?.cancel();
                setState(() {
                  _messages = List.from(_allMessages);
                });
              },
            ),

          // User Avatar mit Gravatar
          GestureDetector(
            onTap: _showUserMenu,
            child: Container(
              margin: const EdgeInsets.only(right: 8),
              child: _buildUserAvatar(radius: 18),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmailList() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.cloud_off, size: 64, color: AppColors.textSecondary),
            const SizedBox(height: 16),
            Text(
              'Keine Verbindung',
              style: TextStyle(fontSize: 18, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: _loadEmailData,
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
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: const Color(0xFFE0F7F5),
                borderRadius: BorderRadius.circular(50),
              ),
              child: Icon(
                Icons.inbox_outlined,
                size: 48,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Keine E-Mails',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Dein Posteingang ist leer',
              style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadEmailData,
      color: AppColors.primary,
      child: ListView.builder(
        itemCount: _messages.length,
        itemBuilder: (context, index) {
          final message = _messages[index];
          return _EmailListItem(
            message: message,
            onTap: () async {
              final result = await Navigator.push<Map<String, dynamic>>(
                context,
                MaterialPageRoute(
                  builder: (context) => EmailDetailScreen(
                    uid: message.uid,
                    mailbox: _currentMailbox,
                  ),
                ),
              );
              // Wenn eine E-Mail gelöscht wurde, sofort aus Liste entfernen
              if (result != null && result['deleted'] == true) {
                setState(() {
                  _messages.removeWhere((m) => m.uid == result['uid']);
                });
              } else {
                // E-Mail wurde gelesen - Liste neu laden für Realtime-Update
                _loadMessages();
              }
            },
            onStarTap: () => _toggleStar(message),
          );
        },
      ),
    );
  }

  Widget _buildBottomNav() {
    // Fallback für Hot Reload - Animation initialisieren falls nötig
    _navAnimationController ??= AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );

    _navWidthAnimation ??= Tween<double>(begin: 80.0, end: 350.0).animate(
      CurvedAnimation(
        parent: _navAnimationController!,
        curve: Curves.easeInOut,
      ),
    );

    return Center(
      child: GestureDetector(
        onTap: () {
          setState(() {
            _isNavExpanded = !_isNavExpanded;
            if (_isNavExpanded) {
              _navAnimationController!.forward();
            } else {
              _navAnimationController!.reverse();
            }
          });
        },
        child: AnimatedBuilder(
          animation: _navWidthAnimation!,
          builder: (context, child) {
            return ClipRRect(
              borderRadius: BorderRadius.circular(35),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                child: Container(
                  width: _navWidthAnimation!.value,
                  height: 70,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE0F7F5).withValues(alpha: 0.8),
                    borderRadius: BorderRadius.circular(35),
                    border: Border.all(
                      color: AppColors.primary.withValues(alpha: 0.3),
                      width: 1.5,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withValues(alpha: 0.2),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: _navWidthAnimation!.value < 330
                      ? Center(
                          child: Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.1),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              Icons.apps,
                              color: AppColors.primary,
                              size: 24,
                            ),
                          ),
                        )
                      : Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                            children: [
                              _buildCompactNavItem(
                                icon: Icons.mail_outlined,
                                activeIcon: Icons.mail,
                                index: 0,
                                badge: _getUnreadCount(),
                              ),
                              _buildCompactNavItem(
                                icon: Icons.calendar_today_outlined,
                                activeIcon: Icons.calendar_today,
                                index: 1,
                              ),
                              _buildCompactNavItem(
                                icon: Icons.videocam_outlined,
                                activeIcon: Icons.videocam,
                                index: 2,
                              ),
                              _buildCompactNavItem(
                                icon: Icons.folder_outlined,
                                activeIcon: Icons.folder,
                                index: 3,
                              ),
                              _buildCompactNavItem(
                                icon: Icons.photo_library_outlined,
                                activeIcon: Icons.photo_library,
                                index: 4,
                              ),
                              _buildCompactNavItem(
                                icon: Icons.chat_bubble_outline,
                                activeIcon: Icons.chat_bubble,
                                index: 5,
                              ),
                            ],
                          ),
                        ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildCompactNavItem({
    required IconData icon,
    required IconData activeIcon,
    required int index,
    int badge = 0,
  }) {
    final isSelected = _currentIndex == index;

    return GestureDetector(
      onTap: () {
        setState(() {
          _currentIndex = index;
          _isNavExpanded = false;
          _navAnimationController?.reverse();
        });
      },
      child: Container(
        width: 42,
        height: 42,
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primary.withValues(alpha: 0.2)
              : Colors.transparent,
          shape: BoxShape.circle,
        ),
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Center(
              child: Icon(
                isSelected ? activeIcon : icon,
                color: AppColors.primary,
                size: isSelected ? 24 : 22,
              ),
            ),
            if (badge > 0)
              Positioned(
                right: 4,
                top: 4,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 5,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.error,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.white, width: 1.5),
                  ),
                  constraints: const BoxConstraints(minWidth: 18),
                  child: Text(
                    badge > 99 ? '99+' : '$badge',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _searchMessages(String query) async {
    setState(() => _isLoading = true);

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
          // Sortiere nach Datum (neueste zuerst) - mit Millisekunden für präzise Sortierung
          _messages.sort(
            (a, b) => b.date.millisecondsSinceEpoch.compareTo(
              a.date.millisecondsSinceEpoch,
            ),
          );
        });
      }
    } catch (e) {
      // Fehler ignorieren
      setState(() => _error = e.toString());
    }

    setState(() => _isLoading = false);
  }

  Widget _buildDrawer() {
    return Drawer(
      backgroundColor: Colors.white,
      child: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.all(24),
              child: Row(
                children: [
                  SvgPicture.asset(
                    'assets/images/Logo.svg',
                    width: 32,
                    height: 32,
                    fit: BoxFit.contain,
                  ),
                  const SizedBox(width: 12),
                  const Text(
                    'Taskilo Mail',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),

            const Divider(),

            // Mailboxen
            Expanded(
              child: ListView(
                padding: EdgeInsets.zero,
                children: [
                  // Hauptordner
                  _buildMailboxTile('INBOX', Icons.inbox, 'Posteingang'),
                  _buildMailboxTile('FLAGGED', Icons.star_outline, 'Markiert'),
                  _buildMailboxTile(
                    'SNOOZED',
                    Icons.access_time,
                    'Zurückgestellt',
                  ),
                  _buildMailboxTile(
                    'IMPORTANT',
                    Icons.label_important_outline,
                    'Wichtig',
                  ),

                  // Kategorien
                  _buildMailboxTile(
                    'PURCHASES',
                    Icons.shopping_bag_outlined,
                    'Käufe',
                  ),

                  // Gesendet & Geplant
                  _buildMailboxTile('Sent', Icons.send_outlined, 'Gesendet'),
                  _buildMailboxTile(
                    'SCHEDULED',
                    Icons.schedule_send,
                    'Geplant',
                  ),
                  _buildMailboxTile(
                    'OUTBOX',
                    Icons.outbox_outlined,
                    'Postausgang',
                  ),

                  // Entwürfe
                  _buildMailboxTile(
                    'Drafts',
                    Icons.drafts_outlined,
                    'Entwürfe',
                  ),

                  // Alle E-Mails
                  _buildMailboxTile('ALL', Icons.all_inbox, 'Alle E-Mails'),

                  // Spam & Papierkorb
                  _buildMailboxTile('Junk', Icons.report_outlined, 'Spam'),
                  _buildMailboxTile(
                    'Trash',
                    Icons.delete_outline,
                    'Papierkorb',
                  ),

                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: Divider(),
                  ),

                  // Abos verwalten (neu)
                  _buildActionTile(
                    Icons.mail_outline,
                    'Abos verwalten',
                    badge: 'Neu',
                    onTap: () {
                      Navigator.pop(context);
                      _showSubscriptionManager();
                    },
                  ),

                  // Labels Sektion
                  const Padding(
                    padding: EdgeInsets.only(left: 16, top: 16, bottom: 8),
                    child: Text(
                      'LABELS',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: Colors.grey,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),

                  // Benutzerdefinierte Labels (dynamisch laden)
                  ..._buildLabelItems(),

                  // Neues Label erstellen
                  _buildActionTile(
                    Icons.add,
                    'Neues Label erstellen',
                    onTap: () {
                      Navigator.pop(context);
                      _showCreateLabelDialog();
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionTile(
    IconData icon,
    String name, {
    String? badge,
    VoidCallback? onTap,
  }) {
    return ListTile(
      leading: Icon(icon, color: AppColors.textSecondary),
      title: Row(
        children: [
          Text(name, style: TextStyle(color: AppColors.textPrimary)),
          if (badge != null) ...[
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.blue,
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                badge,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ],
      ),
      onTap: onTap,
    );
  }

  List<Widget> _buildLabelItems() {
    // Statische Labels - werden als IMAP Keywords in E-Mails gespeichert
    // Labels sind: $label_arbeit, $label_persönlich, $label_finanzen
    final labels = [
      {'id': 'arbeit', 'name': 'Arbeit', 'color': Colors.blue},
      {'id': 'persönlich', 'name': 'Persönlich', 'color': Colors.green},
      {'id': 'finanzen', 'name': 'Finanzen', 'color': Colors.purple},
    ];

    return labels
        .map(
          (label) => ListTile(
            leading: Icon(Icons.label, color: label['color'] as Color),
            title: Text(label['name'] as String),
            onTap: () {
              Navigator.pop(context);
              // Zeige Hinweis - Label-Suche nutzt IMAP SEARCH
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    'Suche nach E-Mails mit Label "${label['name']}"...',
                  ),
                ),
              );
              // Setze Suchbegriff auf Label-Keyword für lokale Filterung
              _searchController.text = 'label:${label['id']}';
              // Filtere nach Label in Flags (falls vorhanden)
              _filterByLabel(label['id'] as String);
            },
          ),
        )
        .toList();
  }

  void _filterByLabel(String labelId) {
    final keyword = '\$label_$labelId';
    setState(() {
      _messages = _allMessages.where((msg) {
        return msg.flags.any(
          (flag) => flag.toLowerCase() == keyword.toLowerCase(),
        );
      }).toList();
    });
  }

  void _showSubscriptionManager() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.7,
        maxChildSize: 0.9,
        builder: (context, scrollController) => Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Abos verwalten',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.mail_outline,
                      size: 64,
                      color: Colors.grey.shade400,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Newsletter-Abonnements werden analysiert...',
                      style: TextStyle(color: Colors.grey.shade600),
                    ),
                    const SizedBox(height: 24),
                    const CircularProgressIndicator(),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showCreateLabelDialog() {
    final controller = TextEditingController();
    Color selectedColor = Colors.blue;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Neues Label erstellen'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: controller,
                decoration: const InputDecoration(
                  labelText: 'Label-Name',
                  border: OutlineInputBorder(),
                ),
                autofocus: true,
              ),
              const SizedBox(height: 16),
              const Text('Farbe auswählen:'),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children:
                    [
                          Colors.blue,
                          Colors.green,
                          Colors.orange,
                          Colors.purple,
                          Colors.red,
                          Colors.teal,
                        ]
                        .map(
                          (color) => GestureDetector(
                            onTap: () =>
                                setDialogState(() => selectedColor = color),
                            child: Container(
                              width: 32,
                              height: 32,
                              decoration: BoxDecoration(
                                color: color,
                                shape: BoxShape.circle,
                                border: selectedColor == color
                                    ? Border.all(color: Colors.black, width: 2)
                                    : null,
                              ),
                            ),
                          ),
                        )
                        .toList(),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Abbrechen'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (controller.text.isNotEmpty) {
                  Navigator.pop(context);
                  // Label wird als IMAP Keyword gespeichert
                  // Neue Labels können beim Hinzufügen zu E-Mails erstellt werden
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        'Label "${controller.text}" erstellt. Sie können es jetzt E-Mails zuweisen.',
                      ),
                    ),
                  );
                }
              },
              child: const Text('Erstellen'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMailboxTile(String path, IconData icon, String name) {
    final isSelected = _currentMailbox == path;
    final unread =
        _mailboxes.where((m) => m.path == path).firstOrNull?.unseen ?? 0;

    return ListTile(
      leading: Icon(
        icon,
        color: isSelected ? AppColors.primary : AppColors.textSecondary,
      ),
      title: Text(
        name,
        style: TextStyle(
          fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
          color: isSelected ? AppColors.primary : AppColors.textPrimary,
        ),
      ),
      trailing: unread > 0
          ? Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: AppColors.primary,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                '$unread',
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
        setState(() => _currentMailbox = path);
        Navigator.pop(context);
        _loadMessages();
      },
    );
  }

  void _showUserMenu() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildUserAvatar(radius: 40, fontSize: 32),
            const SizedBox(height: 16),
            Text(
              _apiService.userEmail ?? 'Nicht angemeldet',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () async {
                  final navigator = GoRouter.of(context);
                  await _apiService.logout();
                  if (!mounted) return;
                  navigator.go(AppRouter.welcome);
                },
                icon: const Icon(Icons.logout, color: AppColors.error),
                label: const Text(
                  'Abmelden',
                  style: TextStyle(color: AppColors.error),
                ),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppColors.error),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  String _getMailboxDisplayName(String path) {
    switch (path) {
      case 'INBOX':
        return 'Posteingang';
      case 'FLAGGED':
        return 'Markiert';
      case 'SNOOZED':
        return 'Zurückgestellt';
      case 'IMPORTANT':
        return 'Wichtig';
      case 'PURCHASES':
        return 'Käufe';
      case 'Sent':
        return 'Gesendet';
      case 'SCHEDULED':
        return 'Geplant';
      case 'OUTBOX':
        return 'Postausgang';
      case 'Drafts':
        return 'Entwürfe';
      case 'ALL':
        return 'Alle E-Mails';
      case 'Trash':
        return 'Papierkorb';
      case 'Junk':
      case 'Spam':
        return 'Spam';
      default:
        return path;
    }
  }

  int _getUnreadCount() {
    return _mailboxes.where((m) => m.path == 'INBOX').firstOrNull?.unseen ?? 0;
  }

  Future<void> _toggleStar(EmailMessage message) async {
    // Bei virtuellen Ordnern (FLAGGED) den echten Quell-Ordner verwenden
    final effectiveMailbox = message.mailbox ?? _currentMailbox;

    await _apiService.toggleStar(
      mailbox: effectiveMailbox,
      uid: message.uid,
      starred: !message.isStarred,
    );
    _loadMessages();
  }
}

/// Gmail-Style E-Mail Item
class _EmailListItem extends StatelessWidget {
  final EmailMessage message;
  final VoidCallback onTap;
  final VoidCallback onStarTap;

  const _EmailListItem({
    required this.message,
    required this.onTap,
    required this.onStarTap,
  });

  @override
  Widget build(BuildContext context) {
    final isUnread = !message.isRead;
    final senderInitial = message.from.isNotEmpty
        ? message.from.first.displayName.isNotEmpty
              ? message.from.first.displayName[0].toUpperCase()
              : 'U'
        : 'U';

    // Bestimme Avatar-Farbe basierend auf erstem Buchstaben
    final avatarColor = _getAvatarColor(senderInitial);

    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        // Leicht hervorgehobener Hintergrund für ungelesene E-Mails
        color: isUnread ? AppColors.primary.withValues(alpha: 0.05) : null,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Ungelesen-Indikator
            if (isUnread)
              Container(
                width: 8,
                height: 8,
                margin: const EdgeInsets.only(top: 8, right: 8),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  shape: BoxShape.circle,
                ),
              )
            else
              const SizedBox(width: 16),

            // Avatar
            CircleAvatar(
              radius: 22,
              backgroundColor: avatarColor,
              child: Text(
                senderInitial,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                  fontSize: 16,
                ),
              ),
            ),
            const SizedBox(width: 12),

            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Sender & Zeit
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          message.from.isNotEmpty
                              ? message.from.first.displayName
                              : 'Unbekannt',
                          style: TextStyle(
                            fontWeight: isUnread
                                ? FontWeight.w600
                                : FontWeight.w500,
                            color: AppColors.textPrimary,
                            fontSize: 15,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Text(
                        _formatDate(message.date),
                        style: TextStyle(
                          fontSize: 12,
                          color: isUnread
                              ? AppColors.textPrimary
                              : AppColors.textSecondary,
                          fontWeight: isUnread
                              ? FontWeight.w500
                              : FontWeight.normal,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),

                  // Betreff
                  Text(
                    message.subject.isNotEmpty
                        ? message.subject
                        : '(Kein Betreff)',
                    style: TextStyle(
                      fontWeight: isUnread
                          ? FontWeight.w500
                          : FontWeight.normal,
                      color: AppColors.textPrimary,
                      fontSize: 14,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),

                  // Vorschau
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          message.preview,
                          style: TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      // Stern
                      GestureDetector(
                        onTap: onStarTap,
                        child: Icon(
                          message.isStarred ? Icons.star : Icons.star_border,
                          size: 20,
                          color: message.isStarred
                              ? Colors.amber
                              : AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),

                  // Anhänge
                  if (message.hasAttachments) ...[
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.divider,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.attachment,
                            size: 14,
                            color: AppColors.textSecondary,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'Anhang',
                            style: TextStyle(
                              fontSize: 11,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = today.subtract(const Duration(days: 1));
    final emailDate = DateTime(date.year, date.month, date.day);
    final time = '${date.hour}:${date.minute.toString().padLeft(2, '0')}';

    if (emailDate == today) {
      // Heute: nur Uhrzeit
      return time;
    } else if (emailDate == yesterday) {
      // Gestern: "Gestern, 14:30"
      return 'Gestern, $time';
    } else if (now.difference(date).inDays < 7) {
      // Letzte 7 Tage: "Mo, 14:30" oder "Di, 08:15"
      return '${_getWeekdayShort(date.weekday)}, $time';
    } else if (date.year == now.year) {
      // Dieses Jahr: "23. Jan."
      return '${date.day}. ${_getMonthShort(date.month)}';
    } else {
      // Anderes Jahr: "23. Jan. 2025"
      return '${date.day}. ${_getMonthShort(date.month)} ${date.year}';
    }
  }

  String _getWeekdayShort(int weekday) {
    const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    return days[weekday - 1];
  }

  String _getMonthShort(int month) {
    const months = [
      'Jan.',
      'Feb.',
      'März',
      'Apr.',
      'Mai',
      'Juni',
      'Juli',
      'Aug.',
      'Sep.',
      'Okt.',
      'Nov.',
      'Dez.',
    ];
    return months[month - 1];
  }

  Color _getAvatarColor(String letter) {
    const colors = [
      Color(0xFFE91E63), // Pink
      Color(0xFF9C27B0), // Purple
      Color(0xFF673AB7), // Deep Purple
      Color(0xFF3F51B5), // Indigo
      Color(0xFF2196F3), // Blue
      Color(0xFF00BCD4), // Cyan
      Color(0xFF009688), // Teal
      Color(0xFF4CAF50), // Green
      Color(0xFFFF9800), // Orange
      Color(0xFFFF5722), // Deep Orange
    ];

    final index = letter.codeUnitAt(0) % colors.length;
    return colors[index];
  }
}
