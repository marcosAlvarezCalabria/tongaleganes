import assert from "node:assert/strict";
import test from "node:test";
import {
  conflictResult,
  domainFixtures,
  forbiddenResult,
  validateBookingRequest,
  validationResult,
} from "../studio/domain.ts";
import { canTransitionAppointment, hasAvailabilityConflict, planAppointmentChange } from "../studio/domain.ts";

const validRequest = {
  bookingMode: "request",
  customer: {
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+34600037560",
  },
  appointment: {
    preferredStartAt: "2026-08-15T10:00:00.000Z",
    description: "Fine line botanical design",
  },
  artistPreference: { kind: "artist", artistId: "artist-ada" },
};

test("accepts a complete request-mode intake with a selected artist", () => {
  assert.deepEqual(validateBookingRequest(validRequest), {
    ok: true,
    value: validRequest,
  });
});

test("rejects an instant booking mode without creating an intake value", () => {
  assert.deepEqual(
    validateBookingRequest({ ...validRequest, bookingMode: "instant" }),
    {
      ok: false,
      error: {
        kind: "validation",
        code: "unsupported_booking_mode",
        field: "bookingMode",
        message: "Only request booking mode is supported.",
      },
    },
  );
});

test("accepts request-mode intake with no artist preference", () => {
  const noPreference = { ...validRequest, artistPreference: { kind: "none" } };
  assert.deepEqual(validateBookingRequest(noPreference), { ok: true, value: noPreference });
});

test("rejects hybrid booking mode with the same actionable error", () => {
  assert.equal(validateBookingRequest({ ...validRequest, bookingMode: "hybrid" }).error.code, "unsupported_booking_mode");
});

test("centralizes typed validation, conflict, and forbidden results", () => {
  assert.deepEqual(validationResult("invalid_contact", "Enter a valid phone number.", "customer.phone"), {
    ok: false,
    error: { kind: "validation", code: "invalid_contact", message: "Enter a valid phone number.", field: "customer.phone" },
  });
  assert.deepEqual(conflictResult("overlap", "This artist is unavailable."), {
    ok: false,
    error: { kind: "conflict", code: "overlap", message: "This artist is unavailable." },
  });
  assert.deepEqual(forbiddenResult("owner_only", "Only owners can schedule."), {
    ok: false,
    error: { kind: "forbidden", code: "owner_only", message: "Only owners can schedule." },
  });
});

test("provides a valid no-preference booking fixture", () => {
  assert.deepEqual(validateBookingRequest(domainFixtures.requestWithoutPreference), {
    ok: true,
    value: domainFixtures.requestWithoutPreference,
  });
});

test("plans an owner confirmation with append-only history", () => {
  assert.deepEqual(planAppointmentChange("submitted", "confirmed", "owner-1"), {
    ok: true,
    value: { status: "confirmed", history: { actorId: "owner-1", status: "confirmed" } },
  });
});

test("rejects invalid lifecycle transitions", () => {
  assert.equal(canTransitionAppointment("submitted", "completed"), false);
});

test("detects appointment overlaps and availability blocks", () => {
  const interval = { startsAt: "2026-08-15T10:00:00.000Z", endsAt: "2026-08-15T12:00:00.000Z" };
  assert.equal(hasAvailabilityConflict(interval, [{ startsAt: "2026-08-15T11:00:00.000Z", endsAt: "2026-08-15T13:00:00.000Z" }]), true);
});

test("allows a boundary-touching interval and terminal status remains terminal", () => {
  assert.equal(hasAvailabilityConflict({ startsAt: "2026-08-15T12:00:00.000Z", endsAt: "2026-08-15T13:00:00.000Z" }, [{ startsAt: "2026-08-15T10:00:00.000Z", endsAt: "2026-08-15T12:00:00.000Z" }]), false);
  assert.equal(canTransitionAppointment("cancelled", "confirmed"), false);
});
