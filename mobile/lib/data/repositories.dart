import 'audio_options.dart';
import 'api_client.dart';
import 'models.dart';

/// Akses endpoint per domain. Satu file agar alur data mudah dilacak; tiap kelas tipis & tanpa state.

class AuthRepo {
  AuthRepo(this._api);
  final ApiClient _api;

  Future<Me> me() async => Me.fromJson(await _api.get('/auth/me'));

  /// Tukar kode sekali pakai (dari arrrconverter://auth?code=) → token sesi.
  Future<void> exchange(String code) async {
    final res = await _api.post('/auth/mobile', {'code': code});
    await _api.setSession(res['token'] as String?);
  }

  Future<void> logout() async {
    try {
      await _api.post('/auth/logout');
    } catch (_) {}
    await _api.setSession(null);
  }
}

class PlansRepo {
  PlansRepo(this._api);
  final ApiClient _api;

  Future<Map<String, PlanLimits>> plans() async {
    final res = await _api.get('/plans');
    final raw = res['plans'];
    if (raw is! Map<String, dynamic>) return {};
    return raw.map((k, v) => MapEntry(k, PlanLimits.fromJson(v is Map<String, dynamic> ? v : const {})));
  }
}

class YoutubeRepo {
  YoutubeRepo(this._api);
  final ApiClient _api;

  Future<SearchPage> search(String q, {String? continuation}) async => SearchPage.fromJson(
        await _api.get('/youtube/search', query: continuation != null ? {'c': continuation} : {'q': q}),
      );

  Future<LinkInfo> info(String url) async => LinkInfo.fromJson(await _api.post('/youtube/info', {'url': url}));
}

class ConvertRepo {
  ConvertRepo(this._api);
  final ApiClient _api;

  Future<Job> start(String videoId, AudioOptions options, {String? title}) async {
    final res = await _api.post('/convert', {
      'videoId': videoId,
      'options': options.toJson(),
      'title': ?title,
    });
    return Job.fromJson(res['job'] as Map<String, dynamic>);
  }

  Future<Job> job(String id) async => Job.fromJson((await _api.get('/jobs/$id'))['job'] as Map<String, dynamic>);
}

class LibraryRepo {
  LibraryRepo(this._api);
  final ApiClient _api;

  Future<List<HistoryItem>> history() async => ((await _api.get('/history'))['items'] as List? ?? const [])
      .whereType<Map<String, dynamic>>()
      .map(HistoryItem.fromJson)
      .toList();

  Future<void> remove(List<String> ids) => _api.post('/history/delete', {'ids': ids, 'archive': false});
}

class RobloxRepo {
  RobloxRepo(this._api);
  final ApiClient _api;

  /// Cek API key → User ID pemilik (null bila tak terbaca).
  Future<({bool ok, String? ownerId})> checkKey(String apiKey) async {
    final res = await _api.post('/roblox/key', {'apiKey': apiKey});
    return (ok: res['ok'] == true, ownerId: res['ownerId'] as String?);
  }

  Future<String?> upload({
    required String apiKey,
    required String fileId,
    required String creatorType,
    required String creatorId,
    required String displayName,
    String? historyId,
    String permission = 'none',
  }) async {
    final res = await _api.post('/roblox/upload', {
      'apiKey': apiKey,
      'fileId': fileId,
      'creatorType': creatorType,
      'creatorId': creatorId,
      'displayName': displayName,
      'historyId': ?historyId,
      'permission': permission,
    });
    return res['assetId'] as String?;
  }
}
