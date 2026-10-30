import 'package:flutter/material.dart';

import 'tokens.dart';

/// Skala tipografi: Sora (judul), Inter Tight (isi), IBM Plex Mono (label/tombol — gaya referensi).
class AppType {
  AppType._();

  static const display = 'Sora';
  static const body = 'InterTight';
  static const mono = 'IBMPlexMono';

  static const hero = TextStyle(fontFamily: display, fontSize: 34, height: 1.08, fontWeight: FontWeight.w600, letterSpacing: -1.1, color: Tokens.textPrimary);
  static const title = TextStyle(fontFamily: display, fontSize: 24, height: 1.15, fontWeight: FontWeight.w600, letterSpacing: -.6, color: Tokens.textPrimary);
  static const heading = TextStyle(fontFamily: display, fontSize: 18, height: 1.25, fontWeight: FontWeight.w600, letterSpacing: -.3, color: Tokens.textPrimary);
  static const bodyLg = TextStyle(fontFamily: body, fontSize: 16, height: 1.5, fontWeight: FontWeight.w400, color: Tokens.textSecondary);
  static const bodyMd = TextStyle(fontFamily: body, fontSize: 15, height: 1.45, fontWeight: FontWeight.w500, color: Tokens.textPrimary);
  static const bodySm = TextStyle(fontFamily: body, fontSize: 13, height: 1.4, fontWeight: FontWeight.w400, color: Tokens.textSecondary);
  static const label = TextStyle(fontFamily: mono, fontSize: 14, height: 1.2, fontWeight: FontWeight.w500, letterSpacing: -.1, color: Tokens.textPrimary);
  static const eyebrow = TextStyle(fontFamily: mono, fontSize: 12, height: 1.2, fontWeight: FontWeight.w500, letterSpacing: .6, color: Tokens.textTertiary);
  static const tabular = TextStyle(fontFamily: mono, fontSize: 12, fontWeight: FontWeight.w500, color: Tokens.textSecondary, fontFeatures: [FontFeature.tabularFigures()]);
}
