import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:async';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class TaskiloPlaceAutocomplete extends StatefulWidget {
  final TextEditingController controller;
  final String labelText;
  final IconData? prefixIcon;
  final Function(Map<String, String>) onPlaceSelected;
  final String? Function(String?)? validator;

  const TaskiloPlaceAutocomplete({
    super.key,
    required this.controller,
    required this.labelText,
    required this.onPlaceSelected,
    this.prefixIcon,
    this.validator,
  });

  @override
  State<TaskiloPlaceAutocomplete> createState() => _TaskiloPlaceAutocompleteState();
}

class _TaskiloPlaceAutocompleteState extends State<TaskiloPlaceAutocomplete> {
  List<PlacePrediction> _predictions = [];
  Timer? _debounceTimer;
  final FocusNode _focusNode = FocusNode();
  OverlayEntry? _overlayEntry;
  final LayerLink _layerLink = LayerLink();

  // API Key aus Environment Variable laden
  static String get _apiKey => dotenv.env['GOOGLE_MAPS_API_KEY'] ?? "";

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onTextChanged);
    _focusNode.addListener(_onFocusChanged);
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    widget.controller.removeListener(_onTextChanged);
    _focusNode.removeListener(_onFocusChanged);
    _focusNode.dispose();
    _removeOverlay();
    super.dispose();
  }

  void _onTextChanged() {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 400), () {
      if (widget.controller.text.isNotEmpty) {
        _searchPlaces(widget.controller.text);
      } else {
        _clearPredictions();
      }
    });
  }

  void _onFocusChanged() {
    if (!_focusNode.hasFocus) {
      // Kleine Verzögerung, damit Tap auf Suggestion funktioniert
      Timer(const Duration(milliseconds: 150), () {
        _clearPredictions();
      });
    }
  }

  Future<void> _searchPlaces(String query) async {
    if (_apiKey.isEmpty) {
      // Fallback ohne API - einfaches Parsing
      _showSimplePredictions(query);
      return;
    }

    try {
      final url = Uri.parse(
        'https://maps.googleapis.com/maps/api/place/autocomplete/json'
        '?input=${Uri.encodeComponent(query)}'
        '&components=country:de|country:at|country:ch'
        '&language=de'
        '&key=$_apiKey'
      );

      final response = await http.get(url);
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final predictions = (data['predictions'] as List)
            .map((p) => PlacePrediction.fromJson(p))
            .toList();
        
        setState(() {
          _predictions = predictions;
        });
        
        _showOverlay();
      } else {
        _showSimplePredictions(query);
      }
    } catch (e) {
      debugPrint('Error fetching places: $e');
      _showSimplePredictions(query);
    }
  }

  void _showSimplePredictions(String query) {
    // Fallback ohne API - einfache Suggestions basierend auf Input
    final suggestions = <PlacePrediction>[];
    
    if (query.length >= 3) {
      // Erstelle einfache Predictions für deutsche Städte
      final cities = [
        'Berlin, Deutschland',
        'München, Deutschland', 
        'Hamburg, Deutschland',
        'Köln, Deutschland',
        'Frankfurt am Main, Deutschland',
        'Stuttgart, Deutschland',
        'Wien, Österreich',
        'Salzburg, Österreich',
        'Zürich, Schweiz',
        'Basel, Schweiz',
      ];
      
      for (final city in cities) {
        if (city.toLowerCase().contains(query.toLowerCase())) {
          suggestions.add(PlacePrediction(
            description: '$query, $city',
            placeId: 'simple_${city.hashCode}',
          ));
        }
      }
      
      // Füge direkten Input als Option hinzu
      suggestions.insert(0, PlacePrediction(
        description: query,
        placeId: 'direct_input',
      ));
    }
    
    setState(() {
      _predictions = suggestions;
    });
    
    if (suggestions.isNotEmpty) {
      _showOverlay();
    }
  }

  void _showOverlay() {
    _removeOverlay();
    
    _overlayEntry = OverlayEntry(
      builder: (context) => Positioned(
        width: MediaQuery.of(context).size.width - 48, // Padding berücksichtigen
        child: CompositedTransformFollower(
          link: _layerLink,
          showWhenUnlinked: false,
          offset: const Offset(0, 60), // Höhe des TextFields
          child: Material(
            elevation: 4,
            borderRadius: BorderRadius.circular(8),
            child: Container(
              constraints: const BoxConstraints(maxHeight: 200),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.grey.shade300),
              ),
              child: ListView.builder(
                shrinkWrap: true,
                padding: EdgeInsets.zero,
                itemCount: _predictions.length,
                itemBuilder: (context, index) {
                  final prediction = _predictions[index];
                  return InkWell(
                    onTap: () => _selectPrediction(prediction),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        border: index < _predictions.length - 1
                            ? Border(bottom: BorderSide(color: Colors.grey.shade200))
                            : null,
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.location_on,
                            color: Color(0xFF14ad9f),
                            size: 20,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              prediction.description,
                              style: const TextStyle(fontSize: 14),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        ),
      ),
    );
    
    Overlay.of(context).insert(_overlayEntry!);
  }

  void _removeOverlay() {
    _overlayEntry?.remove();
    _overlayEntry = null;
  }

  void _selectPrediction(PlacePrediction prediction) {
    widget.controller.text = prediction.description;
    _parseAndSetAddress(prediction.description);
    _clearPredictions();
    _focusNode.unfocus();
  }

  void _clearPredictions() {
    setState(() {
      _predictions = [];
    });
    _removeOverlay();
  }

  void _parseAndSetAddress(String description) {
    try {
      final parts = description.split(', ');
      
      String street = "";
      String city = "";
      String postalCode = "";
      String country = "DE"; // Default
      
      // Versuche, die Adresse zu parsen (deutsche Adressformate)
      if (parts.isNotEmpty) {
        street = parts[0]; // Erste Teil ist normalerweise Straße + Hausnummer
      }
      
      // Suche nach PLZ (5 Ziffern) und Stadt
      for (int i = 1; i < parts.length; i++) {
        final part = parts[i].trim();
        
        // PLZ Pattern: 5 Ziffern am Anfang
        final plzMatch = RegExp(r'^(\d{5})\s*(.+)').firstMatch(part);
        if (plzMatch != null) {
          postalCode = plzMatch.group(1) ?? "";
          city = plzMatch.group(2) ?? "";
          continue;
        }
        
        // Länder erkennen
        if (part.toLowerCase().contains('deutschland') || 
            part.toLowerCase().contains('germany')) {
          country = "DE";
        } else if (part.toLowerCase().contains('österreich') || 
                   part.toLowerCase().contains('austria')) {
          country = "AT";
        } else if (part.toLowerCase().contains('schweiz') || 
                   part.toLowerCase().contains('switzerland')) {
          country = "CH";
        }
        
        // Falls kein PLZ Pattern gefunden, nehme letzten Teil als Stadt
        if (city.isEmpty && i == parts.length - 2) {
          city = part;
        }
      }
      
      // Falls keine PLZ gefunden, versuche im letzten Teil zu suchen
      if (postalCode.isEmpty && parts.length > 1) {
        final lastPart = parts.last;
        final plzInLast = RegExp(r'(\d{5})').firstMatch(lastPart);
        if (plzInLast != null) {
          postalCode = plzInLast.group(1) ?? "";
          city = lastPart.replaceAll(RegExp(r'\d{5}\s*'), '').trim();
        } else if (city.isEmpty) {
          city = lastPart;
        }
      }
      
      // Callback mit geparsten Daten aufrufen
      widget.onPlaceSelected({
        'street': street,
        'city': city,
        'postalCode': postalCode,
        'country': country,
        'fullAddress': description,
      });
      
    } catch (e) {
      debugPrint('Fehler beim Parsen der Adresse: $e');
      // Fallback: Verwende die komplette Beschreibung als Straße
      widget.onPlaceSelected({
        'street': description,
        'city': "",
        'postalCode': "",
        'country': "DE",
        'fullAddress': description,
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return CompositedTransformTarget(
      link: _layerLink,
      child: TextFormField(
        controller: widget.controller,
        focusNode: _focusNode,
        decoration: InputDecoration(
          labelText: widget.labelText,
          prefixIcon: widget.prefixIcon != null 
              ? Icon(widget.prefixIcon, color: const Color(0xFF14ad9f))
              : null,
          suffixIcon: widget.controller.text.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: () {
                    widget.controller.clear();
                    _clearPredictions();
                  },
                )
              : null,
          border: const OutlineInputBorder(),
          focusedBorder: const OutlineInputBorder(
            borderSide: BorderSide(color: Color(0xFF14ad9f), width: 2),
          ),
        ),
        validator: widget.validator,
        onTap: () {
          if (widget.controller.text.isNotEmpty && _predictions.isEmpty) {
            _searchPlaces(widget.controller.text);
          }
        },
      ),
    );
  }
}

class PlacePrediction {
  final String description;
  final String placeId;

  PlacePrediction({
    required this.description,
    required this.placeId,
  });

  factory PlacePrediction.fromJson(Map<String, dynamic> json) {
    return PlacePrediction(
      description: json['description'] ?? '',
      placeId: json['place_id'] ?? '',
    );
  }
}
