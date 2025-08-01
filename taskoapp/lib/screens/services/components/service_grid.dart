import 'package:flutter/material.dart';
import 'service_card.dart';

class ServiceGrid extends StatelessWidget {
  final List<Map<String, dynamic>> services;
  final bool isLoading;
  final String sortBy;
  final double minPrice;
  final double maxPrice;
  final List<String> selectedFilters;
  final VoidCallback onRefresh;

  const ServiceGrid({
    super.key,
    required this.services,
    required this.isLoading,
    required this.sortBy,
    required this.minPrice,
    required this.maxPrice,
    required this.selectedFilters,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Results Header
          Row(
            children: [
              Text(
                '${_getFilteredServices().length} Services gefunden',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.black87,
                ),
              ),
              const Spacer(),
              if (isLoading)
                const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF14ad9f)),
                  ),
                ),
            ],
          ),
          
          const SizedBox(height: 16),
          
          // Services Grid
          Expanded(
            child: isLoading && services.isEmpty
                ? _buildLoadingGrid()
                : services.isEmpty
                    ? _buildEmptyState()
                    : _buildServicesGrid(),
          ),
        ],
      ),
    );
  }

  Widget _buildLoadingGrid() {
    return GridView.builder(
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: _getCrossAxisCount(),
        childAspectRatio: 0.75,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
      ),
      itemCount: 6, // Loading placeholders
      itemBuilder: (context, index) => _buildLoadingCard(),
    );
  }

  Widget _buildLoadingCard() {
    return Container(
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
          // Image placeholder
          Container(
            height: 120,
            decoration: BoxDecoration(
              color: Colors.grey.shade200,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  height: 16,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade200,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  height: 14,
                  width: 120,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade200,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.search_off,
            size: 64,
            color: Colors.grey.shade400,
          ),
          const SizedBox(height: 16),
          Text(
            'Keine Services gefunden',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Versuche andere Filter oder erweitere deine Suche',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.shade500,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: onRefresh,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF14ad9f),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
            child: const Text('Neu laden'),
          ),
        ],
      ),
    );
  }

  Widget _buildServicesGrid() {
    final filteredServices = _getFilteredServices();
    
    return GridView.builder(
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: _getCrossAxisCount(),
        childAspectRatio: 0.75,
        crossAxisSpacing: 16,
        mainAxisSpacing: 16,
      ),
      itemCount: filteredServices.length,
      itemBuilder: (context, index) {
        return ServiceCard(service: filteredServices[index]);
      },
    );
  }

  List<Map<String, dynamic>> _getFilteredServices() {
    List<Map<String, dynamic>> filtered = List.from(services);
    
    // Apply filters
    if (selectedFilters.isNotEmpty) {
      filtered = filtered.where((service) {
        // Implement actual filtering logic
        for (String filter in selectedFilters) {
          switch (filter) {
            case 'pro':
              if (!(service['isPro'] ?? false)) return false;
              break;
            case 'fast':
              if (!(service['isFastDelivery'] ?? false)) return false;
              break;
            case 'online':
              if (!(service['isOnline'] ?? false)) return false;
              break;
            case 'onsite':
              if (!(service['isOnsite'] ?? false)) return false;
              break;
            case 'prolevel':
              if ((service['rating'] ?? 0) < 4.5) return false;
              break;
            case 'schnell':
              if (!(service['isFastDelivery'] ?? false)) return false;
              break;
            case 'vorort':
              if (!(service['isOnsite'] ?? false)) return false;
              break;
          }
        }
        return true;
      }).toList();
    }
    
    // Apply price filter
    filtered = filtered.where((service) {
      final price = (service['price'] as num?)?.toDouble() ?? 0.0;
      return price >= minPrice && price <= maxPrice;
    }).toList();
    
    // Apply sorting
    switch (sortBy) {
      case 'rating':
        filtered.sort((a, b) => (b['rating'] ?? 0).compareTo(a['rating'] ?? 0));
        break;
      case 'price_low':
        filtered.sort((a, b) => (a['price'] ?? 0).compareTo(b['price'] ?? 0));
        break;
      case 'price_high':
        filtered.sort((a, b) => (b['price'] ?? 0).compareTo(a['price'] ?? 0));
        break;
      case 'newest':
        // Sort by creation date (newest first)
        filtered.sort((a, b) {
          final dateA = a['createdAt'] as String?;
          final dateB = b['createdAt'] as String?;
          
          if (dateA == null && dateB == null) return 0;
          if (dateA == null) return 1;
          if (dateB == null) return -1;
          
          try {
            final parsedDateA = DateTime.parse(dateA);
            final parsedDateB = DateTime.parse(dateB);
            return parsedDateB.compareTo(parsedDateA); // Newest first
          } catch (e) {
            // Fallback to string comparison if parsing fails
            return dateB.compareTo(dateA);
          }
        });
        break;
      default: // recommended
        // Sort by recommendation algorithm
        filtered.sort((a, b) {
          // Complex recommendation algorithm considering multiple factors
          double scoreA = _calculateRecommendationScore(a);
          double scoreB = _calculateRecommendationScore(b);
          return scoreB.compareTo(scoreA); // Higher score first
        });
        break;
    }
    
    return filtered;
  }

  double _calculateRecommendationScore(Map<String, dynamic> service) {
    double score = 0.0;
    
    // Rating weight (40% of total score)
    final rating = (service['rating'] as num?)?.toDouble() ?? 0.0;
    score += rating * 0.4;
    
    // Review count weight (20% of total score) - more reviews = more reliable
    final reviewCount = (service['reviewCount'] as num?)?.toInt() ?? 0;
    score += (reviewCount / 100).clamp(0.0, 1.0) * 0.2;
    
    // Response time weight (15% of total score) - faster response = better
    final responseTimeHours = (service['responseTimeHours'] as num?)?.toDouble() ?? 24.0;
    final responseScore = (24 - responseTimeHours).clamp(0.0, 24.0) / 24.0;
    score += responseScore * 0.15;
    
    // Completion rate weight (10% of total score)
    final completionRate = (service['completionRate'] as num?)?.toDouble() ?? 0.0;
    score += (completionRate / 100) * 0.1;
    
    // Pro status bonus (5% of total score)
    if (service['isPro'] == true) {
      score += 0.05;
    }
    
    // Recent activity bonus (5% of total score) - active providers preferred
    final lastActiveStr = service['lastActive'] as String?;
    if (lastActiveStr != null) {
      try {
        final lastActive = DateTime.parse(lastActiveStr);
        final daysSinceActive = DateTime.now().difference(lastActive).inDays;
        if (daysSinceActive <= 7) {
          score += 0.05; // Bonus for being active within last week
        } else if (daysSinceActive <= 30) {
          score += 0.025; // Smaller bonus for being active within last month
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
    
    // Price competitiveness bonus (5% of total score)
    final price = (service['price'] as num?)?.toDouble() ?? 0.0;
    if (price > 0) {
      // Bonus for reasonable pricing (not too high, not suspiciously low)
      if (price >= 20 && price <= 200) {
        score += 0.05;
      } else if (price >= 10 && price <= 500) {
        score += 0.025;
      }
    }
    
    return score.clamp(0.0, 5.0); // Ensure score stays within reasonable bounds
  }

  int _getCrossAxisCount() {
    // Responsive grid
    return 2; // Mobile: 2 columns, could be expanded for tablet/desktop
  }
}
