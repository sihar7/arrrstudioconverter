import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Pengaturan upload Roblox. API key HANYA di secure storage perangkat (tidak dikirim ke mana pun selain
/// saat upload), creator di shared preferences.
class RobloxSettings extends ChangeNotifier {
  static const _store = FlutterSecureStorage();
  static const _kKey = 'roblox_api_key';
  static const _kType = 'roblox_creator_type';
  static const _kId = 'roblox_creator_id';

  String apiKey = '';
  String creatorType = 'user';
  String creatorId = '';

  bool get ready => apiKey.isNotEmpty && creatorId.isNotEmpty;

  Future<void> load() async {
    apiKey = await _store.read(key: _kKey) ?? '';
    final prefs = await SharedPreferences.getInstance();
    creatorType = prefs.getString(_kType) ?? 'user';
    creatorId = prefs.getString(_kId) ?? '';
    notifyListeners();
  }

  Future<void> save({required String apiKey, required String creatorType, required String creatorId}) async {
    this.apiKey = apiKey.trim();
    this.creatorType = creatorType;
    this.creatorId = creatorId.trim();
    await _store.write(key: _kKey, value: this.apiKey);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kType, creatorType);
    await prefs.setString(_kId, this.creatorId);
    notifyListeners();
  }
}
