export type SpoofKind = "audio" | "animation";

export interface SpoofPermission {
  mode: "place" | "public";
  placeId: string | null;
  status: "pending" | "granted" | "failed";
  message: string | null;
}

export interface SpoofRecord {
  id: string;
  createdAt: number;
  kind: SpoofKind;
  sourceId: string;
  name: string;
  creatorType: "user" | "group";
  creatorId: string;
  /** asset ID baru (null selama Roblox masih memproses) */
  assetId: string | null;
  operationId: string | null;
  /** fallback .rbxm kalau upload animasi ditolak Roblox */
  fileId: string | null;
  error: string | null;
  permission: SpoofPermission | null;
}
