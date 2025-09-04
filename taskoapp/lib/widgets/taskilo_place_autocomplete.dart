import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:async';
import 'dart:math' as math;
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

  // API Key für Flutter - nutze den Web-Key temporär ohne Restrictions
  String get _apiKey {
    final flutterKey = dotenv.env['GOOGLE_MAPS_FLUTTER_API_KEY'];
    if (flutterKey != null && flutterKey.isNotEmpty) {
      return flutterKey;
    }
    
    // Verwende den gleichen Key wie das Web-Projekt
    return dotenv.env['GOOGLE_MAPS_API_KEY'] ?? "AIzaSyCsKo9MFlJDLErQjCgESVGnLjMhYD9UhvI";
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
    // Verhindere API-Calls wenn Focus verloren wurde
    if (!_focusNode.hasFocus) return;
    
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 300), () {
      // Nochmalige Prüfung des Focus nach Debounce
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
      // Sofort Overlay entfernen wenn Focus verloren
      _clearPredictions();
    }
  }

  Future<void> _searchPlaces(String query) async {
    try {
      final url = Uri.parse(
        'https://maps.googleapis.com/maps/api/place/autocomplete/json'
        '?input=${Uri.encodeComponent(query)}'
        '&components=country:de|country:at|country:ch'
        '&language=de'
        '&types=address'
        '&key=$_apiKey'
      );

      debugPrint('🔍 Google Places Request: $query');
      debugPrint('🔑 API Key (erste 10 Zeichen): ${_apiKey.substring(0, math.min(10, _apiKey.length))}...');
      debugPrint('🌐 Request URL: ${url.toString().replaceAll(_apiKey, 'HIDDEN_API_KEY')}');

      final response = await http.get(url);
      
      debugPrint('📡 HTTP Status: ${response.statusCode}');
      debugPrint('📦 Response Body: ${response.body}');
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final String status = data['status'] ?? 'UNKNOWN_ERROR';
        
        debugPrint('✅ Google Places API Status: $status');
        
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
          
          debugPrint('📍 ${predictions.length} Predictions gefunden');
        } else {
          // API Error - zeige Details und verwende Fallback
          final String? errorMessage = data['error_message'];
          debugPrint('⚠️ Google Places API Error:');
          debugPrint('   Status: $status');
          debugPrint('   Error Message: ${errorMessage ?? 'Keine Details verfügbar'}');
          
          if (status == 'REQUEST_DENIED') {
            debugPrint('🚫 REQUEST_DENIED Debugging Hilfe:');
            debugPrint('   1. Google Cloud Console öffnen: https://console.cloud.google.com/');
            debugPrint('   2. Places API aktivieren: APIs & Services > Library > Places API');
            debugPrint('   3. API Key Berechtigung prüfen: APIs & Services > Credentials');
            debugPrint('   4. Billing Account aktivieren: Billing');
            debugPrint('   5. API Key Restrictions korrekt konfigurieren');
            debugPrint('   6. Quota & Limits überprüfen');
          } else if (status == 'OVER_QUERY_LIMIT') {
            debugPrint('💰 Query Limit erreicht - verwende Fallback');
          } else if (status == 'ZERO_RESULTS') {
            debugPrint('🔍 Keine Ergebnisse für "$query"');
          }
          
          _showSimplePredictions(query);
        }
      } else {
        debugPrint('❌ HTTP Error ${response.statusCode}: ${response.body}');
        _showSimplePredictions(query);
      }
    } catch (e, stackTrace) {
      debugPrint('💥 Exception in _searchPlaces: $e');
      debugPrint('📚 StackTrace: $stackTrace');
      _showSimplePredictions(query);
    }
  }

  void _showSimplePredictions(String query) {
    // Erweiterte lokale Suggestions mit deutschen/österreichischen/schweizer Orten
    final suggestions = <PlacePrediction>[];
    
    if (query.length >= 2) {
      // Deutschsprachige Städte und häufige Adressen
      final places = [
        // Deutschland
        {'street': 'Hauptstraße', 'city': 'Berlin', 'plz': '10115', 'country': 'DE'},
        {'street': 'Marienplatz', 'city': 'München', 'plz': '80331', 'country': 'DE'},
        {'street': 'Rathausmarkt', 'city': 'Hamburg', 'plz': '20095', 'country': 'DE'},
        {'street': 'Domplatz', 'city': 'Köln', 'plz': '50667', 'country': 'DE'},
        {'street': 'Römerberg', 'city': 'Frankfurt am Main', 'plz': '60311', 'country': 'DE'},
        {'street': 'Schlossplatz', 'city': 'Stuttgart', 'plz': '70173', 'country': 'DE'},
        {'street': 'Königsallee', 'city': 'Düsseldorf', 'plz': '40213', 'country': 'DE'},
        {'street': 'Potsdamer Platz', 'city': 'Berlin', 'plz': '10785', 'country': 'DE'},
        
        // Österreich
        {'street': 'Graben', 'city': 'Wien', 'plz': '1010', 'country': 'AT'},
        {'street': 'Getreidegasse', 'city': 'Salzburg', 'plz': '5020', 'country': 'AT'},
        {'street': 'Maria-Theresien-Straße', 'city': 'Innsbruck', 'plz': '6020', 'country': 'AT'},
        
        // Schweiz
        {'street': 'Bahnhofstrasse', 'city': 'Zürich', 'plz': '8001', 'country': 'CH'},
        {'street': 'Freie Strasse', 'city': 'Basel', 'plz': '4001', 'country': 'CH'},
        {'street': 'Rue du Rhône', 'city': 'Genf', 'plz': '1204', 'country': 'CH'},
      ];
      
      // Suche nach passenden Orten
      for (final place in places) {
        final street = place['street']!;
        final city = place['city']!;
        final plz = place['plz']!;
        final country = place['country']!;
        
        if (street.toLowerCase().contains(query.toLowerCase()) ||
            city.toLowerCase().contains(query.toLowerCase()) ||
            query.toLowerCase().contains(street.toLowerCase()) ||
            query.toLowerCase().contains(city.toLowerCase())) {
          
          final countryName = country == 'DE' ? 'Deutschland' : 
                           country == 'AT' ? 'Österreich' : 'Schweiz';
          
          suggestions.add(PlacePrediction(
            description: '$query, $plz $city, $countryName',
            placeId: 'local_${street}_$city'.hashCode.toString(),
          ));
        }
      }
      
      // Häufige deutsche Straßennamen
      final commonStreets = [
        'Hauptstraße', 'Bahnhofstraße', 'Kirchgasse', 'Schulstraße',
        'Dorfstraße', 'Mühlenweg', 'Gartenstraße', 'Waldweg',
        'Lindenstraße', 'Rosenstraße', 'Am Markt', 'Friedhofstraße'
      ];
      
      for (final street in commonStreets) {
        if (street.toLowerCase().contains(query.toLowerCase()) ||
            query.toLowerCase().contains(street.toLowerCase())) {
          suggestions.add(PlacePrediction(
            description: '$query${query.contains(street) ? '' : ', $street'}',
            placeId: 'street_${street.hashCode}',
          ));
        }
      }
      
      // Direkten Input als erste Option hinzufügen
      suggestions.insert(0, PlacePrediction(
        description: query,
        placeId: 'direct_input',
      ));
      
      // Entferne Duplikate
      final uniqueSuggestions = <PlacePrediction>[];
      final seenDescriptions = <String>{};
      
      for (final suggestion in suggestions) {
        if (!seenDescriptions.contains(suggestion.description)) {
          uniqueSuggestions.add(suggestion);
          seenDescriptions.add(suggestion.description);
        }
      }
      
      setState(() {
        _predictions = uniqueSuggestions.take(8).toList(); // Maximal 8 Suggestions
      });
      
      if (uniqueSuggestions.isNotEmpty) {
        _showOverlay();
        debugPrint('📍 ${uniqueSuggestions.length} lokale Suggestions für "$query"');
      }
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
              constraints: const BoxConstraints(maxHeight: 250),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFF14ad9f).withValues(alpha: 0.3)),
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
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
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
    // Sofort Overlay entfernen und Input-Events stoppen
    _clearPredictions();
    _focusNode.unfocus();
    
    widget.controller.text = prediction.description;
    
    // Debug-Information für PlaceID
    debugPrint('🎯 Adresse ausgewählt: ${prediction.description}');
    debugPrint('🆔 PlaceID: ${prediction.placeId}');
    debugPrint('🔍 PlaceID startet mit ChI: ${prediction.placeId.startsWith('ChI')}');
    debugPrint('🔍 PlaceID Länge: ${prediction.placeId.length}');
    debugPrint('🔑 Verfügbarer API Key: ${_apiKey.isNotEmpty ? 'JA' : 'NEIN'}');
    
    // Wenn es eine echte Google Place ID ist, nutze Place Details API
    if (prediction.placeId.startsWith('ChI') || prediction.placeId.length > 20) {
      debugPrint('✅ Nutze Place Details API für echte Google PlaceID');
      _getPlaceDetailsAndParse(prediction.placeId, prediction.description);
    } else {
      debugPrint('⚠️ Nutze Fallback Parser für lokale PlaceID');
      _parseAndSetAddress(prediction.description);
    }
  }

  Future<void> _getPlaceDetailsAndParse(String placeId, String description) async {
    try {
      // Nutze den gleichen API Key wie für Autocomplete
      final apiKey = _apiKey;
      if (apiKey.isEmpty) {
        debugPrint('❌ Google Places API Key nicht gefunden - nutze Fallback');
        _parseAndSetAddress(description);
        return;
      }

      final url = 'https://maps.googleapis.com/maps/api/place/details/json'
          '?place_id=$placeId'
          '&fields=address_components'
          '&language=de'
          '&key=$apiKey';

      debugPrint('🔍 Place Details Request für: $placeId');
      debugPrint('🔑 Place Details API Key (erste 10 Zeichen): ${apiKey.substring(0, math.min(10, apiKey.length))}...');
      debugPrint('🌐 Details URL: ${url.replaceAll(apiKey, 'HIDDEN_API_KEY')}');

      final response = await http.get(Uri.parse(url));
      debugPrint('📡 Place Details Status: ${response.statusCode}');

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        debugPrint('📦 Place Details Response: ${json.encode(data)}');

        if (data['status'] == 'OK' && data['result'] != null) {
          final addressComponents = data['result']['address_components'] as List?;
          
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
              
              debugPrint('🔍 Component: $longName ($shortName) - Types: $types');
              
              if (types.contains('street_number')) {
                streetNumber = longName;
              } else if (types.contains('route')) {
                street = longName;
              } else if (types.contains('locality') && types.contains('political')) {
                // Priorität: locality vor administrative_area_level_3
                city = longName;
              } else if (types.contains('administrative_area_level_3') && city.isEmpty) {
                // Nur als Fallback wenn noch keine locality gefunden
                city = longName;
              } else if (types.contains('postal_code')) {
                postalCode = longName;
              } else if (types.contains('country')) {
                country = shortName;
              }
            }
          }
          
          // Straße mit Hausnummer zusammenfügen
          final fullStreet = streetNumber.isNotEmpty ? '$street $streetNumber' : street;
          
          debugPrint('📍 Place Details extrahiert:');
          debugPrint('🛣️ Straße: "$fullStreet"');
          debugPrint('🏙️ Stadt: "$city"');
          debugPrint('📮 PLZ: "$postalCode"');
          debugPrint('🌍 Land: "$country"');
          
          // Callback mit vollständigen Daten
          widget.onPlaceSelected({
            'street': fullStreet,
            'city': city,
            'postalCode': postalCode,
            'country': country,
            'fullAddress': description,
          });
          
          return; // Erfolgreich abgeschlossen
        } else {
          debugPrint('⚠️ Place Details API Error: ${data['status']} - ${data['error_message'] ?? 'Unbekannter Fehler'}');
        }
      } else {
        debugPrint('❌ Place Details HTTP Error ${response.statusCode}: ${response.body}');
      }
    } catch (e) {
      debugPrint('❌ Place Details Fehler: $e');
    }
    
    // Fallback bei Fehlern
    debugPrint('⚠️ Place Details fehlgeschlagen - nutze Fallback Parser');
    _parseAndSetAddress(description);
  }

  void _clearPredictions() {
    setState(() {
      _predictions = [];
    });
    _removeOverlay();
  }

  void _parseAndSetAddress(String description) {
    try {
      debugPrint('🏠 Parsing Google Places result: "$description"');
      
      // Initialisiere return values
      String street = '';
      String city = '';
      String postalCode = '';
      String country = 'DE'; // Default
      
      // Splits auf Komma für Google Places Format
      final parts = description.split(', ');
      
      if (parts.isNotEmpty) {
        // Erster Teil ist normalerweise die komplette Straße mit Hausnummer
        street = parts[0].trim();
        debugPrint('🛣️ Street extracted: "$street"');
      }
      
      // Durchsuche alle Parts nach PLZ, Stadt und Land
      for (int i = 1; i < parts.length; i++) {
        final part = parts[i].trim();
        debugPrint('🔍 Processing part $i: "$part"');
        
        // Deutsche PLZ Pattern (5 Ziffern) + Stadt
        final plzCityMatch = RegExp(r'^(\d{5})\s+(.+)$').firstMatch(part);
        if (plzCityMatch != null) {
          postalCode = plzCityMatch.group(1)!;
          city = plzCityMatch.group(2)!.trim();
          debugPrint('📮 PLZ + Stadt gefunden: PLZ="$postalCode", Stadt="$city"');
          continue;
        }
        
        // Österreichische PLZ Pattern (4 Ziffern) + Stadt
        final autPlzMatch = RegExp(r'^(\d{4})\s+(.+)$').firstMatch(part);
        if (autPlzMatch != null) {
          postalCode = autPlzMatch.group(1)!;
          city = autPlzMatch.group(2)!.trim();
          country = 'AT';
          debugPrint('📮 Österreich PLZ + Stadt: PLZ="$postalCode", Stadt="$city"');
          continue;
        }
        
        // Schweizer PLZ Pattern (4 Ziffern) + Stadt
        final chPlzMatch = RegExp(r'^(\d{4})\s+(.+)$').firstMatch(part);
        if (chPlzMatch != null && !country.startsWith('AT')) {
          postalCode = chPlzMatch.group(1)!;
          city = chPlzMatch.group(2)!.trim();
          country = 'CH';
          debugPrint('📮 Schweiz PLZ + Stadt: PLZ="$postalCode", Stadt="$city"');
          continue;
        }
        
        // PLZ allein suchen (ohne Stadt)
        final plzAloneMatch = RegExp(r'^(\d{4,5})$').firstMatch(part);
        if (plzAloneMatch != null && postalCode.isEmpty) {
          postalCode = plzAloneMatch.group(1)!;
          debugPrint('📮 PLZ allein gefunden: "$postalCode"');
          continue;
        }
        
        // PLZ irgendwo im Teil finden
        final plzAnywhereMatch = RegExp(r'(\d{4,5})').firstMatch(part);
        if (plzAnywhereMatch != null && postalCode.isEmpty) {
          postalCode = plzAnywhereMatch.group(1)!;
          debugPrint('📮 PLZ irgendwo gefunden: "$postalCode" in "$part"');
        }
        
        // Länder erkennen (explizit)
        final lowerPart = part.toLowerCase();
        if (lowerPart.contains('deutschland') || lowerPart.contains('germany')) {
          country = 'DE';
          debugPrint('🇩🇪 Deutschland erkannt');
        } else if (lowerPart.contains('österreich') || lowerPart.contains('austria')) {
          country = 'AT';
          debugPrint('🇦🇹 Österreich erkannt');
        } else if (lowerPart.contains('schweiz') || lowerPart.contains('switzerland')) {
          country = 'CH';
          debugPrint('🇨🇭 Schweiz erkannt');
        } else if (lowerPart.contains('frankreich') || lowerPart.contains('france')) {
          country = 'FR';
          debugPrint('🇫🇷 Frankreich erkannt');
        } else if (lowerPart.contains('italien') || lowerPart.contains('italy')) {
          country = 'IT';
          debugPrint('🇮🇹 Italien erkannt');
        } else if (lowerPart.contains('spanien') || lowerPart.contains('spain')) {
          country = 'ES';
          debugPrint('🇪🇸 Spanien erkannt');
        }
        
        // Falls noch keine Stadt aber kein PLZ Pattern, könnte es Stadt sein
        if (city.isEmpty && !RegExp(r'\d{4,5}').hasMatch(part) && !lowerPart.contains('deutschland') && !lowerPart.contains('germany')) {
          city = part;
          debugPrint('🏙️ Stadt (Fallback): "$city"');
        }
      }
      
      // PLZ-basierte Länder-Erkennung als Fallback
      if (postalCode.isNotEmpty) {
        final plzNum = int.tryParse(postalCode);
        if (plzNum != null) {
          if (postalCode.length == 5 && plzNum >= 1000 && plzNum <= 99999) {
            if (country == 'DE') {
              // Deutsche PLZ bleiben DE
              debugPrint('🇩🇪 Deutsche PLZ bestätigt: $postalCode');
            }
          } else if (postalCode.length == 4) {
            if (plzNum >= 1000 && plzNum <= 9999) {
              // 4-stellige PLZ könnte AT oder CH sein
              if (country == 'DE') {
                country = plzNum >= 6000 ? 'CH' : 'AT'; // Grosse Vereinfachung
                debugPrint('🎯 PLZ-basierte Länder-Zuordnung: $postalCode -> $country');
              }
            }
          }
        }
      }
      
      // Fallbacks für fehlende Daten
      if (street.isEmpty && description.isNotEmpty) {
        street = description.split(',')[0].trim();
        debugPrint('🛣️ Street (Final Fallback): "$street"');
      }
      
      if (city.isEmpty && parts.length > 1) {
        // Verwende vorletzten Teil als Stadt falls verfügbar
        final candidateCity = parts[parts.length - 2].trim();
        if (!RegExp(r'^\d+').hasMatch(candidateCity)) {
          city = candidateCity;
          debugPrint('🏙️ Stadt (Part Fallback): "$city"');
        }
      }
      
      final result = {
        'street': street,
        'city': city,
        'postalCode': postalCode,
        'country': country, // ISO-Code
        'fullAddress': description,
      };
      
      debugPrint('✅ Final parsed result: $result');
      
      // Callback mit geparsten Daten aufrufen
      widget.onPlaceSelected(result);
      
    } catch (e, stackTrace) {
      debugPrint('❌ Fehler beim Parsen der Adresse: $e');
      debugPrint('📚 StackTrace: $stackTrace');
      
      // Fallback: Verwende die komplette Beschreibung als Straße
      widget.onPlaceSelected({
        'street': description,
        'city': '',
        'postalCode': '',
        'country': 'DE',
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
