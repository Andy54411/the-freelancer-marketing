import 'package:flutter/material.dart';

class ServiceHeader extends StatelessWidget {
  final String subcategory;
  final String? category;
  final VoidCallback onBack;

  const ServiceHeader({
    super.key,
    required this.subcategory,
    this.category,
    required this.onBack,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Navigation Row
          Row(
            children: [
              IconButton(
                onPressed: onBack,
                icon: const Icon(Icons.arrow_back, color: Color(0xFF14ad9f)),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
              const SizedBox(width: 8),
              if (category != null) ...[
                Text(
                  category!,
                  style: TextStyle(
                    color: Colors.grey.shade600,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(width: 4),
                Icon(
                  Icons.chevron_right,
                  size: 16,
                  color: Colors.grey.shade400,
                ),
                const SizedBox(width: 4),
              ],
              Expanded(
                child: Text(
                  subcategory,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF14ad9f),
                  ),
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 16),
          
          // Title und Description
          Text(
            '$subcategory Services',
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          
          const SizedBox(height: 8),
          
          Text(
            'Finde die besten $subcategory Experten für dein Projekt',
            style: TextStyle(
              fontSize: 16,
              color: Colors.grey.shade600,
              height: 1.4,
            ),
          ),
          
          const SizedBox(height: 16),
          
          // Stats Row
          Row(
            children: [
              _buildStatItem(Icons.verified, '1,000+', 'Verifizierte Experten'),
              const SizedBox(width: 24),
              _buildStatItem(Icons.star, '4.9', 'Durchschnittsbewertung'),
              const SizedBox(width: 24),
              _buildStatItem(Icons.access_time, '24h', 'Antwortzeit'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem(IconData icon, String value, String label) {
    return Row(
      children: [
        Icon(
          icon,
          size: 20,
          color: const Color(0xFF14ad9f),
        ),
        const SizedBox(width: 8),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              value,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey.shade600,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
