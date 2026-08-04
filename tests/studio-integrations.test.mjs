import assert from "node:assert/strict";
import test from "node:test";
import { isAllowedPublicOrigin, submitPublicRequest } from "../studio/use-cases.ts";

const validIntake = {
  bookingMode: "request",
  customer: { name: "Ada Lovelace", email: "ada@example.com", phone: "+34600037560" },
  appointment: { preferredStartAt: "2026-08-15T10:00:00.000Z", description: "Fine line botanical design" },
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
