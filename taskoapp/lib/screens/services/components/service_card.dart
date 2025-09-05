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
                    // Echtes Provider-Bild (Banner oder Profile)
                    if (_hasValidImage())
                      Positioned.fill(
                        child: Image.network(
                          _getProviderImage(),
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) {
                            return Center(
                              child: Icon(
                                _getServiceIcon(),
                                size: 48,
                                color: Colors.white.withValues(alpha: 0.8),
                              ),
                            );
                          },
                        ),
                      )
                    else
                      // Fallback Icon wenn kein Bild verfügbar
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
                padding: const EdgeInsets.all(8), // Reduziertes Padding
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Provider Info - kompakter
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 8, // Noch kleinerer Radius
                          backgroundColor: const Color(0xFF14ad9f).withValues(alpha: 0.2),
                          backgroundImage: (widget.service['profilePictureURL'] != null && 
                                          widget.service['profilePictureURL'].toString().isNotEmpty &&
                                          widget.service['profilePictureURL'].toString().startsWith('http'))
                              ? NetworkImage(widget.service['profilePictureURL'])
                              : (widget.service['logoURL'] != null && 
                                 widget.service['logoURL'].toString().isNotEmpty &&
                                 widget.service['logoURL'].toString().startsWith('http'))
                                  ? NetworkImage(widget.service['logoURL'])
                                  : (widget.service['image'] != null && 
                                     widget.service['image'].toString().isNotEmpty &&
                                     widget.service['image'].toString().startsWith('http'))
                                      ? NetworkImage(widget.service['image'])
                                      : null,
                          child: (widget.service['profilePictureURL'] == null || 
                                  widget.service['profilePictureURL'].toString().isEmpty ||
                                  !widget.service['profilePictureURL'].toString().startsWith('http')) &&
                                 (widget.service['logoURL'] == null || 
                                  widget.service['logoURL'].toString().isEmpty ||
                                  !widget.service['logoURL'].toString().startsWith('http')) &&
                                 (widget.service['image'] == null || 
                                  widget.service['image'].toString().isEmpty ||
                                  !widget.service['image'].toString().startsWith('http'))
                              ? Text(
                                  _getProviderInitials(),
                                  style: const TextStyle(
                                    fontSize: 7, // Noch kleinere Schrift
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF14ad9f),
                                  ),
                                )
                              : null,
                        ),
                        const SizedBox(width: 4), // Noch kleinerer Abstand
                        Expanded(
                          child: Text(
                            widget.service['providerName'] ?? widget.service['companyName'] ?? 'Unbekannter Anbieter',
                            style: TextStyle(
                              fontSize: 10, // Noch kleinere Schrift
                              color: Colors.grey.shade600,
                              fontWeight: FontWeight.w500,
                            ),
                            overflow: TextOverflow.ellipsis,
                            maxLines: 1,
                          ),
                        ),
                      ],
                    ),
                    
                    const SizedBox(height: 3), // Noch kleinerer Abstand
                    
                    // Service Title - kompakter
                    Text(
                      widget.service['title'] ?? widget.service['companyName'] ?? 'Service-Titel',
                      style: const TextStyle(
                        fontSize: 12, // Kleinere Schrift
                        fontWeight: FontWeight.w600,
                        color: Colors.black87,
                        height: 1.0, // Reduzierte Zeilenhöhe
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    
                    // Subcategory - nur bei Platz anzeigen
                    if (widget.service['subcategoryName'] != null) ...[
                      const SizedBox(height: 1),
                      Text(
                        widget.service['subcategoryName'],
                        style: const TextStyle(
                          fontSize: 9, // Noch kleinere Schrift
                          color: Color(0xFF14ad9f),
                          fontWeight: FontWeight.w500,
                        ),
                        overflow: TextOverflow.ellipsis,
                        maxLines: 1,
                      ),
                    ],
                    
                    const Spacer(),
                    
                    // Rating und Reviews - kompakter
                    Row(
                      children: [
                        Icon(
                          Icons.star,
                          size: 10, // Noch kleineres Icon
                          color: Colors.amber.shade600,
                        ),
                        const SizedBox(width: 1), // Noch kleinerer Abstand
                        Text(
                          '${widget.service['rating'] ?? 4.8}',
                          style: const TextStyle(
                            fontSize: 9, // Noch kleinere Schrift
                            fontWeight: FontWeight.w600,
                            color: Colors.black87,
                          ),
                        ),
                        const SizedBox(width: 1), // Noch kleinerer Abstand
                        Text(
                          '(${widget.service['reviewCount'] ?? 0})',
                          style: TextStyle(
                            fontSize: 9, // Noch kleinere Schrift
                            color: Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ),
                    
                    const SizedBox(height: 2), // Noch kleinerer Abstand
                    
                    // Preis - kompakter
                    Row(
                      children: [
                        Text(
                          'Ab ',
                          style: TextStyle(
                            fontSize: 8, // Noch kleinere Schrift
                            color: Colors.grey.shade600,
                          ),
                        ),
                        Text(
                          '€${widget.service['price']?.toStringAsFixed(0) ?? widget.service['hourlyRate']?.toStringAsFixed(0) ?? '35'}',
                          style: const TextStyle(
                            fontSize: 10, // Kleinere Schrift
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF14ad9f),
                          ),
                        ),
                        Text(
                          '/h',
                          style: TextStyle(
                            fontSize: 8, // Noch kleinere Schrift
                            color: Colors.grey.shade600,
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

  bool _hasValidImage() {
    // Prüfe alle möglichen Bildquellen in Prioritäts-Reihenfolge
    final imageUrl = _getProviderImage();
    return imageUrl.isNotEmpty && 
           !imageUrl.startsWith('blob:') && 
           (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'));
  }

  String _getProviderImage() {
    // Priorität: Banner > Profile > Logo > andere Bildfelder
    final bannnerImage = widget.service['profileBannerImage']?.toString() ?? '';
    if (bannnerImage.isNotEmpty && !bannnerImage.startsWith('blob:')) {
      return bannnerImage;
    }
    
    final image = widget.service['image']?.toString() ?? '';
    if (image.isNotEmpty && !image.startsWith('blob:')) {
      return image;
    }
    
    final profilePicture = widget.service['profilePictureURL']?.toString() ?? '';
    if (profilePicture.isNotEmpty && !profilePicture.startsWith('blob:')) {
      return profilePicture;
    }
    
    final logoUrl = widget.service['logoURL']?.toString() ?? '';
    if (logoUrl.isNotEmpty && !logoUrl.startsWith('blob:')) {
      return logoUrl;
    }
    
    final avatarUrl = widget.service['avatarURL']?.toString() ?? '';
    if (avatarUrl.isNotEmpty && !avatarUrl.startsWith('blob:')) {
      return avatarUrl;
    }
    
    return '';
  }
}
