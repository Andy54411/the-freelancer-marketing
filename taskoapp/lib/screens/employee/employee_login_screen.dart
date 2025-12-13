import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../services/employee_auth_service.dart';
import 'employee_home_screen.dart';

/// Employee Login Screen
/// Separater Login-Bereich für Mitarbeiter
class EmployeeLoginScreen extends StatefulWidget {
  final String? companyId;

  const EmployeeLoginScreen({super.key, this.companyId});

  @override
  State<EmployeeLoginScreen> createState() => _EmployeeLoginScreenState();
}

class _EmployeeLoginScreenState extends State<EmployeeLoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _companyIdController = TextEditingController();

  bool _isLoading = false;
  bool _obscurePassword = true;
  String? _errorMessage;
  CompanyLoginInfo? _companyInfo;
  bool _showRegistration = false;
  String? _employeeIdForRegistration;

  @override
  void initState() {
    super.initState();
    if (widget.companyId != null) {
      _companyIdController.text = widget.companyId!;
      _loadCompanyInfo(widget.companyId!);
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _companyIdController.dispose();
    super.dispose();
  }

  Future<void> _loadCompanyInfo(String companyId) async {
    setState(() => _isLoading = true);
    
    final info = await EmployeeAuthService.getCompanyInfo(companyId);
    
    setState(() {
      _companyInfo = info;
      _isLoading = false;
      if (info == null) {
        _errorMessage = 'Unternehmen nicht gefunden';
      }
    });
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await EmployeeAuthService.login(
      companyId: _companyIdController.text.trim(),
      email: _emailController.text.trim(),
      password: _passwordController.text,
    );

    setState(() => _isLoading = false);

    if (result.success && result.session != null) {
      // Navigate to Employee Home
      Get.offAll(() => const EmployeeHomeScreen());
    } else if (result.requiresRegistration) {
      setState(() {
        _showRegistration = true;
        _employeeIdForRegistration = result.employeeIdForRegistration;
        _errorMessage = null;
      });
    } else {
      setState(() => _errorMessage = result.error);
    }
  }

  Future<void> _handleRegistration() async {
    if (!_formKey.currentState!.validate()) return;
    if (_employeeIdForRegistration == null) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await EmployeeAuthService.register(
      companyId: _companyIdController.text.trim(),
      employeeId: _employeeIdForRegistration!,
      email: _emailController.text.trim(),
      password: _passwordController.text,
    );

    setState(() => _isLoading = false);

    if (result.success && result.session != null) {
      Get.offAll(() => const EmployeeHomeScreen());
    } else {
      setState(() => _errorMessage = result.error);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[100],
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Logo oder Firmenlogo
                if (_companyInfo?.logo != null)
                  Image.network(
                    _companyInfo!.logo!,
                    height: 80,
                    errorBuilder: (_, __, ___) => _buildDefaultLogo(),
                  )
                else
                  _buildDefaultLogo(),

                const SizedBox(height: 16),

                // Titel
                Text(
                  _companyInfo?.companyName ?? 'Mitarbeiter-Login',
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF14AD9F),
                  ),
                ),

                const SizedBox(height: 8),

                Text(
                  _showRegistration 
                      ? 'Erstelle deinen App-Zugang'
                      : 'Melde dich an, um fortzufahren',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey[600],
                  ),
                ),

                const SizedBox(height: 32),

                // Login Form
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withAlpha(13),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      children: [
                        // Company ID (falls nicht vorgegeben)
                        if (widget.companyId == null) ...[
                          TextFormField(
                            controller: _companyIdController,
                            decoration: InputDecoration(
                              labelText: 'Unternehmens-Code',
                              hintText: 'Von Ihrem Arbeitgeber',
                              prefixIcon: const Icon(Icons.business),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              suffixIcon: _companyInfo != null
                                  ? const Icon(Icons.check_circle, color: Colors.green)
                                  : null,
                            ),
                            onFieldSubmitted: (value) => _loadCompanyInfo(value),
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return 'Bitte Unternehmens-Code eingeben';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),
                        ],

                        // Email
                        TextFormField(
                          controller: _emailController,
                          keyboardType: TextInputType.emailAddress,
                          decoration: InputDecoration(
                            labelText: 'E-Mail',
                            prefixIcon: const Icon(Icons.email_outlined),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'Bitte E-Mail eingeben';
                            }
                            if (!GetUtils.isEmail(value)) {
                              return 'Ungültige E-Mail-Adresse';
                            }
                            return null;
                          },
                        ),

                        const SizedBox(height: 16),

                        // Password
                        TextFormField(
                          controller: _passwordController,
                          obscureText: _obscurePassword,
                          decoration: InputDecoration(
                            labelText: _showRegistration ? 'Passwort erstellen' : 'Passwort',
                            prefixIcon: const Icon(Icons.lock_outlined),
                            suffixIcon: IconButton(
                              icon: Icon(
                                _obscurePassword
                                    ? Icons.visibility_outlined
                                    : Icons.visibility_off_outlined,
                              ),
                              onPressed: () {
                                setState(() => _obscurePassword = !_obscurePassword);
                              },
                            ),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'Bitte Passwort eingeben';
                            }
                            if (_showRegistration && value.length < 6) {
                              return 'Passwort muss mindestens 6 Zeichen haben';
                            }
                            return null;
                          },
                        ),

                        // Error Message
                        if (_errorMessage != null) ...[
                          const SizedBox(height: 16),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.red[50],
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.red[200]!),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.error_outline, color: Colors.red, size: 20),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    _errorMessage!,
                                    style: const TextStyle(color: Colors.red),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],

                        const SizedBox(height: 24),

                        // Login/Register Button
                        SizedBox(
                          width: double.infinity,
                          height: 50,
                          child: ElevatedButton(
                            onPressed: _isLoading 
                                ? null 
                                : (_showRegistration ? _handleRegistration : _handleLogin),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF14AD9F),
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child: _isLoading
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(
                                      color: Colors.white,
                                      strokeWidth: 2,
                                    ),
                                  )
                                : Text(
                                    _showRegistration ? 'Registrieren' : 'Anmelden',
                                    style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                          ),
                        ),

                        // Switch to registration/login
                        if (_showRegistration) ...[
                          const SizedBox(height: 16),
                          TextButton(
                            onPressed: () {
                              setState(() {
                                _showRegistration = false;
                                _errorMessage = null;
                              });
                            },
                            child: const Text('Zurück zum Login'),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 24),

                // Back to normal login
                TextButton.icon(
                  onPressed: () => Get.back(),
                  icon: const Icon(Icons.arrow_back),
                  label: const Text('Zurück zur Hauptanwendung'),
                ),

                const SizedBox(height: 16),

                // Powered by Taskilo
                Text(
                  'Powered by Taskilo',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[500],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDefaultLogo() {
    return Container(
      width: 80,
      height: 80,
      decoration: BoxDecoration(
        color: const Color(0xFF14AD9F),
        borderRadius: BorderRadius.circular(16),
      ),
      child: const Icon(
        Icons.people_alt_outlined,
        size: 40,
        color: Colors.white,
      ),
    );
  }
}
