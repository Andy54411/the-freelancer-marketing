import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/user_model.dart';
import '../../utils/app_theme.dart';
import '../../services/auth_service.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<TaskiloUser?>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          PopupMenuButton<String>(
            onSelected: (value) async {
              if (value == 'logout') {
                final authService = context.read<AuthService>();
                await authService.signOut();
                if (context.mounted) {
                  Navigator.of(context).pushReplacementNamed('/');
                }
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'logout',
                child: Row(
                  children: [
                    Icon(Icons.logout, color: Colors.red),
                    SizedBox(width: 8),
                    Text('Abmelden'),
                  ],
                ),
              ),
            ],
            icon: const Icon(Icons.more_vert),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Dashboard Header
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 30,
                      backgroundColor: AppTheme.primaryColor,
                      backgroundImage: user?.photoURL != null
                          ? NetworkImage(user!.photoURL!)
                          : null,
                      child: user?.photoURL == null
                          ? Text(
                              user?.displayName?.substring(0, 1).toUpperCase() ?? 'U',
                              style: const TextStyle(
                                fontSize: 20,
                                color: Colors.white,
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
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          Text(
                            user?.userType == UserType.serviceProvider
                                ? 'Service Anbieter'
                                : 'Kunde',
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: AppTheme.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (user?.userType == UserType.serviceProvider)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: user?.profile?.isAvailable == true
                              ? AppTheme.successColor
                              : AppTheme.errorColor,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Text(
                          user?.profile?.isAvailable == true
                              ? 'Verfügbar'
                              : 'Nicht verfügbar',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            if (user?.userType == UserType.serviceProvider) ...[
              // Service Provider Dashboard
              Text(
                'Anbieter Statistiken',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 16),
              
              // Stats Grid
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                children: [
                  _buildStatCard(
                    context,
                    'Bewertung',
                    user?.profile?.rating?.toStringAsFixed(1) ?? '0.0',
                    Icons.star,
                    AppTheme.warningColor,
                  ),
                  _buildStatCard(
                    context,
                    'Aufträge',
                    (user?.profile?.completedJobs ?? 0).toString(),
                    Icons.check_circle,
                    AppTheme.successColor,
                  ),
                  _buildStatCard(
                    context,
                    'Services',
                    '${user?.profile?.skills?.length ?? 0}',
                    Icons.work,
                    AppTheme.primaryColor,
                  ),
                  _buildStatCard(
                    context,
                    'Status',
                    user?.profile?.isAvailable == true ? 'Aktiv' : 'Inaktiv',
                    Icons.circle,
                    user?.profile?.isAvailable == true
                        ? AppTheme.successColor
                        : AppTheme.errorColor,
                  ),
                ],
              ),
              const SizedBox(height: 24),
              
              // Quick Actions
              Text(
                'Schnellaktionen',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 16),
              Card(
                child: Column(
                  children: [
                    ListTile(
                      leading: const Icon(Icons.edit),
                      title: const Text('Profil bearbeiten'),
                      subtitle: const Text('Services und Informationen aktualisieren'),
                      trailing: const Icon(Icons.arrow_forward_ios),
                      onTap: () {
                        // Navigate to edit profile
                      },
                    ),
                    const Divider(),
                    ListTile(
                      leading: Icon(
                        user?.profile?.isAvailable == true
                            ? Icons.pause_circle
                            : Icons.play_circle,
                      ),
                      title: Text(
                        user?.profile?.isAvailable == true
                            ? 'Verfügbarkeit pausieren'
                            : 'Verfügbarkeit aktivieren',
                      ),
                      subtitle: Text(
                        user?.profile?.isAvailable == true
                            ? 'Keine neuen Anfragen erhalten'
                            : 'Neue Anfragen erhalten',
                      ),
                      trailing: const Icon(Icons.arrow_forward_ios),
                      onTap: () {
                        // Toggle availability
                      },
                    ),
                    const Divider(),
                    ListTile(
                      leading: const Icon(Icons.analytics),
                      title: const Text('Detaillierte Statistiken'),
                      subtitle: const Text('Vollständige Leistungsübersicht'),
                      trailing: const Icon(Icons.arrow_forward_ios),
                      onTap: () {
                        // Navigate to analytics
                      },
                    ),
                  ],
                ),
              ),
            ] else ...[
              // Customer Dashboard
              Text(
                'Meine Aktivitäten',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 16),
              
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      Icon(
                        Icons.search,
                        size: 64,
                        color: AppTheme.textLight,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Keine Aktivitäten',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Hier werden Ihre gebuchten Services und Anfragen angezeigt',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppTheme.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () {
                          Navigator.of(context).pushNamed('/home');
                        },
                        child: const Text('Services entdecken'),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard(
    BuildContext context,
    String title,
    String value,
    IconData icon,
    Color color,
  ) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 32,
              color: color,
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                color: color,
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              title,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: AppTheme.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
