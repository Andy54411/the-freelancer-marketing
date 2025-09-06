import 'package:flutter/material.dart';

class ProviderPortfolioPanel extends StatefulWidget {
  final Map<String, dynamic>? portfolioItem;
  final bool isVisible;
  final VoidCallback onClose;

  const ProviderPortfolioPanel({
    super.key,
    required this.portfolioItem,
    required this.isVisible,
    required this.onClose,
  });

  @override
  State<ProviderPortfolioPanel> createState() => _ProviderPortfolioPanelState();
}

class _ProviderPortfolioPanelState extends State<ProviderPortfolioPanel>
    with SingleTickerProviderStateMixin {
  late AnimationController _slideController;
  late Animation<Offset> _slideAnimation;
  int _currentImageIndex = 0;
  final PageController _pageController = PageController();

  @override
  void initState() {
    super.initState();
    _slideController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _slideAnimation = Tween<Offset>(
      begin: const Offset(1.0, 0.0),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _slideController,
      curve: Curves.easeInOut,
    ));
  }

  @override
  void didUpdateWidget(ProviderPortfolioPanel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isVisible && !oldWidget.isVisible) {
      _slideController.forward();
      _currentImageIndex = 0;
      if (_pageController.hasClients) {
        _pageController.jumpToPage(0);
      }
    } else if (!widget.isVisible && oldWidget.isVisible) {
      _slideController.reverse();
    }
  }

  @override
  void dispose() {
    _slideController.dispose();
    _pageController.dispose();
    super.dispose();
  }

  List<String> _getAllImages() {
    if (widget.portfolioItem == null) return [];
    
    List<String> images = [];
    
    // Hauptbild hinzufügen
    final mainImage = widget.portfolioItem!['imageUrl']?.toString();
    if (mainImage != null && mainImage.isNotEmpty) {
      images.add(mainImage);
    }
    
    // Zusätzliche Bilder hinzufügen
    final additionalImages = widget.portfolioItem!['additionalImages'] as List<dynamic>? ?? [];
    for (var img in additionalImages) {
      final imgUrl = img.toString();
      if (imgUrl.isNotEmpty && !images.contains(imgUrl)) {
        images.add(imgUrl);
      }
    }
    
    return images;
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.isVisible || widget.portfolioItem == null) {
      return const SizedBox.shrink();
    }

    final images = _getAllImages();
    final item = widget.portfolioItem!;

    return Positioned.fill(
      child: SlideTransition(
        position: _slideAnimation,
        child: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Color(0xFF14ad9f),
                Color(0xFF0d9488),
                Color(0xFF2563eb),
              ],
            ),
          ),
          child: SafeArea(
            child: Column(
              children: [
                // Header mit Close Button
                _buildHeader(item),
                
                // Content
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Bilder Galerie
                        if (images.isNotEmpty) _buildImageGallery(images),
                        
                        const SizedBox(height: 24),
                        
                        // Titel
                        _buildTitle(item),
                        
                        const SizedBox(height: 16),
                        
                        // Beschreibung
                        if (item['description'] != null && item['description'].toString().isNotEmpty)
                          _buildDescription(item),
                        
                        const SizedBox(height: 20),
                        
                        // Details
                        _buildDetails(item),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(Map<String, dynamic> item) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.close, color: Colors.white, size: 24),
            onPressed: widget.onClose,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              item['title'] ?? 'Portfolio Detail',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.share, color: Colors.white, size: 24),
            onPressed: () {
              // Share Funktionalität
            },
          ),
        ],
      ),
    );
  }

  Widget _buildImageGallery(List<String> images) {
    return Container(
      height: 250,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        color: Colors.white.withOpacity(0.1),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Stack(
          children: [
            // Image PageView
            PageView.builder(
              controller: _pageController,
              onPageChanged: (index) {
                setState(() {
                  _currentImageIndex = index;
                });
              },
              itemCount: images.length,
              itemBuilder: (context, index) {
                return Image.network(
                  images[index],
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) => Container(
                    color: Colors.white.withOpacity(0.1),
                    child: Icon(
                      Icons.image,
                      color: Colors.white.withOpacity(0.6),
                      size: 64,
                    ),
                  ),
                );
              },
            ),
            
            // Bild Indikatoren
            if (images.length > 1)
              Positioned(
                bottom: 16,
                left: 0,
                right: 0,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: images.map((img) {
                    int index = images.indexOf(img);
                    return Container(
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: _currentImageIndex == index
                            ? Colors.white
                            : Colors.white.withOpacity(0.5),
                      ),
                    );
                  }).toList(),
                ),
              ),
            
            // Navigation Buttons
            if (images.length > 1) ...[
              // Previous Button
              Positioned(
                left: 8,
                top: 0,
                bottom: 0,
                child: Center(
                  child: IconButton(
                    icon: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.3),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.chevron_left,
                        color: Colors.white,
                        size: 20,
                      ),
                    ),
                    onPressed: _currentImageIndex > 0
                        ? () {
                            _pageController.previousPage(
                              duration: const Duration(milliseconds: 300),
                              curve: Curves.easeInOut,
                            );
                          }
                        : null,
                  ),
                ),
              ),
              
              // Next Button
              Positioned(
                right: 8,
                top: 0,
                bottom: 0,
                child: Center(
                  child: IconButton(
                    icon: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.3),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.chevron_right,
                        color: Colors.white,
                        size: 20,
                      ),
                    ),
                    onPressed: _currentImageIndex < images.length - 1
                        ? () {
                            _pageController.nextPage(
                              duration: const Duration(milliseconds: 300),
                              curve: Curves.easeInOut,
                            );
                          }
                        : null,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildTitle(Map<String, dynamic> item) {
    return Text(
      item['title'] ?? 'Portfolio Item',
      style: const TextStyle(
        color: Colors.white,
        fontSize: 24,
        fontWeight: FontWeight.bold,
      ),
    );
  }

  Widget _buildDescription(Map<String, dynamic> item) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Colors.white.withOpacity(0.2),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Beschreibung',
            style: TextStyle(
              color: Colors.white.withOpacity(0.8),
              fontSize: 12,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            item['description'].toString(),
            style: const TextStyle(
              color: Colors.white,
              fontSize: 14,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetails(Map<String, dynamic> item) {
    final details = <String, String>{};
    
    if (item['category'] != null && item['category'].toString().isNotEmpty) {
      details['Kategorie'] = item['category'].toString();
    }
    
    if (item['createdAt'] != null && item['createdAt'].toString().isNotEmpty) {
      details['Erstellt'] = item['createdAt'].toString().split('T').first;
    }
    
    if (item['featured'] == true) {
      details['Status'] = 'Featured';
    }
    
    final technologies = item['technologies'] as List<dynamic>? ?? [];
    if (technologies.isNotEmpty) {
      details['Technologien'] = technologies.join(', ');
    }

    if (details.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Colors.white.withOpacity(0.2),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Details',
            style: TextStyle(
              color: Colors.white.withOpacity(0.8),
              fontSize: 12,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 12),
          ...details.entries.map((entry) => Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 100,
                  child: Text(
                    entry.key,
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.7),
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                Expanded(
                  child: Text(
                    entry.value,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
          )),
        ],
      ),
    );
  }
}
