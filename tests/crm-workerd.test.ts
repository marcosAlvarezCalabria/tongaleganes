import { env, SELF } from "cloudflare:test";
import { importJWK, SignJWT } from "jose";
import { beforeEach, describe, expect, it } from "vitest";
import { getCrmActor } from "../app/api/crm/_auth";

const issuer = "https://access.test";
const audience = "crm-test";
const signingKey = await importJWK(JSON.parse(env.TEST_PRIVATE_JWK), "RS256");
const token = (email: string) => new SignJWT({ email }).setProtectedHeader({ alg: "RS256", kid: "test-only-crm-key" }).setIssuer(issuer).setAudience(audience).setIssuedAt().setExpirationTime("5m").sign(signingKey);

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM media_assets").run();
  await env.DB.prepare("DELETE FROM calendar_outbox").run();
  await env.DB.prepare("DELETE FROM appointment_history").run();
  await env.DB.prepare("DELETE FROM availability_blocks").run();
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

  it("rejects owner scheduling that overlaps an active appointment without state, history, or outbox writes", async () => {
    const request = new Request("https://studio.test/api/crm/appointments/appointment-grace", {
      method: "POST",
      headers: { "Cf-Access-Jwt-Assertion": await token("owner@test.invalid"), "content-type": "application/json" },
      body: JSON.stringify({ kind: "schedule", artistId: "artist-1", interval: { startsAt: "2026-08-15T11:00:00.000Z", endsAt: "2026-08-15T13:00:00.000Z" } }),
    });
    const response = await SELF.fetch(request);
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ kind: "conflict", code: "availability_conflict" });
    await expect(env.DB.prepare("SELECT artist_id, status, scheduled_start_at, scheduled_end_at, revision FROM appointments WHERE id = ?").bind("appointment-grace").first()).resolves.toEqual({ artist_id: "artist-2", status: "submitted", scheduled_start_at: null, scheduled_end_at: null, revision: 1 });
    await expect(env.DB.prepare("SELECT id FROM appointment_history WHERE appointment_id = ?").bind("appointment-grace").all()).resolves.toMatchObject({ results: [] });
    await expect(env.DB.prepare("SELECT id FROM calendar_outbox WHERE appointment_id = ?").bind("appointment-grace").all()).resolves.toMatchObject({ results: [] });
  });

  it("rejects owner scheduling into an availability block but permits touching its boundary", async () => {
    await env.DB.prepare("INSERT INTO availability_blocks (id,artist_id,starts_at,ends_at,reason,created_at,updated_at) VALUES (?,?,?,?,?,?,?)").bind("block-1", "artist-1", "2026-08-16T10:00:00.000Z", "2026-08-16T12:00:00.000Z", "break", "2026", "2026").run();
    const schedule = async (startsAt: string, endsAt: string) => SELF.fetch(new Request("https://studio.test/api/crm/appointments/appointment-grace", {
      method: "POST",
      headers: { "Cf-Access-Jwt-Assertion": await token("owner@test.invalid"), "content-type": "application/json" },
      body: JSON.stringify({ kind: "schedule", artistId: "artist-1", interval: { startsAt, endsAt } }),
    }));
    expect((await schedule("2026-08-16T11:00:00.000Z", "2026-08-16T13:00:00.000Z")).status).toBe(409);
    expect((await schedule("2026-08-16T12:00:00.000Z", "2026-08-16T14:00:00.000Z")).status).toBe(204);
    await expect(env.DB.prepare("SELECT artist_id, status, scheduled_start_at, scheduled_end_at, revision FROM appointments WHERE id = ?").bind("appointment-grace").first()).resolves.toEqual({ artist_id: "artist-1", status: "confirmed", scheduled_start_at: "2026-08-16T12:00:00.000Z", scheduled_end_at: "2026-08-16T14:00:00.000Z", revision: 2 });
  });

  it("excludes the appointment being moved and terminal appointments from occupied intervals", async () => {
    const insert = (id: string, status: "cancelled" | "completed") => env.DB.prepare("INSERT INTO appointments (id,customer_id,artist_id,status,preferred_start_at,scheduled_start_at,scheduled_end_at,description,revision,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(id, "customer-ada", "artist-1", status, "2026-08-17T10:00:00.000Z", "2026-08-17T10:00:00.000Z", "2026-08-17T12:00:00.000Z", status, 1, "2026", "2026").run();
    await insert("appointment-cancelled", "cancelled");
    await insert("appointment-completed", "completed");
    const schedule = async (startsAt: string, endsAt: string) => SELF.fetch(new Request("https://studio.test/api/crm/appointments/appointment-grace", {
      method: "POST",
      headers: { "Cf-Access-Jwt-Assertion": await token("owner@test.invalid"), "content-type": "application/json" },
      body: JSON.stringify({ kind: "schedule", artistId: "artist-1", interval: { startsAt, endsAt } }),
    }));
    expect((await schedule("2026-08-17T10:00:00.000Z", "2026-08-17T12:00:00.000Z")).status).toBe(204);
    expect((await schedule("2026-08-17T11:00:00.000Z", "2026-08-17T13:00:00.000Z")).status).toBe(204);
  });

  it("rejects unassigned and unsafe uploads without persisting D1 or R2 writes", async () => {
    const upload = async (email: string | null, appointmentId: string, file: File) => {
      const form = new FormData(); form.set("appointmentId", appointmentId); form.set("file", file);
      return SELF.fetch(new Request("https://studio.test/api/crm/media", { method: "POST", body: form, headers: email ? { "Cf-Access-Jwt-Assertion": await token(email) } : undefined }));
    };
    const png = (width = 2, height = 2) => { const bytes = new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,0,0,0,0,0]); const view = new DataView(bytes.buffer); view.setUint32(16, width); view.setUint32(20, height); return new File([bytes], "tattoo.png", { type: "image/png" }); };
    expect((await upload(null, "appointment-ada", png())).status).toBe(401);
    expect((await upload("artist-two@test.invalid", "appointment-ada", png())).status).toBe(404);
    for (const name of ["requirements.txt", "CMakeLists.txt", "exploit.mdx", "README.sh"]) expect((await upload("artist@test.invalid", "appointment-ada", new File(["#!/bin/sh\necho unsafe"], name, { type: "image/png" }))).status).toBe(400);
    expect((await upload("artist@test.invalid", "appointment-ada", new File([new Uint8Array([255,216,255])], "wrong.png", { type: "image/png" }))).status).toBe(400);
    expect((await upload("artist@test.invalid", "appointment-ada", png(2401))).status).toBe(400);
    expect([400, 413]).toContain((await upload("artist@test.invalid", "appointment-ada", new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }))).status);
    expect((await env.DB.prepare("SELECT id FROM media_assets").all()).results).toEqual([]);
    expect((await env.MEDIA.list()).objects).toEqual([]);
  });

  it("keeps private media private until owner approval and revokes public eligibility", async () => {
    const form = new FormData(); form.set("appointmentId", "appointment-ada"); form.set("file", new File([new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,2,0,0,0,2])], "tattoo.png", { type: "image/png" }));
    const artistHeader = { "Cf-Access-Jwt-Assertion": await token("artist@test.invalid") };
    const created = await SELF.fetch(new Request("https://studio.test/api/crm/media", { method: "POST", body: form, headers: artistHeader }));
    expect(created.status).toBe(201); const { id } = await created.json() as { id: string };
    expect((await SELF.fetch(`https://studio.test/media/${id}`)).status).toBe(404);
    expect((await SELF.fetch(new Request(`https://studio.test/api/media/${id}`, { headers: { "Cf-Access-Jwt-Assertion": await token("artist-two@test.invalid") } }))).status).toBe(404);
    expect((await SELF.fetch(new Request(`https://studio.test/api/media/${id}`, { headers: artistHeader }))).status).toBe(200);
    const ownerHeader = { "Cf-Access-Jwt-Assertion": await token("owner@test.invalid"), "content-type": "application/json" };
    expect((await SELF.fetch(new Request(`https://studio.test/api/crm/media/${id}/approval`, { method: "POST", headers: ownerHeader, body: JSON.stringify({ action: "approve" }) }))).status).toBe(204);
    expect((await SELF.fetch(`https://studio.test/media/${id}`)).status).toBe(200);
    expect((await SELF.fetch(new Request(`https://studio.test/api/crm/media/${id}/approval`, { method: "POST", headers: ownerHeader, body: JSON.stringify({ action: "revoke" }) }))).status).toBe(204);
    expect((await SELF.fetch(`https://studio.test/media/${id}`)).status).toBe(404);
    expect((await SELF.fetch(new Request(`https://studio.test/api/media/${id}`, { headers: { "Cf-Access-Jwt-Assertion": await token("artist-two@test.invalid") } }))).status).toBe(404);
    const rejectedForm = new FormData(); rejectedForm.set("appointmentId", "appointment-ada"); rejectedForm.set("file", new File([new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,2,0,0,0,2])], "reject.png", { type: "image/png" }));
    const rejected = await SELF.fetch(new Request("https://studio.test/api/crm/media", { method: "POST", body: rejectedForm, headers: artistHeader })); const { id: rejectedId } = await rejected.json() as { id: string };
    expect((await SELF.fetch(new Request(`https://studio.test/api/crm/media/${rejectedId}/approval`, { method: "POST", headers: ownerHeader, body: JSON.stringify({ action: "reject" }) }))).status).toBe(204);
    expect((await SELF.fetch(`https://studio.test/media/${rejectedId}`)).status).toBe(404);
    expect((await SELF.fetch(new Request(`https://studio.test/api/media/${rejectedId}`, { headers: { "Cf-Access-Jwt-Assertion": await token("artist-two@test.invalid") } }))).status).toBe(404);
  });
});
