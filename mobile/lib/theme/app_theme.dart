import 'package:flutter/material.dart';

import 'tokens.dart';
import 'type.dart';

class AppTheme {
  AppTheme._();

  static ThemeData get dark => ThemeData(
        brightness: Brightness.dark,
        fontFamily: AppType.body,
        scaffoldBackgroundColor: Tokens.surfaceBase,
        splashFactory: NoSplash.splashFactory,
        highlightColor: Colors.transparent,
        colorScheme: const ColorScheme.dark(
          primary: Tokens.accent,
          onPrimary: Tokens.textOnAccent,
          surface: Tokens.surfaceRaised,
          onSurface: Tokens.textPrimary,
          error: Tokens.danger,
          outline: Tokens.border,
        ),
        sliderTheme: SliderThemeData(
          trackHeight: 4,
          activeTrackColor: Tokens.accent,
          inactiveTrackColor: Tokens.border,
          thumbColor: Tokens.accentStrong,
          overlayColor: Tokens.accent.withValues(alpha: .12),
          valueIndicatorColor: Tokens.surfaceSunken,
          valueIndicatorTextStyle: AppType.label,
        ),
        snackBarTheme: SnackBarThemeData(
          behavior: SnackBarBehavior.floating,
          backgroundColor: Tokens.surfaceSunken,
          contentTextStyle: AppType.bodyMd,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(Tokens.radiusPill),
            side: const BorderSide(color: Tokens.border),
          ),
        ),
        bottomSheetTheme: const BottomSheetThemeData(
          backgroundColor: Tokens.surfaceRaised,
          modalBarrierColor: Color(0x99000000),
          showDragHandle: true,
          dragHandleColor: Tokens.borderStrong,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(Tokens.radiusLg))),
        ),
        progressIndicatorTheme: const ProgressIndicatorThemeData(color: Tokens.accent, linearTrackColor: Tokens.border),
        textSelectionTheme: TextSelectionThemeData(
          cursorColor: Tokens.accentStrong,
          selectionColor: Tokens.accent.withValues(alpha: .3),
          selectionHandleColor: Tokens.accentStrong,
        ),
      );
}
