import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'task_payment_screen.dart';
import '../../components/ai_chat_widget.dart';
import '../../components/service_info_card.dart';
import '../../components/task_form_components.dart';

class TaskDescriptionScreen extends StatefulWidget {
  final Map<String, dynamic> selectedService;

  const TaskDescriptionScreen({
    super.key,
    required this.selectedService,
  });

  @override
  State<TaskDescriptionScreen> createState() => _TaskDescriptionScreenState();
}

class _TaskDescriptionScreenState extends State<TaskDescriptionScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _locationController = TextEditingController();
  final _budgetController = TextEditingController();
  
  DateTime? _selectedDate;
  TimeOfDay? _startTime;
  TimeOfDay? _endTime;
  String _urgency = 'normal';
  List<String> _selectedTags = <String>[];
  
  // Neue Features für detaillierte Buchung
  String _bookingType = 'fixed'; // 'fixed' oder 'quote'
  double? _providerHourlyRate;
  double? _estimatedHours;
  double? _estimatedTotal;
  
  // KI-Assistent State
  bool _showAIAssistant = false;
  
  final List<String> _availableTags = [
    'Sofort',
    'Flexibel',
    'Wochenende',
    'Abends',
    'Morgens',
    'Einmalig',
    'Regelmäßig',
    'Dringend',
  ];

  @override
  void initState() {
    super.initState();
    _loadProviderHourlyRate();
  }

  /// Lädt den Stundensatz des Anbieters aus der Datenbank
  Future<void> _loadProviderHourlyRate() async {
    try {
      final providerId = widget.selectedService['id'] ?? widget.selectedService['providerId'];
      if (providerId != null) {
        debugPrint('💰 Lade Stundensatz für Provider: $providerId');
        
        // Versuche aus companies Collection zu laden
        final doc = await FirebaseFirestore.instance
            .collection('companies')
            .doc(providerId)
            .get();
            
        if (doc.exists) {
          final data = doc.data() as Map<String, dynamic>;
          final hourlyRate = data['hourlyRate'];
          
          if (hourlyRate != null) {
            setState(() {
              _providerHourlyRate = double.tryParse(hourlyRate.toString());
            });
            debugPrint('✅ Stundensatz geladen: €$_providerHourlyRate/h');
            _calculateEstimatedTotal();
          }
        }
      }
    } catch (e) {
      debugPrint('❌ Fehler beim Laden des Stundensatzes: $e');
    }
  }

  /// Berechnet die geschätzten Gesamtkosten basierend auf Stunden
  void _calculateEstimatedTotal() {
    if (_providerHourlyRate != null && _estimatedHours != null) {
      setState(() {
        _estimatedTotal = _providerHourlyRate! * _estimatedHours!;
      });
      debugPrint('💰 Geschätzte Gesamtkosten: €$_estimatedTotal');
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _locationController.dispose();
    _budgetController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: const Text(
          'Auftrag beschreiben',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w600,
          ),
        ),
        backgroundColor: const Color(0xFF14ad9f),
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            onPressed: () => setState(() => _showAIAssistant = !_showAIAssistant),
            icon: Icon(
              _showAIAssistant ? Icons.close : Icons.auto_awesome,
              color: Colors.white,
            ),
            tooltip: _showAIAssistant ? 'KI-Assistenten schließen' : 'KI-Assistenten öffnen',
          ),
        ],
      ),
      body: _showAIAssistant ? _buildAIAssistant() : _buildManualForm(),
    );
  }

  Widget _buildManualForm() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Service Info Card
          _buildServiceInfoCard(),
          
          const SizedBox(height: 24),
          
          // Task Form
          Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildTitleField(),
                const SizedBox(height: 20),
                
                _buildDescriptionField(),
                const SizedBox(height: 20),
                
                _buildLocationField(),
                const SizedBox(height: 20),
                
                _buildDateTimeSection(),
                const SizedBox(height: 20),
                
                _buildBookingTypeSection(),
                const SizedBox(height: 20),
                
                _buildBudgetField(),
                const SizedBox(height: 20),
                
                _buildUrgencySection(),
                const SizedBox(height: 20),
                
                _buildTagsSection(),
                const SizedBox(height: 32),
                
                _buildContinueButton(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAIAssistant() {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        children: [
          // Service Info Card
          ServiceInfoCard(service: widget.selectedService),
          
          const SizedBox(height: 16),
          
          // KI-Chat Widget
          Expanded(
            child: AIChatWidget(
              title: 'KI-Assistent Modus',
              subtitle: 'Lassen Sie die KI Ihren Auftrag optimieren',
              onTaskGenerated: _handleAIGeneratedTask,
              initialContext: widget.selectedService,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildServiceInfoCard() {
    return ServiceInfoCard(service: widget.selectedService);
  }

  Widget _buildTitleField() {
    return TaskFormField(
      label: 'Titel des Auftrags',
      hintText: 'z.B. Dinner für 6 Personen kochen',
      controller: _titleController,
      validator: (value) {
        if (value == null || value.trim().isEmpty) {
          return 'Bitte geben Sie einen Titel ein';
        }
        return null;
      },
    );
  }

  Widget _buildDescriptionField() {
    return TaskFormField(
      label: 'Beschreibung',
      hintText: 'Beschreiben Sie Ihren Auftrag im Detail...',
      controller: _descriptionController,
      maxLines: 5,
      validator: (value) {
        if (value == null || value.trim().isEmpty) {
          return 'Bitte geben Sie eine Beschreibung ein';
        }
        return null;
      },
    );
  }

  Widget _buildLocationField() {
    return TaskFormField(
      label: 'Ort',
      hintText: 'z.B. Berlin, Mitte oder bei mir zu Hause',
      controller: _locationController,
      prefixIcon: const Icon(Icons.location_on, color: Color(0xFF14ad9f)),
      validator: (value) {
        if (value == null || value.trim().isEmpty) {
          return 'Bitte geben Sie einen Ort an';
        }
        return null;
      },
    );
  }

  Widget _buildDateTimeSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Wann soll der Auftrag durchgeführt werden?',
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 12),
        
        // Datum auswählen
        GestureDetector(
          onTap: _selectDate,
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey[300]!),
            ),
            child: Row(
              children: [
                const Icon(Icons.calendar_today, color: Color(0xFF14ad9f)),
                const SizedBox(width: 8),
                Text(
                  _selectedDate != null
                      ? '${_selectedDate!.day}.${_selectedDate!.month}.${_selectedDate!.year}'
                      : 'Datum wählen',
                  style: TextStyle(
                    color: _selectedDate != null ? Colors.black87 : Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),
        ),
        
        const SizedBox(height: 12),
        
        // Zeit-Eingabe: Von-Bis
        Row(
          children: [
            // Startzeit
            Expanded(
              child: GestureDetector(
                onTap: _selectStartTime,
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey[300]!),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.schedule, color: Color(0xFF14ad9f)),
                      const SizedBox(width: 8),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Von',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[600],
                            ),
                          ),
                          Text(
                            _startTime != null
                                ? '${_startTime!.hour.toString().padLeft(2, '0')}:${_startTime!.minute.toString().padLeft(2, '0')}'
                                : 'Startzeit',
                            style: TextStyle(
                              color: _startTime != null ? Colors.black87 : Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
            
            const SizedBox(width: 12),
            
            // Endzeit
            Expanded(
              child: GestureDetector(
                onTap: _selectEndTime,
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey[300]!),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.schedule_send, color: Color(0xFF14ad9f)),
                      const SizedBox(width: 8),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Bis',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[600],
                            ),
                          ),
                          Text(
                            _endTime != null
                                ? '${_endTime!.hour.toString().padLeft(2, '0')}:${_endTime!.minute.toString().padLeft(2, '0')}'
                                : 'Endzeit',
                            style: TextStyle(
                              color: _endTime != null ? Colors.black87 : Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
        
        // Geschätzte Arbeitszeit anzeigen
        if (_estimatedHours != null) ...[
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF14ad9f).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                const Icon(Icons.access_time, color: Color(0xFF14ad9f), size: 16),
                const SizedBox(width: 8),
                Text(
                  'Geschätzte Arbeitszeit: ${_estimatedHours!.toStringAsFixed(1)} Stunden',
                  style: const TextStyle(
                    color: Color(0xFF14ad9f),
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildBookingTypeSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Buchungstyp',
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 12),
        
        Row(
          children: [
            // Feste Buchung
            Expanded(
              child: GestureDetector(
                onTap: () => setState(() => _bookingType = 'fixed'),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: _bookingType == 'fixed' 
                        ? const Color(0xFF14ad9f).withValues(alpha: 0.1)
                        : Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: _bookingType == 'fixed' 
                          ? const Color(0xFF14ad9f) 
                          : Colors.grey[300]!,
                      width: _bookingType == 'fixed' ? 2 : 1,
                    ),
                  ),
                  child: Column(
                    children: [
                      Icon(
                        Icons.schedule_rounded,
                        color: _bookingType == 'fixed' 
                            ? const Color(0xFF14ad9f) 
                            : Colors.grey[600],
                        size: 24,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Feste Buchung',
                        style: TextStyle(
                          color: _bookingType == 'fixed' 
                              ? const Color(0xFF14ad9f) 
                              : Colors.grey[700],
                          fontWeight: _bookingType == 'fixed' 
                              ? FontWeight.w600 
                              : FontWeight.normal,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Direkt buchen',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            
            const SizedBox(width: 12),
            
            // Angebot anfragen
            Expanded(
              child: GestureDetector(
                onTap: () => setState(() => _bookingType = 'quote'),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: _bookingType == 'quote' 
                        ? const Color(0xFF14ad9f).withValues(alpha: 0.1)
                        : Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: _bookingType == 'quote' 
                          ? const Color(0xFF14ad9f) 
                          : Colors.grey[300]!,
                      width: _bookingType == 'quote' ? 2 : 1,
                    ),
                  ),
                  child: Column(
                    children: [
                      Icon(
                        Icons.request_quote_rounded,
                        color: _bookingType == 'quote' 
                            ? const Color(0xFF14ad9f) 
                            : Colors.grey[600],
                        size: 24,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Angebot anfragen',
                        style: TextStyle(
                          color: _bookingType == 'quote' 
                              ? const Color(0xFF14ad9f) 
                              : Colors.grey[700],
                          fontWeight: _bookingType == 'quote' 
                              ? FontWeight.w600 
                              : FontWeight.normal,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Preis verhandeln',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
        
        // Geschätzte Kosten anzeigen (nur bei fester Buchung)
        if (_bookingType == 'fixed' && _estimatedTotal != null) ...[
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF14ad9f).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: const Color(0xFF14ad9f).withValues(alpha: 0.3),
              ),
            ),
            child: Row(
              children: [
                const Icon(Icons.euro, color: Color(0xFF14ad9f), size: 20),
                const SizedBox(width: 8),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Geschätzte Gesamtkosten',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[700],
                      ),
                    ),
                    Text(
                      '€${_estimatedTotal!.toStringAsFixed(2)}',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF14ad9f),
                      ),
                    ),
                    if (_providerHourlyRate != null)
                      Text(
                        '${_providerHourlyRate!.toStringAsFixed(2)}€/Std × ${_estimatedHours?.toStringAsFixed(1) ?? '0'} Std',
                        style: TextStyle(
                          fontSize: 11,
                          color: Colors.grey[600],
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildBudgetField() {
    return TaskFormField(
      label: 'Budget',
      hintText: 'z.B. 150',
      controller: _budgetController,
      keyboardType: TextInputType.number,
      prefixIcon: const Icon(Icons.euro, color: Color(0xFF14ad9f)),
      suffixText: 'EUR',
      validator: (value) {
        if (value == null || value.trim().isEmpty) {
          return 'Bitte geben Sie ein Budget an';
        }
        if (double.tryParse(value) == null) {
          return 'Bitte geben Sie eine gültige Zahl ein';
        }
        return null;
      },
    );
  }

  Widget _buildUrgencySection() {
    return TaskUrgencySelector(
      label: 'Dringlichkeit',
      selectedUrgency: _urgency,
      onUrgencyChanged: (value) => setState(() => _urgency = value),
    );
  }

  Widget _buildTagsSection() {
    return TaskTagSelector(
      label: 'Tags (optional)',
      availableTags: _availableTags,
      selectedTags: _selectedTags,
      onTagToggle: (tag) {
        setState(() {
          if (_selectedTags.contains(tag)) {
            _selectedTags.remove(tag);
          } else {
            _selectedTags.add(tag);
          }
        });
      },
    );
  }

  Widget _buildContinueButton() {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: _continueToPayment,
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF14ad9f),
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          elevation: 0,
        ),
        child: const Text(
          'Weiter zur Bezahlung',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }

  Future<void> _selectDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: Color(0xFF14ad9f),
            ),
          ),
          child: child!,
        );
      },
    );
    
    if (date != null) {
      setState(() => _selectedDate = date);
    }
  }

  Future<void> _selectStartTime() async {
    final TimeOfDay? time = await showTimePicker(
      context: context,
      initialTime: _startTime ?? TimeOfDay.now(),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: Color(0xFF14ad9f),
            ),
          ),
          child: child!,
        );
      },
    );

    if (time != null) {
      setState(() {
        _startTime = time;
        _calculateEstimatedHours();
      });
    }
  }

  Future<void> _selectEndTime() async {
    final TimeOfDay? time = await showTimePicker(
      context: context,
      initialTime: _endTime ?? TimeOfDay.now(),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: Color(0xFF14ad9f),
            ),
          ),
          child: child!,
        );
      },
    );

    if (time != null) {
      setState(() {
        _endTime = time;
        _calculateEstimatedHours();
      });
    }
  }

  void _calculateEstimatedHours() {
    if (_startTime != null && _endTime != null) {
      // Convert TimeOfDay to minutes
      final startMinutes = _startTime!.hour * 60 + _startTime!.minute;
      final endMinutes = _endTime!.hour * 60 + _endTime!.minute;
      
      // Calculate difference (handle overnight bookings)
      double diffMinutes = (endMinutes - startMinutes).toDouble();
      if (diffMinutes < 0) {
        diffMinutes += 24 * 60; // Add 24 hours for overnight
      }
      
      _estimatedHours = diffMinutes / 60;
      
      // Calculate estimated total if hourly rate is available
      if (_providerHourlyRate != null && _estimatedHours != null) {
        _estimatedTotal = _estimatedHours! * _providerHourlyRate!;
      }
    }
  }


  void _continueToPayment() {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    if (_selectedDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Bitte wählen Sie ein Datum aus'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    // Task-Daten zusammenstellen
    final taskData = {
      'title': _titleController.text.trim(),
      'description': _descriptionController.text.trim(),
      'location': _locationController.text.trim(),
      'budget': double.parse(_budgetController.text),
      'selectedDate': _selectedDate!.toIso8601String(),
      'startTime': _startTime?.toString(),
      'endTime': _endTime?.toString(),
      'estimatedHours': _estimatedHours,
      'estimatedTotal': _estimatedTotal,
      'bookingType': _bookingType,
      'urgency': _urgency,
      'tags': _selectedTags,
      'service': widget.selectedService,
      'createdAt': DateTime.now().toIso8601String(),
    };

    // Weiter zu Step 4 (Payment)
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => TaskPaymentScreen(taskData: taskData),
      ),
    );
  }

  // KI-Generierte Task-Daten verarbeiten
  void _handleAIGeneratedTask(Map<String, dynamic> aiData) {
    debugPrint('🤖 KI-Daten empfangen: $aiData');
    
    setState(() {
      // Übertrage KI-generierte Daten in die Form-Felder
      _titleController.text = aiData['title'] ?? '';
      _descriptionController.text = aiData['description'] ?? '';
      _locationController.text = aiData['location'] ?? '';
      _budgetController.text = aiData['budget']?.toString() ?? '';
      
      // Normalisiere Urgency für App-kompatible Werte
      final aiUrgency = aiData['urgency']?.toString() ?? 'normal';
      _urgency = _normalizeUrgencyForApp(aiUrgency);
      
      _selectedTags = List<String>.from(aiData['tags'] ?? []);
      
      // NEUE: Verarbeite Start- und Endzeit aus AI-Daten
      _processTimeFromAIData(aiData);
      
      // Versuche Datum automatisch zu setzen
      _setDateFromAIData(aiData);
      
      debugPrint('📝 Form-Felder aktualisiert:');
      debugPrint('   Titel: ${_titleController.text}');
      debugPrint('   Beschreibung: ${_descriptionController.text}');
      debugPrint('   Ort: ${_locationController.text}');
      debugPrint('   Budget: ${_budgetController.text}');
      debugPrint('   Dringlichkeit: $_urgency');
      debugPrint('   Tags: $_selectedTags');
      debugPrint('   Datum: $_selectedDate');
      debugPrint('   Start-Zeit: $_startTime');
      debugPrint('   End-Zeit: $_endTime');
      
      // Wechsle zurück zum manuellen Modus, damit User die Daten überprüfen kann
      _showAIAssistant = false;
    });

    // Zeige Erfolgsmeldung
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('KI-Assistent hat Ihren Auftrag erstellt! Titel: "${aiData['title']}" - Sie können ihn jetzt überprüfen und anpassen.'),
        backgroundColor: const Color(0xFF14ad9f),
        duration: const Duration(seconds: 4),
      ),
    );
  }

  String _normalizeUrgencyForApp(String aiUrgency) {
    // Konvertiere KI-Urgency-Werte zu App-kompatiblen Werten
    switch (aiUrgency.toLowerCase()) {
      case 'high':
      case 'urgent':
      case 'dringend':
        return 'high';
      case 'low':
      case 'flexible':
      case 'flexibel':
        return 'low';
      case 'normal':
      default:
        return 'normal';
    }
  }

  /// Verarbeitet Start- und Endzeit aus AI-Daten
  void _processTimeFromAIData(Map<String, dynamic> aiData) {
    debugPrint('⏰ Verarbeite Zeit-Daten aus AI...');
    
    // Direkte Zeit-Daten aus AI-Response
    final startTimeStr = aiData['startTime']?.toString();
    final endTimeStr = aiData['endTime']?.toString();
    
    debugPrint('📝 AI Start-Zeit: $startTimeStr');
    debugPrint('📝 AI End-Zeit: $endTimeStr');
    
    // Parse Start-Zeit
    if (startTimeStr != null) {
      final startTime = _parseTimeString(startTimeStr);
      if (startTime != null) {
        _startTime = startTime;
        debugPrint('✅ Start-Zeit gesetzt: ${startTime.format(context)}');
      }
    }
    
    // Parse End-Zeit
    if (endTimeStr != null) {
      final endTime = _parseTimeString(endTimeStr);
      if (endTime != null) {
        _endTime = endTime;
        debugPrint('✅ End-Zeit gesetzt: ${endTime.format(context)}');
      }
    }
    
    // Falls Start-/End-Zeit nicht direkt verfügbar, versuche aus rawData zu extrahieren
    if (_startTime == null || _endTime == null) {
      final rawData = aiData['rawData'] as Map<String, dynamic>?;
      if (rawData != null) {
        final rawStartTime = rawData['startTime']?.toString();
        final rawEndTime = rawData['endTime']?.toString();
        
        if (rawStartTime != null && _startTime == null) {
          _startTime = _parseTimeString(rawStartTime);
          debugPrint('🔄 Start-Zeit aus rawData: ${_startTime?.format(context)}');
        }
        
        if (rawEndTime != null && _endTime == null) {
          _endTime = _parseTimeString(rawEndTime);
          debugPrint('🔄 End-Zeit aus rawData: ${_endTime?.format(context)}');
        }
      }
    }
    
    // Berechne geschätzte Kosten neu
    _calculateEstimatedTotal();
  }

  /// Hilfsmethode zum Parsen von Zeit-Strings (HH:MM Format)
  TimeOfDay? _parseTimeString(String timeStr) {
    final timePattern = RegExp(r'^(\d{1,2}):(\d{2})$');
    final match = timePattern.firstMatch(timeStr.trim());
    
    if (match != null) {
      final hour = int.tryParse(match.group(1)!) ?? 0;
      final minute = int.tryParse(match.group(2)!) ?? 0;
      
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        return TimeOfDay(hour: hour, minute: minute);
      }
    }
    
    debugPrint('⚠️ Konnte Zeit nicht parsen: "$timeStr"');
    return null;
  }

  void _setDateFromAIData(Map<String, dynamic> aiData) {
    final rawData = aiData['rawData'] as Map<String, dynamic>?;
    final timing = rawData?['timing']?.toString().toLowerCase() ?? '';
    
    // Extrahiere Uhrzeit aus dem Timing-String
    TimeOfDay? extractedTime;
    final timePattern = RegExp(r'(\d{1,2}):(\d{2})(?:\s*uhr)?', caseSensitive: false);
    final timeMatch = timePattern.firstMatch(timing);
    if (timeMatch != null) {
      final hour = int.tryParse(timeMatch.group(1)!) ?? 12;
      final minute = int.tryParse(timeMatch.group(2)!) ?? 0;
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        extractedTime = TimeOfDay(hour: hour, minute: minute);
        debugPrint('⏰ Uhrzeit aus AI-Daten extrahiert: ${hour.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')}');
      }
    }
    
    if (timing.contains('morgen')) {
      _selectedDate = DateTime.now().add(const Duration(days: 1));
      _startTime = extractedTime ?? const TimeOfDay(hour: 12, minute: 0);
      debugPrint('📅 Datum automatisch gesetzt: morgen ($_selectedDate) um ${_startTime?.format(context) ?? '12:00'}');
    } else if (timing.contains('heute')) {
      _selectedDate = DateTime.now();
      _startTime = extractedTime ?? TimeOfDay.now();
      debugPrint('📅 Datum automatisch gesetzt: heute ($_selectedDate) um ${_startTime?.format(context) ?? 'jetzt'}');
    } else if (timing.contains('wochenende')) {
      // Finde das nächste Wochenende
      final now = DateTime.now();
      int daysUntilSaturday = DateTime.saturday - now.weekday;
      if (daysUntilSaturday <= 0) daysUntilSaturday += 7;
      _selectedDate = now.add(Duration(days: daysUntilSaturday));
      _startTime = extractedTime ?? const TimeOfDay(hour: 10, minute: 0);
      debugPrint('📅 Datum automatisch gesetzt: Wochenende ($_selectedDate) um ${_startTime?.format(context) ?? '10:00'}');
    } else if (extractedTime != null) {
      // Nur Uhrzeit angegeben, setze Datum auf heute
      _selectedDate = DateTime.now();
      _startTime = extractedTime;
      debugPrint('📅 Nur Uhrzeit erkannt: heute ($_selectedDate) um ${_startTime?.format(context)}');
    }
  }
}
