/// Konfigurasi app mobile ARRR Studio Converter.
/// Semua nilai yang bisa berubah ada di sini — jangan hardcode di layar/komponen.
class AppConfig {
  AppConfig._();

  static const String appName = 'ARRR Converter';

  /// Web produksi (sama dengan `appUrl` di desktop/package.json). API = `$webUrl/api/*` (di-proxy ke backend).
  static const String webUrl = 'https://bypass.arrrstudio.com';
  static String api(String path) => '$webUrl/api$path';

  /// Skema deep link untuk kembali dari login Discord (harus sama dengan MOBILE_SCHEME di backend).
  static const String authScheme = 'arrrconverter';

  /// Nama cookie backend (lihat ARRSTUDIOCONVERTERBE/src/lib/server/config.ts).
  static const String sessionCookie = 'arrc_sid';
  static const String guestCookie = 'arrc_gid';

  /// Penanda di User-Agent agar web/BE bisa mengenali app mobile.
  static const String userAgentTag = 'ARRRMobile/1.0';

  /// Host yang tetap dibuka di dalam WebView alat (lainnya ke browser).
  static const List<String> inAppHosts = ['bypass.arrrstudio.com'];

  /// Polling status job convert.
  static const Duration jobPoll = Duration(milliseconds: 1500);
  static const Duration requestTimeout = Duration(seconds: 30);

  static String thumb(String videoId) => 'https://i.ytimg.com/vi/$videoId/hqdefault.jpg';
}
