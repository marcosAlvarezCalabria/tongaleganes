import type { Actor } from "./ports.ts";

export function canAccessAppointment(actor: Actor, assignedArtistId: string | null) {
  return actor.role === "owner" || (actor.artistId !== undefined && actor.artistId === assignedArtistId);
}
