import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../dashboard_layout.dart';

class ProjectAssistantScreen extends StatefulWidget {
  final String userId;

  const ProjectAssistantScreen({
    super.key,
    required this.userId,
  });

  @override
  State<ProjectAssistantScreen> createState() => _ProjectAssistantScreenState();
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
    // Debug: Print the received JSON data
    debugPrint('📊 Provider JSON data: $json');
    
    // Try multiple possible locations for profile picture
    String? profilePicture;
    if (json['profilePictureURL'] != null) {
      profilePicture = json['profilePictureURL'];
    } else if (json['profile_picture_url'] != null) {
      profilePicture = json['profile_picture_url'];
    } else if (json['profilePicture'] != null) {
      profilePicture = json['profilePicture'];
    } else if (json['step3'] != null && json['step3']['profilePictureURL'] != null) {
      profilePicture = json['step3']['profilePictureURL'];
    }
    
    // If it's a blob URL, skip it (not a real URL)
    if (profilePicture != null && profilePicture.startsWith('blob:')) {
      profilePicture = null;
    }
    
    debugPrint('🖼️ Profile picture URL found: $profilePicture');
    
    return Provider(
      id: json['id'] ?? json['uid'] ?? '',
      companyName: json['companyName'] ?? json['name'] ?? json['company_name'] ?? '',
      name: json['name'] ?? json['companyName'] ?? '',
      description: json['description'] ?? '',
      location: json['location'] is Map ? json['location'] : null,
      rating: json['rating']?.toDouble(),
      completedProjects: json['completedProjects'] ?? json['completed_projects'],
      completedJobs: json['completedJobs'] ?? json['completed_jobs'],
      services: json['services'] != null ? List<String>.from(json['services']) : null,
      priceRange: json['priceRange'] ?? json['price_range'],
      profilePictureURL: profilePicture,
      reviewCount: json['reviewCount'] ?? json['review_count'],
      isVerified: json['isVerified'] ?? json['is_verified'],
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

class _ProjectAssistantScreenState extends State<ProjectAssistantScreen> {
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
      debugPrint('Error generating questions: $error');
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
      debugPrint('Error finding providers: $error');
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
              
              // Warte und navigiere zurück
              await Future.delayed(const Duration(seconds: 2));
              if (mounted) {
                Navigator.of(context).pop();
              }
            } else {
              throw Exception('Fehler beim Erstellen des Projekts');
            }
          }
        }
      }
    } catch (error) {
      debugPrint('Error creating project: $error');
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

  @override
  Widget build(BuildContext context) {
    return DashboardLayout(
      title: 'KI-Projekt Assistent',
      useGradientBackground: true,
      showBackButton: true,
      body: _buildStepContent(),
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
            color: Colors.transparent,
            border: Border(top: BorderSide(color: Colors.white.withValues(alpha: 0.2))),
          ),
          child: SafeArea(
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _messageController,
                    decoration: InputDecoration(
                      hintText: 'Ihre Nachricht...',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.3)),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.3)),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: const BorderSide(color: Colors.white, width: 2),
                      ),
                      filled: true,
                      fillColor: Colors.white.withValues(alpha: 0.9),
                      hintStyle: TextStyle(color: Colors.black.withValues(alpha: 0.6)),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
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
                    padding: const EdgeInsets.all(12),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildRecommendationsInterface() {
    return Column(
      children: [
        // Header
        Container(
          padding: const EdgeInsets.all(16),
          color: Colors.transparent,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Passende Anbieter gefunden',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Wählen Sie optional Anbieter aus oder fahren Sie direkt fort.',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
        
        // Provider Liste
        Expanded(
          child: _recommendedProviders.isNotEmpty
              ? ListView.builder(
                  padding: const EdgeInsets.all(16),
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
                                ? const Color(0xFF14AD9F).withValues(alpha: 0.05) 
                                : Colors.white,
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Header with Avatar, Name, and Selection
                              Row(
                                children: [
                                  // Profile Picture or Avatar
                                  _buildProviderAvatar(provider),
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
                )
              : const Center(
                  child: Padding(
                    padding: EdgeInsets.all(32),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.search_off,
                          size: 64,
                          color: Colors.white,
                        ),
                        SizedBox(height: 16),
                        Text(
                          'Keine passenden Anbieter gefunden',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w500,
                            color: Colors.white,
                          ),
                        ),
                        SizedBox(height: 8),
                        Text(
                          'Ihr Projekt wird trotzdem öffentlich ausgeschrieben.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
        ),
        
        // Action Buttons
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.transparent,
            border: Border(top: BorderSide(color: Colors.white.withValues(alpha: 0.2))),
          ),
          child: SafeArea(
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {
                      _selectedProviders.clear();
                      _createProject();
                    },
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      side: const BorderSide(color: Colors.white),
                      backgroundColor: Colors.white.withValues(alpha: 0.1),
                    ),
                    child: const Text(
                      'Ohne Auswahl',
                      style: TextStyle(color: Colors.white),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _createProject,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: const Color(0xFF14AD9F),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: Text(
                      _selectedProviders.isEmpty 
                        ? 'Projekt erstellen'
                        : '${_selectedProviders.length} ausgewählt',
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCreatingInterface() {
    return const Center(
      child: Padding(
        padding: EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              strokeWidth: 3,
            ),
            SizedBox(height: 24),
            Text(
              'Projekt wird erstellt...',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            SizedBox(height: 12),
            Text(
              'Die KI erstellt Ihre detaillierte Projektausschreibung',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.white,
                fontSize: 16,
              ),
            ),
          ],
        ),
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
              radius: 20,
              backgroundColor: const Color(0xFF14AD9F),
              child: const Icon(Icons.psychology, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 12),
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: message.isUser 
                    ? const Color(0xFF14AD9F)
                    : Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: message.isUser 
                    ? null 
                    : Border.all(color: Colors.grey.shade200),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Text(
                message.content,
                style: TextStyle(
                  color: message.isUser ? Colors.white : Colors.black87,
                  fontSize: 15,
                  height: 1.4,
                ),
              ),
            ),
          ),
          if (message.isUser) ...[
            const SizedBox(width: 12),
            CircleAvatar(
              radius: 20,
              backgroundColor: Colors.grey.shade400,
              child: const Icon(Icons.person, color: Colors.white, size: 20),
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
            radius: 20,
            backgroundColor: const Color(0xFF14AD9F),
            child: const Icon(Icons.psychology, color: Colors.white, size: 20),
          ),
          const SizedBox(width: 12),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.shade200),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
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
                SizedBox(width: 12),
                Text(
                  'KI denkt nach...',
                  style: TextStyle(
                    fontSize: 15,
                    color: Colors.black87,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProviderAvatar(Provider provider) {
    return Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: Colors.grey.shade300,
          width: 1,
        ),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: provider.profilePictureURL != null && 
               provider.profilePictureURL!.isNotEmpty &&
               provider.profilePictureURL != 'null'
            ? Image.network(
                provider.profilePictureURL!,
                width: 48,
                height: 48,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  // Fallback wenn Bild nicht geladen werden kann
                  return _buildFallbackAvatar(provider);
                },
                loadingBuilder: (context, child, loadingProgress) {
                  if (loadingProgress == null) return child;
                  return Container(
                    width: 48,
                    height: 48,
                    decoration: const BoxDecoration(
                      color: Color(0xFF14AD9F),
                    ),
                    child: const Center(
                      child: SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      ),
                    ),
                  );
                },
              )
            : _buildFallbackAvatar(provider),
      ),
    );
  }

  Widget _buildFallbackAvatar(Provider provider) {
    return Container(
      width: 48,
      height: 48,
      decoration: const BoxDecoration(
        color: Color(0xFF14AD9F),
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
    );
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }
}
