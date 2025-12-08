import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../models/user_model.dart';
import '../../utils/colors.dart';
import '../dashboard/dashboard_layout.dart';
import '../support/support_screen.dart';
import 'edit_profile_screen.dart';
import '../jobs/my_applications_screen.dart';

/// Profile Screen
/// Zeigt Benutzerinformationen und Einstellungen
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  bool _isLoading = false;

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
          title: 'Profil',
          useGradientBackground: true,
          showBackButton: true,
          onBackPressed: () => Navigator.pop(context),
          showBottomNavigation: false,
          body: _buildProfileContent(user),
        );
      },
    );
  }

  Widget _buildProfileContent(TaskiloUser user) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Profile Header
          Container(
            margin: const EdgeInsets.only(bottom: 20),
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.1),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Column(
              children: [
                // Avatar
                CircleAvatar(
                  radius: 40,
                  backgroundColor: TaskiloColors.primary,
                  backgroundImage: user.photoURL != null
                      ? NetworkImage(user.photoURL!)
                      : null,
                  child: user.photoURL == null
                      ? Text(
                          _getInitial(user),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 32,
                            fontWeight: FontWeight.bold,
                          ),
                        )
                      : null,
                ),
                const SizedBox(height: 16),

                // Name
                Text(
                  _getDisplayName(user),
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),

                // User Type Badge
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: TaskiloColors.primary.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: TaskiloColors.primary),
                  ),
                  child: Text(
                    _getUserTypeDisplayText(user.userType),
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                ),

                const SizedBox(height: 16),

                // Edit Profile Button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () => _navigateToEditProfile(user),
                    icon: const Icon(Icons.edit, size: 20),
                    label: const Text(
                      'Profil bearbeiten',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: TaskiloColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 2,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Account Information
          _buildSectionCard(
            title: 'Account-Informationen',
            icon: Icons.person_outline,
            children: [
              _buildInfoRow('E-Mail', user.email),
              _buildInfoRow('Benutzer-ID', user.uid),
              _buildInfoRow(
                'Benutzertyp',
                _getUserTypeDisplayText(user.userType),
              ),
              _buildInfoRow('Erstellt am', _formatDate(user.createdAt)),
            ],
          ),

          const SizedBox(height: 20),

          // Career Section
          _buildSectionCard(
            title: 'Karriere',
            icon: Icons.work_outline,
            children: [
              _buildActionRow(
                'Meine Bewerbungen',
                Icons.assignment_ind_outlined,
                () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const MyApplicationsScreen(),
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 20),

          // App Settings
          _buildSectionCard(
            title: 'Einstellungen',
            icon: Icons.settings_outlined,
            children: [
              _buildActionRow(
                'Benachrichtigungen',
                Icons.notifications_outlined,
                () => _showNotImplemented(),
              ),
              _buildActionRow(
                'Datenschutz',
                Icons.privacy_tip_outlined,
                () => _showNotImplemented(),
              ),
              _buildActionRow(
                'Hilfe & Support',
                Icons.help_outline,
                () => _navigateToSupport(),
              ),
              _buildActionRow(
                'Über die App',
                Icons.info_outline,
                () => _showAboutDialog(),
              ),
            ],
          ),

          const SizedBox(height: 20),

          // Logout Button
          Container(
            width: double.infinity,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.red.shade300, width: 2),
            ),
            child: OutlinedButton.icon(
              onPressed: _isLoading ? null : _handleLogout,
              icon: _isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.red,
                      ),
                    )
                  : const Icon(Icons.logout, size: 20),
              label: Text(
                _isLoading ? 'Wird abgemeldet...' : 'Abmelden',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.red.shade300,
                backgroundColor: Colors.red.shade50,
                side: BorderSide.none,
                padding: const EdgeInsets.symmetric(vertical: 18),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionCard({
    required String title,
    required IconData icon,
    required List<Widget> children,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: Colors.white, size: 24),
              const SizedBox(width: 8),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ...children,
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              '$label:',
              style: TextStyle(
                fontSize: 14,
                color: Colors.white.withValues(alpha: 0.8),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionRow(String title, IconData icon, VoidCallback onTap) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(8)),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(8),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
            child: Row(
              children: [
                Icon(icon, color: Colors.white, size: 20),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(fontSize: 14, color: Colors.white),
                  ),
                ),
                Icon(
                  Icons.chevron_right,
                  color: Colors.white.withValues(alpha: 0.6),
                  size: 20,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _getUserTypeDisplayText(UserType userType) {
    switch (userType) {
      case UserType.customer:
        return 'Kunde';
      case UserType.serviceProvider:
        return 'Anbieter';
      case UserType.admin:
        return 'Administrator';
    }
  }

  String _getDisplayName(TaskiloUser user) {
    if (user.displayName?.isNotEmpty == true) {
      return user.displayName!;
    }
    return user.email;
  }

  String _getInitial(TaskiloUser user) {
    final name = _getDisplayName(user);
    return name.isNotEmpty ? name.substring(0, 1).toUpperCase() : 'U';
  }

  String _formatDate(DateTime? date) {
    if (date == null) return 'Unbekannt';
    return '${date.day}.${date.month}.${date.year}';
  }

  void _showNotImplemented() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Diese Funktion wird bald verfügbar sein'),
        backgroundColor: TaskiloColors.primary,
      ),
    );
  }

  void _showAboutDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Über Taskilo'),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Taskilo App'),
            SizedBox(height: 8),
            Text('Version: 1.0.0'),
            SizedBox(height: 8),
            Text('Eine Plattform für Services und Dienstleistungen'),
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

  Future<void> _handleLogout() async {
    setState(() => _isLoading = true);

    try {
      await _auth.signOut();

      if (mounted) {
        // Navigate to login screen and clear stack
        Navigator.of(
          context,
        ).pushNamedAndRemoveUntil('/login', (route) => false);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Fehler beim Abmelden: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _navigateToEditProfile(TaskiloUser user) async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => EditProfileScreen(user: user)),
    );

    // Wenn der Benutzer vom Edit Screen zurückkommt, aktualisiere das UI
    if (result != null && mounted) {
      setState(() {
        // Trigger rebuild to show updated profile data
      });
    }
  }

  void _navigateToSupport() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const SupportScreen()),
    );
  }
}
