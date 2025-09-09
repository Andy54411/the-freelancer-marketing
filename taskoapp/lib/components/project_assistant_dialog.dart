import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class ProjectAssistantDialog extends StatefulWidget {
  final String userId;

  const ProjectAssistantDialog({
    Key? key,
    required this.userId,
  }) : super(key: key);

  @override
  State<ProjectAssistantDialog> createState() => _ProjectAssistantDialogState();
}

enum AssistantStep {
  chat,
  recommendations,
  creating,
}

class SmartQuestion {
  final String id;
  final String question;
  final String type;
  final bool required;
  final String? placeholder;
  final String category;

  SmartQuestion({
    required this.id,
    required this.question,
    required this.type,
    required this.required,
    this.placeholder,
    required this.category,
  });

  factory SmartQuestion.fromJson(Map<String, dynamic> json) {
    return SmartQuestion(
      id: json['id'] ?? '',
      question: json['question'] ?? '',
      type: json['type'] ?? 'text',
      required: json['required'] ?? false,
      placeholder: json['placeholder'],
      category: json['category'] ?? '',
    );
  }
}

class Provider {
  final String id;
  final String companyName;
  final String name;
  final String? description;
  final Map<String, dynamic>? location;
  final double? rating;
  final int? completedProjects;
  final int? completedJobs;
  final List<String>? services;
  final String? priceRange;
  final String? profilePictureURL;
  final int? reviewCount;
  final bool? isVerified;

  Provider({
    required this.id,
    required this.companyName,
    required this.name,
    this.description,
    this.location,
    this.rating,
    this.completedProjects,
    this.completedJobs,
    this.services,
    this.priceRange,
    this.profilePictureURL,
    this.reviewCount,
    this.isVerified,
  });

  factory Provider.fromJson(Map<String, dynamic> json) {
    return Provider(
      id: json['id'] ?? '',
      companyName: json['companyName'] ?? json['name'] ?? '',
      name: json['name'] ?? '',
      description: json['description'],
      location: json['location'],
      rating: json['rating']?.toDouble(),
      completedProjects: json['completedProjects'],
      completedJobs: json['completedJobs'],
      services: json['services'] != null ? List<String>.from(json['services']) : null,
      priceRange: json['priceRange'],
      profilePictureURL: json['profilePictureURL'],
      reviewCount: json['reviewCount'],
      isVerified: json['isVerified'],
    );
  }
}

class ChatMessage {
  final String id;
  final String content;
  final bool isUser;
  final DateTime timestamp;

  ChatMessage({
    required this.id,
    required this.content,
    required this.isUser,
    required this.timestamp,
  });
}

class _ProjectAssistantDialogState extends State<ProjectAssistantDialog> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  
  AssistantStep _currentStep = AssistantStep.chat;
  List<ChatMessage> _messages = [];
  List<SmartQuestion> _smartQuestions = [];
  List<Provider> _recommendedProviders = [];
  Set<String> _selectedProviders = {};
  
  int _currentQuestionIndex = -1;
  Map<String, String> _questionAnswers = {};
  String _detectedCategory = '';
  String _projectDescription = '';
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _initializeChat();
  }

  void _initializeChat() {
    final welcomeMessage = ChatMessage(
      id: 'welcome-${DateTime.now().millisecondsSinceEpoch}-${DateTime.now().microsecond}',
      content: 'Hallo! Ich helfe Ihnen dabei, Ihr Projekt zu erstellen. Beschreiben Sie mir bitte, was Sie vorhaben.',
      isUser: false,
      timestamp: DateTime.now(),
    );
    setState(() {
      _messages = [welcomeMessage];
    });
  }

  void _addMessage(String content, bool isUser) {
    final message = ChatMessage(
      id: '${DateTime.now().millisecondsSinceEpoch}-${DateTime.now().microsecond}',
      content: content,
      isUser: isUser,
      timestamp: DateTime.now(),
    );
    
    setState(() {
      _messages.add(message);
    });
    
    // Scroll to bottom
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _generateQuestions(String description) async {
    try {
      setState(() => _isLoading = true);
      
      final response = await http.post(
        Uri.parse('https://taskilo.de/api/project-ai'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'action': 'generateSmartQuestions',
          'data': {
            'userInput': description,
          },
        }),
      );

      if (response.statusCode == 200) {
        final result = json.decode(response.body);
        
        if (result['success'] && result['data'] != null) {
          final questions = (result['data']['questions'] as List)
              .map((q) => SmartQuestion.fromJson(q))
              .toList();
          
          setState(() {
            _smartQuestions = questions;
            _detectedCategory = result['data']['detectedCategory'] ?? '';
          });

          if (questions.isNotEmpty) {
            setState(() {
              _currentQuestionIndex = 0;
            });
            _addMessage(questions[0].question, false);
          }
        } else {
          _addMessage(
            'Entschuldigung, es gab einen Fehler beim Analysieren Ihres Projekts. '
            'Können Sie es noch einmal versuchen?',
            false,
          );
        }
      }
    } catch (error) {
      print('Error generating questions: $error');
      _addMessage(
        'Es gab einen Fehler beim Analysieren Ihres Projekts. '
        'Bitte versuchen Sie es später noch einmal.',
        false,
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _handleNextQuestion() {
    final nextIndex = _currentQuestionIndex + 1;
    if (nextIndex < _smartQuestions.length) {
      setState(() {
        _currentQuestionIndex = nextIndex;
      });
      _addMessage(_smartQuestions[nextIndex].question, false);
    } else {
      // Alle Fragen beantwortet - zeige Anbieterempfehlungen
      _addMessage(
        'Perfekt! Lassen Sie mich passende Dienstleister für Ihr Projekt finden...',
        false,
      );
      _findRecommendedProviders();
    }
  }

  Future<void> _findRecommendedProviders() async {
    try {
      setState(() => _isLoading = true);
      
      final response = await http.post(
        Uri.parse('https://taskilo.de/api/project-ai'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'action': 'findProviders',
          'data': {
            'category': _detectedCategory,
            'location': _questionAnswers['location'] ?? '',
            'answers': _questionAnswers,
          },
        }),
      );

      if (response.statusCode == 200) {
        final result = json.decode(response.body);
        
        if (result['success'] && result['data'] != null) {
          final providers = (result['data'] as List)
              .map((p) => Provider.fromJson(p))
              .toList();
          
          setState(() {
            _recommendedProviders = providers;
            _currentStep = AssistantStep.recommendations;
          });

          if (providers.isNotEmpty) {
            _addMessage(
              'Ich habe ${providers.length} passende Dienstleister für Ihr $_detectedCategory-Projekt gefunden. '
              'Sie können optional welche auswählen oder direkt mit der Projekt-Erstellung fortfahren.',
              false,
            );
          } else {
            _addMessage(
              'Leider habe ich keine spezifischen Dienstleister in Ihrer Nähe gefunden, '
              'aber Ihr Projekt wird trotzdem öffentlich ausgeschrieben.',
              false,
            );
          }
        }
      }
    } catch (error) {
      print('Error finding providers: $error');
      _addMessage(
        'Es gab einen Fehler beim Suchen nach Dienstleistern, '
        'aber wir können trotzdem Ihr Projekt erstellen.',
        false,
      );
      setState(() {
        _currentStep = AssistantStep.recommendations;
      });
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _createProject() async {
    setState(() {
      _currentStep = AssistantStep.creating;
      _isLoading = true;
    });

    try {
      // Schritt 1: Detailliertes Projekt generieren
      final detailResponse = await http.post(
        Uri.parse('https://taskilo.de/api/project-ai'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'action': 'createDetailedProject',
          'data': {
            'originalDescription': _projectDescription,
            'category': _detectedCategory,
            'answers': _questionAnswers,
          },
        }),
      );

      if (detailResponse.statusCode == 200) {
        final detailResult = json.decode(detailResponse.body);
        
        if (detailResult['success'] && detailResult['data'] != null) {
          // Schritt 2: Projekt in der Datenbank erstellen
          final projectResponse = await http.post(
            Uri.parse('https://taskilo.de/api/ai-project-creation'),
            headers: {'Content-Type': 'application/json'},
            body: json.encode({
              'userId': widget.userId,
              'projectData': {
                'title': detailResult['data']['title'],
                'description': detailResult['data']['description'],
                'category': detailResult['data']['category'],
                'subcategory': detailResult['data']['subcategory'] ?? detailResult['data']['category'],
                'estimatedBudget': detailResult['data']['estimatedBudget'] ?? 0,
                'timeline': detailResult['data']['timeline'] ?? _questionAnswers['timing'] ?? 'Flexibel',
                'services': detailResult['data']['services'] ?? [],
                'priority': detailResult['data']['priority'] ?? 'medium',
                'originalPrompt': _projectDescription,
                'location': _questionAnswers['location'] ?? '',
                'requirements': detailResult['data']['requirements'] ?? [],
                'specialRequirements': detailResult['data']['specialRequirements'] ?? '',
                'deliverables': detailResult['data']['deliverables'] ?? [],
                'recommendedProviders': _selectedProviders.toList(),
              },
            }),
          );

          if (projectResponse.statusCode == 200) {
            final projectResult = json.decode(projectResponse.body);
            
            if (projectResult['success']) {
              _addMessage(
                '🎉 Perfekt! Ihr Projekt wurde erfolgreich erstellt und ist jetzt für Dienstleister sichtbar.',
                false,
              );
              
              // Warte und schließe das Modal
              await Future.delayed(const Duration(seconds: 2));
              if (mounted) {
                _resetModal();
                Navigator.of(context).pop();
              }
            } else {
              throw Exception('Fehler beim Erstellen des Projekts');
            }
          }
        }
      }
    } catch (error) {
      print('Error creating project: $error');
      _addMessage(
        'Es gab einen Fehler beim Erstellen Ihres Projekts. '
        'Bitte versuchen Sie es noch einmal.',
        false,
      );
      setState(() {
        _currentStep = AssistantStep.chat;
      });
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _sendMessage() async {
    final message = _messageController.text.trim();
    if (message.isEmpty || _isLoading) return;

    _addMessage(message, true);
    _messageController.clear();

    setState(() => _isLoading = true);

    try {
      if (_currentQuestionIndex == -1) {
        // Erste Nachricht - Projektbeschreibung
        _projectDescription = message;
        _addMessage(
          'Verstanden! Lassen Sie mich einige spezifische Fragen stellen, '
          'um Ihr Projekt optimal zu gestalten.',
          false,
        );
        
        await _generateQuestions(message);
      } else {
        // Beantworte aktuelle Frage
        final currentQuestion = _smartQuestions[_currentQuestionIndex];
        _questionAnswers[currentQuestion.id] = message;
        
        _handleNextQuestion();
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _resetModal() {
    setState(() {
      _currentStep = AssistantStep.chat;
      _messages.clear();
      _smartQuestions.clear();
      _recommendedProviders.clear();
      _selectedProviders.clear();
      _currentQuestionIndex = -1;
      _questionAnswers.clear();
      _detectedCategory = '';
      _projectDescription = '';
      _isLoading = false;
    });
    // Re-initialize chat
    _initializeChat();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      child: Container(
        width: MediaQuery.of(context).size.width * 0.9,
        height: MediaQuery.of(context).size.height * 0.8,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          color: Colors.white,
        ),
        child: Column(
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                color: Color(0xFF14AD9F),
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(12),
                  topRight: Radius.circular(12),
                ),
              ),
              child: Row(
                children: [
                  const Icon(Icons.psychology, color: Colors.white),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'KI-Projekt Assistent von Taskilo',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () {
                      _resetModal();
                      Navigator.of(context).pop();
                    },
                    icon: const Icon(Icons.close, color: Colors.white),
                  ),
                ],
              ),
            ),
            
            // Content basierend auf Step
            Expanded(
              child: _buildStepContent(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStepContent() {
    switch (_currentStep) {
      case AssistantStep.chat:
        return _buildChatInterface();
      case AssistantStep.recommendations:
        return _buildRecommendationsInterface();
      case AssistantStep.creating:
        return _buildCreatingInterface();
    }
  }

  Widget _buildChatInterface() {
    return Column(
      children: [
        // Chat Messages
        Expanded(
          child: ListView.builder(
            controller: _scrollController,
            padding: const EdgeInsets.all(16),
            itemCount: _messages.length + (_isLoading ? 1 : 0),
            itemBuilder: (context, index) {
              if (index == _messages.length && _isLoading) {
                return _buildLoadingMessage();
              }
              
              final message = _messages[index];
              return _buildChatMessage(message);
            },
          ),
        ),
        
        // Input Area
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            border: Border(top: BorderSide(color: Colors.grey.shade300)),
          ),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _messageController,
                  decoration: const InputDecoration(
                    hintText: 'Ihre Nachricht...',
                    border: OutlineInputBorder(),
                  ),
                  maxLines: null,
                  onSubmitted: (_) => _sendMessage(),
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                onPressed: _isLoading ? null : _sendMessage,
                icon: const Icon(Icons.send),
                style: IconButton.styleFrom(
                  backgroundColor: const Color(0xFF14AD9F),
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildRecommendationsInterface() {
    return Column(
      children: [
        // Provider Liste
        Expanded(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  'Passende Anbieter gefunden',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
              ),
              
              if (_recommendedProviders.isNotEmpty) ...[
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: _recommendedProviders.length,
                    itemBuilder: (context, index) {
                      final provider = _recommendedProviders[index];
                      final isSelected = _selectedProviders.contains(provider.id);
                      
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        elevation: 2,
                        child: InkWell(
                          onTap: () {
                            setState(() {
                              if (isSelected) {
                                _selectedProviders.remove(provider.id);
                              } else {
                                _selectedProviders.add(provider.id);
                              }
                            });
                          },
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: isSelected 
                                    ? const Color(0xFF14AD9F) 
                                    : Colors.grey.shade300,
                                width: isSelected ? 2 : 1,
                              ),
                              color: isSelected 
                                  ? const Color(0xFF14AD9F).withOpacity(0.05) 
                                  : Colors.white,
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Header with Avatar, Name, and Selection
                                Row(
                                  children: [
                                    // Profile Picture or Avatar
                                    Container(
                                      width: 48,
                                      height: 48,
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF14AD9F),
                                        borderRadius: BorderRadius.circular(24),
                                      ),
                                      child: Center(
                                        child: Text(
                                          provider.companyName.isNotEmpty 
                                              ? provider.companyName[0].toUpperCase()
                                              : 'U',
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 18,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    
                                    // Company info
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            children: [
                                              Expanded(
                                                child: Text(
                                                  provider.companyName,
                                                  style: const TextStyle(
                                                    fontSize: 16,
                                                    fontWeight: FontWeight.w600,
                                                  ),
                                                  overflow: TextOverflow.ellipsis,
                                                ),
                                              ),
                                              if (provider.isVerified == true)
                                                Container(
                                                  margin: const EdgeInsets.only(left: 8),
                                                  padding: const EdgeInsets.symmetric(
                                                    horizontal: 6, 
                                                    vertical: 2,
                                                  ),
                                                  decoration: BoxDecoration(
                                                    color: Colors.green.shade100,
                                                    borderRadius: BorderRadius.circular(10),
                                                    border: Border.all(
                                                      color: Colors.green.shade300,
                                                    ),
                                                  ),
                                                  child: Row(
                                                    mainAxisSize: MainAxisSize.min,
                                                    children: [
                                                      Icon(
                                                        Icons.verified,
                                                        size: 12,
                                                        color: Colors.green.shade800,
                                                      ),
                                                      const SizedBox(width: 2),
                                                      Text(
                                                        'Verifiziert',
                                                        style: TextStyle(
                                                          fontSize: 10,
                                                          fontWeight: FontWeight.w500,
                                                          color: Colors.green.shade800,
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                ),
                                            ],
                                          ),
                                          
                                          // Rating and Status
                                          const SizedBox(height: 4),
                                          Wrap(
                                            spacing: 8,
                                            runSpacing: 4,
                                            children: [
                                              // Rating
                                              if (provider.rating != null && provider.rating! > 0) ...[
                                                Row(
                                                  mainAxisSize: MainAxisSize.min,
                                                  children: [
                                                    Icon(
                                                      Icons.star,
                                                      size: 14,
                                                      color: Colors.amber.shade600,
                                                    ),
                                                    const SizedBox(width: 2),
                                                    Text(
                                                      provider.rating!.toStringAsFixed(1),
                                                      style: const TextStyle(
                                                        fontSize: 12,
                                                        fontWeight: FontWeight.w500,
                                                      ),
                                                    ),
                                                    if (provider.reviewCount != null && provider.reviewCount! > 0)
                                                      Text(
                                                        ' (${provider.reviewCount})',
                                                        style: TextStyle(
                                                          fontSize: 11,
                                                          color: Colors.grey.shade600,
                                                        ),
                                                      ),
                                                  ],
                                                ),
                                              ] else ...[
                                                Container(
                                                  padding: const EdgeInsets.symmetric(
                                                    horizontal: 6, 
                                                    vertical: 2,
                                                  ),
                                                  decoration: BoxDecoration(
                                                    color: Colors.grey.shade100,
                                                    borderRadius: BorderRadius.circular(8),
                                                  ),
                                                  child: Text(
                                                    'Noch keine Bewertungen',
                                                    style: TextStyle(
                                                      fontSize: 10,
                                                      color: Colors.grey.shade600,
                                                    ),
                                                  ),
                                                ),
                                              ],
                                              
                                              // Completed Jobs Badge
                                              if (provider.completedJobs != null) ...[
                                                if (provider.completedJobs! >= 5)
                                                  Container(
                                                    padding: const EdgeInsets.symmetric(
                                                      horizontal: 6, 
                                                      vertical: 2,
                                                    ),
                                                    decoration: BoxDecoration(
                                                      color: Colors.blue.shade100,
                                                      borderRadius: BorderRadius.circular(8),
                                                      border: Border.all(
                                                        color: Colors.blue.shade300,
                                                      ),
                                                    ),
                                                    child: Row(
                                                      mainAxisSize: MainAxisSize.min,
                                                      children: [
                                                        Icon(
                                                          Icons.check_circle,
                                                          size: 10,
                                                          color: Colors.blue.shade800,
                                                        ),
                                                        const SizedBox(width: 2),
                                                        Text(
                                                          '${provider.completedJobs} Projekte erfolgreich',
                                                          style: TextStyle(
                                                            fontSize: 10,
                                                            fontWeight: FontWeight.w500,
                                                            color: Colors.blue.shade800,
                                                          ),
                                                        ),
                                                      ],
                                                    ),
                                                  )
                                                else if (provider.completedJobs! > 0)
                                                  Container(
                                                    padding: const EdgeInsets.symmetric(
                                                      horizontal: 6, 
                                                      vertical: 2,
                                                    ),
                                                    decoration: BoxDecoration(
                                                      color: Colors.yellow.shade100,
                                                      borderRadius: BorderRadius.circular(8),
                                                      border: Border.all(
                                                        color: Colors.yellow.shade300,
                                                      ),
                                                    ),
                                                    child: Row(
                                                      mainAxisSize: MainAxisSize.min,
                                                      children: [
                                                        Icon(
                                                          Icons.check_circle_outline,
                                                          size: 10,
                                                          color: Colors.yellow.shade800,
                                                        ),
                                                        const SizedBox(width: 2),
                                                        Text(
                                                          '${provider.completedJobs} Projekt${provider.completedJobs! > 1 ? 'e' : ''}',
                                                          style: TextStyle(
                                                            fontSize: 10,
                                                            fontWeight: FontWeight.w500,
                                                            color: Colors.yellow.shade800,
                                                          ),
                                                        ),
                                                      ],
                                                    ),
                                                  )
                                                else
                                                  Container(
                                                    padding: const EdgeInsets.symmetric(
                                                      horizontal: 6, 
                                                      vertical: 2,
                                                    ),
                                                    decoration: BoxDecoration(
                                                      color: Colors.purple.shade100,
                                                      borderRadius: BorderRadius.circular(8),
                                                      border: Border.all(
                                                        color: Colors.purple.shade300,
                                                      ),
                                                    ),
                                                    child: Row(
                                                      mainAxisSize: MainAxisSize.min,
                                                      children: [
                                                        Icon(
                                                          Icons.info_outline,
                                                          size: 10,
                                                          color: Colors.purple.shade800,
                                                        ),
                                                        const SizedBox(width: 2),
                                                        Text(
                                                          'Neues Unternehmen',
                                                          style: TextStyle(
                                                            fontSize: 10,
                                                            fontWeight: FontWeight.w500,
                                                            color: Colors.purple.shade800,
                                                          ),
                                                        ),
                                                      ],
                                                    ),
                                                  ),
                                              ],
                                            ],
                                          ),
                                        ],
                                      ),
                                    ),
                                    
                                    // Selection indicator
                                    Icon(
                                      isSelected ? Icons.check_circle : Icons.radio_button_unchecked,
                                      color: isSelected 
                                          ? const Color(0xFF14AD9F) 
                                          : Colors.grey.shade400,
                                      size: 24,
                                    ),
                                  ],
                                ),
                                
                                // Location
                                if (provider.location != null) ...[
                                  const SizedBox(height: 8),
                                  Row(
                                    children: [
                                      Icon(
                                        Icons.location_on,
                                        size: 14,
                                        color: Colors.grey.shade600,
                                      ),
                                      const SizedBox(width: 4),
                                      Expanded(
                                        child: Text(
                                          '${provider.location!['city'] ?? ''} ${provider.location!['postalCode'] ?? ''}'.trim(),
                                          style: TextStyle(
                                            fontSize: 12,
                                            color: Colors.grey.shade600,
                                          ),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                                
                                // Description
                                if (provider.description != null && provider.description!.isNotEmpty) ...[
                                  const SizedBox(height: 8),
                                  Text(
                                    provider.description!,
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.grey.shade700,
                                      height: 1.3,
                                    ),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                                
                                // Price Range
                                if (provider.priceRange != null && provider.priceRange!.isNotEmpty) ...[
                                  const SizedBox(height: 8),
                                  Text(
                                    provider.priceRange!,
                                    style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      color: Color(0xFF14AD9F),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ] else ...[
                const Expanded(
                  child: Center(
                    child: Text('Keine passenden Anbieter gefunden.'),
                  ),
                ),
              ],
            ],
          ),
        ),
        
        // Action Buttons
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            border: Border(top: BorderSide(color: Colors.grey.shade300)),
          ),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () {
                    _selectedProviders.clear();
                    _createProject();
                  },
                  child: const Text('Ohne Auswahl fortfahren'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton(
                  onPressed: _createProject,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF14AD9F),
                    foregroundColor: Colors.white,
                  ),
                  child: Text(
                    'Mit ${_selectedProviders.length} Anbieter${_selectedProviders.length != 1 ? 'n' : ''} fortfahren',
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildCreatingInterface() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF14AD9F)),
          ),
          SizedBox(height: 16),
          Text(
            'Projekt wird erstellt...',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          SizedBox(height: 8),
          Text(
            'Die KI erstellt basierend auf Ihren Antworten eine\ndetaillierte Projektausschreibung',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey),
          ),
        ],
      ),
    );
  }

  Widget _buildChatMessage(ChatMessage message) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: message.isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        children: [
          if (!message.isUser) ...[
            CircleAvatar(
              radius: 16,
              backgroundColor: const Color(0xFF14AD9F),
              child: const Icon(Icons.psychology, color: Colors.white, size: 16),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: message.isUser 
                    ? const Color(0xFF14AD9F)
                    : Colors.grey.shade100,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                message.content,
                style: TextStyle(
                  color: message.isUser ? Colors.white : Colors.black87,
                ),
              ),
            ),
          ),
          if (message.isUser) ...[
            const SizedBox(width: 8),
            CircleAvatar(
              radius: 16,
              backgroundColor: Colors.grey.shade400,
              child: const Icon(Icons.person, color: Colors.white, size: 16),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildLoadingMessage() {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 16,
            backgroundColor: const Color(0xFF14AD9F),
            child: const Icon(Icons.psychology, color: Colors.white, size: 16),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF14AD9F)),
                  ),
                ),
                SizedBox(width: 8),
                Text('KI denkt nach...'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }
}
