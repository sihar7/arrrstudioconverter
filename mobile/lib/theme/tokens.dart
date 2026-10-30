import 'package:flutter/material.dart';

/// Design token 3 lapis: Primitive → Semantic → Component.
/// Arah visual: permukaan hitam NETRAL (tanpa rona biru) + aksen silver metalik (selaras logo ARRR chrome).
class Primitive {
  Primitive._();
  static const neutral975 = Color(0xFF08080A);
  static const neutral950 = Color(0xFF0C0C0E);
  static const neutral900 = Color(0xFF141416);
  static const neutral850 = Color(0xFF1B1B1E);
  static const neutral800 = Color(0xFF26262A);
  static const neutral700 = Color(0xFF34343A);
  static const neutral500 = Color(0xFF6F6F78);
  static const neutral400 = Color(0xFFA6A6AE);
  static const neutral50 = Color(0xFFF4F4F5);

  static const silver100 = Color(0xFFF3F4F6);
  static const silver300 = Color(0xFFD5D8DD);
  static const silver500 = Color(0xFF9EA2AA);

  static const red400 = Color(0xFFF2777A);
  static const green400 = Color(0xFF7BD88F);
}

class Tokens {
  Tokens._();

  // Semantic — permukaan
  static const surfaceBase = Primitive.neutral950;
  static const surfaceDeep = Primitive.neutral975;
  static const surfaceRaised = Primitive.neutral900;
  static const surfaceSunken = Primitive.neutral850;
  static const border = Primitive.neutral800;
  static const borderStrong = Primitive.neutral700;

  // Semantic — teks
  static const textPrimary = Primitive.neutral50;
  static const textSecondary = Primitive.neutral400;
  static const textTertiary = Primitive.neutral500;
  static const textOnAccent = Primitive.neutral950;

  // Semantic — aksen silver
  static const accent = Primitive.silver300;
  static const accentStrong = Primitive.silver100;
  static const accentMuted = Primitive.silver500;
  static const danger = Primitive.red400;
  static const success = Primitive.green400;

  /// Kilau silver untuk tombol primer & elemen unggulan.
  static const silverSheen = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Primitive.silver100, Primitive.silver300, Primitive.silver500],
    stops: [0, .55, 1],
  );

  /// Glow lembut (versi silver dari glow biru referensi).
  static List<BoxShadow> glow([double strength = 1]) => [
        BoxShadow(color: Primitive.silver100.withValues(alpha: .18 * strength), blurRadius: 24, spreadRadius: -4),
      ];

  // Component
  static const buttonPrimaryPressed = Primitive.silver500;
  static const rowPressed = surfaceSunken;
  static const focusRing = accentStrong;

  // Ukuran
  static const radiusSm = 10.0;
  static const radiusMd = 14.0;
  static const radiusLg = 20.0;
  static const radiusPill = 999.0;
  static const touch = 48.0;
  static const gutter = 20.0;

  // Motion
  static const fast = Duration(milliseconds: 120);
  static const base = Duration(milliseconds: 220);
  static const slow = Duration(milliseconds: 350);

  /// Durasi efektif — 0 bila pengguna mematikan animasi di sistem.
  static Duration motion(BuildContext context, Duration d) =>
      MediaQuery.of(context).disableAnimations ? Duration.zero : d;
}
