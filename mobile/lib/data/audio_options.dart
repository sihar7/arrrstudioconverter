import 'models.dart';

/// Opsi convert — cermin `audioOptionsSchema` & `PRESETS` (src/lib/schemas/convert.schema.ts).
/// Server tetap menurunkan opsi ke batas plan (clampOptions), UI hanya membantu.
class AudioOptions {
  const AudioOptions({
    this.format = 'mp3',
    this.bitrate = 192,
    this.speed = 1,
    this.pitch = 0,
    this.preservePitch = true,
    this.bass = 0,
    this.reverb = 0,
    this.spatial8d = false,
    this.normalize = false,
  });

  final String format;
  final int bitrate;
  final double speed, pitch, bass, reverb;
  final bool preservePitch, spatial8d, normalize;

  AudioOptions copyWith({
    String? format,
    int? bitrate,
    double? speed,
    double? pitch,
    bool? preservePitch,
    double? bass,
    double? reverb,
    bool? spatial8d,
    bool? normalize,
  }) =>
      AudioOptions(
        format: format ?? this.format,
        bitrate: bitrate ?? this.bitrate,
        speed: speed ?? this.speed,
        pitch: pitch ?? this.pitch,
        preservePitch: preservePitch ?? this.preservePitch,
        bass: bass ?? this.bass,
        reverb: reverb ?? this.reverb,
        spatial8d: spatial8d ?? this.spatial8d,
        normalize: normalize ?? this.normalize,
      );

  /// Sesuaikan ke plan: format & bitrate yang diizinkan, speed/pitch dalam rentang.
  AudioOptions fitTo(PlanLimits p) => copyWith(
        format: p.formats.contains(format) ? format : (p.formats.isEmpty ? 'mp3' : p.formats.first),
        bitrate: bitrate > p.maxBitrate ? p.maxBitrate : bitrate,
        speed: speed.clamp(p.speed.$1, p.speed.$2),
        pitch: pitch.clamp(-p.pitch, p.pitch),
        bass: p.effects.contains('eq') ? bass : 0,
        reverb: p.effects.contains('reverb') ? reverb : 0,
        spatial8d: p.effects.contains('spatial8d') && spatial8d,
      );

  Map<String, dynamic> toJson() => {
        'format': format,
        'bitrate': bitrate,
        'sampleRate': 44100,
        'mono': false,
        'compress': true,
        'speed': double.parse(speed.toStringAsFixed(2)),
        'pitch': pitch,
        'preservePitch': preservePitch,
        'volume': 0,
        'bass': bass,
        'treble': 0,
        'reverb': reverb,
        'spatial8d': spatial8d,
        'normalize': normalize,
        'master': false,
        'fadeIn': 0,
        'fadeOut': 0,
        'trimStart': null,
        'trimEnd': null,
      };
}

class Preset {
  const Preset(this.id, this.label, this.apply, {this.needs});
  final String id, label;
  final AudioOptions Function(AudioOptions) apply;

  /// Efek plan yang dibutuhkan (eq / reverb / spatial8d); null = semua plan.
  final String? needs;

  bool allowed(PlanLimits p) => needs == null || p.effects.contains(needs);

  static final all = <Preset>[
    Preset('normal', 'Normal', (o) => o.copyWith(speed: 1, pitch: 0, preservePitch: true, reverb: 0, bass: 0, spatial8d: false, normalize: false)),
    Preset('nightcore', 'Nightcore', (o) => o.copyWith(speed: 1.25, preservePitch: false, pitch: 0)),
    Preset('slowed', 'Slowed', (o) => o.copyWith(speed: .85, preservePitch: false, pitch: 0, reverb: 0)),
    Preset('spedUp', 'Sped Up', (o) => o.copyWith(speed: 1.3, preservePitch: true, pitch: 0), needs: 'eq'),
    Preset('slowedReverb', 'Slowed + Reverb', (o) => o.copyWith(speed: .85, preservePitch: false, pitch: 0, reverb: 45), needs: 'reverb'),
    Preset('bassBoost', 'Bass Boost', (o) => o.copyWith(bass: 10, normalize: true), needs: 'eq'),
    Preset('eightD', '8D Audio', (o) => o.copyWith(spatial8d: true, reverb: 20), needs: 'spatial8d'),
  ];
}
