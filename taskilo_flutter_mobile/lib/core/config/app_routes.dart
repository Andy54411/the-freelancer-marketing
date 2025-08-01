import 'package:get/get.dart';
import '../../features/splash/splash_screen.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/register_screen.dart';
import '../../features/home/screens/home_screen.dart';
import '../../features/orders/screens/orders_list_screen.dart';
import '../../features/orders/screens/order_detail_screen.dart';
import '../../features/profile/screens/profile_screen.dart';
import '../../features/chat/screens/chat_screen.dart';
import '../../features/services/screens/services_screen.dart';
import '../../features/services/screens/service_detail_screen.dart';
import '../../features/booking/screens/booking_screen.dart';
import '../../features/dashboard/screens/company_dashboard_screen.dart';
import '../../features/time_tracking/screens/time_tracking_screen.dart';

class AppRoutes {
  static const String splash = '/splash';
  static const String login = '/login';
  static const String register = '/register';
  static const String home = '/home';
  static const String orders = '/orders';
  static const String orderDetail = '/order-detail';
  static const String profile = '/profile';
  static const String chat = '/chat';
  static const String services = '/services';
  static const String serviceDetail = '/service-detail';
  static const String booking = '/booking';
  static const String companyDashboard = '/company-dashboard';
  static const String timeTracking = '/time-tracking';

  static List<GetPage> routes = [
    GetPage(
      name: splash,
      page: () => const SplashScreen(),
    ),
    GetPage(
      name: login,
      page: () => const LoginScreen(),
      transition: Transition.fadeIn,
    ),
    GetPage(
      name: register,
      page: () => const RegisterScreen(),
      transition: Transition.fadeIn,
    ),
    GetPage(
      name: home,
      page: () => const HomeScreen(),
      transition: Transition.fadeIn,
    ),
    GetPage(
      name: orders,
      page: () => const OrdersListScreen(),
      transition: Transition.rightToLeft,
    ),
    GetPage(
      name: orderDetail,
      page: () => const OrderDetailScreen(),
      transition: Transition.rightToLeft,
    ),
    GetPage(
      name: profile,
      page: () => const ProfileScreen(),
      transition: Transition.rightToLeft,
    ),
    GetPage(
      name: chat,
      page: () => const ChatScreen(),
      transition: Transition.rightToLeft,
    ),
    GetPage(
      name: services,
      page: () => const ServicesScreen(),
      transition: Transition.rightToLeft,
    ),
    GetPage(
      name: serviceDetail,
      page: () => const ServiceDetailScreen(),
      transition: Transition.rightToLeft,
    ),
    GetPage(
      name: booking,
      page: () => const BookingScreen(),
      transition: Transition.rightToLeft,
    ),
    GetPage(
      name: companyDashboard,
      page: () => const CompanyDashboardScreen(),
      transition: Transition.rightToLeft,
    ),
    GetPage(
      name: timeTracking,
      page: () => const TimeTrackingScreen(),
      transition: Transition.rightToLeft,
    ),
  ];
}
