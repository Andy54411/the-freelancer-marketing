import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../services/auth_service.dart';
import '../../models/user_model.dart';
import '../../widgets/taskilo_place_autocomplete.dart';
import '../job/task_description_screen.dart';

class RegisterScreen extends StatefulWidget {
  final Map<String, dynamic>? selectedService; // Optional: Service-Daten für Task-Erstellung
  
  const RegisterScreen({super.key, this.selectedService});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _streetController = TextEditingController();
  final _cityController = TextEditingController();
  final _postalCodeController = TextEditingController();
  
  bool _isLoading = false;
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _agreesToNewsletter = false;
  bool _agreeToTerms = false;
  final UserType _selectedUserType = UserType.customer;
  String _selectedCountryCode = '+49';
  String _selectedCountry = 'DE';
  DateTime? _selectedDateOfBirth;

  final List<Map<String, String>> _countryCodes = [
    {'country': 'Deutschland', 'code': '+49', 'flag': '🇩🇪', 'iso': 'DE'},
    {'country': 'Österreich', 'code': '+43', 'flag': '🇦🇹', 'iso': 'AT'},
    {'country': 'Schweiz', 'code': '+41', 'flag': '🇨🇭', 'iso': 'CH'},
    {'country': 'Frankreich', 'code': '+33', 'flag': '🇫🇷', 'iso': 'FR'},
    {'country': 'Italien', 'code': '+39', 'flag': '🇮🇹', 'iso': 'IT'},
    {'country': 'Spanien', 'code': '+34', 'flag': '🇪🇸', 'iso': 'ES'},
    {'country': 'Vereinigtes Königreich', 'code': '+44', 'flag': '🇬🇧', 'iso': 'GB'},
    {'country': 'Polen', 'code': '+48', 'flag': '🇵🇱', 'iso': 'PL'},
  ];

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _firstNameController.dispose();
    _lastNameController.dispose();
    _phoneController.dispose();
    _streetController.dispose();
    _cityController.dispose();
    _postalCodeController.dispose();
    super.dispose();
  }

  Future<void> _launchURL(String url) async {
    if (await canLaunchUrl(Uri.parse(url))) {
      await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    } else {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Link konnte nicht geöffnet werden'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _register() async {
    if (!_formKey.currentState!.validate()) return;

    if (_passwordController.text != _confirmPasswordController.text) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Passwörter stimmen nicht überein'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    if (!_agreeToTerms) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Bitte stimmen Sie den Nutzungsbedingungen zu'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    if (_selectedUserType == UserType.serviceProvider && _selectedDateOfBirth == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Geburtsdatum ist für Anbieter erforderlich'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final authService = context.read<AuthService>();
      final phoneNumber = '$_selectedCountryCode${_phoneController.text.replaceAll(RegExp(r'\D'), '')}';
      
      await authService.registerUser(
        email: _emailController.text.trim(),
        password: _passwordController.text,
        firstName: _firstNameController.text.trim(),
        lastName: _lastNameController.text.trim(),
        phoneNumber: phoneNumber,
        street: _streetController.text.trim(),
        city: _cityController.text.trim(),
        postalCode: _postalCodeController.text.trim(),
        country: _selectedCountry,
        termsAccepted: _agreeToTerms,
        privacyAccepted: _agreeToTerms, // Gleicher Wert wie Terms
        newsletterSubscribed: _agreesToNewsletter,
        userType: _selectedUserType,
      );
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Registrierung erfolgreich! Jetzt können Sie Ihren ersten Auftrag erstellen.'),
            backgroundColor: Color(0xFF14ad9f),
          ),
        );
        
        // Nach Registrierung zu Task Description (Step 3) weiterleiten
        // Verwende echte Service-Daten falls vorhanden, sonst Demo-Daten
        final serviceData = widget.selectedService ?? {
          'displayName': 'Demo Service',
          'category': 'Allgemein',
          'photoURL': null,
          'rating': 4.5,
          'reviewCount': 10,
        };
        
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (context) => TaskDescriptionScreen(selectedService: serviceData),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        String errorMessage;
        
        // Spezifische Firebase-Fehlerbehandlung
        if (e.toString().contains('email-already-in-use')) {
          errorMessage = 'Diese E-Mail-Adresse wird bereits verwendet';
        } else if (e.toString().contains('weak-password')) {
          errorMessage = 'Das Passwort ist zu schwach';
        } else if (e.toString().contains('invalid-email')) {
          errorMessage = 'Ungültige E-Mail-Adresse';
        } else if (e.toString().contains('network-request-failed')) {
          errorMessage = 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung';
        } else if (e.toString().contains('too-many-requests')) {
          errorMessage = 'Zu viele Versuche. Bitte warten Sie einen Moment';
        } else if (e.toString().contains('operation-not-allowed')) {
          errorMessage = 'E-Mail-Registrierung ist nicht aktiviert';
        } else if (e.toString().contains('internal error')) {
          errorMessage = 'Firebase-Konfigurationsfehler. Bitte versuchen Sie es später erneut';
        } else {
          errorMessage = 'Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut';
        }
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMessage),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 4),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFE0F2F1), // Passend zum Gradient
      appBar: AppBar(
        title: const Text(
          'Registrieren',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        backgroundColor: const Color(0xFF14ad9f),
        elevation: 0,
        foregroundColor: Colors.white,
        centerTitle: true,
      ),
      body: SafeArea(
        child: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Color(0xFFF0F9FF),
                Color(0xFFE0F2F1),
              ],
            ),
          ),
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 12),
                  
                  // Header with Logo
                  Center(
                    child: TweenAnimationBuilder<double>(
                      key: ValueKey(DateTime.now().millisecondsSinceEpoch),
                      tween: Tween<double>(begin: 0, end: 1),
                      duration: const Duration(seconds: 2),
                      builder: (context, value, child) {
                        return Transform.rotate(
                          angle: value * 2 * 3.14159 * 1, // Genau 1 Umdrehung
                          child: Container(
                            width: 100,
                            height: 100,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(20),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.1),
                                  blurRadius: 10,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(20),
                              child: Image.asset(
                                'assets/images/taskilo_logo.jpg',
                                fit: BoxFit.cover,
                                errorBuilder: (context, error, stackTrace) {
                                  // Fallback wenn Logo nicht gefunden wird
                                  return Container(
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF14ad9f),
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: const Icon(
                                      Icons.task_alt,
                                      size: 50,
                                      color: Colors.white,
                                    ),
                                  );
                                },
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 12),
                  
                  Text(
                    'Neues Konto erstellen',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF14ad9f),
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 4),
                  Text(
                        'Erstelle dein Taskilo-Konto',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.grey.shade600,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 24),
                      
                      // Name Fields
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _firstNameController,
                              decoration: const InputDecoration(
                                labelText: 'Vorname',
                                prefixIcon: Icon(Icons.person, color: Color(0xFF14ad9f)),
                                border: OutlineInputBorder(),
                              ),
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'Vorname erforderlich';
                                }
                                return null;
                              },
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: TextFormField(
                              controller: _lastNameController,
                              decoration: const InputDecoration(
                                labelText: 'Nachname',
                                prefixIcon: Icon(Icons.person_outline, color: Color(0xFF14ad9f)),
                                border: OutlineInputBorder(),
                              ),
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'Nachname erforderlich';
                                }
                                return null;
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      
                      // E-Mail Feld
                      TextFormField(
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        decoration: const InputDecoration(
                          labelText: 'E-Mail-Adresse',
                          prefixIcon: Icon(Icons.email, color: Color(0xFF14ad9f)),
                          border: OutlineInputBorder(),
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'E-Mail erforderlich';
                          }
                          if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(value)) {
                            return 'Ungültige E-Mail-Adresse';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      
                      // Phone Field mit Country Code
                      Row(
                        children: [
                          Expanded(
                            flex: 2,
                            child: DropdownButtonFormField<String>(
                              value: _selectedCountryCode,
                              decoration: const InputDecoration(
                                labelText: 'Land',
                                border: OutlineInputBorder(),
                              ),
                              items: _countryCodes.map((country) {
                                return DropdownMenuItem<String>(
                                  value: country['code'],
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(country['flag']!),
                                      const SizedBox(width: 4),
                                      Flexible(
                                        child: Text(
                                          country['code']!,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              }).toList(),
                              onChanged: (String? value) {
                                setState(() {
                                  _selectedCountryCode = value!;
                                  _selectedCountry = _countryCodes.firstWhere(
                                    (country) => country['code'] == value,
                                  )['iso']!;
                                });
                              },
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            flex: 3,
                            child: TextFormField(
                              controller: _phoneController,
                              keyboardType: TextInputType.phone,
                              decoration: const InputDecoration(
                                labelText: 'Telefonnummer',
                                prefixIcon: Icon(Icons.phone, color: Color(0xFF14ad9f)),
                                border: OutlineInputBorder(),
                              ),
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'Telefon erforderlich';
                                }
                                return null;
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      
                      // Address Fields mit Google Places
                      TaskiloPlaceAutocomplete(
                        controller: _streetController,
                        labelText: 'Straße und Hausnummer',
                        prefixIcon: Icons.home,
                        onPlaceSelected: (addressData) {
                          // Automatisches Ausfüllen der anderen Felder
                          if (addressData['city']?.isNotEmpty == true) {
                            _cityController.text = addressData['city']!;
                          }
                          if (addressData['postalCode']?.isNotEmpty == true) {
                            _postalCodeController.text = addressData['postalCode']!;
                          }
                          if (addressData['country']?.isNotEmpty == true) {
                            // Setze das Land basierend auf der Auswahl
                            final countryIso = addressData['country']!;
                            final countryData = _countryCodes.firstWhere(
                              (country) => country['iso'] == countryIso,
                              orElse: () => _countryCodes.first,
                            );
                            setState(() {
                              _selectedCountry = countryIso;
                              _selectedCountryCode = countryData['code']!;
                            });
                          }
                        },
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Adresse erforderlich';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      
                      Row(
                        children: [
                          Expanded(
                            flex: 1,
                            child: TextFormField(
                              controller: _postalCodeController,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(
                                labelText: 'PLZ',
                                prefixIcon: Icon(Icons.location_on, color: Color(0xFF14ad9f)),
                                border: OutlineInputBorder(),
                              ),
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'PLZ erforderlich';
                                }
                                return null;
                              },
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            flex: 2,
                            child: TextFormField(
                              controller: _cityController,
                              decoration: const InputDecoration(
                                labelText: 'Stadt',
                                prefixIcon: Icon(Icons.location_city, color: Color(0xFF14ad9f)),
                                border: OutlineInputBorder(),
                              ),
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'Stadt erforderlich';
                                }
                                return null;
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      
                      // Date of Birth (required for service providers)
                      if (_selectedUserType == UserType.serviceProvider)
                        InkWell(
                          onTap: () async {
                            final date = await showDatePicker(
                              context: context,
                              initialDate: DateTime.now().subtract(const Duration(days: 6570)), // 18 Jahre
                              firstDate: DateTime(1900),
                              lastDate: DateTime.now().subtract(const Duration(days: 6570)),
                            );
                            if (date != null) {
                              setState(() {
                                _selectedDateOfBirth = date;
                              });
                            }
                          },
                          child: Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              border: Border.all(color: Colors.grey.shade400),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.calendar_today, color: Color(0xFF14ad9f)),
                                const SizedBox(width: 12),
                                Text(
                                  _selectedDateOfBirth != null
                                      ? '${_selectedDateOfBirth!.day}.${_selectedDateOfBirth!.month}.${_selectedDateOfBirth!.year}'
                                      : 'Geburtsdatum (erforderlich für Anbieter)',
                                  style: TextStyle(
                                    color: _selectedDateOfBirth != null 
                                        ? Colors.black87 
                                        : Colors.grey.shade600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      if (_selectedUserType == UserType.serviceProvider)
                        const SizedBox(height: 16),
                      
                      // Password Fields
                      TextFormField(
                        controller: _passwordController,
                        obscureText: _obscurePassword,
                        decoration: InputDecoration(
                          labelText: 'Passwort',
                          prefixIcon: const Icon(Icons.lock, color: Color(0xFF14ad9f)),
                          suffixIcon: IconButton(
                            icon: Icon(_obscurePassword ? Icons.visibility : Icons.visibility_off),
                            onPressed: () {
                              setState(() {
                                _obscurePassword = !_obscurePassword;
                              });
                            },
                          ),
                          border: const OutlineInputBorder(),
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Passwort erforderlich';
                          }
                          if (value.length < 6) {
                            return 'Passwort muss mindestens 6 Zeichen haben';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      
                      TextFormField(
                        controller: _confirmPasswordController,
                        obscureText: _obscureConfirmPassword,
                        decoration: InputDecoration(
                          labelText: 'Passwort bestätigen',
                          prefixIcon: const Icon(Icons.lock_outline, color: Color(0xFF14ad9f)),
                          suffixIcon: IconButton(
                            icon: Icon(_obscureConfirmPassword ? Icons.visibility : Icons.visibility_off),
                            onPressed: () {
                              setState(() {
                                _obscureConfirmPassword = !_obscureConfirmPassword;
                              });
                            },
                          ),
                          border: const OutlineInputBorder(),
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Passwort-Bestätigung erforderlich';
                          }
                          if (value != _passwordController.text) {
                            return 'Passwörter stimmen nicht überein';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      
                      // Newsletter Checkbox
                      CheckboxListTile(
                        title: const Text('Newsletter abonnieren'),
                        subtitle: const Text('Erhalte Updates zu neuen Features'),
                        value: _agreesToNewsletter,
                        activeColor: const Color(0xFF14ad9f),
                        onChanged: (bool? value) {
                          setState(() {
                            _agreesToNewsletter = value ?? false;
                          });
                        },
                      ),
                      
                      // Terms Checkbox
                      Row(
                        children: [
                          Checkbox(
                            value: _agreeToTerms,
                            activeColor: const Color(0xFF14ad9f),
                            onChanged: (bool? value) {
                              setState(() {
                                _agreeToTerms = value ?? false;
                              });
                            },
                          ),
                          Expanded(
                            child: RichText(
                              text: TextSpan(
                                style: const TextStyle(
                                  fontSize: 14,
                                  color: Colors.black87,
                                ),
                                children: [
                                  const TextSpan(text: 'Ich stimme den '),
                                  WidgetSpan(
                                    child: GestureDetector(
                                      onTap: () => _launchURL('https://taskilo.de/agb'),
                                      child: const Text(
                                        'Nutzungsbedingungen',
                                        style: TextStyle(
                                          color: Color(0xFF14ad9f),
                                          decoration: TextDecoration.underline,
                                          fontSize: 14,
                                        ),
                                      ),
                                    ),
                                  ),
                                  const TextSpan(text: ' und '),
                                  WidgetSpan(
                                    child: GestureDetector(
                                      onTap: () => _launchURL('https://taskilo.de/datenschutz'),
                                      child: const Text(
                                        'Datenschutzbestimmungen',
                                        style: TextStyle(
                                          color: Color(0xFF14ad9f),
                                          decoration: TextDecoration.underline,
                                          fontSize: 14,
                                        ),
                                      ),
                                    ),
                                  ),
                                  const TextSpan(text: ' zu'),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                      
                      // Register Button
                      SizedBox(
                        height: 50,
                        child: ElevatedButton(
                          onPressed: _isLoading ? null : _register,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF14ad9f),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            elevation: 2,
                          ),
                          child: _isLoading
                              ? const CircularProgressIndicator(
                                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                )
                              : const Text(
                                  'Konto erstellen',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      
                      // Login Link
                      TextButton(
                        onPressed: () {
                          Navigator.of(context).pop();
                        },
                        child: RichText(
                          text: const TextSpan(
                            text: 'Bereits ein Konto? ',
                            style: TextStyle(color: Colors.grey),
                            children: [
                              TextSpan(
                                text: 'Hier anmelden',
                                style: TextStyle(
                                  color: Color(0xFF14ad9f),
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
  }
}
