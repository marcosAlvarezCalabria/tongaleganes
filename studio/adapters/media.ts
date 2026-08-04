export type MediaState = "pending" | "approved" | "rejected" | "revoked";

const maxBytes = 10 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const png = (bytes: Uint8Array) => bytes.length >= 24 && bytes.slice(0, 8).every((byte, index) => byte === [137, 80, 78, 71, 13, 10, 26, 10][index]);
const jpeg = (bytes: Uint8Array) => bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
const webp = (bytes: Uint8Array) => new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
const read32 = (bytes: Uint8Array, offset: number) => (bytes[offset] << 24) + (bytes[offset + 1] << 16) + (bytes[offset + 2] << 8) + bytes[offset + 3];

function dimensions(bytes: Uint8Array): [number, number] | null {
  if (png(bytes)) return [read32(bytes, 16), read32(bytes, 20)];
  if (webp(bytes) && new TextDecoder().decode(bytes.slice(12, 16)) === "VP8X" && bytes.length >= 30) return [1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16), 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16)];
  for (let offset = 2; jpeg(bytes) && offset + 9 < bytes.length; offset += 2 + ((bytes[offset + 2] << 8) | bytes[offset + 3])) if (bytes[offset] === 255 && bytes[offset + 1] >= 192 && bytes[offset + 1] <= 195) return [(bytes[offset + 7] << 8) | bytes[offset + 8], (bytes[offset + 5] << 8) | bytes[offset + 6]];
  return null;
}

export async function validateImage(file: File) {
  if (file.size > maxBytes || !allowedTypes.has(file.type)) return false;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const magicMatches = (file.type === "image/png" && png(bytes)) || (file.type === "image/jpeg" && jpeg(bytes)) || (file.type === "image/webp" && webp(bytes));
  const size = magicMatches ? dimensions(bytes) : null;
  return Boolean(size && size[0] > 0 && size[1] > 0 && size[0] <= 2400 && size[1] <= 2400);
}

export function retentionDeadline(state: MediaState, updatedAt: string) {
  const days = state === "revoked" ? 7 : state === "pending" || state === "rejected" ? 30 : null;
  return days === null ? null : new Date(Date.parse(updatedAt) + days * 86_400_000).toISOString();
}
