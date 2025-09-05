import 'package:flutter/material.dart';

class ServiceInfoCard extends StatelessWidget {
  final Map<String, dynamic> service;
  final double? radius;
  final EdgeInsets? padding;

  const ServiceInfoCard({
    super.key,
    required this.service,
    this.radius = 25,
    this.padding = const EdgeInsets.all(16),
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            spreadRadius: 0,
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      padding: padding,
      child: Row(
        children: [
          // Service Avatar
          CircleAvatar(
            radius: radius,
            backgroundColor: const Color(0xFF14ad9f),
            backgroundImage: _hasValidImageUrl()
                ? NetworkImage(_getImageUrl())
                : null,
            child: !_hasValidImageUrl()
                ? const Icon(Icons.person, color: Colors.white)
                : null,
          ),
          
          const SizedBox(width: 12),
          
          // Service Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  service['displayName'] ?? 
                  service['providerName'] ?? 
                  service['companyName'] ?? 
                  'Service Anbieter',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Colors.black87,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  service['category'] ?? 
                  service['title'] ?? 
                  'Service',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey[600],
                  ),
                ),
                if (service['rating'] != null) ...[
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.star, color: Colors.amber, size: 16),
                      const SizedBox(width: 4),
                      Text(
                        '${service['rating']} (${service['reviewCount'] ?? 0} Bewertungen)',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Helper Methods für sichere Bildanzeige
  bool _hasValidImageUrl() {
    final imageUrl = _getImageUrl();
    return imageUrl.isNotEmpty && 
           !imageUrl.startsWith('blob:') && 
           (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'));
  }

  String _getImageUrl() {
    // Priorität: photoURL > profilePictureURL > logoURL > image
    final photoUrl = service['photoURL']?.toString() ?? '';
    if (photoUrl.isNotEmpty && !photoUrl.startsWith('blob:')) {
      return photoUrl;
    }
    
    final profilePicture = service['profilePictureURL']?.toString() ?? '';
    if (profilePicture.isNotEmpty && !profilePicture.startsWith('blob:')) {
      return profilePicture;
    }
    
    final logoUrl = service['logoURL']?.toString() ?? '';
    if (logoUrl.isNotEmpty && !logoUrl.startsWith('blob:')) {
      return logoUrl;
    }
    
    final image = service['image']?.toString() ?? '';
    if (image.isNotEmpty && !image.startsWith('blob:')) {
      return image;
    }
    
    return '';
  }
}
