import type { Actor } from "./ports.ts";

type Statement = { bind(...values: unknown[]): Statement; first<T>(): Promise<T | null>; run(): Promise<unknown> };
type DevDatabase = { prepare(query: string): Statement };
type StaffRow = { id: string; role: "owner" | "artist"; artist_id: string | null };

type DevCrmEnv = { DB?: DevDatabase; CRM_DEMO_MODE?: string; CRM_DEV_AUTH?: string; CRM_DEV_AUTH_EMAIL?: string };

let ready: Promise<void> | null = null;

const now = "2026-08-10T00:00:00.000Z";

const statements = [
  "CREATE TABLE IF NOT EXISTS staff (id TEXT PRIMARY KEY NOT NULL, email TEXT NOT NULL UNIQUE, role TEXT NOT NULL CHECK (role IN ('owner', 'artist')), artist_id TEXT, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS appointments (id TEXT PRIMARY KEY NOT NULL, customer_id TEXT NOT NULL REFERENCES customers(id), artist_id TEXT REFERENCES staff(id), status TEXT NOT NULL DEFAULT 'submitted', preferred_start_at TEXT NOT NULL, scheduled_start_at TEXT, scheduled_end_at TEXT, description TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1, requested_artist_id TEXT REFERENCES staff(id), requested_style TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
  "CREATE INDEX IF NOT EXISTS appointments_artist_schedule ON appointments (artist_id, scheduled_start_at)",
  "CREATE TABLE IF NOT EXISTS appointment_history (id TEXT PRIMARY KEY NOT NULL, appointment_id TEXT NOT NULL REFERENCES appointments(id), actor_id TEXT REFERENCES staff(id), status TEXT NOT NULL, note TEXT, created_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS availability_blocks (id TEXT PRIMARY KEY NOT NULL, artist_id TEXT NOT NULL REFERENCES staff(id), starts_at TEXT NOT NULL, ends_at TEXT NOT NULL, reason TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
  "CREATE INDEX IF NOT EXISTS availability_artist_interval ON availability_blocks (artist_id, starts_at, ends_at)",
  "CREATE TABLE IF NOT EXISTS media_assets (id TEXT PRIMARY KEY NOT NULL, appointment_id TEXT NOT NULL REFERENCES appointments(id), uploader_id TEXT NOT NULL REFERENCES staff(id), object_key TEXT NOT NULL UNIQUE, state TEXT NOT NULL DEFAULT 'pending', approved_by TEXT REFERENCES staff(id), approved_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS calendar_outbox (id TEXT PRIMARY KEY NOT NULL, appointment_id TEXT NOT NULL REFERENCES appointments(id), revision INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE (appointment_id, revision))",
  "CREATE TABLE IF NOT EXISTS calendar_projection (appointment_id TEXT PRIMARY KEY NOT NULL REFERENCES appointments(id), event_id TEXT NOT NULL, revision INTEGER NOT NULL, state_hash TEXT NOT NULL, last_error TEXT, status TEXT NOT NULL DEFAULT 'pending', retry_at TEXT, drift_at TEXT, updated_at TEXT NOT NULL)",
];

const optionalMigrations = [
  "ALTER TABLE appointments ADD COLUMN requested_artist_id TEXT REFERENCES staff(id)",
  "ALTER TABLE appointments ADD COLUMN requested_style TEXT",
  "ALTER TABLE calendar_projection ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'",
  "ALTER TABLE calendar_projection ADD COLUMN retry_at TEXT",
  "ALTER TABLE calendar_projection ADD COLUMN drift_at TEXT",
];

async function runIgnoringDuplicateColumn(database: DevDatabase, query: string) {
  try {
    await database.prepare(query).run();
  } catch (error) {
    if (!(error instanceof Error) || !error.message.toLowerCase().includes("duplicate column")) throw error;
  }
}

async function ensureDevCrmDatabase(database: DevDatabase) {
  if (!ready) {
    ready = (async () => {
      for (const statement of statements) await database.prepare(statement).run();
      for (const statement of optionalMigrations) await runIgnoringDuplicateColumn(database, statement);

      await database.prepare("INSERT OR REPLACE INTO staff (id,email,role,artist_id,active,created_at,updated_at) VALUES (?,?,?,?,1,?,?)")
        .bind("owner-1", "owner@test.invalid", "owner", null, now, now).run();
      await database.prepare("INSERT OR REPLACE INTO staff (id,email,role,artist_id,active,created_at,updated_at) VALUES (?,?,?,?,1,?,?)")
        .bind("artist-1", "artist@test.invalid", "artist", "artist-1", now, now).run();
      const customers = [
        ["customer-1", "Laura Martín", "laura@test.invalid", "+34600037560"],
        ["customer-2", "Diego Ramos", "diego@test.invalid", "+34611122334"],
        ["customer-3", "Marta Vega", "marta@test.invalid", "+34622233445"],
        ["customer-4", "Sergio León", "sergio@test.invalid", "+34633344556"],
      ];
      for (const customer of customers) {
        await database.prepare("INSERT OR REPLACE INTO customers (id,name,email,phone,created_at,updated_at) VALUES (?,?,?,?,?,?)")
          .bind(...customer, now, now).run();
      }

      const appointments = [
        ["appointment-1", "customer-1", "artist-1", "submitted", "2026-08-15T10:00:00.000Z", null, null, "Pieza fine line botánica en antebrazo, tamaño medio.", 1, "artist-1", "fineline"],
        ["appointment-2", "customer-2", "artist-1", "confirmed", "2026-08-16T17:00:00.000Z", "2026-08-16T17:00:00.000Z", "2026-08-16T19:00:00.000Z", "Blackwork ornamental para hombro. Cliente pide revisar composición antes de confirmar tamaño final.", 2, "artist-1", "blackwork"],
        ["appointment-3", "customer-3", null, "submitted", "2026-08-18T11:30:00.000Z", null, null, "Idea neo-traditional con flores y daga. Pendiente asignar artista y enviar presupuesto.", 1, null, "neotrad"],
        ["appointment-4", "customer-4", "artist-1", "completed", "2026-08-09T12:00:00.000Z", "2026-08-09T12:00:00.000Z", "2026-08-09T15:00:00.000Z", "Sesión final de pieza grande en pierna. Fotos pendientes de moderación para galería privada.", 3, "artist-1", "bodysuit"],
      ];
      for (const appointment of appointments) {
        await database.prepare("INSERT OR REPLACE INTO appointments (id,customer_id,artist_id,status,preferred_start_at,scheduled_start_at,scheduled_end_at,description,revision,requested_artist_id,requested_style,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
          .bind(...appointment, now, now).run();
      }

      await database.prepare("INSERT OR REPLACE INTO availability_blocks (id,artist_id,starts_at,ends_at,reason,created_at,updated_at) VALUES (?,?,?,?,?,?,?)")
        .bind("block-1", "artist-1", "2026-08-17T10:00:00.000Z", "2026-08-17T14:00:00.000Z", "Preparación de diseños", now, now).run();
      await database.prepare("INSERT OR REPLACE INTO calendar_projection (appointment_id,event_id,revision,state_hash,last_error,status,retry_at,drift_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)")
        .bind("appointment-2", "demo-calendar-event-2", 2, "demo-hash-2", null, "synced", null, null, now).run();
    })();
  }
  await ready;
}

export async function getLocalDemoCrmActor(headers: Headers, env: DevCrmEnv): Promise<Actor | null> {
  const host = headers.get("host") ?? "";
  const isLocalHost = host.startsWith("localhost:") || host.startsWith("127.0.0.1:") || host.startsWith("[::1]:");
  if (!isLocalHost || env.CRM_DEMO_MODE !== "enabled" || !env.DB) return null;

  await ensureDevCrmDatabase(env.DB);
  const staff = await env.DB.prepare("SELECT id, role, artist_id FROM staff WHERE email = ? AND active = 1")
    .bind("owner@test.invalid")
    .first<StaffRow>();
  return staff && { staffId: staff.id, role: staff.role, ...(staff.artist_id ? { artistId: staff.artist_id } : {}) };
}