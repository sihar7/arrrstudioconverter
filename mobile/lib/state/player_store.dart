import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:just_audio/just_audio.dart';

import '../config/app_config.dart';
import '../data/api_client.dart';

/// Pemutar pratinjau hasil convert (stream file dari server dengan cookie sesi).
class PlayerStore extends ChangeNotifier {
  PlayerStore(this._api) {
    _subs.add(_player.playerStateStream.listen((_) => notifyListeners()));
    _subs.add(_player.positionStream.listen((p) {
      position = p;
      notifyListeners();
    }));
    _subs.add(_player.durationStream.listen((d) => duration = d ?? Duration.zero));
  }

  final ApiClient _api;
  final AudioPlayer _player = AudioPlayer();
  final List<StreamSubscription<dynamic>> _subs = [];

  String? fileId;
  String title = '';
  String subtitle = '';
  Duration position = Duration.zero;
  Duration duration = Duration.zero;
  String? error;

  bool get playing => _player.playing;
  bool get active => fileId != null;
  bool get loading => _player.processingState == ProcessingState.loading || _player.processingState == ProcessingState.buffering;
  double get fraction => duration.inMilliseconds == 0 ? 0 : (position.inMilliseconds / duration.inMilliseconds).clamp(0, 1);

  Future<void> play(String fileId, {required String title, String subtitle = ''}) async {
    if (this.fileId == fileId) return toggle();
    this.fileId = fileId;
    this.title = title;
    this.subtitle = subtitle;
    error = null;
    notifyListeners();
    try {
      await _player.setUrl(AppConfig.api('/files/$fileId'), headers: _api.authHeaders);
      unawaited(_player.play());
    } catch (_) {
      error = 'File tidak bisa diputar (mungkin sudah kedaluwarsa).';
      this.fileId = null;
      notifyListeners();
    }
  }

  Future<void> toggle() => _player.playing ? _player.pause() : _player.play();

  Future<void> seek(double f) => _player.seek(duration * f);

  Future<void> stop() async {
    await _player.stop();
    fileId = null;
    notifyListeners();
  }

  @override
  void dispose() {
    for (final s in _subs) {
      s.cancel();
    }
    _player.dispose();
    super.dispose();
  }
}
