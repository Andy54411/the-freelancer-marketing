import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../models/user_model.dart';
import '../../../services/auth_service.dart';
import '../dashboard_layout.dart';
import 'my_orders_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final PageController _pageController = PageController();

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _signOut() async {
    final authService = context.read<AuthService>();
    await authService.signOut();
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<TaskiloUser?>();
    
    // Wenn User ausgeloggt ist, zeige Loading oder navigiere zurück
    if (user == null) {
      debugPrint('HOMESCREEN: User ist NULL - sollte zur Startseite');
      // Zurück zur AuthWrapper, die dann DiscoverScreen zeigt
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Navigator.of(context).pushNamedAndRemoveUntil(
          '/',
          (route) => false,
        );
      });
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }
    
    return DashboardLayout(
      title: 'Willkommen, ${user.displayName ?? 'Benutzer'}!',
      useGradientBackground: true,
      showFooter: false, // PageView braucht keine ScrollView
      actions: [
        IconButton(
          icon: const Icon(Icons.logout, color: Colors.white),
          onPressed: _signOut,
        ),
      ],
      body: PageView(
        controller: _pageController,
        children: [
          _buildHomePage(user),
          _buildServicesPage(),
          _buildProfilePage(user),
        ],
      ),
    );
  }

  Widget _buildHomePage(TaskiloUser? user) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Welcome Card mit Glasmorphismus-Effekt
          DashboardCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Dashboard Übersicht',
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    shadows: [
                      Shadow(
                        color: Colors.black26,
                        offset: Offset(0, 1),
                        blurRadius: 2,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Hier ist Ihr persönlicher Dashboard-Bereich.',
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.white.withValues(alpha: 0.9),
                  ),
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 20),
          
          // Schnellzugriff Text mit weißer Schrift
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              'Schnellzugriff',
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Colors.white,
                shadows: [
                  Shadow(
                    color: Colors.black26,
                    offset: Offset(0, 1),
                    blurRadius: 2,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            mainAxisSpacing: 16,
            crossAxisSpacing: 16,
            childAspectRatio: 1.5,
            children: [
              _buildQuickActionCard(
                'Neuer Auftrag',
                Icons.add_circle,
                () {
                  Navigator.of(context).pushNamed('/home');
                },
              ),
              _buildQuickActionCard(
                'Meine Aufträge',
                Icons.list_alt,
                () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (context) => const MyOrdersScreen(),
                    ),
                  );
                },
              ),
              _buildQuickActionCard(
                'Nachrichten',
                Icons.message,
                () {
                  // Navigation zu Nachrichten
                },
              ),
              _buildQuickActionCard(
                'Einstellungen',
                Icons.settings,
                () {
                  // Navigation zu Einstellungen
                },
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActionCard(String title, IconData icon, VoidCallback onTap) {
    return DashboardCard(
      margin: EdgeInsets.zero,
      onTap: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            icon,
            size: 32,
            color: Colors.white,
          ),
          const SizedBox(height: 8),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildServicesPage() {
    return Center(
      child: DashboardCard(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.work,
              size: 64,
              color: Colors.white.withValues(alpha: 0.8),
            ),
            const SizedBox(height: 16),
            const Text(
              'Services',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Hier werden die verfügbaren Services angezeigt',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                color: Colors.white.withValues(alpha: 0.9),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProfilePage(TaskiloUser? user) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Profile Header mit Glasmorphismus
          DashboardCard(
            child: Row(
              children: [
                CircleAvatar(
                  radius: 40,
                  backgroundColor: Colors.white.withValues(alpha: 0.2),
                  backgroundImage: user?.photoURL != null
                      ? NetworkImage(user!.photoURL!)
                      : null,
                  child: user?.photoURL == null
                      ? Text(
                          user?.displayName?.substring(0, 1).toUpperCase() ?? 'U',
                          style: const TextStyle(
                            fontSize: 24,
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        )
                      : null,
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user?.displayName ?? 'Unbekannter Benutzer',
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        user?.email ?? '',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.white.withValues(alpha: 0.8),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 20),
          
          // Profile Options Text
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              'Profil-Optionen',
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Colors.white,
                shadows: [
                  Shadow(
                    color: Colors.black26,
                    offset: Offset(0, 1),
                    blurRadius: 2,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          
          _buildProfileOption(
            'Profil bearbeiten',
            Icons.edit,
            () {
              // Navigation zu Profil bearbeiten
            },
          ),
          _buildProfileOption(
            'Zahlungsmethoden',
            Icons.payment,
            () {
              // Navigation zu Zahlungsmethoden
            },
          ),
          _buildProfileOption(
            'Benachrichtigungen',
            Icons.notifications,
            () {
              // Navigation zu Benachrichtigungen
            },
          ),
          _buildProfileOption(
            'Hilfe & Support',
            Icons.help,
            () {
              // Navigation zu Hilfe
            },
          ),
        ],
      ),
    );
  }

  Widget _buildProfileOption(String title, IconData icon, VoidCallback onTap) {
    return DashboardCard(
      margin: const EdgeInsets.only(bottom: 8, left: 16, right: 16),
      onTap: onTap,
      child: Row(
        children: [
          Icon(icon, color: Colors.white),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              title,
              style: const TextStyle(
                fontSize: 16,
                color: Colors.white,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Icon(Icons.chevron_right, color: Colors.white.withValues(alpha: 0.7)),
        ],
      ),
    );
  }
}
