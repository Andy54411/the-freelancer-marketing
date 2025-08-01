import 'package:flutter/material.dart';

class ServiceFilters extends StatefulWidget {
  final String sortBy;
  final double minPrice;
  final double maxPrice;
  final List<String> selectedFilters;
  final Function(String) onSortChanged;
  final Function(double, double) onPriceChanged;
  final Function(List<String>) onFiltersChanged;

  const ServiceFilters({
    super.key,
    required this.sortBy,
    required this.minPrice,
    required this.maxPrice,
    required this.selectedFilters,
    required this.onSortChanged,
    required this.onPriceChanged,
    required this.onFiltersChanged,
  });

  @override
  State<ServiceFilters> createState() => _ServiceFiltersState();
}

class _ServiceFiltersState extends State<ServiceFilters> {

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(
          bottom: BorderSide(color: Colors.grey.shade200),
        ),
      ),
      child: Column(
        children: [
          // Filter Chips Row
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildFilterChip('Alle', widget.selectedFilters.isEmpty),
                const SizedBox(width: 8),
                _buildFilterChip('Pro Level', widget.selectedFilters.contains('pro')),
                const SizedBox(width: 8),
                _buildFilterChip('Schnell', widget.selectedFilters.contains('fast')),
                const SizedBox(width: 8),
                _buildFilterChip('Online', widget.selectedFilters.contains('online')),
                const SizedBox(width: 8),
                _buildFilterChip('Vor Ort', widget.selectedFilters.contains('onsite')),
                const SizedBox(width: 8),
                _buildPriceFilter(),
                const SizedBox(width: 8),
                _buildSortDropdown(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, bool isSelected) {
    return FilterChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (selected) {
        List<String> newFilters = List.from(widget.selectedFilters);
        String filterKey = label.toLowerCase().replaceAll(' ', '');
        
        if (label == 'Alle') {
          newFilters.clear();
        } else if (selected) {
          if (!newFilters.contains(filterKey)) {
            newFilters.add(filterKey);
          }
        } else {
          newFilters.remove(filterKey);
        }
        
        widget.onFiltersChanged(newFilters);
      },
      selectedColor: const Color(0xFF14ad9f).withValues(alpha: 0.2),
      checkmarkColor: const Color(0xFF14ad9f),
      side: BorderSide(
        color: isSelected ? const Color(0xFF14ad9f) : Colors.grey.shade300,
      ),
      labelStyle: TextStyle(
        color: isSelected ? const Color(0xFF14ad9f) : Colors.grey.shade700,
        fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
      ),
    );
  }

  Widget _buildPriceFilter() {
    return ActionChip(
      label: Text('€${widget.minPrice.toInt()} - €${widget.maxPrice.toInt()}'),
      onPressed: () {
        _showPriceRangeDialog();
      },
      backgroundColor: Colors.grey.shade100,
      side: BorderSide(color: Colors.grey.shade300),
      labelStyle: TextStyle(color: Colors.grey.shade700),
      avatar: Icon(
        Icons.euro,
        size: 18,
        color: Colors.grey.shade600,
      ),
    );
  }

  void _showPriceRangeDialog() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        double tempMinPrice = widget.minPrice;
        double tempMaxPrice = widget.maxPrice;

        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              title: const Text(
                'Preisspanne festlegen',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF14ad9f),
                ),
              ),
              content: SizedBox(
                width: 300,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Wähle deine gewünschte Preisspanne',
                      style: TextStyle(
                        color: Colors.grey.shade600,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 24),
                    
                    // Current Range Display
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF14ad9f).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: const Color(0xFF14ad9f).withValues(alpha: 0.3),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            '€${tempMinPrice.toInt()}',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF14ad9f),
                            ),
                          ),
                          Container(
                            width: 40,
                            height: 2,
                            color: const Color(0xFF14ad9f),
                          ),
                          Text(
                            '€${tempMaxPrice.toInt()}',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF14ad9f),
                            ),
                          ),
                        ],
                      ),
                    ),
                    
                    const SizedBox(height: 24),
                    
                    // Min Price Slider
                    Text(
                      'Mindestpreis: €${tempMinPrice.toInt()}',
                      style: const TextStyle(fontWeight: FontWeight.w500),
                    ),
                    Slider(
                      value: tempMinPrice,
                      min: 0,
                      max: 500,
                      divisions: 50,
                      activeColor: const Color(0xFF14ad9f),
                      inactiveColor: const Color(0xFF14ad9f).withValues(alpha: 0.3),
                      onChanged: (value) {
                        setState(() {
                          tempMinPrice = value;
                          if (tempMinPrice >= tempMaxPrice) {
                            tempMaxPrice = tempMinPrice + 10;
                          }
                        });
                      },
                    ),
                    
                    const SizedBox(height: 16),
                    
                    // Max Price Slider
                    Text(
                      'Höchstpreis: €${tempMaxPrice.toInt()}',
                      style: const TextStyle(fontWeight: FontWeight.w500),
                    ),
                    Slider(
                      value: tempMaxPrice,
                      min: 10,
                      max: 2000,
                      divisions: 199,
                      activeColor: const Color(0xFF14ad9f),
                      inactiveColor: const Color(0xFF14ad9f).withValues(alpha: 0.3),
                      onChanged: (value) {
                        setState(() {
                          tempMaxPrice = value;
                          if (tempMaxPrice <= tempMinPrice) {
                            tempMinPrice = tempMaxPrice - 10;
                          }
                        });
                      },
                    ),
                    
                    const SizedBox(height: 16),
                    
                    // Quick Select Buttons
                    Wrap(
                      spacing: 8,
                      children: [
                        _buildQuickSelectChip('€0-50', 0, 50, tempMinPrice, tempMaxPrice, (min, max) {
                          setState(() {
                            tempMinPrice = min;
                            tempMaxPrice = max;
                          });
                        }),
                        _buildQuickSelectChip('€50-100', 50, 100, tempMinPrice, tempMaxPrice, (min, max) {
                          setState(() {
                            tempMinPrice = min;
                            tempMaxPrice = max;
                          });
                        }),
                        _buildQuickSelectChip('€100-250', 100, 250, tempMinPrice, tempMaxPrice, (min, max) {
                          setState(() {
                            tempMinPrice = min;
                            tempMaxPrice = max;
                          });
                        }),
                        _buildQuickSelectChip('€250-500', 250, 500, tempMinPrice, tempMaxPrice, (min, max) {
                          setState(() {
                            tempMinPrice = min;
                            tempMaxPrice = max;
                          });
                        }),
                      ],
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: Text(
                    'Abbrechen',
                    style: TextStyle(color: Colors.grey.shade600),
                  ),
                ),
                ElevatedButton(
                  onPressed: () {
                    widget.onPriceChanged(tempMinPrice, tempMaxPrice);
                    Navigator.of(context).pop();
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF14ad9f),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: const Text('Anwenden'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Widget _buildQuickSelectChip(String label, double min, double max, double currentMin, double currentMax, Function(double, double) onSelect) {
    bool isSelected = currentMin == min && currentMax == max;
    
    return GestureDetector(
      onTap: () => onSelect(min, max),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF14ad9f) : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? const Color(0xFF14ad9f) : Colors.grey.shade300,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : Colors.grey.shade700,
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ),
    );
  }

  Widget _buildSortDropdown() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey.shade300),
        borderRadius: BorderRadius.circular(20),
        color: Colors.grey.shade50,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.sort,
            size: 18,
            color: Colors.grey.shade600,
          ),
          const SizedBox(width: 8),
          DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: widget.sortBy,
              style: TextStyle(
                color: Colors.grey.shade700,
                fontSize: 14,
              ),
              items: const [
                DropdownMenuItem(value: 'recommended', child: Text('Empfohlen')),
                DropdownMenuItem(value: 'rating', child: Text('Beste Bewertung')),
                DropdownMenuItem(value: 'price_low', child: Text('Preis: Niedrig')),
                DropdownMenuItem(value: 'price_high', child: Text('Preis: Hoch')),
                DropdownMenuItem(value: 'newest', child: Text('Neueste')),
              ],
              onChanged: (value) {
                if (value != null) {
                  widget.onSortChanged(value);
                }
              },
            ),
          ),
        ],
      ),
    );
  }
}
