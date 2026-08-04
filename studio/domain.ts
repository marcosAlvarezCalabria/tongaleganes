export type BookingMode = "request" | "instant" | "hybrid";
export type ArtistPreference = { kind: "artist"; artistId: string } | { kind: "none" };

export interface BookingRequest {
  bookingMode: BookingMode;
  customer: { name: string; email: string; phone: string };
  appointment: { preferredStartAt: string; description: string };
  artistPreference: ArtistPreference;
}

export type DomainError = { kind: "validation" | "conflict" | "forbidden"; code: string; message: string; field?: string };
export type DomainResult<T> = { ok: true; value: T } | { ok: false; error: DomainError };

const failure = <T>(kind: DomainError["kind"], code: string, message: string, field?: string): DomainResult<T> => ({
  ok: false,
  error: { kind, code, message, ...(field ? { field } : {}) },
});

export const validationResult = <T>(code: string, message: string, field?: string) => failure<T>("validation", code, message, field);
export const conflictResult = <T>(code: string, message: string) => failure<T>("conflict", code, message);
export const forbiddenResult = <T>(code: string, message: string) => failure<T>("forbidden", code, message);

export const domainFixtures = {
  requestWithoutPreference: {
    bookingMode: "request",
    customer: { name: "Ada Lovelace", email: "ada@example.com", phone: "+34600037560" },
    appointment: { preferredStartAt: "2026-08-15T10:00:00.000Z", description: "Fine line botanical design" },
    artistPreference: { kind: "none" },
  } satisfies BookingRequest,
};

const unsupportedBookingMode = () => validationResult<BookingRequest>(
  "unsupported_booking_mode",
  "Only request booking mode is supported.",
  "bookingMode",
);

export function validateBookingRequest(input: BookingRequest): DomainResult<BookingRequest> {
  if (input.bookingMode !== "request") {
    return unsupportedBookingMode();
  }

  return { ok: true, value: input };
}

export type AppointmentStatus = "submitted" | "confirmed" | "moved" | "cancelled" | "completed";
export type TimeInterval = { startsAt: string; endsAt: string };

const transitions: Record<AppointmentStatus, AppointmentStatus[]> = {
  submitted: ["confirmed", "cancelled"], confirmed: ["moved", "cancelled", "completed"],
  moved: ["confirmed", "cancelled"], cancelled: [], completed: [],
};

export function canTransitionAppointment(from: AppointmentStatus, to: AppointmentStatus) {
  return transitions[from].includes(to);
}

export function planAppointmentChange(from: AppointmentStatus, to: AppointmentStatus, actorId: string): DomainResult<{ status: AppointmentStatus; history: { actorId: string; status: AppointmentStatus } }> {
  return canTransitionAppointment(from, to)
    ? { ok: true, value: { status: to, history: { actorId, status: to } } }
    : validationResult("invalid_transition", "This appointment cannot move to that status.", "status");
}

const startsBeforeEnd = (start: string, end: string) => start < end;

export function intervalsOverlap(left: TimeInterval, right: TimeInterval) {
  return startsBeforeEnd(left.startsAt, right.endsAt) && startsBeforeEnd(right.startsAt, left.endsAt);
}

export function hasAvailabilityConflict(candidate: TimeInterval, occupied: TimeInterval[]) {
  return occupied.some((interval) => intervalsOverlap(candidate, interval));
}

export const lifecycleFixtures = {
  openInterval: { startsAt: "2026-08-15T10:00:00.000Z", endsAt: "2026-08-15T12:00:00.000Z" },
};
