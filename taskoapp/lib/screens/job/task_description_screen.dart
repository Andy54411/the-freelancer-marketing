import 'package:flutter/material.dart';
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
  TimeOfDay? _selectedTime;
  String _urgency = 'normal';
  List<String> _selectedTags = <String>[];
  
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
    return TaskDateTimeSelector(
      label: 'Wann soll der Auftrag durchgeführt werden?',
      selectedDate: _selectedDate,
      selectedTime: _selectedTime,
      onDateTap: _selectDate,
      onTimeTap: _selectTime,
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

  Future<void> _selectTime() async {
    final time = await showTimePicker(
      context: context,
      initialTime: _selectedTime ?? TimeOfDay.now(),
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
      setState(() => _selectedTime = time);
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
      'selectedTime': _selectedTime?.toString(),
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

  void _setDateFromAIData(Map<String, dynamic> aiData) {
    final rawData = aiData['rawData'] as Map<String, dynamic>?;
    final timing = rawData?['timing']?.toString().toLowerCase() ?? '';
    
    if (timing.contains('morgen')) {
      _selectedDate = DateTime.now().add(const Duration(days: 1));
      _selectedTime = const TimeOfDay(hour: 12, minute: 0); // Standard-Zeit 12:00
      debugPrint('📅 Datum automatisch gesetzt: morgen ($_selectedDate)');
    } else if (timing.contains('heute')) {
      _selectedDate = DateTime.now();
      _selectedTime = TimeOfDay.now();
      debugPrint('📅 Datum automatisch gesetzt: heute ($_selectedDate)');
    } else if (timing.contains('wochenende')) {
      // Finde das nächste Wochenende
      final now = DateTime.now();
      int daysUntilSaturday = DateTime.saturday - now.weekday;
      if (daysUntilSaturday <= 0) daysUntilSaturday += 7;
      _selectedDate = now.add(Duration(days: daysUntilSaturday));
      _selectedTime = const TimeOfDay(hour: 10, minute: 0);
      debugPrint('📅 Datum automatisch gesetzt: Wochenende ($_selectedDate)');
    }
  }
}
