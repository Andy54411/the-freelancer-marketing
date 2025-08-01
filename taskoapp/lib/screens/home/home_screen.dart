import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/user_model.dart';
import '../../services/auth_service.dart';
import '../../services/taskilo_service.dart';
import '../../services/firebase_functions_service.dart';
import '../../services/time_tracking_service.dart';
import '../../utils/app_theme.dart';
import '../../widgets/booking_widget.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedIndex = 0;
  final PageController _pageController = PageController();

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
    _pageController.animateToPage(
      index,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
  }

  Future<void> _signOut() async {
    final authService = context.read<AuthService>();
    await authService.signOut();
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<TaskiloUser?>();
    
    return Scaffold(
      appBar: AppBar(
        title: Text('Hallo, ${user?.displayName ?? 'Benutzer'}!'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: _signOut,
            tooltip: 'Abmelden',
          ),
        ],
      ),
      body: PageView(
        controller: _pageController,
        onPageChanged: (index) {
          setState(() {
            _selectedIndex = index;
          });
        },
        children: [
          _buildHomePage(user),
          _buildServicesPage(),
          _buildProfilePage(user),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: _onItemTapped,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.work),
            label: 'Services',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person),
            label: 'Profil',
          ),
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
          // Welcome Card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Willkommen bei Taskilo',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    user?.userType == UserType.serviceProvider
                        ? 'Verwalten Sie Ihre Services und finden Sie neue Kunden'
                        : 'Finden Sie den perfekten Service für Ihre Bedürfnisse',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 16),
                  if (user?.userType == UserType.customer)
                    ElevatedButton.icon(
                      onPressed: () => _onItemTapped(1),
                      icon: const Icon(Icons.search),
                      label: const Text('Services entdecken'),
                    )
                  else
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: () => _onItemTapped(2),
                            icon: const Icon(Icons.dashboard),
                            label: const Text('Dashboard'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: _testTimeTracking,
                            icon: const Icon(Icons.timer),
                            label: const Text('Time Tracking'),
                          ),
                        ),
                      ],
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Firebase Functions Status Card
          FutureBuilder<bool>(
            future: FirebaseFunctionsService.testConnection(),
            builder: (context, snapshot) {
              return Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Row(
                    children: [
                      Icon(
                        snapshot.data == true ? Icons.check_circle : Icons.error,
                        color: snapshot.data == true 
                            ? AppTheme.successColor 
                            : AppTheme.errorColor,
                      ),
                      const SizedBox(width: 12),
                      Text(
                        snapshot.data == true 
                            ? 'Firebase Functions verbunden'
                            : 'Firebase Functions nicht verfügbar',
                        style: TextStyle(
                          color: snapshot.data == true 
                              ? AppTheme.successColor 
                              : AppTheme.errorColor,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const Spacer(),
                      if (user?.userType == UserType.serviceProvider)
                        TextButton(
                          onPressed: _checkProviderStatus,
                          child: const Text('Provider Status'),
                        ),
                    ],
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 24),
          
          // Service Categories
          Text(
            'Beliebte Kategorien',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 120,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: TaskiloService.serviceCategories.length,
              itemBuilder: (context, index) {
                final category = TaskiloService.serviceCategories[index];
                return Container(
                  width: 100,
                  margin: const EdgeInsets.only(right: 12),
                  child: Card(
                    child: InkWell(
                      onTap: () {
                        // Navigate to category
                        _onItemTapped(1);
                      },
                      borderRadius: BorderRadius.circular(12),
                      child: Padding(
                        padding: const EdgeInsets.all(8.0),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              _getCategoryIcon(category),
                              size: 32,
                              color: AppTheme.primaryColor,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              category,
                              style: Theme.of(context).textTheme.bodySmall,
                              textAlign: TextAlign.center,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
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
          const SizedBox(height: 24),
          
          // Quick Stats
          if (user?.userType == UserType.serviceProvider) ...[
            Text(
              'Ihre Statistiken',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            FutureBuilder<Map<String, dynamic>>(
              future: _loadProviderAnalytics(),
              builder: (context, snapshot) {
                final analytics = snapshot.data;
                return Row(
                  children: [
                    Expanded(
                      child: Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            children: [
                              Icon(
                                Icons.star,
                                size: 32,
                                color: AppTheme.warningColor,
                              ),
                              const SizedBox(height: 8),
                              Text(
                                user?.profile?.rating?.toStringAsFixed(1) ?? '0.0',
                                style: Theme.of(context).textTheme.headlineSmall,
                              ),
                              Text(
                                'Bewertung',
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            children: [
                              Icon(
                                Icons.check_circle,
                                size: 32,
                                color: AppTheme.successColor,
                              ),
                              const SizedBox(height: 8),
                              Text(
                                '${user?.profile?.completedJobs ?? 0}',
                                style: Theme.of(context).textTheme.headlineSmall,
                              ),
                              Text(
                                'Aufträge',
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            children: [
                              Icon(
                                Icons.euro,
                                size: 32,
                                color: AppTheme.primaryColor,
                              ),
                              const SizedBox(height: 8),
                              Text(
                                '€${analytics?['totalEarnings']?.toStringAsFixed(0) ?? '0'}',
                                style: Theme.of(context).textTheme.headlineSmall,
                              ),
                              Text(
                                'Verdienst',
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
            const SizedBox(height: 24),

            // Time Tracking Widget (nur für Provider)
            _buildTimeTrackingWidget(),
          ] else ...[
            // Quick Actions für Kunden
            Text(
              'Schnelle Aktionen',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: Card(
                    child: InkWell(
                      onTap: () => _showBookingDemo(BookingType.b2c),
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          children: [
                            Icon(
                              Icons.build,
                              size: 32,
                              color: AppTheme.primaryColor,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Handwerker\nbuchen',
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
                Expanded(
                  child: Card(
                    child: InkWell(
                      onTap: () => _showBookingDemo(BookingType.b2b),
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          children: [
                            Icon(
                              Icons.business_center,
                              size: 32,
                              color: AppTheme.primaryColor,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Projekt\nstarten',
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
                Expanded(
                  child: Card(
                    child: InkWell(
                      onTap: () => _showBookingDemo(BookingType.hourly),
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          children: [
                            Icon(
                              Icons.access_time,
                              size: 32,
                              color: AppTheme.primaryColor,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Stunden\nbuchen',
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildServicesPage() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.work,
            size: 64,
            color: AppTheme.textLight,
          ),
          SizedBox(height: 16),
          Text(
            'Services Seite',
            style: TextStyle(
              fontSize: 24,
              color: AppTheme.textSecondary,
            ),
          ),
          SizedBox(height: 8),
          Text(
            'Hier werden bald alle verfügbaren Services angezeigt',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: AppTheme.textLight,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProfilePage(TaskiloUser? user) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        children: [
          // Profile Header
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 50,
                    backgroundColor: AppTheme.primaryColor,
                    backgroundImage: user?.photoURL != null
                        ? NetworkImage(user!.photoURL!)
                        : null,
                    child: user?.photoURL == null
                        ? Text(
                            user?.displayName?.substring(0, 1).toUpperCase() ?? 'U',
                            style: const TextStyle(
                              fontSize: 32,
                              color: Colors.white,
                            ),
                          )
                        : null,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    user?.displayName ?? 'Unbekannter Benutzer',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  Text(
                    user?.email ?? '',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppTheme.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Chip(
                    label: Text(
                      user?.userType == UserType.serviceProvider
                          ? 'Service Anbieter'
                          : 'Kunde',
                    ),
                    backgroundColor: AppTheme.primaryLightColor,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          
          // Profile Actions
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.edit),
                  title: const Text('Profil bearbeiten'),
                  trailing: const Icon(Icons.arrow_forward_ios),
                  onTap: () {
                    // Navigate to edit profile
                  },
                ),
                const Divider(),
                ListTile(
                  leading: const Icon(Icons.settings),
                  title: const Text('Einstellungen'),
                  trailing: const Icon(Icons.arrow_forward_ios),
                  onTap: () {
                    // Navigate to settings
                  },
                ),
                const Divider(),
                ListTile(
                  leading: const Icon(Icons.help),
                  title: const Text('Hilfe & Support'),
                  trailing: const Icon(Icons.arrow_forward_ios),
                  onTap: () {
                    // Navigate to help
                  },
                ),
                const Divider(),
                ListTile(
                  leading: const Icon(Icons.logout, color: AppTheme.errorColor),
                  title: const Text(
                    'Abmelden',
                    style: TextStyle(color: AppTheme.errorColor),
                  ),
                  onTap: _signOut,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  IconData _getCategoryIcon(String category) {
    switch (category.toLowerCase()) {
      case 'handwerk':
        return Icons.build;
      case 'reinigung':
        return Icons.cleaning_services;
      case 'garten':
        return Icons.grass;
      case 'transport':
        return Icons.local_shipping;
      case 'it & technik':
        return Icons.computer;
      case 'design':
        return Icons.design_services;
      case 'beratung':
        return Icons.psychology;
      case 'events':
        return Icons.event;
      default:
        return Icons.work;
    }
  }

  Future<void> _testTimeTracking() async {
    try {
      // Test time tracking functionality
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Time Tracking Status: ${TimeTrackingService.isTracking ? "Aktiv" : "Inaktiv"}'),
          backgroundColor: AppTheme.primaryColor,
        ),
      );
      
      if (!TimeTrackingService.isTracking) {
        await TimeTrackingService.startTracking(
          orderId: 'test-order',
          taskDescription: 'Test Time Tracking Session',
        );
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Time Tracking gestartet'),
              backgroundColor: Color.fromRGBO(76, 175, 80, 1),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Time Tracking Fehler: $e'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    }
  }

  Future<void> _checkProviderStatus() async {
    try {
      final user = context.read<AuthService>().currentUser;
      if (user?.uid == null) return;

      // Use available methods to get provider data
      final orders = await FirebaseFunctionsService.getProviderOrders();
      final accountStatus = await FirebaseFunctionsService.getProviderAccountStatus();
      
      // Calculate basic analytics
      final totalOrders = orders.length;
      final completedOrders = orders.where((o) => o['status'] == 'completed').length;
      
      if (mounted) {
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Provider Status'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Account Status: ${accountStatus['status'] ?? 'Unbekannt'}'),
                Text('Total Aufträge: $totalOrders'),
                Text('Abgeschlossen: $completedOrders'),
                Text('Account ID: ${accountStatus['accountId'] ?? 'N/A'}'),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('OK'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Fehler beim Laden der Analytics: $e'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    }
  }

  Future<Map<String, dynamic>> _loadProviderAnalytics() async {
    try {
      final user = context.read<AuthService>().currentUser;
      if (user?.uid == null) return {};

      // Return mock data for now
      return {
        'totalEarnings': 1250.50,
        'activeOrders': 3,
        'totalRatings': 42,
        'averageRating': 4.7,
      };
    } catch (e) {
      // Log error silently and return empty map
      debugPrint('Error loading provider analytics: $e');
      return {};
    }
  }

  Widget _buildTimeTrackingWidget() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.timer, color: AppTheme.primaryColor),
                const SizedBox(width: 8),
                Text(
                  'Zeit Erfassung',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const Spacer(),
                Switch(
                  value: TimeTrackingService.isTracking,
                  onChanged: (value) async {
                    if (value) {
                      await TimeTrackingService.startTracking(
                        orderId: 'manual-session',
                        taskDescription: 'Manuelle Zeit Erfassung',
                      );
                    } else {
                      await TimeTrackingService.stopTracking();
                    }
                    setState(() {}); // Refresh UI
                  },
                  activeColor: AppTheme.primaryColor,
                ),
              ],
            ),
            const SizedBox(height: 12),
            StreamBuilder<Duration>(
              stream: TimeTrackingService.durationStream,
              builder: (context, snapshot) {
                final duration = snapshot.data ?? Duration.zero;
                final hours = duration.inHours;
                final minutes = duration.inMinutes % 60;
                final seconds = duration.inSeconds % 60;
                
                return Text(
                  '${hours.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}',
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontFamily: 'monospace',
                    color: AppTheme.primaryColor,
                  ),
                );
              },
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () async {
                      await TimeTrackingService.startTracking(
                        orderId: 'quick-session',
                        taskDescription: 'Quick Session',
                      );
                      setState(() {});
                    },
                    icon: const Icon(Icons.play_arrow),
                    label: const Text('Start'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () async {
                      await TimeTrackingService.stopTracking();
                      setState(() {});
                    },
                    icon: const Icon(Icons.stop),
                    label: const Text('Stop'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showBookingDemo(BookingType bookingType) {
    final user = context.read<AuthService>().currentUser;
    if (user == null) return;

    // Create demo provider user
    final demoProvider = TaskiloUser(
      uid: 'demo-provider',
      email: 'demo@taskilo.com',
      displayName: 'Demo Service Provider',
      phone: '+49 123 456789',
      userType: UserType.serviceProvider,
      isVerified: true,
      createdAt: DateTime.now(),
      profile: const UserProfile(
        firstName: 'Demo',
        lastName: 'Provider',
        address: 'Musterstraße 123',
        city: 'Berlin',
        postalCode: '12345',
        country: 'Deutschland',
        bio: 'Professioneller Service Provider',
        rating: 4.8,
        completedJobs: 15,
        isAvailable: true,
      ),
    );

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.9,
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: BookingWidget(
          provider: demoProvider,
          serviceTitle: _getServiceTitle(bookingType),
          serviceDescription: _getServiceDescription(bookingType),
          bookingType: bookingType,
        ),
      ),
    );
  }

  String _getServiceTitle(BookingType type) {
    switch (type) {
      case BookingType.b2c:
        return 'Handwerker Service';
      case BookingType.b2b:
        return 'Business Projekt';
      case BookingType.hourly:
        return 'Stunden-Abrechnung';
    }
  }

  String _getServiceDescription(BookingType type) {
    switch (type) {
      case BookingType.b2c:
        return 'Professioneller Handwerker Service mit Festpreis-Garantie';
      case BookingType.b2b:
        return 'Umfassendes Business-Projekt mit Meilenstein-basierter Abrechnung';
      case BookingType.hourly:
        return 'Flexible Stunden-Abrechnung für kleinere Aufgaben';
    }
  }
}
