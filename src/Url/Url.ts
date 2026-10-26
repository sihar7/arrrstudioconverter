// Base URL layanan eksternal — satu tempat, jangan hardcode di modul lain
const Url = {
  discordApi: "https://discord.com/api/v10",
  discordAuthorize: "https://discord.com/oauth2/authorize",
  discordCdn: "https://cdn.discordapp.com",

  robloxAssets: "https://apis.roblox.com/assets/v1",
  robloxPermissions: "https://apis.roblox.com/asset-permissions-api/v1/assets/permissions",
  robloxIntrospect: "https://apis.roblox.com/api-keys/v1/introspect",
  robloxDelivery: "https://apis.roblox.com/asset-delivery-api/v1/assetId",
  robloxDeliveryPublic: "https://assetdelivery.roblox.com/v2/assetId",
  robloxUniverses: "https://apis.roblox.com/universes/v1/places",
  robloxUsers: "https://users.roblox.com/v1/users",
  robloxGroups: "https://groups.roblox.com/v1/groups",
  robloxThumbs: "https://thumbnails.roblox.com/v1",
  robloxCreatorDashboard: "https://create.roblox.com/dashboard/credentials",
  robloxCreations: "https://create.roblox.com/dashboard/creations",
  robloxInventory: "https://apis.roblox.com/cloud/v2/users",
  robloxCreatorStore: "https://apis.roblox.com/cloud/v2/creator-store-products",

  youtubeWatch: "https://www.youtube.com/watch?v=",
  youtubePlaylist: "https://www.youtube.com/playlist?list=",
  youtubeOembed: "https://www.youtube.com/oembed",
  youtubeThumb: "https://i.ytimg.com/vi",
  youtubePlayer: "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
  youtubeSwData: "https://www.youtube.com/sw.js_data",
  youtubeHome: "https://www.youtube.com",
  // Jembatan YouTube di Google Apps Script (scripts/youtube-bridge.gs) — "Web app URL" hasil deploy.
  // Kosong = nonaktif. Di Vercel jadi jalur utama karena IP datacenter diblokir YouTube
  youtubeBridge: "",
  ytdlpRelease: "https://github.com/yt-dlp/yt-dlp/releases/latest/download",

  arrWebsite: "https://arrstudioweb.vercel.app/en",
  arrDiscord: "https://discord.gg/mtn3YmwjV",
} as const;

/** Halaman konfigurasi aset di Creator Dashboard (distribusi publik / Creator Store) */
export const robloxAssetConfigureUrl = (assetId: string) => `${Url.robloxCreations}/store/${assetId}/configure`;

export default Url;
