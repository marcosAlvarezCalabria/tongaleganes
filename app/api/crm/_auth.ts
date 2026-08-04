import { authorizeAccessToken, createAccessKeySet, getAccessConfig } from "@/studio/auth";

const accessHeader = "Cf-Access-Jwt-Assertion";

export async function getCrmActor(headers: Headers) {
  const { env } = await import("cloudflare:workers");
  const config = getAccessConfig(env);
  if (!config) return null;

  const result = await authorizeAccessToken(
    headers.get(accessHeader),
    config,
    createAccessKeySet(config),
    async (email) => {
      const staff = await env.DB.prepare(
        "SELECT id, role, artist_id FROM staff WHERE email = ? AND active = 1",
      ).bind(email).first<{ id: string; role: "owner" | "artist"; artist_id: string | null }>();
      return staff && { staffId: staff.id, role: staff.role, ...(staff.artist_id ? { artistId: staff.artist_id } : {}) };
    },
  );

  return result.ok ? result.value : null;
}
