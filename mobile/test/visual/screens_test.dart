// Render tiap layar dengan data palsu → PNG di test/visual/goldens (verifikasi visual tanpa emulator).
// Jalankan: flutter test test/visual --update-goldens
import 'dart:convert';
import 'dart:io';

import 'package:arrr_converter/data/api_client.dart';
import 'package:arrr_converter/data/models.dart';
import 'package:arrr_converter/screens/shell/app_shell.dart';
import 'package:arrr_converter/state/player_store.dart';
import 'package:arrr_converter/state/queue_store.dart';
import 'package:arrr_converter/state/roblox_settings.dart';
import 'package:arrr_converter/state/session_store.dart';
import 'package:arrr_converter/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _plan = {
  'id': 'lite',
  'tokens': 12,
  'maxDurationSec': 900,
  'playlistMax': 10,
  'parallel': 2,
  'maxBitrate': 192,
  'formats': ['mp3', 'ogg', 'm4a'],
  'effects': ['eq'],
  'ranges': {'speed': [0.7, 1.4], 'pitch': 4},
};

final _api = MockClient((req) async {
  final p = req.url.path;
  Object body = {};
  if (p.endsWith('/auth/me')) {
    body = {
      'user': {'id': '1', 'username': 'arrr', 'displayName': 'ARRR Studio', 'avatarUrl': null},
      'quota': {'limit': 12, 'used': 4, 'remaining': 8, 'resetIn': 7200, 'windowHours': 5},
      'plan': {'id': 'lite', 'expiresAt': null},
    };
  } else if (p.endsWith('/plans')) {
    body = {'plans': {'free': _plan, 'lite': _plan}};
  } else if (p.endsWith('/history')) {
    body = {
      'items': [
        for (final (i, t) in ['Midnight Drive (Slowed)', 'Neon Skyline', 'Ocean Eyes – Nightcore'].indexed)
          {
            'id': 'h$i', 'title': t, 'artist': 'Artis $i', 'format': 'mp3', 'size': 3200000, 'duration': 201,
            'fileId': 'f$i', 'fileAvailable': true, 'thumbnail': '',
            'roblox': i == 0 ? {'assetId': '1234567890', 'state': 'Approved'} : null,
          },
      ],
    };
  }
  return http.Response(jsonEncode(body), 200, headers: {'content-type': 'application/json'});
});

Future<void> _loadFonts() async {
  for (final (family, file) in [
    ('Sora', 'assets/fonts/Sora.ttf'),
    ('InterTight', 'assets/fonts/InterTight.ttf'),
    ('IBMPlexMono', 'assets/fonts/IBMPlexMono-Medium.ttf'),
  ]) {
    final bytes = File(file).readAsBytesSync();
    await (FontLoader(family)..addFont(Future.value(ByteData.view(bytes.buffer)))).load();
  }
  // Ikon Material
  final material = File('${Platform.environment['FLUTTER_ROOT'] ?? 'C:/dev/flutter'}/bin/cache/artifacts/material_fonts/MaterialIcons-Regular.otf');
  if (material.existsSync()) {
    await (FontLoader('MaterialIcons')..addFont(Future.value(ByteData.view(material.readAsBytesSync().buffer)))).load();
  }
}

void main() {
  setUpAll(() async {
    FlutterSecureStorage.setMockInitialValues({});
    SharedPreferences.setMockInitialValues({'roblox_creator_id': '987654'});
    TestWidgetsFlutterBinding.ensureInitialized();
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(
      const MethodChannel('com.ryanheise.just_audio.methods'),
      (_) async => null,
    );
    await _loadFonts();
  });

  for (final (name, tab) in [('studio', 0), ('search', 1), ('library', 2), ('tools', 3), ('account', 4)]) {
    testWidgets('screen $name', (tester) async {
      tester.view.physicalSize = const Size(1170, 2532);
      tester.view.devicePixelRatio = 3;
      addTearDown(tester.view.reset);

      final api = ApiClient(client: _api);
      final session = SessionStore(api);
      await tester.runAsync(session.start);
      final queue = QueueStore(api, session);
      if (name == 'studio') {
        queue.items.addAll([
          QueueItem(Video(videoId: 'a', title: 'Lagu satu yang sedang diproses', author: 'Artis A', thumbnail: '', duration: 214))
            ..status = ItemStatus.running
            ..stage = 'Memproses'
            ..progress = 62,
          QueueItem(Video(videoId: 'b', title: 'Lagu dua siap convert', author: 'Artis B', thumbnail: '', duration: 187)),
          QueueItem(Video(videoId: 'c', title: 'Lagu tiga sudah selesai', author: 'Artis C', thumbnail: '', duration: 240))
            ..status = ItemStatus.error
            ..error = 'Video lebih dari 15 menit (batas plan)',
        ]);
      }

      await tester.pumpWidget(MultiProvider(
        providers: [
          ChangeNotifierProvider.value(value: session),
          ChangeNotifierProvider(create: (_) => RobloxSettings()),
          ChangeNotifierProvider(create: (_) => PlayerStore(api)),
          ChangeNotifierProvider.value(value: queue),
        ],
        child: MaterialApp(debugShowCheckedModeBanner: false, theme: AppTheme.dark, home: const AppShell()),
      ));
      await tester.pump();
      if (tab != 0) {
        await tester.tap(find.text(['Studio', 'Cari', 'Pustaka', 'Alat', 'Akun'][tab]));
        await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 200)));
      }
      await tester.pump();
      await tester.pump(const Duration(seconds: 1));
      await expectLater(find.byType(AppShell), matchesGoldenFile('goldens/$name.png'));
    });
  }
}
