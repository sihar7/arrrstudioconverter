import 'package:url_launcher/url_launcher.dart';

import '../config/app_config.dart';

/// Menentukan link mana yang dibuka di dalam app dan mana yang dilempar ke browser/app lain.
class LinkPolicy {
  LinkPolicy._();

  static bool isInApp(Uri uri) {
    if (uri.scheme == 'about' || uri.scheme == 'blob' || uri.scheme == 'data') return true;
    if (uri.scheme != 'http' && uri.scheme != 'https') return false;
    return AppConfig.inAppHosts.contains(uri.host);
  }

  /// Buka di luar app (browser, Roblox, Discord, mailto, dll). Mengembalikan true bila berhasil.
  static Future<bool> openExternal(Uri uri) async {
    try {
      return await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      return false;
    }
  }
}
