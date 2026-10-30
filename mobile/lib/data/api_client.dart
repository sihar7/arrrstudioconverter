import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

import '../config/app_config.dart';

/// Galat dari API (`{error, code}`) dengan pesan yang siap ditampilkan.
class ApiException implements Exception {
  ApiException(this.message, {this.code, this.status});
  final String message;
  final String? code;
  final int? status;

  bool get unauthorized => status == 401;
  @override
  String toString() => message;
}

/// Klien HTTP ke backend. Sesi = cookie `arrc_sid` (token dari login mobile), tamu = `arrc_gid`.
/// Keduanya disimpan di secure storage dan dikirim manual sebagai header Cookie.
class ApiClient {
  ApiClient({http.Client? client}) : _http = client ?? http.Client();

  final http.Client _http;
  static const _store = FlutterSecureStorage();
  static final _guestRe = RegExp('${AppConfig.guestCookie}=([^;,\\s]+)');

  String? _session;
  String? _guest;

  bool get hasSession => _session != null;

  Future<void> init() async {
    _session = await _store.read(key: AppConfig.sessionCookie);
    _guest = await _store.read(key: AppConfig.guestCookie);
  }

  Future<void> setSession(String? token) async {
    _session = token;
    if (token == null) {
      await _store.delete(key: AppConfig.sessionCookie);
    } else {
      await _store.write(key: AppConfig.sessionCookie, value: token);
    }
  }

  /// Header Cookie untuk request lain (file audio, WebView alat).
  Map<String, String> get authHeaders {
    final parts = [
      if (_session != null) '${AppConfig.sessionCookie}=$_session',
      if (_guest != null) '${AppConfig.guestCookie}=$_guest',
    ];
    return {
      'User-Agent': AppConfig.userAgentTag,
      if (parts.isNotEmpty) 'Cookie': parts.join('; '),
    };
  }

  String? get sessionToken => _session;
  String? get guestToken => _guest;

  Future<Map<String, dynamic>> get(String path, {Map<String, String>? query}) =>
      _send('GET', path, query: query);
  Future<Map<String, dynamic>> post(String path, [Object? body]) => _send('POST', path, body: body);
  Future<Map<String, dynamic>> patch(String path, [Object? body]) => _send('PATCH', path, body: body);
  Future<Map<String, dynamic>> delete(String path) => _send('DELETE', path);

  Future<Map<String, dynamic>> _send(String method, String path, {Map<String, String>? query, Object? body}) async {
    final uri = Uri.parse(AppConfig.api(path)).replace(queryParameters: query);
    final req = http.Request(method, uri)..headers.addAll(authHeaders);
    if (body != null) {
      req.headers['Content-Type'] = 'application/json';
      req.body = jsonEncode(body);
    }

    final http.Response res;
    try {
      res = await http.Response.fromStream(await _http.send(req).timeout(AppConfig.requestTimeout));
    } catch (_) {
      throw ApiException('Tidak bisa terhubung ke server. Periksa internet kamu.');
    }
    await _captureGuest(res.headers['set-cookie']);

    Map<String, dynamic> json = const {};
    if (res.body.isNotEmpty) {
      try {
        final decoded = jsonDecode(res.body);
        if (decoded is Map<String, dynamic>) json = decoded;
      } catch (_) {}
    }
    if (res.statusCode >= 400) {
      throw ApiException(
        (json['error'] as String?) ?? 'Terjadi kesalahan (${res.statusCode})',
        code: json['code'] as String?,
        status: res.statusCode,
      );
    }
    return json;
  }

  Future<void> _captureGuest(String? setCookie) async {
    final m = setCookie == null ? null : _guestRe.firstMatch(setCookie);
    final value = m?.group(1);
    if (value == null || value.isEmpty || value == _guest) return;
    _guest = value;
    await _store.write(key: AppConfig.guestCookie, value: value);
  }
}
