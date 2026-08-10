import { calendarEventId, type CalendarAppointment } from "./adapters/google-calendar";

type Row = { id: string; appointment_id: string; revision: number; attempts: number; customer_name: string; artist_name: string; scheduled_start_at: string; status: string };
type Statement = { bind(...values: unknown[]): { all(): Promise<{ results: unknown[] }>; run(): Promise<unknown> } };
type Database = { prepare(query: string): Statement };

export const projectionStatus = (outcome: "projected" | "retry" | "drift") => outcome;

const saveProjection = async (database: Database, appointment: CalendarAppointment, outcome: "projected" | "retry" | "drift") => {
  const now = new Date().toISOString();
  await database.prepare("INSERT INTO calendar_projection (appointment_id, event_id, revision, state_hash, status, last_error, retry_at, drift_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(appointment_id) DO UPDATE SET event_id = excluded.event_id, revision = excluded.revision, state_hash = excluded.state_hash, status = excluded.status, last_error = excluded.last_error, retry_at = excluded.retry_at, drift_at = excluded.drift_at, updated_at = excluded.updated_at")
    .bind(appointment.id, await calendarEventId(appointment.id), appointment.revision, `${appointment.revision}:${appointment.status}`, projectionStatus(outcome), outcome === "projected" ? null : outcome, outcome === "retry" ? now : null, outcome === "drift" ? now : null, now).run();
};

export async function drainCalendarOutbox(database: Database, project: (appointment: CalendarAppointment) => Promise<"projected" | "retry"> = async () => "retry") {
  const rows = (await database.prepare("SELECT o.id, o.appointment_id, o.revision, o.attempts, c.name AS customer_name, s.id AS artist_name, a.scheduled_start_at, a.status FROM calendar_outbox o JOIN appointments a ON a.id = o.appointment_id JOIN customers c ON c.id = a.customer_id JOIN staff s ON s.id = a.artist_id WHERE o.status = 'pending' AND o.next_attempt_at <= ?").bind(new Date().toISOString()).all()).results as Row[];
  for (const row of rows) {
    const outcome = await project({ id: row.appointment_id, revision: row.revision, customerName: row.customer_name, artist: row.artist_name, startsAt: row.scheduled_start_at, status: row.status });
    const appointment = { id: row.appointment_id, revision: row.revision, customerName: row.customer_name, artist: row.artist_name, startsAt: row.scheduled_start_at, status: row.status };
    const retryAt = new Date(Date.now() + 300_000 * 2 ** Math.min(row.attempts, 8)).toISOString();
    await saveProjection(database, appointment, outcome);
    await database.prepare(outcome === "projected" ? "UPDATE calendar_outbox SET status = 'done', updated_at = ? WHERE id = ?" : "UPDATE calendar_outbox SET attempts = attempts + 1, next_attempt_at = ?, updated_at = ? WHERE id = ?").bind(...(outcome === "projected" ? [new Date().toISOString(), row.id] : [retryAt, new Date().toISOString(), row.id])).run();
  }
}

export async function reconcileCalendarProjections(database: Database, reconcile: (appointment: CalendarAppointment) => Promise<"aligned" | "drift"> = async () => "drift") {
  const rows = (await database.prepare("SELECT p.appointment_id, p.revision, c.name AS customer_name, s.id AS artist_name, a.scheduled_start_at, a.status FROM calendar_projection p JOIN appointments a ON a.id = p.appointment_id JOIN customers c ON c.id = a.customer_id JOIN staff s ON s.id = a.artist_id").bind().all()).results as Array<Omit<Row, "id" | "attempts">>;
  for (const row of rows) {
    const appointment = { id: row.appointment_id, revision: row.revision, customerName: row.customer_name, artist: row.artist_name, startsAt: row.scheduled_start_at, status: row.status };
    if (await reconcile(appointment) === "drift") await saveProjection(database, appointment, "drift");
  }
}
