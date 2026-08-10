import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fetchOptimizedAsset } from "../worker/assets.ts";
import { normalizeSpanishPhone, replaceAppointmentStyle } from "../studio/booking.ts";
import { isAllowedPublicOrigin, parsePublicIntake, submitPublicRequest } from "../studio/use-cases.ts";
import { persistAvailabilityBlock, persistOperationPlan } from "../studio/adapters/d1.ts";
import { createAppointmentHandlers } from "../app/api/crm/appointments/handlers.ts";

const validIntake = {
  bookingMode: "request",
  customer: { name: "Ada Lovelace", email: "ada@example.com", phone: "+34600037560" },
  appointment: { preferredStartAt: "2026-08-15T10:00:00.000Z", description: "Fine line botanical design", style: "fineline" },
  artistPreference: { kind: "artist", artistId: "nuria-cordoba" },
  turnstileToken: "verified-token",
};

test("records a verified request-mode intake with a selected artist", async () => {
  const saved = [];
  const result = await submitPublicRequest(validIntake, {
    isRateLimited: async () => false,
    save: async (request) => (saved.push(request), "appointment-1"),
    verifyHuman: async () => true,
  });

  assert.deepEqual(result, { ok: true, value: { appointmentId: "appointment-1" } });
  const request = { bookingMode: validIntake.bookingMode, customer: validIntake.customer, appointment: validIntake.appointment, artistPreference: validIntake.artistPreference };
  assert.deepEqual(saved, [request]);
});

test("rejects a cross-origin public request", () => {
  assert.equal(isAllowedPublicOrigin("https://attacker.example", "https://tongatattoo.example"), false);
});

test("accepts a verified request with no artist preference", async () => {
  const result = await submitPublicRequest(
    { ...validIntake, artistPreference: { kind: "none" } },
    { isRateLimited: async () => false, save: async () => "appointment-2", verifyHuman: async () => true },
  );
  assert.deepEqual(result, { ok: true, value: { appointmentId: "appointment-2" } });
});

test("normalizes common Spanish phone formatting and persists one selected appointment style", () => {
  const result = parsePublicIntake({
    ...validIntake,
    customer: { ...validIntake.customer, phone: "+34 600 000 000" },
    appointment: { ...validIntake.appointment, style: "fineline" },
  });
  assert.deepEqual(normalizeSpanishPhone("600 000 000"), "+34600000000");
  assert.equal(replaceAppointmentStyle("fineline", "neotrad"), "neotrad");
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.value.appointment, { ...validIntake.appointment, style: "fineline" });
});

test("rejects invalid phone and unsupported or excessive appointment style without persistence", async () => {
  let saves = 0;
  const dependencies = { isRateLimited: async () => false, save: async () => (saves += 1, "unexpected"), verifyHuman: async () => true };
  for (const payload of [
    { ...validIntake, customer: { ...validIntake.customer, phone: "+34 600 000 000 0" }, appointment: { ...validIntake.appointment, style: "fineline" } },
    { ...validIntake, appointment: { ...validIntake.appointment, style: "not-a-style" } },
    { ...validIntake, appointment: { ...validIntake.appointment, style: "x".repeat(65) } },
  ]) assert.equal((await submitPublicRequest(payload, dependencies)).ok, false);
  assert.equal(saves, 0);
});

test("uses the official Turnstile widget and an accessible, optimized style selector", async () => {
  const source = await readFile(new URL("../app/(public)/book/BookingForm.tsx", import.meta.url), "utf8");
  assert.match(source, /https:\/\/challenges\.cloudflare\.com\/turnstile\/v0\/api\.js/);
  assert.match(source, /aria-pressed=/);
  assert.match(source, /<Image /);
  assert.doesNotMatch(source, /<img /);
  assert.match(source, /disabled=\{submitting \|\| !turnstileToken\}/);
  assert.match(source, /maxLength=\{2000\}/);
});

test("refuses missing assets and image-endpoint recursion without global fetch fallback", async () => {
  assert.equal((await fetchOptimizedAsset(undefined, "/images/fineline.jpg", "https://studio.test")).status, 503);
  const assets = { fetch: async () => new Response("unexpected") };
  assert.equal((await fetchOptimizedAsset(assets, "/_vinext/image?url=%2Fimages%2Ffineline.jpg", "https://studio.test")).status, 400);
});

test("rejects malformed, excessive, instant, and hybrid intake without persistence", async () => {
  let saves = 0;
  const dependencies = { isRateLimited: async () => false, save: async () => (saves += 1, "unexpected"), verifyHuman: async () => true };
  for (const payload of [
    { ...validIntake, customer: { ...validIntake.customer, email: "not-an-email" } },
    { ...validIntake, appointment: { ...validIntake.appointment, description: "x".repeat(2001) } },
    { ...validIntake, bookingMode: "instant" },
    { ...validIntake, bookingMode: "hybrid" },
  ]) {
    const result = await submitPublicRequest(payload, dependencies);
    assert.equal(result.ok, false);
  }
  assert.equal(saves, 0);
});

test("refuses rate-limited or failed-human-check requests before persistence", async () => {
  let saves = 0;
  for (const dependencies of [
    { isRateLimited: async () => true, verifyHuman: async () => true },
    { isRateLimited: async () => false, verifyHuman: async () => false },
  ]) {
    const result = await submitPublicRequest(validIntake, { ...dependencies, save: async () => (saves += 1, "unexpected") });
    assert.equal(result.ok, false);
  }
  assert.equal(saves, 0);
});

const operationPlan = {
  currentState: {
    id: "appointment-1", assignedArtistId: "artist-1", status: "confirmed",
    startsAt: "2026-08-15T10:00:00.000Z", endsAt: "2026-08-15T12:00:00.000Z", notes: null, revision: 3,
  },
  history: { appointmentId: "appointment-1", actorId: "owner-1", status: "confirmed" },
  calendarOutbox: { appointmentId: "appointment-1", revision: 3 },
};

const fakeD1 = (changes) => {
  const statements = [];
  return {
    statements,
    prepare(query) {
      return { bind(...values) { return { query, values }; } };
    },
    async batch(batch) {
      statements.push(...batch);
      return changes.map((change) => ({ meta: { changes: change } }));
    },
  };
};

test("maps an operation plan into one atomic current-state, history, and outbox D1 batch", async () => {
  const database = fakeD1([1, 1, 1]);
  const result = await persistOperationPlan(database, operationPlan, "2026-08-01T09:00:00.000Z");

  assert.deepEqual(result, { ok: true, value: undefined });
  assert.equal(database.statements.length, 3);
  assert.match(database.statements[0].query, /UPDATE appointments/);
  assert.deepEqual(database.statements[0].values, ["artist-1", "confirmed", "2026-08-15T10:00:00.000Z", "2026-08-15T12:00:00.000Z", 3, "2026-08-01T09:00:00.000Z", "appointment-1", 2]);
  assert.match(database.statements[1].query, /INSERT INTO appointment_history/);
  assert.deepEqual(database.statements[1].values.slice(0, 5), ["appointment-1:history:3", "appointment-1", "owner-1", "confirmed", null]);
  assert.match(database.statements[2].query, /INSERT INTO calendar_outbox/);
  assert.deepEqual(database.statements[2].values.slice(0, 3), ["appointment-1:outbox:3", "appointment-1", 3]);
});

test("maps availability blocks conditionally and reports conditional appointment or block conflicts", async () => {
  const block = { id: "block-1", artistId: "artist-1", startsAt: "2026-08-15T13:00:00.000Z", endsAt: "2026-08-15T14:00:00.000Z", reason: "Break" };
  const available = fakeD1([1]);
  assert.deepEqual(await persistAvailabilityBlock(available, block, "2026-08-01T09:00:00.000Z"), { ok: true, value: undefined });
  assert.match(available.statements[0].query, /NOT EXISTS/);
  assert.deepEqual(available.statements[0].values.slice(0, 7), ["block-1", "artist-1", block.startsAt, block.endsAt, "Break", "2026-08-01T09:00:00.000Z", "2026-08-01T09:00:00.000Z"]);

  const staleAppointment = await persistOperationPlan(fakeD1([0, 0, 0]), operationPlan, "2026-08-01T09:00:00.000Z");
  assert.deepEqual(staleAppointment, { ok: false, error: { kind: "conflict", code: "appointment_write_conflict", message: "This appointment changed before it could be saved." } });
  const conflictingBlock = await persistAvailabilityBlock(fakeD1([0]), block, "2026-08-01T09:00:00.000Z");
  assert.deepEqual(conflictingBlock, { ok: false, error: { kind: "conflict", code: "availability_conflict", message: "This artist is unavailable." } });
});

const crmAppointment = { id: "appointment-1", assignedArtistId: "artist-1", status: "confirmed", startsAt: "2026-08-15T10:00:00.000Z", endsAt: "2026-08-15T12:00:00.000Z", notes: null, revision: 2 };
const crmHandlers = (actor) => createAppointmentHandlers({
  actor: async () => actor,
  list: async (current) => current.role === "owner" ? [crmAppointment] : [crmAppointment].filter((item) => item.assignedArtistId === current.artistId),
  find: async (id, current) => id === crmAppointment.id && (current.role === "owner" || current.artistId === crmAppointment.assignedArtistId) ? crmAppointment : null,
  occupied: async () => [],
  save: async () => ({ ok: true, value: undefined }),
  block: async () => ({ ok: true, value: undefined }),
});

test("serves scoped list/detail and denies forged or unrelated-artist requests without disclosure", async () => {
  assert.equal((await crmHandlers(null).list(new Request("https://crm.test/api/crm/appointments"))).status, 401);
  const artist = crmHandlers({ staffId: "artist-staff", role: "artist", artistId: "artist-1" });
  assert.deepEqual(await (await artist.list(new Request("https://crm.test/api/crm/appointments"))).json(), { appointments: [crmAppointment] });
  assert.deepEqual(await (await artist.detail(new Request("https://crm.test/api/crm/appointments/appointment-1"), "appointment-1")).json(), { appointment: crmAppointment });
  assert.equal((await artist.mutate(new Request("https://crm.test/api/crm/appointments/other", { method: "POST", body: JSON.stringify({ notes: "x" }) }), "other")).status, 404);
});

test("allows owner scheduling and blocking but denies artist owner actions", async () => {
  const owner = crmHandlers({ staffId: "owner-1", role: "owner" });
  assert.equal((await owner.mutate(new Request("https://crm.test/api/crm/appointments/appointment-1", { method: "POST", body: JSON.stringify({ kind: "schedule", artistId: "artist-1", interval: { startsAt: "2026-08-16T10:00:00.000Z", endsAt: "2026-08-16T12:00:00.000Z" } }) }), "appointment-1")).status, 204);
  assert.equal((await owner.block(new Request("https://crm.test/api/crm/availability-blocks", { method: "POST", body: JSON.stringify({ artistId: "artist-1", startsAt: "2026-08-16T13:00:00.000Z", endsAt: "2026-08-16T14:00:00.000Z" }) }))).status, 204);
  const artist = crmHandlers({ staffId: "artist-staff", role: "artist", artistId: "artist-1" });
  assert.equal((await artist.block(new Request("https://crm.test/api/crm/availability-blocks", { method: "POST", body: "{}" }))).status, 403);
});
