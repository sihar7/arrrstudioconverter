import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_web_auth_2/flutter_web_auth_2.dart';

import '../config/app_config.dart';
import '../data/api_client.dart';
import '../data/models.dart';
import '../data/repositories.dart';

/// Sesi pengguna: profil, kuota, plan & batasnya. Login Discord lewat browser sistem → deep link.
class SessionStore extends ChangeNotifier {
  SessionStore(this.api)
      : _auth = AuthRepo(api),
        _plans = PlansRepo(api);

  final ApiClient api;
  final AuthRepo _auth;
  final PlansRepo _plans;

  Me? me;
  Map<String, PlanLimits> plans = {};
  bool loading = true;
  bool signingIn = false;
  String? error;

  User? get user => me?.user;
  bool get loggedIn => user != null;
  PlanLimits get limits => plans[me?.planId ?? 'free'] ?? plans['free'] ?? PlanLimits.fromJson(PlanLimits.fallback);

  Future<void> start() async {
    await api.init();
    await refresh();
  }

  Future<void> refresh() async {
    try {
      final results = await Future.wait([_auth.me(), _plans.plans()]);
      me = results[0] as Me;
      plans = results[1] as Map<String, PlanLimits>;
      error = null;
    } on ApiException catch (e) {
      error = e.message;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  /// Hanya perbarui kuota/profil (setelah convert).
  Future<void> refreshMe() async {
    try {
      me = await _auth.me();
      notifyListeners();
    } catch (_) {}
  }

  /// Mengembalikan pesan galat, atau null bila berhasil / dibatalkan.
  Future<String?> login() async {
    if (signingIn) return null;
    signingIn = true;
    notifyListeners();
    try {
      final result = await FlutterWebAuth2.authenticate(
        url: '${AppConfig.api('/auth/discord')}?mobile=1',
        callbackUrlScheme: AppConfig.authScheme,
      );
      final uri = Uri.parse(result);
      final err = uri.queryParameters['error'];
      if (err != null) return _loginError(err);
      final code = uri.queryParameters['code'];
      if (code == null) return 'Login tidak selesai. Coba lagi.';
      await _auth.exchange(code);
      await refresh();
      return null;
    } on PlatformException catch (e) {
      // CANCELED = pengguna menutup jendela login
      return e.code == 'CANCELED' ? null : 'Login gagal dibuka (${e.code}).';
    } on ApiException catch (e) {
      return e.message;
    } finally {
      signingIn = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    await _auth.logout();
    await refresh();
  }

  String _loginError(String code) => switch (code) {
        'not_member' => 'Gabung server Discord ARRR Studio dulu, lalu masuk lagi.',
        'expired' => 'Sesi login kedaluwarsa. Coba lagi.',
        _ => 'Login Discord gagal. Coba lagi.',
      };
}
