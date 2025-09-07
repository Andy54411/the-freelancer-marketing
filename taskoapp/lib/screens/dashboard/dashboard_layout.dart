import 'package:flutter/material.dart';
import 'dart:ui';
import '../../utils/colors.dart';
import 'dashboard_user/my_orders_screen.dart';
import 'dashboard_user/search_screen.dart';
import '../messages/messages_screen.dart';
import '../profile/profile_screen.dart';

class DashboardLayout extends StatefulWidget {
  final String title;
  final Widget body;
  final bool hasSearchBar;
  final String? searchHint;
  final Function(String)? onSearchChanged;
  final List<Tab>? tabs;
  final TabController? tabController;
  final bool showBackButton;
  final VoidCallback? onBackPressed;
  final bool useGradientBackground;
  final List<Widget>? actions;
  final bool showFooter;
  final bool showBottomNavigation;

  const DashboardLayout({
    super.key,
    required this.title,
    required this.body,
    this.hasSearchBar = false,
    this.searchHint,
    this.onSearchChanged,
    this.tabs,
    this.tabController,
    this.showBackButton = false,
    this.onBackPressed,
    this.useGradientBackground = false,
    this.actions,
    this.showFooter = false,
    this.showBottomNavigation = true,
  });

  @override
  State<DashboardLayout> createState() => _DashboardLayoutState();
}

class _DashboardLayoutState extends State<DashboardLayout> {
  int _selectedIndex = 0;

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
    
    // Navigation basierend auf dem ausgewählten Tab
    switch (index) {
      case 0: // Home Icon
        Navigator.of(context).pushNamedAndRemoveUntil('/dashboard', (route) => false);
        break;
      case 1: // Work Icon - Meine Aufträge
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => const MyOrdersScreen(),
          ),
        );
        break;
      case 2: // Search Icon
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => const SearchScreen(),
          ),
        );
        break;
      case 3: // Mail Icon - Posteingang
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => const MessagesScreen(),
          ),
        );
        break;
      case 4: // Person Icon - Profil
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => const ProfileScreen(),
          ),
        );
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      extendBodyBehindAppBar: false,
      body: Container(
        decoration: widget.useGradientBackground
            ? const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Color(0xFF14ad9f), // from-[#14ad9f]
                    Color(0xFF0d9488), // via-teal-600
                    Color(0xFF2563eb), // to-blue-600
                  ],
                ),
              )
            : const BoxDecoration(color: Color(0xFFF8FAFC)),
        child: SafeArea(
          child: Column(
            children: [
              _buildCustomAppBar(context),
              if (widget.hasSearchBar) _buildSearchBar(),
              if (widget.tabs != null && widget.tabController != null) _buildTabBar(),
              Expanded(
                child: widget.showFooter
                  ? SingleChildScrollView(
                      child: widget.body,
                    )
                  : widget.body,
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: widget.showBottomNavigation ? _buildBottomNavigation() : null,
    );
  }

  Widget _buildCustomAppBar(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          if (widget.showBackButton)
            IconButton(
              icon: const Icon(Icons.arrow_back, color: Colors.white, size: 24),
              onPressed: widget.onBackPressed ?? () => Navigator.of(context).pop(),
            ),
          if (widget.showBackButton) const SizedBox(width: 8),
          Expanded(
            child: Text(
              widget.title,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 24,
                fontWeight: FontWeight.bold,
                shadows: [
                  Shadow(
                    color: Colors.black26,
                    offset: Offset(0, 2),
                    blurRadius: 4,
                  ),
                ],
              ),
              textAlign: widget.showBackButton ? TextAlign.left : TextAlign.center,
            ),
          ),
          if (widget.actions != null) ...widget.actions!,
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Container(
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: TextField(
        onChanged: widget.onSearchChanged,
        decoration: InputDecoration(
          hintText: widget.searchHint ?? 'Suchen...',
          hintStyle: TextStyle(
            color: Colors.grey[400],
            fontSize: 16,
          ),
          prefixIcon: Icon(
            Icons.search,
            color: Colors.grey[400],
            size: 22,
          ),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 16,
          ),
        ),
      ),
    );
  }

  Widget _buildTabBar() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: TabBar(
        controller: widget.tabController,
        indicator: BoxDecoration(
          color: TaskiloColors.primary,
          borderRadius: BorderRadius.circular(8),
        ),
        indicatorSize: TabBarIndicatorSize.tab,
        indicatorPadding: const EdgeInsets.all(4),
        labelColor: Colors.white,
        unselectedLabelColor: Colors.grey[600],
        labelStyle: const TextStyle(
          fontWeight: FontWeight.w600,
          fontSize: 14,
        ),
        unselectedLabelStyle: const TextStyle(
          fontWeight: FontWeight.w500,
          fontSize: 14,
        ),
        tabs: widget.tabs!,
      ),
    );
  }

  Widget _buildBottomNavigation() {
    return BottomNavigationBar(
      type: BottomNavigationBarType.fixed,
      showSelectedLabels: false,
      showUnselectedLabels: false,
      items: const [
        BottomNavigationBarItem(
          icon: Icon(Icons.home),
          label: '',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.work),
          label: '',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.search),
          label: '',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.mail),
          label: '',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.person),
          label: '',
        ),
      ],
      currentIndex: _selectedIndex,
      selectedItemColor: const Color(0xFF14ad9f), // Taskilo primary color
      onTap: _onItemTapped,
      backgroundColor: Colors.white,
      unselectedItemColor: Colors.grey,
    );
  }
}

// Standard-Card-Layout für alle Dashboard-Inhalte
class DashboardCard extends StatelessWidget {
  final Widget child;
  final EdgeInsets? margin;
  final EdgeInsets? padding;
  final VoidCallback? onTap;
  final bool isGlassEffect;

  const DashboardCard({
    super.key,
    required this.child,
    this.margin,
    this.padding,
    this.onTap,
    this.isGlassEffect = true,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: margin ?? const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: isGlassEffect 
            ? Colors.white.withValues(alpha: 0.15)
            : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: isGlassEffect 
            ? Border.all(color: Colors.white.withValues(alpha: 0.2), width: 1)
            : null,
        boxShadow: [
          BoxShadow(
            color: isGlassEffect 
                ? Colors.black.withValues(alpha: 0.1)
                : Colors.black.withValues(alpha: 0.06),
            blurRadius: isGlassEffect ? 20 : 12,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: BackdropFilter(
          filter: isGlassEffect 
              ? ImageFilter.blur(sigmaX: 10, sigmaY: 10)
              : ImageFilter.blur(sigmaX: 0, sigmaY: 0),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: onTap,
              borderRadius: BorderRadius.circular(20),
              child: Padding(
                padding: padding ?? const EdgeInsets.all(20),
                child: child,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// Standard-Liste für Dashboard-Inhalte
class DashboardList extends StatelessWidget {
  final List<Widget> children;
  final EdgeInsets? padding;

  const DashboardList({
    super.key,
    required this.children,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: padding ?? const EdgeInsets.symmetric(vertical: 16),
      children: children,
    );
  }
}

// Standard-Grid für Dashboard-Inhalte
class DashboardGrid extends StatelessWidget {
  final List<Widget> children;
  final int crossAxisCount;
  final double childAspectRatio;
  final EdgeInsets? padding;

  const DashboardGrid({
    super.key,
    required this.children,
    this.crossAxisCount = 2,
    this.childAspectRatio = 1.0,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      padding: padding ?? const EdgeInsets.all(16),
      crossAxisCount: crossAxisCount,
      childAspectRatio: childAspectRatio,
      crossAxisSpacing: 16,
      mainAxisSpacing: 16,
      children: children,
    );
  }
}
