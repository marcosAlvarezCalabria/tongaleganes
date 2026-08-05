import type { CalendarAppointment } from "./adapters/google-calendar";

type Row = { id: string; appointment_id: string; revision: number; attempts: number; customer_name: string; artist_name: string; scheduled_start_at: string; status: string };
type Statement = { bind(...values: unknown[]): { all(): Promise<{ results: Row[] }>; run(): Promise<unknown> } };
type Database = { prepare(query: string): Statement };

export async function drainCalendarOutbox(database: Database, project: (appointment: CalendarAppointment) => Promise<"projected" | "retry"> = async () => "retry") {
  const rows = (await database.prepare("SELECT o.id, o.appointment_id, o.revision, o.attempts, c.name AS customer_name, s.id AS artist_name, a.scheduled_start_at, a.status FROM calendar_outbox o JOIN appointments a ON a.id = o.appointment_id JOIN customers c ON c.id = a.customer_id JOIN staff s ON s.id = a.artist_id WHERE o.status = 'pending' AND o.next_attempt_at <= ?").bind(new Date().toISOString()).all()).results;
  for (const row of rows) {
    const outcome = await project({ id: row.appointment_id, revision: row.revision, customerName: row.customer_name, artist: row.artist_name, startsAt: row.scheduled_start_at, status: row.status });
    const retryAt = new Date(Date.now() + 300_000 * 2 ** Math.min(row.attempts, 8)).toISOString();
    await database.prepare(outcome === "projected" ? "UPDATE calendar_outbox SET status = 'done', updated_at = ? WHERE id = ?" : "UPDATE calendar_outbox SET attempts = attempts + 1, next_attempt_at = ?, updated_at = ? WHERE id = ?").bind(...(outcome === "projected" ? [new Date().toISOString(), row.id] : [retryAt, new Date().toISOString(), row.id])).run();
  }
}
