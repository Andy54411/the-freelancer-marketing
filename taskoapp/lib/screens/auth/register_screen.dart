import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../models/user_model.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

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
  UserType _selectedUserType = UserType.customer;
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
        userType: _selectedUserType,
        agreesToNewsletter: _agreesToNewsletter,
        dateOfBirth: _selectedDateOfBirth,
      );
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Registrierung erfolgreich! Bitte bestätigen Sie Ihre E-Mail.'),
            backgroundColor: Color(0xFF14ad9f),
          ),
        );
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString()),
            backgroundColor: Colors.red,
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
      appBar: AppBar(
        title: const Text('Registrieren'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: const Color(0xFF14ad9f),
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
            child: Card(
              elevation: 8,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Header
                      Text(
                        'Neues Konto erstellen',
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          color: const Color(0xFF14ad9f),
                          fontWeight: FontWeight.bold,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Erstelle dein Taskilo-Konto',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.grey.shade600,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 32),
                      
                      // User Type Selection
                      Container(
                        decoration: BoxDecoration(
                          color: Colors.grey.shade50,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.grey.shade300),
                        ),
                        child: Column(
                          children: [
                            RadioListTile<UserType>(
                              title: const Text('Ich suche Services'),
                              subtitle: const Text('Als Kunde Services buchen'),
                              value: UserType.customer,
                              groupValue: _selectedUserType,
                              activeColor: const Color(0xFF14ad9f),
                              onChanged: (UserType? value) {
                                setState(() {
                                  _selectedUserType = value!;
                                });
                              },
                            ),
                            const Divider(height: 1),
                            RadioListTile<UserType>(
                              title: const Text('Ich biete Services an'),
                              subtitle: const Text('Als Anbieter Services verkaufen'),
                              value: UserType.serviceProvider,
                              groupValue: _selectedUserType,
                              activeColor: const Color(0xFF14ad9f),
                              onChanged: (UserType? value) {
                                setState(() {
                                  _selectedUserType = value!;
                                });
                              },
                            ),
                          ],
                        ),
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
                          SizedBox(
                            width: 120,
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
                                    children: [
                                      Text(country['flag']!),
                                      const SizedBox(width: 8),
                                      Text(country['code']!),
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
                          const SizedBox(width: 16),
                          Expanded(
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
                      
                      // Address Fields
                      TextFormField(
                        controller: _streetController,
                        decoration: const InputDecoration(
                          labelText: 'Straße und Hausnummer',
                          prefixIcon: Icon(Icons.home, color: Color(0xFF14ad9f)),
                          border: OutlineInputBorder(),
                        ),
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
                      CheckboxListTile(
                        title: const Text('Nutzungsbedingungen akzeptieren'),
                        subtitle: const Text('Ich stimme den AGB und Datenschutzbestimmungen zu'),
                        value: _agreeToTerms,
                        activeColor: const Color(0xFF14ad9f),
                        onChanged: (bool? value) {
                          setState(() {
                            _agreeToTerms = value ?? false;
                          });
                        },
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
        ),
      ),
    );
  }
}
