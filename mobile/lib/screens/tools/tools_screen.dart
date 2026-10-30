import 'package:flutter/material.dart';

import '../../components/pressable.dart';
import '../../components/typography.dart';
import '../../theme/tokens.dart';
import '../../theme/type.dart';
import 'tool_web_screen.dart';
import '../../theme/app_icons.dart';

class _Tool {
  const _Tool(this.title, this.desc, this.icon, this.path, {this.featured = false});
  final String title, desc, path;
  final IconData icon;
  final bool featured;
}

/// Alat tambahan. Kartu unggulan dibuat silver (pengganti kartu "gambar" di referensi).
class ToolsScreen extends StatelessWidget {
  const ToolsScreen({super.key});

  static const _tools = [
    _Tool('Skybox', '6 sisi langit + pencahayaan otomatis untuk Roblox', AppIcons.cloudSun, '/skybox', featured: true),
    _Tool('Hapus background', 'AI di perangkat, hasil transparan', AppIcons.selectionBackground, '/remove-bg'),
    _Tool('Upscale', 'Perbesar gambar 2× / 4× tetap tajam', AppIcons.arrowsOut, '/upscale'),
    _Tool('Upload audio', 'MP3/OGG dari HP langsung ke Roblox', AppIcons.uploadSimple, '/upload'),
    _Tool('Audio saya', 'Kelola, arsip & izin aset Roblox', AppIcons.vinylRecord, '/library'),
    _Tool('Spoof', 'Pindahkan audio/animasi ke akunmu', AppIcons.swap, '/spoof'),
    _Tool('Obfuscator', 'Lindungi script Luau', AppIcons.lockKey, '/obfuscator'),
  ];

  @override
  Widget build(BuildContext context) {
    final pad = MediaQuery.paddingOf(context);
    final width = MediaQuery.sizeOf(context).width;
    final cols = width >= 700 ? 3 : 2;

    return CustomScrollView(
      slivers: [
        SliverPadding(
          padding: EdgeInsets.fromLTRB(Tokens.gutter, pad.top + 20, Tokens.gutter, 20),
          sliver: const SliverToBoxAdapter(child: TwoToneTitle('Alat kreator.', 'Semua untuk Roblox.', style: AppType.title)),
        ),
        SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: Tokens.gutter),
          sliver: SliverGrid.builder(
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: cols,
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: .86,
            ),
            itemCount: _tools.length,
            itemBuilder: (_, i) => _ToolCard(_tools[i]),
          ),
        ),
        const SliverToBoxAdapter(child: SizedBox(height: 32)),
      ],
    );
  }
}

class _ToolCard extends StatelessWidget {
  const _ToolCard(this.tool);
  final _Tool tool;

  @override
  Widget build(BuildContext context) {
    final f = tool.featured;
    final fg = f ? Tokens.textOnAccent : Tokens.textPrimary;
    return Pressable(
      label: tool.title,
      scale: .97,
      onTap: () => ToolWebScreen.open(context, tool.path, tool.title),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: f ? null : Tokens.surfaceRaised,
          gradient: f ? Tokens.silverSheen : null,
          borderRadius: BorderRadius.circular(Tokens.radiusLg),
          boxShadow: f ? Tokens.glow(.8) : null,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(tool.icon, size: 30, color: f ? Tokens.textOnAccent : Tokens.accent),
            const Spacer(),
            Text(tool.title, style: AppType.heading.copyWith(fontSize: 17, color: fg)),
            const SizedBox(height: 4),
            Text(tool.desc, maxLines: 3, overflow: TextOverflow.ellipsis,
                style: AppType.bodySm.copyWith(color: f ? Tokens.textOnAccent.withValues(alpha: .7) : Tokens.textSecondary)),
          ],
        ),
      ),
    );
  }
}
