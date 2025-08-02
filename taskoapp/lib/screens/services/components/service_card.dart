import 'package:flutter/material.dart';
import '../service_details_screen.dart';

class ServiceCard extends StatefulWidget {
  final Map<String, dynamic> service;

  const ServiceCard({
    super.key,
    required this.service,
  });

  @override
  State<ServiceCard> createState() => _ServiceCardState();
}

class _ServiceCardState extends State<ServiceCard> {
  bool _isFavorite = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        // Navigate to service details
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => ServiceDetailsScreen(service: widget.service),
          ),
        );
      },
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Service Image
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
              child: Container(
                height: 120,
                width: double.infinity,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      const Color(0xFF14ad9f).withValues(alpha: 0.8),
                      const Color(0xFF0f9d84).withValues(alpha: 0.9),
                    ],
                  ),
                ),
                child: Stack(
                  children: [
                    // Placeholder für Service-Bild
                    Center(
                      child: Icon(
                        _getServiceIcon(),
                        size: 48,
                        color: Colors.white.withValues(alpha: 0.8),
                      ),
                    ),
                    
                    // Pro Badge
                    if (_isPro())
                      Positioned(
                        top: 8,
                        right: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.orange,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Text(
                            'PRO',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    
                    // Favorit Button
                    Positioned(
                      top: 8,
                      left: 8,
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          shape: BoxShape.circle,
                        ),
                        child: IconButton(
                          icon: Icon(
                            _isFavorite ? Icons.favorite : Icons.favorite_border,
                            size: 20,
                            color: _isFavorite 
                              ? Colors.red 
                              : Colors.white.withValues(alpha: 0.8),
                          ),
                          onPressed: () {
                            // Toggle favorite
                            setState(() {
                              _isFavorite = !_isFavorite;
                            });
                            // Show feedback
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(_isFavorite 
                                  ? 'Zu Favoriten hinzugefügt' 
                                  : 'Aus Favoriten entfernt'),
                                duration: const Duration(seconds: 2),
                                backgroundColor: const Color(0xFF14ad9f),
                              ),
                            );
                          },
                          padding: const EdgeInsets.all(4),
                          constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            
            // Service Content
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Provider Info
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 10, // Kleinerer Radius
                          backgroundColor: const Color(0xFF14ad9f).withValues(alpha: 0.2),
                          backgroundImage: (widget.service['profilePictureURL'] != null && 
                                          widget.service['profilePictureURL'].toString().isNotEmpty)
                              ? NetworkImage(widget.service['profilePictureURL'])
                              : null,
                          child: (widget.service['profilePictureURL'] == null || 
                                  widget.service['profilePictureURL'].toString().isEmpty)
                              ? Text(
                                  _getProviderInitials(),
                                  style: const TextStyle(
                                    fontSize: 8, // Kleinere Schrift
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF14ad9f),
                                  ),
                                )
                              : null,
                        ),
                        const SizedBox(width: 6), // Kleinerer Abstand
                        Expanded(
                          child: Text(
                            widget.service['providerName'] ?? 'Unbekannter Anbieter',
                            style: TextStyle(
                              fontSize: 11, // Kleinere Schrift
                              color: Colors.grey.shade600,
                              fontWeight: FontWeight.w500,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    
                    const SizedBox(height: 6), // Kleinerer Abstand
                    
                    // Service Title
                    Text(
                      widget.service['title'] ?? 'Service-Titel',
                      style: const TextStyle(
                        fontSize: 13, // Kleinere Schrift
                        fontWeight: FontWeight.w600,
                        color: Colors.black87,
                        height: 1.1,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    
                    // Subcategory
                    if (widget.service['subcategoryName'] != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        widget.service['subcategoryName'],
                        style: const TextStyle(
                          fontSize: 10, // Kleinere Schrift
                          color: Color(0xFF14ad9f),
                          fontWeight: FontWeight.w500,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    
                    const Spacer(),
                    
                    // Rating und Reviews
                    Row(
                      children: [
                        Icon(
                          Icons.star,
                          size: 12, // Kleineres Icon
                          color: Colors.amber.shade600,
                        ),
                        const SizedBox(width: 2), // Kleinerer Abstand
                        Text(
                          '${widget.service['rating'] ?? 4.8}',
                          style: const TextStyle(
                            fontSize: 11, // Kleinere Schrift
                            fontWeight: FontWeight.w600,
                            color: Colors.black87,
                          ),
                        ),
                        const SizedBox(width: 2), // Kleinerer Abstand
                        Text(
                          '(${widget.service['reviewCount'] ?? 127})',
                          style: TextStyle(
                            fontSize: 11, // Kleinere Schrift
                            color: Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ),
                    
                    const SizedBox(height: 4), // Kleinerer Abstand
                    
                    // Preis
                    Row(
                      children: [
                        Text(
                          'Ab ',
                          style: TextStyle(
                            fontSize: 10, // Kleinere Schrift
                            color: Colors.grey.shade600,
                          ),
                        ),
                        Text(
                          '€${widget.service['price'] ?? 49}',
                          style: const TextStyle(
                            fontSize: 12, // Kleinere Schrift
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF14ad9f),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  IconData _getServiceIcon() {
    // Dynamisches Icon basierend auf Service-Typ
    final title = (widget.service['title'] ?? '').toLowerCase();
    if (title.contains('logo') || title.contains('design')) return Icons.palette;
    if (title.contains('web') || title.contains('website')) return Icons.web;
    if (title.contains('app') || title.contains('mobile')) return Icons.phone_android;
    if (title.contains('text') || title.contains('schreiben')) return Icons.edit;
    if (title.contains('video') || title.contains('film')) return Icons.videocam;
    if (title.contains('photo') || title.contains('foto')) return Icons.camera_alt;
    return Icons.work; // Default
  }

  bool _isPro() {
    return widget.service['isPro'] == true || widget.service['level'] == 'pro';
  }

  String _getProviderInitials() {
    final name = widget.service['providerName'] ?? 'U';
    final words = name.split(' ');
    if (words.length >= 2) {
      return '${words[0][0]}${words[1][0]}'.toUpperCase();
    }
    return name[0].toUpperCase();
  }
}
