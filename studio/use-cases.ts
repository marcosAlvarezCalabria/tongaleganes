import { conflictResult, forbiddenResult, hasAvailabilityConflict, planAppointmentChange, validationResult, validateBookingRequest, type AppointmentStatus, type BookingRequest, type DomainResult, type TimeInterval } from "./domain.ts";
import type { Actor } from "./ports.ts";

const hasArtistScope = (actor: Actor, assignedArtistId: string | null) => actor.artistId !== undefined && actor.artistId === assignedArtistId;

export function canAccessAppointment(actor: Actor, assignedArtistId: string | null) {
  return actor.role === "owner" || hasArtistScope(actor, assignedArtistId);
}

export type PublicIntake = BookingRequest & { turnstileToken: string };

type PublicIntakeDependencies = {
  isRateLimited(email: string): Promise<boolean>;
  save(request: BookingRequest): Promise<string>;
  verifyHuman(token: string): Promise<boolean>;
};

const invalid = <T>(code: string, field: string) => validationResult<T>(code, "Please check this field and try again.", field);
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const isText = (value: unknown, maximum: number): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= maximum;

export function parsePublicIntake(value: unknown): DomainResult<PublicIntake> {
  if (!isRecord(value) || !isRecord(value.customer) || !isRecord(value.appointment) || !isRecord(value.artistPreference)) {
    return invalid("invalid_request", "request");
  }
  const { customer, appointment, artistPreference } = value;
  if (!isText(customer.name, 100)) return invalid("invalid_name", "customer.name");
  if (!isText(customer.email, 254) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) return invalid("invalid_email", "customer.email");
  if (!isText(customer.phone, 32) || !/^\+[1-9]\d{7,14}$/.test(customer.phone)) return invalid("invalid_phone", "customer.phone");
  if (!isText(appointment.description, 2000)) return invalid("invalid_description", "appointment.description");
  if (!isText(appointment.preferredStartAt, 40) || Number.isNaN(Date.parse(appointment.preferredStartAt))) return invalid("invalid_start", "appointment.preferredStartAt");
  if (!isText(value.turnstileToken, 2048)) return invalid("invalid_human_check", "turnstileToken");

  const preference = artistPreference.kind === "none"
    ? { kind: "none" as const }
    : isText(artistPreference.artistId, 64) ? { kind: "artist" as const, artistId: artistPreference.artistId } : null;
  if (!preference) return invalid("invalid_artist", "artistPreference");

  return {
    ok: true,
    value: {
      bookingMode: value.bookingMode as BookingRequest["bookingMode"],
      customer: { name: customer.name.trim(), email: customer.email.trim().toLowerCase(), phone: customer.phone.trim() },
      appointment: { preferredStartAt: appointment.preferredStartAt, description: appointment.description.trim() },
      artistPreference: preference,
      turnstileToken: value.turnstileToken,
    },
  };
}

export function isAllowedPublicOrigin(origin: string | null, expectedOrigin: string) {
  return origin === null || origin === expectedOrigin;
}

export type OperationAppointment = {
  id: string;
  customerName: string;
  description: string;
  assignedArtistId: string | null;
  status: AppointmentStatus;
  startsAt: string | null;
  endsAt: string | null;
  notes: string | null;
  revision: number;
};

export type OperationPlanningRepository = {
  appointment: OperationAppointment;
  occupiedIntervals: TimeInterval[];
};

export type AppointmentOperation =
  | { kind: "schedule"; artistId: string; interval: TimeInterval }
  | { kind: "update"; status?: AppointmentStatus; notes?: string };

export type AppointmentOperationPlan = {
  currentState: OperationAppointment;
  history: { appointmentId: string; actorId: string; status: AppointmentStatus; notes?: string };
  calendarOutbox: { appointmentId: string; revision: number };
};

const toOperationPlan = (
  appointmentId: string,
  currentState: OperationAppointment,
  history: AppointmentOperationPlan["history"],
): DomainResult<AppointmentOperationPlan> => ({
  ok: true,
  value: {
    currentState,
    history,
    calendarOutbox: { appointmentId, revision: currentState.revision },
  },
});

export function planAppointmentOperation(input: {
  actor: Actor;
  repository: OperationPlanningRepository;
  operation: AppointmentOperation;
}): DomainResult<AppointmentOperationPlan> {
  const { actor, operation, repository } = input;
  const appointment = repository.appointment;

  if (operation.kind === "schedule") {
    if (actor.role !== "owner") {
      return forbiddenResult("owner_only", "Only owners can schedule.");
    }
    if (hasAvailabilityConflict(operation.interval, repository.occupiedIntervals)) {
      return conflictResult("availability_conflict", "This artist is unavailable.");
    }
    const status = appointment.status === "submitted" ? "confirmed" : "moved";
    const change = planAppointmentChange(appointment.status, status, actor.staffId);
    if (!change.ok) return change;
    const currentState = {
      ...appointment,
      assignedArtistId: operation.artistId,
      status: change.value.status,
      startsAt: operation.interval.startsAt,
      endsAt: operation.interval.endsAt,
      revision: appointment.revision + 1,
    };
    return toOperationPlan(appointment.id, currentState, { appointmentId: appointment.id, ...change.value.history });
  }

  if (!canAccessAppointment(actor, appointment.assignedArtistId)) {
    return forbiddenResult("appointment_access_denied", "This actor cannot access this appointment.");
  }
  const change = operation.status === undefined
    ? { ok: true as const, value: { status: appointment.status, history: { actorId: actor.staffId, status: appointment.status } } }
    : planAppointmentChange(appointment.status, operation.status, actor.staffId);
  if (!change.ok) return change;
  const currentState = { ...appointment, status: change.value.status, notes: operation.notes ?? appointment.notes, revision: appointment.revision + 1 };
  return toOperationPlan(appointment.id, currentState, {
    appointmentId: appointment.id,
    ...change.value.history,
    ...(operation.notes === undefined ? {} : { notes: operation.notes }),
  });
}

export async function submitPublicRequest(value: unknown, dependencies: PublicIntakeDependencies): Promise<DomainResult<{ appointmentId: string }>> {
  const parsed = parsePublicIntake(value);
  if (!parsed.ok) return parsed;
  const booking = validateBookingRequest(parsed.value);
  if (!booking.ok) return booking;
  if (await dependencies.isRateLimited(booking.value.customer.email)) return invalid("rate_limited", "customer.email");
  if (!await dependencies.verifyHuman(parsed.value.turnstileToken)) return invalid("human_check_failed", "turnstileToken");

  const request: BookingRequest = { bookingMode: parsed.value.bookingMode, customer: parsed.value.customer, appointment: parsed.value.appointment, artistPreference: parsed.value.artistPreference };
  return { ok: true, value: { appointmentId: await dependencies.save(request) } };
}
