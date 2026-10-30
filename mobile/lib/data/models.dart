// Model data — cermin dari tipe backend (ARRSTUDIOCONVERTERBE/src/type/*.ts).

T? _opt<T>(Object? v) => v is T ? v : null;
int _int(Object? v, [int d = 0]) => v is num ? v.toInt() : d;
double _dbl(Object? v, [double d = 0]) => v is num ? v.toDouble() : d;
String _str(Object? v, [String d = '']) => v is String ? v : d;
Map<String, dynamic> _map(Object? v) => v is Map<String, dynamic> ? v : const {};
List<dynamic> _list(Object? v) => v is List ? v : const [];

class User {
  User.fromJson(Map<String, dynamic> j)
      : id = _str(j['id']),
        username = _str(j['username']),
        displayName = _str(j['displayName'], _str(j['username'])),
        avatarUrl = _opt<String>(j['avatarUrl']),
        isAdmin = j['isAdmin'] == true;
  final String id, username, displayName;
  final String? avatarUrl;
  final bool isAdmin;
}

class Quota {
  Quota.fromJson(Map<String, dynamic> j)
      : limit = _opt<num>(j['limit'])?.toInt(),
        used = _int(j['used']),
        remaining = _opt<num>(j['remaining'])?.toInt(),
        resetIn = _opt<num>(j['resetIn'])?.toInt(),
        windowHours = _int(j['windowHours'], 5);
  final int? limit, remaining, resetIn;
  final int used, windowHours;

  bool get unlimited => limit == null;
  double get fraction => unlimited || limit == 0 ? 1 : (remaining ?? 0) / limit!;
}

class Me {
  Me.fromJson(Map<String, dynamic> j)
      : user = j['user'] is Map ? User.fromJson(_map(j['user'])) : null,
        quota = Quota.fromJson(_map(j['quota'])),
        planId = _str(_map(j['plan'])['id'], 'free'),
        planExpiresAt = _opt<num>(_map(j['plan'])['expiresAt'])?.toInt();
  final User? user;
  final Quota quota;
  final String planId;
  final int? planExpiresAt;
}

/// Batas plan yang dipakai UI (subset PlanLimits).
class PlanLimits {
  PlanLimits.fromJson(Map<String, dynamic> j)
      : id = _str(j['id'], 'free'),
        tokens = _opt<num>(j['tokens'])?.toInt(),
        maxDurationSec = _int(j['maxDurationSec'], 480),
        playlistMax = _int(j['playlistMax'], 5),
        parallel = _int(j['parallel'], 1),
        maxBitrate = _int(j['maxBitrate'], 128),
        formats = _list(j['formats']).whereType<String>().toList(),
        effects = _list(j['effects']).whereType<String>().toSet(),
        speed = _range(_map(j['ranges'])['speed'], .8, 1.25),
        pitch = _dbl(_map(j['ranges'])['pitch'], 2);

  static const fallback = {'id': 'free', 'formats': ['mp3', 'ogg'], 'maxBitrate': 128};

  final String id;
  final int? tokens;
  final int maxDurationSec, playlistMax, parallel, maxBitrate;
  final List<String> formats;
  final Set<String> effects;
  final (double, double) speed;
  final double pitch;

  static (double, double) _range(Object? v, double a, double b) {
    final l = _list(v);
    return l.length == 2 ? (_dbl(l[0], a), _dbl(l[1], b)) : (a, b);
  }
}

class Video {
  Video({required this.videoId, required this.title, this.author = '', String? thumbnail, this.duration})
      : thumbnail = thumbnail ?? 'https://i.ytimg.com/vi/$videoId/hqdefault.jpg';
  Video.fromJson(Map<String, dynamic> j)
      : this(
          videoId: _str(j['videoId']),
          title: _str(j['title'], 'Tanpa judul'),
          author: _str(j['author']),
          thumbnail: _opt<String>(j['thumbnail']),
          duration: _opt<num>(j['duration'])?.toInt(),
        );
  final String videoId, title, author, thumbnail;
  final int? duration;
}

class SearchPage {
  SearchPage.fromJson(Map<String, dynamic> j)
      : items = _list(j['items']).whereType<Map<String, dynamic>>().map(Video.fromJson).toList(),
        continuation = _opt<String>(j['continuation']);
  final List<Video> items;
  final String? continuation;
}

enum JobStatus { queued, downloading, processing, done, error }

class JobResult {
  JobResult.fromJson(Map<String, dynamic> j)
      : fileId = _str(j['fileId']),
        filename = _str(j['filename'], 'audio'),
        format = _str(j['format'], 'mp3'),
        size = _int(j['size']),
        duration = _dbl(j['duration']),
        historyId = _opt<String>(j['historyId']);
  final String fileId, filename, format;
  final int size;
  final double duration;
  final String? historyId;
}

class Job {
  Job.fromJson(Map<String, dynamic> j)
      : id = _str(j['id']),
        status = JobStatus.values.asNameMap()[_str(j['status'])] ?? JobStatus.queued,
        progress = _int(j['progress']),
        title = _str(j['title']),
        result = j['result'] is Map ? JobResult.fromJson(_map(j['result'])) : null,
        error = _opt<String>(j['error']);
  final String id, title;
  final JobStatus status;
  final int progress;
  final JobResult? result;
  final String? error;

  bool get finished => status == JobStatus.done || status == JobStatus.error;
}

class RobloxInfo {
  RobloxInfo.fromJson(Map<String, dynamic> j)
      : assetId = _opt<String>(j['assetId']),
        state = _str(j['state'], 'Processing'),
        error = _opt<String>(j['error']);
  final String? assetId, error;
  final String state;
}

class HistoryItem {
  HistoryItem.fromJson(Map<String, dynamic> j)
      : id = _str(j['id']),
        createdAt = _int(j['createdAt']),
        videoId = _str(j['videoId']),
        title = _str(j['title'], 'Tanpa judul'),
        artist = _opt<String>(j['artist']),
        thumbnail = _opt<String>(_map(j['cover'])['url']) ?? _str(j['thumbnail']),
        format = _str(j['format'], 'mp3'),
        size = _int(j['size']),
        duration = _dbl(j['duration']),
        fileId = _str(j['fileId']),
        fileAvailable = j['fileAvailable'] == true,
        roblox = j['roblox'] is Map ? RobloxInfo.fromJson(_map(j['roblox'])) : null;
  final String id, videoId, title, thumbnail, format, fileId;
  final String? artist;
  final int createdAt, size;
  final double duration;
  final bool fileAvailable;
  final RobloxInfo? roblox;

  bool get robloxReady => const {'mp3', 'ogg', 'wav', 'flac'}.contains(format);
}

/// Hasil POST /youtube/info: satu video atau isi playlist.
class LinkInfo {
  LinkInfo.fromJson(Map<String, dynamic> j)
      : videos = j['type'] == 'playlist'
            ? _list(j['items']).whereType<Map<String, dynamic>>().map(Video.fromJson).toList()
            : [Video.fromJson(_map(j['video']))],
        playlistTitle = j['type'] == 'playlist' ? _opt<String>(j['title']) : null,
        truncatedAt = _opt<num>(j['truncated'])?.toInt();
  final List<Video> videos;
  final String? playlistTitle;
  final int? truncatedAt;
}
