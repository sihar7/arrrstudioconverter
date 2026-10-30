import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../components/buttons.dart';
import '../../components/pressable.dart';
import '../../components/surfaces.dart';
import '../../components/toast.dart';
import '../../components/typography.dart';
import '../../state/roblox_settings.dart';
import '../../state/session_store.dart';
import '../../theme/tokens.dart';
import '../../theme/type.dart';
import '../tools/tool_web_screen.dart';
import 'widgets/roblox_sheet.dart';
import '../../theme/app_icons.dart';

/// Akun: profil Discord, plan & token, akun Roblox, keluar.
class AccountScreen extends StatelessWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final s = context.watch<SessionStore>();
    final rb = context.watch<RobloxSettings>();
    final pad = MediaQuery.paddingOf(context);
    final user = s.user;
    final quota = s.me?.quota;

    return ListView(
      padding: EdgeInsets.fromLTRB(Tokens.gutter, pad.top + 20, Tokens.gutter, 32),
      children: [
        const TwoToneTitle('Akun.', 'Plan & pengaturan.', style: AppType.title),
        const SizedBox(height: 20),
        SurfaceCard(
          child: user == null
              ? Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Kamu sedang mode tamu', style: AppType.heading),
                  const SizedBox(height: 6),
                  Text('Masuk dengan Discord untuk token lebih banyak, Pustaka, dan upload Roblox.', style: AppType.bodySm),
                  const SizedBox(height: 16),
                  PrimaryButton(
                    label: 'Masuk dengan Discord',
                    loading: s.signingIn,
                    onPressed: () async {
                      final err = await s.login();
                      if (err != null && context.mounted) showToast(context, err);
                    },
                  ),
                ])
              : Row(children: [
                  CircleAvatar(
                    radius: 26,
                    backgroundColor: Tokens.surfaceSunken,
                    foregroundImage: user.avatarUrl != null ? NetworkImage(user.avatarUrl!) : null,
                    child: Text(user.displayName.characters.first.toUpperCase(), style: AppType.heading),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(user.displayName, maxLines: 1, overflow: TextOverflow.ellipsis, style: AppType.heading),
                      Text('@${user.username}', style: AppType.bodySm),
                    ]),
                  ),
                  _PlanBadge(s.me?.planId ?? 'free'),
                ]),
        ),
        const SizedBox(height: 12),
        if (quota != null)
          SurfaceCard(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                const Eyebrow('Token'),
                const Spacer(),
                Text(quota.unlimited ? 'Tanpa batas' : '${quota.remaining} / ${quota.limit}', style: AppType.tabular.copyWith(color: Tokens.textPrimary)),
              ]),
              const SizedBox(height: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(3),
                child: LinearProgressIndicator(value: quota.fraction, minHeight: 6),
              ),
              const SizedBox(height: 10),
              Text(
                quota.resetIn != null
                    ? 'Terisi penuh lagi dalam ${_hm(quota.resetIn!)} · 1 token = ±5 menit audio'
                    : 'Token terisi ulang tiap ${quota.windowHours} jam · 1 token = ±5 menit audio',
                style: AppType.bodySm,
              ),
            ]),
          ),
        const SizedBox(height: 12),
        _Row(
          icon: AppIcons.crownSimple,
          title: 'Upgrade plan',
          subtitle: 'Lite mulai Rp15.000/bulan',
          onTap: () => ToolWebScreen.open(context, '/pricing', 'Harga'),
        ),
        _Row(
          icon: AppIcons.gameController,
          title: 'Akun Roblox',
          subtitle: rb.ready ? '${rb.creatorType == 'user' ? 'User' : 'Grup'} ${rb.creatorId} · key tersimpan' : 'Belum diatur — perlu untuk upload',
          onTap: () => showRobloxSheet(context),
        ),
        _Row(
          icon: AppIcons.globe,
          title: 'Buka versi web',
          subtitle: 'Semua fitur lengkap di bypass.arrrstudio.com',
          onTap: () => ToolWebScreen.open(context, '/converter', 'Web'),
        ),
        if (user != null) ...[
          const SizedBox(height: 28),
          SecondaryButton(
            label: 'Keluar',
            icon: AppIcons.signOut,
            danger: true,
            expand: true,
            onPressed: () => _confirmLogout(context, s),
          ),
        ],
        const SizedBox(height: 24),
        Center(child: Text('ARRR Converter · mobile 1.0', style: AppType.eyebrow)),
      ],
    );
  }

  static String _hm(int sec) {
    final h = sec ~/ 3600, m = (sec % 3600) ~/ 60;
    return h > 0 ? '$h j $m mnt' : '$m mnt';
  }

  Future<void> _confirmLogout(BuildContext context, SessionStore s) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (d) => AlertDialog(
        backgroundColor: Tokens.surfaceRaised,
        title: Text('Keluar dari akun?', style: AppType.heading),
        content: Text('Antrean di HP ini tetap ada. Pustaka bisa dilihat lagi setelah masuk.', style: AppType.bodySm),
        actions: [
          TextButton(onPressed: () => Navigator.pop(d, false), child: Text('Batal', style: AppType.label)),
          TextButton(onPressed: () => Navigator.pop(d, true), child: Text('Keluar', style: AppType.label.copyWith(color: Tokens.danger))),
        ],
      ),
    );
    if (ok == true) await s.logout();
  }
}

class _PlanBadge extends StatelessWidget {
  const _PlanBadge(this.plan);
  final String plan;

  @override
  Widget build(BuildContext context) {
    final paid = plan != 'free';
    return Container(
      height: 28,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        gradient: paid ? Tokens.silverSheen : null,
        color: paid ? null : Tokens.surfaceSunken,
        borderRadius: BorderRadius.circular(Tokens.radiusPill),
      ),
      child: Text(plan.toUpperCase(), style: AppType.tabular.copyWith(color: paid ? Tokens.textOnAccent : Tokens.textPrimary)),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.icon, required this.title, required this.subtitle, required this.onTap});
  final IconData icon;
  final String title, subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Pressable(
        onTap: onTap,
        scale: .98,
        label: title,
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: Tokens.surfaceRaised, borderRadius: BorderRadius.circular(Tokens.radiusMd)),
          child: Row(children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(color: Tokens.surfaceSunken, borderRadius: BorderRadius.circular(Tokens.radiusSm)),
              child: Icon(icon, size: 20, color: Tokens.accent),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(title, style: AppType.bodyMd),
                Text(subtitle, maxLines: 1, overflow: TextOverflow.ellipsis, style: AppType.bodySm),
              ]),
            ),
            const Icon(Icons.chevron_right_rounded, color: Tokens.textTertiary),
          ]),
        ),
      ),
    );
  }
}
