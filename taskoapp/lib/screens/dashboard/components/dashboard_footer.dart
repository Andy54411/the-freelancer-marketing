import 'package:flutter/material.dart';
import '../../../utils/app_theme.dart';

class DashboardFooter extends StatelessWidget {
  const DashboardFooter({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 32),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(16),
          topRight: Radius.circular(16),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Hauptbereich mit Links
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Support & Hilfe
                Expanded(
                  flex: 2,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Support & Hilfe',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: AppTheme.primaryColor,
                        ),
                      ),
                      const SizedBox(height: 16),
                      _buildFooterLink(
                        context,
                        'FAQ & Hilfe',
                        Icons.help_outline,
                        () {
                          // Navigation zur Hilfe-Seite
                        },
                      ),
                      const SizedBox(height: 8),
                      _buildFooterLink(
                        context,
                        'Kontakt & Support',
                        Icons.support_agent,
                        () {
                          // Navigation zum Support
                        },
                      ),
                      const SizedBox(height: 8),
                      _buildFooterLink(
                        context,
                        'Video-Tutorials',
                        Icons.play_circle_outline,
                        () {
                          // Navigation zu Tutorials
                        },
                      ),
                    ],
                  ),
                ),
                
                // Services & Aufträge
                Expanded(
                  flex: 2,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Services & Aufträge',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: AppTheme.primaryColor,
                        ),
                      ),
                      const SizedBox(height: 16),
                      _buildFooterLink(
                        context,
                        'Neuen Auftrag erstellen',
                        Icons.add_circle_outline,
                        () {
                          Navigator.of(context).pushNamed('/home');
                        },
                      ),
                      const SizedBox(height: 8),
                      _buildFooterLink(
                        context,
                        'Meine Aufträge',
                        Icons.list_alt,
                        () {
                          // Navigation zu Aufträgen
                        },
                      ),
                      const SizedBox(height: 8),
                      _buildFooterLink(
                        context,
                        'Favoriten',
                        Icons.favorite_outline,
                        () {
                          // Navigation zu Favoriten
                        },
                      ),
                    ],
                  ),
                ),
                
                // Konto & Einstellungen
                Expanded(
                  flex: 2,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Konto & Einstellungen',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: AppTheme.primaryColor,
                        ),
                      ),
                      const SizedBox(height: 16),
                      _buildFooterLink(
                        context,
                        'Profil bearbeiten',
                        Icons.person_outline,
                        () {
                          // Navigation zum Profil
                        },
                      ),
                      const SizedBox(height: 8),
                      _buildFooterLink(
                        context,
                        'Zahlungsmethoden',
                        Icons.payment,
                        () {
                          // Navigation zu Zahlungen
                        },
                      ),
                      const SizedBox(height: 8),
                      _buildFooterLink(
                        context,
                        'Benachrichtigungen',
                        Icons.notifications,
                        () {
                          // Navigation zu Einstellungen
                        },
                      ),
                    ],
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 24),
            
            // Trennlinie
            Divider(
              color: Colors.grey[300],
              thickness: 1,
            ),
            
            const SizedBox(height: 16),
            
            // Unterer Bereich mit App-Info und Links
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // App-Logo und Version
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            color: AppTheme.primaryColor,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(
                            Icons.handyman,
                            color: Colors.white,
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Taskilo',
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: AppTheme.primaryColor,
                              ),
                            ),
                            Text(
                              'Version 1.0.0',
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: AppTheme.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
                
                // Rechtliche Links
                Row(
                  children: [
                    TextButton(
                      onPressed: () {
                        // Datenschutz
                      },
                      child: Text(
                        'Datenschutz',
                        style: TextStyle(
                          color: AppTheme.textSecondary,
                          fontSize: 12,
                        ),
                      ),
                    ),
                    Text(
                      '•',
                      style: TextStyle(
                        color: AppTheme.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                    TextButton(
                      onPressed: () {
                        // AGB
                      },
                      child: Text(
                        'AGB',
                        style: TextStyle(
                          color: AppTheme.textSecondary,
                          fontSize: 12,
                        ),
                      ),
                    ),
                    Text(
                      '•',
                      style: TextStyle(
                        color: AppTheme.textSecondary,
                        fontSize: 12,
                      ),
                    ),
                    TextButton(
                      onPressed: () {
                        // Impressum
                      },
                      child: Text(
                        'Impressum',
                        style: TextStyle(
                          color: AppTheme.textSecondary,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
            
            const SizedBox(height: 8),
            
            // Copyright
            Center(
              child: Text(
                '© 2024 Taskilo. Alle Rechte vorbehalten.',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppTheme.textSecondary,
                  fontSize: 11,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFooterLink(
    BuildContext context,
    String title,
    IconData icon,
    VoidCallback onTap,
  ) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
        child: Row(
          children: [
            Icon(
              icon,
              size: 16,
              color: AppTheme.textSecondary,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                title,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppTheme.textSecondary,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
