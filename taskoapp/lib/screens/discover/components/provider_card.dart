import 'package:flutter/material.dart';

class ProviderCard extends StatelessWidget {
  final Map<String, dynamic> provider;

  const ProviderCard({
    super.key,
    required this.provider,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: const Color(0xFF14ad9f).withValues(alpha: 0.2),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Provider Header
            Row(
              children: [
                // Profile Picture
                CircleAvatar(
                  radius: 30,
                  backgroundColor: const Color(0xFF14ad9f).withValues(alpha: 0.1),
                  backgroundImage: provider['profilePictureURL'] != null
                      ? NetworkImage(provider['profilePictureURL'])
                      : null,
                  child: provider['profilePictureURL'] == null
                      ? const Icon(
                          Icons.person,
                          color: Color(0xFF14ad9f),
                          size: 30,
                        )
                      : null,
                ),
                const SizedBox(width: 16),
                
                // Provider Info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        provider['companyName'] ?? provider['name'] ?? 'Unbekannter Anbieter',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (provider['name'] != null && provider['companyName'] != null)
                        Text(
                          provider['name'],
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey.shade600,
                          ),
                        ),
                      if (provider['location'] != null && provider['location'].toString().isNotEmpty)
                        Row(
                          children: [
                            Icon(
                              Icons.location_on,
                              size: 16,
                              color: Colors.grey.shade600,
                            ),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                provider['location'],
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey.shade600,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                    ],
                  ),
                ),
                
                // Price
                if (provider['hourlyRate'] != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFF14ad9f).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      '${provider['hourlyRate']}€/h',
                      style: const TextStyle(
                        color: Color(0xFF14ad9f),
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                  ),
              ],
            ),
            
            // Description
            if (provider['description'] != null && provider['description'].toString().isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(
                provider['description'],
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey.shade700,
                  height: 1.4,
                ),
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
            ],
            
            // Rating and Actions
            const SizedBox(height: 12),
            Row(
              children: [
                // Rating
                if (provider['rating'] != null) ...[
                  Icon(
                    Icons.star,
                    size: 16,
                    color: Colors.amber.shade600,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    provider['rating'].toString(),
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ] else ...[
                  Text(
                    'Noch keine Bewertungen',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade500,
                    ),
                  ),
                ],
                
                const Spacer(),
                
                // Action Buttons
                TextButton(
                  onPressed: () {
                    // TODO: Navigate to provider details
                    debugPrint('View details for provider: ${provider['id']}');
                  },
                  child: const Text(
                    'Details',
                    style: TextStyle(
                      color: Color(0xFF14ad9f),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                
                ElevatedButton(
                  onPressed: () {
                    // TODO: Navigate to booking
                    debugPrint('Book provider: ${provider['id']}');
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF14ad9f),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                    ),
                  ),
                  child: const Text(
                    'Buchen',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
