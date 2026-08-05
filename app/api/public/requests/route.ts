import { verifyTurnstile } from "@/studio/adapters/turnstile";
import { isAllowedPublicOrigin, parsePublicIntake, submitPublicRequest } from "@/studio/use-cases";

const requestWindowMs = 15 * 60 * 1000;

export async function POST(request: Request) {
  if (!isAllowedPublicOrigin(request.headers.get("origin"), new URL(request.url).origin)) {
    return Response.json({ error: "origin_not_allowed" }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = parsePublicIntake(payload);
  if (!parsed.ok) return Response.json({ error: parsed.error.code }, { status: 400 });

  const { env } = await import("cloudflare:workers");
  const turnstileSecret = env.TURNSTILE_SECRET;
  if (!turnstileSecret) return Response.json({ error: "intake_unavailable" }, { status: 503 });

  const result = await submitPublicRequest(parsed.value, {
    isRateLimited: async (email) => {
      const since = new Date(Date.now() - requestWindowMs).toISOString();
      const row = await env.DB.prepare(
        "SELECT COUNT(*) AS count FROM appointments JOIN customers ON customers.id = appointments.customer_id WHERE customers.email = ? AND appointments.created_at >= ?",
      ).bind(email, since).first<{ count: number }>();
      return (row?.count ?? 0) >= 3;
    },
    save: async (intake) => {
      const now = new Date().toISOString();
      const customerId = crypto.randomUUID();
      const appointmentId = crypto.randomUUID();
      const requestedArtistId = intake.artistPreference.kind === "artist" ? intake.artistPreference.artistId : null;
      await env.DB.batch([
        env.DB.prepare("INSERT INTO customers (id, name, email, phone, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").bind(customerId, intake.customer.name, intake.customer.email, intake.customer.phone, now, now),
        env.DB.prepare("INSERT INTO appointments (id, customer_id, requested_artist_id, status, preferred_start_at, description, revision, created_at, updated_at) VALUES (?, ?, ?, 'submitted', ?, ?, 1, ?, ?)").bind(appointmentId, customerId, requestedArtistId, intake.appointment.preferredStartAt, intake.appointment.description, now, now),
        env.DB.prepare("INSERT INTO appointment_history (id, appointment_id, status, note, created_at) VALUES (?, ?, 'submitted', ?, ?)").bind(crypto.randomUUID(), appointmentId, "Public request submitted.", now),
      ]);
      return appointmentId;
    },
    verifyHuman: (token) => verifyTurnstile(token, turnstileSecret, request.headers.get("cf-connecting-ip") ?? undefined),
  });

  if (!result.ok) {
    return Response.json({ error: result.error.code }, { status: result.error.code === "rate_limited" ? 429 : 400 });
  }
  return Response.json(result.value, { status: 201 });
}
