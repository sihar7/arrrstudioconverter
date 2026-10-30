import 'dart:async';

import 'package:flutter/foundation.dart';

import '../config/app_config.dart';
import '../data/api_client.dart';
import '../data/audio_options.dart';
import '../data/models.dart';
import '../data/repositories.dart';
import 'session_store.dart';

enum ItemStatus { ready, running, done, error }

class QueueItem {
  QueueItem(this.video) : key = '${video.videoId}-${DateTime.now().microsecondsSinceEpoch}';
  final String key;
  final Video video;
  ItemStatus status = ItemStatus.ready;
  int progress = 0;
  String stage = '';
  Job? job;
  String? error;

  bool get busy => status == ItemStatus.running;
}

/// Antrean convert: tambah dari link/pencarian, jalankan sesuai batas paralel plan, polling status job.
class QueueStore extends ChangeNotifier {
  QueueStore(ApiClient api, this._session)
      : _yt = YoutubeRepo(api),
        _convert = ConvertRepo(api);

  final YoutubeRepo _yt;
  final ConvertRepo _convert;
  final SessionStore _session;

  final List<QueueItem> items = [];
  AudioOptions options = const AudioOptions();
  String presetId = 'normal';
  bool resolving = false;
  final Map<String, Timer> _polls = {};
  bool _disposed = false;

  int get readyCount => items.where((i) => i.status == ItemStatus.ready).length;
  int get runningCount => items.where((i) => i.busy).length;
  int get pendingBadge => readyCount + runningCount;

  void setOptions(AudioOptions o) {
    options = o.fitTo(_session.limits);
    _notify();
  }

  void applyPreset(Preset p) {
    presetId = p.id;
    options = p.apply(options).fitTo(_session.limits);
    _notify();
  }

  /// Link video / playlist → item antrean. Mengembalikan pesan untuk toast.
  Future<String> addLink(String url) async {
    resolving = true;
    _notify();
    try {
      final info = await _yt.info(url.trim());
      for (final v in info.videos) {
        items.insert(0, QueueItem(v));
      }
      final n = info.videos.length;
      final cut = info.truncatedAt != null ? ' (dibatasi $n oleh plan)' : '';
      return n == 1 ? 'Masuk antrean: ${info.videos.first.title}' : '$n lagu masuk antrean$cut';
    } on ApiException catch (e) {
      return e.message;
    } finally {
      resolving = false;
      _notify();
    }
  }

  void addVideo(Video v) {
    items.insert(0, QueueItem(v));
    _notify();
  }

  void remove(QueueItem item) {
    _polls.remove(item.key)?.cancel();
    items.remove(item);
    _notify();
  }

  void clearFinished() {
    items.removeWhere((i) => i.status == ItemStatus.done || i.status == ItemStatus.error);
    _notify();
  }

  /// Jalankan item siap sebanyak slot paralel yang tersisa; dipanggil lagi tiap job selesai.
  void runAll() {
    final slots = _session.limits.parallel - runningCount;
    if (slots <= 0) return;
    final next = items.reversed.where((i) => i.status == ItemStatus.ready).take(slots).toList();
    for (final item in next) {
      _start(item);
    }
  }

  void retry(QueueItem item) {
    item
      ..status = ItemStatus.ready
      ..error = null
      ..progress = 0;
    runAll();
    _notify();
  }

  Future<void> _start(QueueItem item) async {
    item
      ..status = ItemStatus.running
      ..stage = 'Mengantre'
      ..progress = 0;
    _notify();
    try {
      item.job = await _convert.start(item.video.videoId, options);
      _session.refreshMe();
      _poll(item);
    } on ApiException catch (e) {
      _fail(item, e.message);
    }
  }

  void _poll(QueueItem item) {
    _polls[item.key]?.cancel();
    _polls[item.key] = Timer.periodic(AppConfig.jobPoll, (t) async {
      final id = item.job?.id;
      if (id == null || _disposed) return t.cancel();
      try {
        final job = await _convert.job(id);
        if (!items.contains(item)) return t.cancel();
        item
          ..job = job
          ..progress = job.progress
          ..stage = _stageOf(job.status);
        if (job.status == JobStatus.done) {
          t.cancel();
          _polls.remove(item.key);
          item.status = ItemStatus.done;
          _session.refreshMe();
          runAll();
        } else if (job.status == JobStatus.error) {
          t.cancel();
          _polls.remove(item.key);
          _fail(item, job.error ?? 'Convert gagal');
          return;
        }
        _notify();
      } on ApiException catch (e) {
        if (e.status == 404) {
          t.cancel();
          _fail(item, 'Job tidak ditemukan');
        }
      }
    });
  }

  void _fail(QueueItem item, String message) {
    item
      ..status = ItemStatus.error
      ..error = message;
    _notify();
    runAll();
  }

  static String _stageOf(JobStatus s) => switch (s) {
        JobStatus.queued => 'Mengantre',
        JobStatus.downloading => 'Mengunduh',
        JobStatus.processing => 'Memproses',
        JobStatus.done => 'Selesai',
        JobStatus.error => 'Gagal',
      };

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    for (final t in _polls.values) {
      t.cancel();
    }
    _polls.clear();
    super.dispose();
  }
}
