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
  final String types;
  final bool restrictToDach;

  const TaskiloPlaceAutocomplete({
    super.key,
    required this.controller,
    required this.labelText,
    required this.onPlaceSelected,
    this.prefixIcon,
    this.validator,
    this.types = 'address',
    this.restrictToDach = true,
  });

  @override
  State<TaskiloPlaceAutocomplete> createState() =>
      _TaskiloPlaceAutocompleteState();
}

class _TaskiloPlaceAutocompleteState extends State<TaskiloPlaceAutocomplete> {
  List<PlacePrediction> _predictions = [];
  Timer? _debounceTimer;
  final FocusNode _focusNode = FocusNode();
  OverlayEntry? _overlayEntry;
  final LayerLink _layerLink = LayerLink();

  String get _apiKey {
    final flutterKey = dotenv.env['GOOGLE_MAPS_FLUTTER_API_KEY'];
    final webKey = dotenv.env['GOOGLE_MAPS_API_KEY'];

    // Priorität: Flutter Key, dann Web Key, dann Fallback
    if (flutterKey != null && flutterKey.isNotEmpty && flutterKey.length > 10) {
      return flutterKey;
    }

    if (webKey != null && webKey.isNotEmpty) {
      return webKey;
    }

    // Kein API Key verfügbar - muss in .env konfiguriert werden
    throw Exception(
      'Google Maps API Key nicht konfiguriert. Bitte GOOGLE_MAPS_API_KEY in .env setzen.',
    );
  }

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
    if (!_focusNode.hasFocus) return;

    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 300), () {
      if (!_focusNode.hasFocus) return;

      final query = widget.controller.text.trim();
      if (query.length >= 2) {
        _searchPlaces(query);
      } else {
        _clearPredictions();
      }
    });
  }

  void _onFocusChanged() {
    if (!_focusNode.hasFocus) {
      _clearPredictions();
    }
  }

  Future<void> _searchPlaces(String query) async {
    if (_apiKey.isEmpty) {
      _showFallbackSuggestions(query);
      return;
    }

    try {
      String components = '';
      if (widget.restrictToDach) {
        components = '&components=country:de|country:at|country:ch';
      }

      final url = Uri.parse(
        'https://maps.googleapis.com/maps/api/place/autocomplete/json'
        '?input=${Uri.encodeComponent(query)}'
        '$components'
        '&language=de'
        '&types=${widget.types}'
        '&key=$_apiKey',
      );

      final response = await http.get(url);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final String status = data['status'] ?? 'UNKNOWN_ERROR';

        if (status == 'OK' && data['predictions'] != null) {
          final predictions = (data['predictions'] as List)
              .map((p) => PlacePrediction.fromJson(p))
              .toList();

          setState(() {
            _predictions = predictions;
          });

          if (predictions.isNotEmpty) {
            _showOverlay();
          }
        } else {
          // Google API Fehler - zeige Fallback
          _showFallbackSuggestions(query);
        }
      } else {
        // HTTP Fehler - zeige Fallback
        _showFallbackSuggestions(query);
      }
    } catch (e) {
      // Netzwerk Fehler - zeige Fallback
      _showFallbackSuggestions(query);
    }
  }

  void _showFallbackSuggestions(String query) {
    final suggestions = <PlacePrediction>[];

    // Direkten Input als erste Option
    suggestions.add(
      PlacePrediction(description: query, placeId: 'direct_input'),
    );

    // Konkrete Beispiele mit vollständigen Adressen für Tests
    if (query.length >= 2) {
      suggestions.addAll([
        PlacePrediction(
          description: 'Hauptstraße 123, 10115 Berlin',
          placeId: 'test_berlin',
        ),
        PlacePrediction(
          description: 'Marienplatz 1, 80331 München',
          placeId: 'test_muenchen',
        ),
        PlacePrediction(
          description: 'Königsallee 27, 40213 Düsseldorf',
          placeId: 'test_duesseldorf',
        ),
      ]);
    }

    setState(() {
      _predictions = suggestions.take(4).toList();
    });

    if (suggestions.isNotEmpty) {
      _showOverlay();
    }
  }

  void _showOverlay() {
    _removeOverlay();

    _overlayEntry = OverlayEntry(
      builder: (context) => Positioned(
        width: MediaQuery.of(context).size.width - 48,
        child: CompositedTransformFollower(
          link: _layerLink,
          showWhenUnlinked: false,
          offset: const Offset(0, 65),
          child: Material(
            elevation: 8,
            borderRadius: BorderRadius.circular(8),
            child: Container(
              constraints: const BoxConstraints(maxHeight: 300),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: const Color(0xFF14ad9f).withValues(alpha: 0.3),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.1),
                    blurRadius: 8,
                    offset: const Offset(0, 4),
                  ),
                ],
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
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                      decoration: BoxDecoration(
                        border: index < _predictions.length - 1
                            ? Border(
                                bottom: BorderSide(color: Colors.grey.shade200),
                              )
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
                              style: const TextStyle(
                                fontSize: 14,
                                color: Colors.black87,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
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
    _clearPredictions();
    _focusNode.unfocus();

    widget.controller.text = prediction.description;

    // Unterscheide zwischen echten Google Places und Fallback-Beispielen
    if (prediction.placeId.startsWith('ChI') ||
        prediction.placeId.length > 20) {
      // Echte Google Place ID - nutze Place Details API
      _getPlaceDetailsAndParse(prediction.placeId, prediction.description);
    } else {
      // Fallback oder Beispiel - nutze eigenen Parser
      _parseBasicAddress(prediction.description);
    }
  }

  Future<void> _getPlaceDetailsAndParse(
    String placeId,
    String description,
  ) async {
    if (_apiKey.isEmpty) {
      _parseBasicAddress(description);
      return;
    }

    try {
      final url =
          'https://maps.googleapis.com/maps/api/place/details/json'
          '?place_id=$placeId'
          '&fields=address_components,formatted_address'
          '&language=de'
          '&key=$_apiKey';

      final response = await http.get(Uri.parse(url));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);

        if (data['status'] == 'OK' && data['result'] != null) {
          final addressComponents =
              data['result']['address_components'] as List?;

          String street = '';
          String streetNumber = '';
          String city = '';
          String postalCode = '';
          String country = '';

          if (addressComponents != null) {
            for (var component in addressComponents) {
              final types = List<String>.from(component['types'] ?? []);
              final longName = component['long_name'] ?? '';
              final shortName = component['short_name'] ?? '';

              if (types.contains('street_number')) {
                streetNumber = longName;
              } else if (types.contains('route')) {
                street = longName;
              } else if (types.contains('locality')) {
                city = longName;
              } else if (types.contains('administrative_area_level_3') &&
                  city.isEmpty) {
                city = longName;
              } else if (types.contains('postal_code')) {
                postalCode = longName;
              } else if (types.contains('country')) {
                country = shortName;
              }
            }
          }

          // Straße mit Hausnummer zusammenfügen
          final fullStreet = streetNumber.isNotEmpty
              ? '$street $streetNumber'
              : street;

          // Callback mit vollständigen Daten
          final result = {
            'street': fullStreet,
            'city': city,
            'postalCode': postalCode,
            'country': country,
            'fullAddress':
                data['result']['formatted_address']?.toString() ?? description,
          };

          debugPrint('Google Places Result: $result');
          widget.onPlaceSelected(result);

          return;
        }
      }
    } catch (e) {
      // Fehler silent ignorieren
    }

    // Fallback bei Fehlern
    _parseBasicAddress(description);
  }

  void _clearPredictions() {
    setState(() {
      _predictions = [];
    });
    _removeOverlay();
  }

  void _parseBasicAddress(String description) {
    String street = '';
    String city = '';
    String postalCode = '';
    String country = 'DE';

    // Debug-Ausgabe
    debugPrint('Parsing Address: "$description"');

    // Teste verschiedene deutsche Adressformate
    final text = description.trim();

    // Format: "Musterstraße 123, 12345 Berlin"
    final format1 = RegExp(r'^(.+?),\s*(\d{4,5})\s+(.+)$').firstMatch(text);
    if (format1 != null) {
      street = format1.group(1)!.trim();
      postalCode = format1.group(2)!;
      city = format1.group(3)!.trim();
      if (postalCode.length == 4) country = 'AT';
      debugPrint(
        'Format 1 erkannt: Straße="$street", PLZ="$postalCode", Stadt="$city"',
      );
    }
    // Format: "Musterstraße 123 12345 Berlin" (ohne Komma)
    else {
      final format2 = RegExp(r'^(.+?)\s+(\d{4,5})\s+(.+)$').firstMatch(text);
      if (format2 != null) {
        street = format2.group(1)!.trim();
        postalCode = format2.group(2)!;
        city = format2.group(3)!.trim();
        if (postalCode.length == 4) country = 'AT';
        debugPrint(
          'Format 2 erkannt: Straße="$street", PLZ="$postalCode", Stadt="$city"',
        );
      }
      // Format: "12345 Berlin, Musterstraße 123"
      else {
        final format3 = RegExp(r'^(\d{4,5})\s+(.+?),\s*(.+)$').firstMatch(text);
        if (format3 != null) {
          postalCode = format3.group(1)!;
          city = format3.group(2)!.trim();
          street = format3.group(3)!.trim();
          if (postalCode.length == 4) country = 'AT';
          debugPrint(
            'Format 3 erkannt: Straße="$street", PLZ="$postalCode", Stadt="$city"',
          );
        }
        // Nur Straße eingegeben
        else {
          street = text;
          debugPrint('Nur Straße erkannt: "$street"');
        }
      }
    }

    // Fallback: Falls noch keine Stadt, versuche PLZ allein zu finden
    if (city.isEmpty && postalCode.isEmpty) {
      final plzOnly = RegExp(r'(\d{4,5})').firstMatch(text);
      if (plzOnly != null) {
        postalCode = plzOnly.group(1)!;
        if (postalCode.length == 4) country = 'AT';

        // Entferne PLZ aus Text für Stadt
        final remaining = text
            .replaceFirst(RegExp(r'\s*\d{4,5}\s*'), ' ')
            .trim();
        if (remaining.isNotEmpty && remaining != street) {
          city = remaining;
        }
        debugPrint('PLZ-Fallback: PLZ="$postalCode", Remaining="$remaining"');
      }
    }

    final result = {
      'street': street,
      'city': city,
      'postalCode': postalCode,
      'country': country,
      'fullAddress': description,
    };

    debugPrint('Sende Result: $result');
    widget.onPlaceSelected(result);
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

  PlacePrediction({required this.description, required this.placeId});

  factory PlacePrediction.fromJson(Map<String, dynamic> json) {
    return PlacePrediction(
      description: json['description'] ?? '',
      placeId: json['place_id'] ?? '',
    );
  }
}
