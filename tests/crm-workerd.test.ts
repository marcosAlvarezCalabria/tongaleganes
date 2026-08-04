import { env, SELF } from "cloudflare:test";
import { importJWK, SignJWT } from "jose";
import { beforeEach, describe, expect, it } from "vitest";
import { getCrmActor } from "../app/api/crm/_auth";

const issuer = "https://access.test";
const audience = "crm-test";
const signingKey = await importJWK(JSON.parse(env.TEST_PRIVATE_JWK), "RS256");
const token = (email: string) => new SignJWT({ email }).setProtectedHeader({ alg: "RS256", kid: "test-only-crm-key" }).setIssuer(issuer).setAudience(audience).setIssuedAt().setExpirationTime("5m").sign(signingKey);

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM staff").run();
  await env.DB.prepare("INSERT INTO staff (id,email,role,artist_id,active,created_at,updated_at) VALUES (?,?,?,?,1,?,?)").bind("owner-1", "owner@test.invalid", "owner", null, "2026", "2026").run();
  await env.DB.prepare("INSERT INTO staff (id,email,role,artist_id,active,created_at,updated_at) VALUES (?,?,?,?,1,?,?)").bind("artist-staff-1", "artist@test.invalid", "artist", "artist-1", "2026", "2026").run();
});

describe("test-only workerd CRM auth harness", () => {
  it("keeps unauthenticated requests undisclosed", async () => expect(await getCrmActor(new Headers())).toBeNull());
  it("resolves seeded owner and artist JWTs through D1 and outbound JWKS", async () => {
    const headers = async (email: string) => new Headers({ "Cf-Access-Jwt-Assertion": await token(email) });
    await expect(getCrmActor(await headers("owner@test.invalid"))).resolves.toEqual({ staffId: "owner-1", role: "owner" });
    await expect(getCrmActor(await headers("artist@test.invalid"))).resolves.toEqual({ staffId: "artist-staff-1", role: "artist", artistId: "artist-1" });
  });
  it("fetches the built CRM Worker with safe unauthenticated and authenticated boundaries", async () => {
    expect((await SELF.fetch("https://studio.test/crm")).status).toBe(404);
    const request = async (email: string) => new Request("https://studio.test/crm", { headers: { "Cf-Access-Jwt-Assertion": await token(email) } });
    expect((await SELF.fetch(await request("owner@test.invalid"))).status).toBe(200);
    expect((await SELF.fetch(await request("artist@test.invalid"))).status).toBe(200);
  });
});
