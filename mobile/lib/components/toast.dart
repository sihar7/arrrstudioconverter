import 'package:flutter/material.dart';

/// Toast pill (SnackBar bertema) — satu pintu agar gaya konsisten.
void showToast(BuildContext context, String text) {
  final m = ScaffoldMessenger.maybeOf(context);
  if (m == null) return;
  m
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(text), duration: const Duration(seconds: 3)));
}
