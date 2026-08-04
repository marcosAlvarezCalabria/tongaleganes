import { conflictResult, type DomainResult } from "../domain.ts";
import type { AppointmentOperationPlan } from "../use-cases.ts";
import type { Actor } from "../ports.ts";
import type { OperationAppointment } from "../use-cases.ts";

export interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  all<T>(): Promise<{ results: T[] }>;
  first<T>(): Promise<T | null>;
}

type AppointmentRow = { id: string; artist_id: string | null; status: OperationAppointment["status"]; scheduled_start_at: string | null; scheduled_end_at: string | null; revision: number };
const mapAppointmentRow = (row: AppointmentRow): OperationAppointment => ({ id: row.id, assignedArtistId: row.artist_id, status: row.status, startsAt: row.scheduled_start_at, endsAt: row.scheduled_end_at, notes: null, revision: row.revision });
const appointmentColumns = "id, artist_id, status, scheduled_start_at, scheduled_end_at, revision";

export async function readScopedAppointments(database: D1DatabasePort, actor: Actor) {
  const statement = actor.role === "owner"
    ? database.prepare(`SELECT ${appointmentColumns} FROM appointments`)
    : database.prepare(`SELECT ${appointmentColumns} FROM appointments WHERE artist_id = ?`).bind(actor.artistId);
  return (await statement.all<AppointmentRow>()).results.map(mapAppointmentRow);
}

export async function readScopedAppointment(database: D1DatabasePort, actor: Actor, id: string) {
  const statement = actor.role === "owner"
    ? database.prepare(`SELECT ${appointmentColumns} FROM appointments WHERE id = ?`).bind(id)
    : database.prepare(`SELECT ${appointmentColumns} FROM appointments WHERE id = ? AND artist_id = ?`).bind(id, actor.artistId);
  const row = await statement.first<AppointmentRow>();
  return row ? mapAppointmentRow(row) : null;
}

export type D1BatchResult = { meta?: { changes?: number } };

export interface D1DatabasePort {
  prepare(query: string): D1Statement;
  batch(statements: D1Statement[]): Promise<D1BatchResult[]>;
}

export function createD1BatchWriter(database: D1DatabasePort) {
  return {
    execute(statements: Array<{ query: string; values?: unknown[] }>) {
      return database.batch(statements.map(({ query, values = [] }) => database.prepare(query).bind(...values)));
    },
  };
}

type D1Write = { query: string; values: unknown[] };
export type AvailabilityBlockWrite = { id: string; artistId: string; startsAt: string; endsAt: string; reason: string | null };

const prepareBatch = (database: D1DatabasePort, writes: D1Write[]) =>
  database.batch(writes.map(({ query, values }) => database.prepare(query).bind(...values)));

const wasWritten = (result: D1BatchResult | undefined) => result?.meta?.changes === 1;

export const mapOperationPlanWrites = (plan: AppointmentOperationPlan, now: string): D1Write[] => {
  const { currentState, history, calendarOutbox } = plan;
  return [mapAppointmentStateWrite(currentState, now), mapHistoryWrite(history, currentState, now), mapOutboxWrite(calendarOutbox, currentState, now)];
};

const mapAppointmentStateWrite = (state: AppointmentOperationPlan["currentState"], now: string): D1Write => ({
  query: "UPDATE appointments SET artist_id = ?, status = ?, scheduled_start_at = ?, scheduled_end_at = ?, revision = ?, updated_at = ? WHERE id = ? AND revision = ?",
  values: [state.assignedArtistId, state.status, state.startsAt, state.endsAt, state.revision, now, state.id, state.revision - 1],
});

const mapHistoryWrite = (history: AppointmentOperationPlan["history"], state: AppointmentOperationPlan["currentState"], now: string): D1Write => ({
  query: "INSERT INTO appointment_history (id, appointment_id, actor_id, status, note, created_at) SELECT ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM appointments WHERE id = ? AND revision = ? AND updated_at = ?)",
  values: [`${history.appointmentId}:history:${state.revision}`, history.appointmentId, history.actorId, history.status, history.notes ?? null, now, state.id, state.revision, now],
});

const mapOutboxWrite = (outbox: AppointmentOperationPlan["calendarOutbox"], state: AppointmentOperationPlan["currentState"], now: string): D1Write => ({
  query: "INSERT INTO calendar_outbox (id, appointment_id, revision, status, attempts, next_attempt_at, created_at, updated_at) SELECT ?, ?, ?, 'pending', 0, ?, ?, ? WHERE EXISTS (SELECT 1 FROM appointments WHERE id = ? AND revision = ? AND updated_at = ?)",
  values: [`${outbox.appointmentId}:outbox:${outbox.revision}`, outbox.appointmentId, outbox.revision, now, now, now, state.id, state.revision, now],
});

export async function persistOperationPlan(database: D1DatabasePort, plan: AppointmentOperationPlan, now: string): Promise<DomainResult<void>> {
  const results = await prepareBatch(database, mapOperationPlanWrites(plan, now));
  return wasWritten(results[0])
    ? { ok: true, value: undefined }
    : conflictResult("appointment_write_conflict", "This appointment changed before it could be saved.");
}

export const mapAvailabilityBlockWrite = (block: AvailabilityBlockWrite, now: string): D1Write => ({
  query: "INSERT INTO availability_blocks (id, artist_id, starts_at, ends_at, reason, created_at, updated_at) SELECT ?, ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM availability_blocks WHERE artist_id = ? AND starts_at < ? AND ? < ends_at) AND NOT EXISTS (SELECT 1 FROM appointments WHERE artist_id = ? AND scheduled_start_at IS NOT NULL AND scheduled_start_at < ? AND ? < scheduled_end_at AND status != 'cancelled')",
  values: [block.id, block.artistId, block.startsAt, block.endsAt, block.reason, now, now, block.artistId, block.endsAt, block.startsAt, block.artistId, block.endsAt, block.startsAt],
});

export async function persistAvailabilityBlock(database: D1DatabasePort, block: AvailabilityBlockWrite, now: string): Promise<DomainResult<void>> {
  const [result] = await prepareBatch(database, [mapAvailabilityBlockWrite(block, now)]);
  return wasWritten(result)
    ? { ok: true, value: undefined }
    : conflictResult("availability_conflict", "This artist is unavailable.");
}
