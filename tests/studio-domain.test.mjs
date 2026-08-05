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
import { planAppointmentOperation } from "../studio/use-cases.ts";

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

const plannerFixtures = {
  appointment: {
    id: "appointment-1", assignedArtistId: null, status: "submitted",
    startsAt: null, endsAt: null, notes: null, revision: 2,
  },
  owner: { staffId: "owner-1", role: "owner" },
  assignedArtist: { staffId: "artist-staff-1", role: "artist", artistId: "artist-1" },
  otherArtist: { staffId: "artist-staff-2", role: "artist", artistId: "artist-2" },
};

const planWithFakeRepository = (input) => planAppointmentOperation({
  ...input,
  repository: {
    appointment: input.appointment ?? plannerFixtures.appointment,
    occupiedIntervals: input.occupiedIntervals ?? [],
  },
});

test("plans an owner assignment and schedule as deterministic state, history, and calendar writes", () => {
  assert.deepEqual(planWithFakeRepository({
    actor: plannerFixtures.owner,
    operation: {
      kind: "schedule",
      artistId: "artist-1",
      interval: { startsAt: "2026-08-15T10:00:00.000Z", endsAt: "2026-08-15T12:00:00.000Z" },
    },
  }), {
    ok: true,
    value: {
      currentState: {
        id: "appointment-1", assignedArtistId: "artist-1", status: "confirmed",
        startsAt: "2026-08-15T10:00:00.000Z", endsAt: "2026-08-15T12:00:00.000Z", notes: null, revision: 3,
      },
      history: { appointmentId: "appointment-1", actorId: "owner-1", status: "confirmed" },
      calendarOutbox: { appointmentId: "appointment-1", revision: 3 },
    },
  });
});

test("plans an assigned artist status and note update without granting another artist access", () => {
  const appointment = { ...plannerFixtures.appointment, assignedArtistId: "artist-1", status: "confirmed", revision: 3 };
  assert.deepEqual(planWithFakeRepository({ actor: plannerFixtures.assignedArtist, appointment, operation: { kind: "update", status: "completed", notes: "Healed well." } }), {
    ok: true,
    value: {
      currentState: { ...appointment, status: "completed", notes: "Healed well.", revision: 4 },
      history: { appointmentId: "appointment-1", actorId: "artist-staff-1", status: "completed", notes: "Healed well." },
      calendarOutbox: { appointmentId: "appointment-1", revision: 4 },
    },
  });
  assert.deepEqual(planWithFakeRepository({ actor: plannerFixtures.otherArtist, appointment, operation: { kind: "update", notes: "Should not write." } }), {
    ok: false,
    error: { kind: "forbidden", code: "appointment_access_denied", message: "This actor cannot access this appointment." },
  });
});

test("rejects artist scheduling, invalid transitions, occupied intervals, and availability blocks", () => {
  const scheduled = { ...plannerFixtures.appointment, assignedArtistId: "artist-1", status: "confirmed", startsAt: "2026-08-15T10:00:00.000Z", endsAt: "2026-08-15T12:00:00.000Z" };
  assert.equal(planWithFakeRepository({ actor: plannerFixtures.assignedArtist, appointment: scheduled, operation: { kind: "schedule", artistId: "artist-1", interval: { startsAt: "2026-08-15T13:00:00.000Z", endsAt: "2026-08-15T14:00:00.000Z" } } }).error.code, "owner_only");
  assert.equal(planWithFakeRepository({ actor: plannerFixtures.owner, appointment: scheduled, operation: { kind: "update", status: "submitted" } }).error.code, "invalid_transition");
  const schedule = { kind: "schedule", artistId: "artist-1", interval: { startsAt: "2026-08-15T11:00:00.000Z", endsAt: "2026-08-15T13:00:00.000Z" } };
  assert.equal(planWithFakeRepository({ actor: plannerFixtures.owner, operation: schedule, occupiedIntervals: [{ startsAt: "2026-08-15T10:30:00.000Z", endsAt: "2026-08-15T11:30:00.000Z" }] }).error.code, "availability_conflict");
  assert.equal(planWithFakeRepository({ actor: plannerFixtures.owner, operation: schedule, occupiedIntervals: [{ startsAt: "2026-08-15T11:30:00.000Z", endsAt: "2026-08-15T12:30:00.000Z" }] }).error.code, "availability_conflict");
});
