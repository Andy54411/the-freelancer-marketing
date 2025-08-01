import 'package:flutter/material.dart';

class ServiceSidebar extends StatefulWidget {
  final Function(Map<String, dynamic>) onFiltersChanged;

  const ServiceSidebar({
    super.key,
    required this.onFiltersChanged,
  });

  @override
  State<ServiceSidebar> createState() => _ServiceSidebarState();
}

class _ServiceSidebarState extends State<ServiceSidebar> {
  // Filter States
  double _minPrice = 0;
  double _maxPrice = 1000;
  String _selectedDeliveryTime = '';
  String _selectedRating = '';
  final List<String> _selectedFeatures = [];
  final List<String> _selectedLanguages = [];

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 280,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(
          left: BorderSide(
            color: Colors.grey.shade200,
            width: 1,
          ),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Sidebar Header
          const Text(
            'Filter',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          
          const SizedBox(height: 20),
          
          // Price Range Filter
          _buildFilterSection(
            title: 'Preis',
            child: Column(
              children: [
                RangeSlider(
                  values: RangeValues(_minPrice, _maxPrice),
                  min: 0,
                  max: 1000,
                  divisions: 20,
                  activeColor: const Color(0xFF14ad9f),
                  inactiveColor: const Color(0xFF14ad9f).withValues(alpha: 0.3),
                  labels: RangeLabels(
                    '€${_minPrice.round()}',
                    '€${_maxPrice.round()}',
                  ),
                  onChanged: (RangeValues values) {
                    setState(() {
                      _minPrice = values.start;
                      _maxPrice = values.end;
                    });
                    _updateFilters();
                  },
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '€${_minPrice.round()}',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey.shade600,
                      ),
                    ),
                    Text(
                      '€${_maxPrice.round()}+',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey.shade600,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Delivery Time Filter
          _buildFilterSection(
            title: 'Lieferzeit',
            child: Column(
              children: [
                _buildRadioOption('24 Stunden', '24h'),
                _buildRadioOption('3 Tage', '3d'),
                _buildRadioOption('1 Woche', '1w'),
                _buildRadioOption('Bis 1 Monat', '1m'),
              ],
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Rating Filter
          _buildFilterSection(
            title: 'Bewertung',
            child: Column(
              children: [
                _buildRatingOption('4.5+ Sterne', '4.5'),
                _buildRatingOption('4.0+ Sterne', '4.0'),
                _buildRatingOption('3.5+ Sterne', '3.5'),
                _buildRatingOption('3.0+ Sterne', '3.0'),
              ],
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Service Features
          _buildFilterSection(
            title: 'Service-Features',
            child: Column(
              children: [
                _buildCheckboxOption('Express-Lieferung', 'express'),
                _buildCheckboxOption('Unbegrenzte Revisionen', 'unlimited_revisions'),
                _buildCheckboxOption('24/7 Support', 'support_24_7'),
                _buildCheckboxOption('Kommerzielle Nutzung', 'commercial_use'),
                _buildCheckboxOption('Quellcode inklusive', 'source_code'),
              ],
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Languages
          _buildFilterSection(
            title: 'Sprachen',
            child: Column(
              children: [
                _buildCheckboxOption('Deutsch', 'de'),
                _buildCheckboxOption('Englisch', 'en'),
                _buildCheckboxOption('Französisch', 'fr'),
                _buildCheckboxOption('Spanisch', 'es'),
                _buildCheckboxOption('Italienisch', 'it'),
              ],
            ),
          ),
          
          const Spacer(),
          
          // Clear Filters Button
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: _clearFilters,
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Color(0xFF14ad9f)),
                foregroundColor: const Color(0xFF14ad9f),
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
              child: const Text('Filter zurücksetzen'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterSection({
    required String title,
    required Widget child,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 12),
        child,
      ],
    );
  }

  Widget _buildRadioOption(String label, String value) {
    return RadioListTile<String>(
      title: Text(
        label,
        style: const TextStyle(fontSize: 14),
      ),
      value: value,
      groupValue: _selectedDeliveryTime,
      onChanged: (String? newValue) {
        setState(() {
          _selectedDeliveryTime = newValue ?? '';
        });
        _updateFilters();
      },
      activeColor: const Color(0xFF14ad9f),
      contentPadding: EdgeInsets.zero,
      dense: true,
    );
  }

  Widget _buildRatingOption(String label, String value) {
    return RadioListTile<String>(
      title: Row(
        children: [
          Icon(
            Icons.star,
            size: 16,
            color: Colors.amber.shade600,
          ),
          const SizedBox(width: 4),
          Text(
            label,
            style: const TextStyle(fontSize: 14),
          ),
        ],
      ),
      value: value,
      groupValue: _selectedRating,
      onChanged: (String? newValue) {
        setState(() {
          _selectedRating = newValue ?? '';
        });
        _updateFilters();
      },
      activeColor: const Color(0xFF14ad9f),
      contentPadding: EdgeInsets.zero,
      dense: true,
    );
  }

  Widget _buildCheckboxOption(String label, String value) {
    final isSelected = _selectedFeatures.contains(value) || _selectedLanguages.contains(value);
    
    return CheckboxListTile(
      title: Text(
        label,
        style: const TextStyle(fontSize: 14),
      ),
      value: isSelected,
      onChanged: (bool? checked) {
        setState(() {
          if (value.length == 2) { // Language codes
            if (checked == true) {
              _selectedLanguages.add(value);
            } else {
              _selectedLanguages.remove(value);
            }
          } else { // Features
            if (checked == true) {
              _selectedFeatures.add(value);
            } else {
              _selectedFeatures.remove(value);
            }
          }
        });
        _updateFilters();
      },
      activeColor: const Color(0xFF14ad9f),
      contentPadding: EdgeInsets.zero,
      dense: true,
    );
  }

  void _updateFilters() {
    final filters = <String, dynamic>{
      'minPrice': _minPrice,
      'maxPrice': _maxPrice,
      'deliveryTime': _selectedDeliveryTime,
      'rating': _selectedRating,
      'features': _selectedFeatures,
      'languages': _selectedLanguages,
    };
    
    widget.onFiltersChanged(filters);
  }

  void _clearFilters() {
    setState(() {
      _minPrice = 0;
      _maxPrice = 1000;
      _selectedDeliveryTime = '';
      _selectedRating = '';
      _selectedFeatures.clear();
      _selectedLanguages.clear();
    });
    _updateFilters();
  }
}
