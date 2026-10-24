import { z } from "zod";
import { AppError, handle, ok, readJson } from "@/lib/server/http";
import { attachGuest, identify } from "@/lib/server/identity";
import { rateLimit } from "@/lib/server/rateLimit";
import { parsePlaylistId, parseVideoId, playlist, videoInfo } from "@/lib/server/media/youtube";

const schema = z.object({
  url: z.string().trim().min(5).max(500),
  playlist: z.boolean().optional(),
});

// Satu link → info video, atau isi playlist kalau diminta / link hanya berisi playlist
export const POST = handle(async (req) => {
  const id = await identify(req);
  await rateLimit("info", id.owner, 40, 60);
  const { url, playlist: wantPlaylist } = schema.parse(await readJson(req));

  const videoId = parseVideoId(url);
  const playlistId = parsePlaylistId(url);
  if (!videoId && !playlistId) throw new AppError("Link YouTube tidak valid", 422, "INVALID_URL");

  if (playlistId && (wantPlaylist || !videoId)) {
    const pl = await playlist(playlistId);
    return attachGuest(ok({ type: "playlist", playlistId, ...pl }), id);
  }
  const video = await videoInfo(videoId!);
  return attachGuest(ok({ type: "video", video, playlistId }), id);
});
