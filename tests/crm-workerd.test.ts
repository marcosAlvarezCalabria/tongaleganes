import { env, SELF } from "cloudflare:test";
import { importJWK, SignJWT } from "jose";
import { beforeEach, describe, expect, it } from "vitest";
import { getCrmActor } from "../app/api/crm/_auth";

const issuer = "https://access.test";
const audience = "crm-test";
const signingKey = await importJWK(JSON.parse(env.TEST_PRIVATE_JWK), "RS256");
const token = (email: string) => new SignJWT({ email }).setProtectedHeader({ alg: "RS256", kid: "test-only-crm-key" }).setIssuer(issuer).setAudience(audience).setIssuedAt().setExpirationTime("5m").sign(signingKey);

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM appointments").run();
  await env.DB.prepare("DELETE FROM customers").run();
  await env.DB.prepare("DELETE FROM staff").run();
  await env.DB.prepare("INSERT INTO staff (id,email,role,artist_id,active,created_at,updated_at) VALUES (?,?,?,?,1,?,?)").bind("owner-1", "owner@test.invalid", "owner", null, "2026", "2026").run();
  await env.DB.prepare("INSERT INTO staff (id,email,role,artist_id,active,created_at,updated_at) VALUES (?,?,?,?,1,?,?)").bind("artist-1", "artist@test.invalid", "artist", "artist-1", "2026", "2026").run();
  await env.DB.prepare("INSERT INTO staff (id,email,role,artist_id,active,created_at,updated_at) VALUES (?,?,?,?,1,?,?)").bind("artist-2", "artist-two@test.invalid", "artist", "artist-2", "2026", "2026").run();
  await env.DB.prepare("INSERT INTO customers (id,name,email,phone,created_at,updated_at) VALUES (?,?,?,?,?,?)").bind("customer-ada", "Ada Lovelace", "ada@test.invalid", "+34600000001", "2026", "2026").run();
  await env.DB.prepare("INSERT INTO customers (id,name,email,phone,created_at,updated_at) VALUES (?,?,?,?,?,?)").bind("customer-grace", "Grace Hopper", "grace@test.invalid", "+34600000002", "2026", "2026").run();
  await env.DB.prepare("INSERT INTO appointments (id,customer_id,artist_id,status,preferred_start_at,scheduled_start_at,scheduled_end_at,description,revision,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind("appointment-ada", "customer-ada", "artist-1", "confirmed", "2026-08-12T10:00:00.000Z", "2026-08-15T10:00:00.000Z", "2026-08-15T12:00:00.000Z", "Diseño botánico", 1, "2026", "2026").run();
  await env.DB.prepare("INSERT INTO appointments (id,customer_id,artist_id,status,preferred_start_at,scheduled_start_at,scheduled_end_at,description,revision,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind("appointment-grace", "customer-grace", "artist-2", "submitted", "2026-08-13T10:00:00.000Z", null, null, "Retrato", 1, "2026", "2026").run();
});

describe("test-only workerd CRM auth harness", () => {
  it("keeps unauthenticated requests undisclosed", async () => expect(await getCrmActor(new Headers())).toBeNull());
  it("resolves seeded owner and artist JWTs through D1 and outbound JWKS", async () => {
    const headers = async (email: string) => new Headers({ "Cf-Access-Jwt-Assertion": await token(email) });
    await expect(getCrmActor(await headers("owner@test.invalid"))).resolves.toEqual({ staffId: "owner-1", role: "owner" });
    await expect(getCrmActor(await headers("artist@test.invalid"))).resolves.toEqual({ staffId: "artist-1", role: "artist", artistId: "artist-1" });
  });
  it("fetches the built CRM Worker with safe unauthenticated and authenticated boundaries", async () => {
    expect((await SELF.fetch("https://studio.test/crm")).status).toBe(404);
    const request = async (email: string) => new Request("https://studio.test/crm", { headers: { "Cf-Access-Jwt-Assertion": await token(email) } });
    expect((await SELF.fetch(await request("owner@test.invalid"))).status).toBe(200);
    expect((await SELF.fetch(await request("artist@test.invalid"))).status).toBe(200);
  });
  it("renders owner workload and privileged appointment actions without disclosing it anonymously", async () => {
    const ownerRequest = new Request("https://studio.test/crm", { headers: { accept: "text/html", "Cf-Access-Jwt-Assertion": await token("owner@test.invalid") } });
    const ownerHtml = await (await SELF.fetch(ownerRequest)).text();
    expect(ownerHtml).toContain("Operaciones del estudio");
    expect(ownerHtml).toContain("Ada Lovelace");
    expect(ownerHtml).toContain("Grace Hopper");
    expect(ownerHtml).toContain("Programar cita");
    expect((await SELF.fetch("https://studio.test/crm")).status).toBe(404);
  });
  it("renders only the assigned artist workload and hides another artist detail", async () => {
    const artistHeaders = { accept: "text/html", "Cf-Access-Jwt-Assertion": await token("artist@test.invalid") };
    const listHtml = await (await SELF.fetch(new Request("https://studio.test/crm", { headers: artistHeaders }))).text();
    expect(listHtml).toContain("Ada Lovelace");
    expect(listHtml).not.toContain("Grace Hopper");
    expect(listHtml).toContain("Actualizar estado");
    expect((await SELF.fetch(new Request("https://studio.test/crm/appointments/appointment-ada", { headers: artistHeaders }))).status).toBe(200);
    expect((await SELF.fetch(new Request("https://studio.test/crm/appointments/appointment-grace", { headers: artistHeaders }))).status).toBe(404);
  });
});
