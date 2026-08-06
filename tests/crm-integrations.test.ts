import { describe, expect, it } from "vitest";
import { calendarEventId, projectCalendarEvent, reconcileCalendarEvent } from "../studio/adapters/google-calendar";
import { drainCalendarOutbox, reconcileCalendarProjections } from "../studio/calendar-drain";
import { manualWhatsAppLink } from "../studio/whatsapp";

const appointment = { id: "appointment-ada", revision: 3, customerName: "Ada Lovelace", artist: "Nuria", startsAt: "2026-08-15T10:00:00.000Z", status: "confirmed" };

describe("calendar projection", () => {
  it("uses deterministic IDs and updates after a duplicate 409", async () => {
    const calls: Request[] = [];
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => { const request = new Request(input, init); calls.push(request); return calls.length === 1 ? Response.json({ access_token: "token" }) : calls.length === 2 ? new Response(null, { status: 409 }) : new Response(null, { status: 200 }); };
    expect(await calendarEventId(appointment.id)).toMatch(/^crm[0-9a-f]{64}$/);
    await expect(projectCalendarEvent(appointment, { calendarId: "studio", clientId: "id", clientSecret: "secret", refreshToken: "refresh", fetcher })).resolves.toBe("projected");
    expect(calls.map((call) => call.method)).toEqual(["POST", "POST", "PATCH"]);
    expect(await calls[1].json()).toMatchObject({ id: calendarEventId(appointment.id), extendedProperties: { private: { appointmentId: appointment.id, revision: "3" } } });
  });

  it("keeps CRM authoritative on timeout and external drift", async () => {
    const timeout = async () => { throw new Error("timeout"); };
    await expect(projectCalendarEvent(appointment, { calendarId: "studio", clientId: "id", clientSecret: "secret", refreshToken: "refresh", fetcher: timeout })).resolves.toBe("retry");
    const drift = async (_: RequestInfo | URL, init?: RequestInit) => init?.method === "POST" ? Response.json({ access_token: "token" }) : Response.json({ extendedProperties: { private: { appointmentId: "other", revision: "1" } } });
    await expect(reconcileCalendarEvent(appointment, { calendarId: "studio", clientId: "id", clientSecret: "secret", refreshToken: "refresh", fetcher: drift })).resolves.toBe("drift");
  });

  it("projects confirmed and moved events, but deletes cancelled events idempotently", async () => {
    const requests: Request[] = [];
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init); requests.push(request);
      return request.url.includes("oauth2") ? Response.json({ access_token: "token" }) : new Response(null, { status: 204 });
    };
    await expect(projectCalendarEvent({ ...appointment, status: "confirmed" }, { calendarId: "studio", clientId: "id", clientSecret: "secret", refreshToken: "refresh", fetcher })).resolves.toBe("projected");
    await expect(projectCalendarEvent({ ...appointment, revision: 4, startsAt: "2026-08-15T12:00:00.000Z", status: "moved" }, { calendarId: "studio", clientId: "id", clientSecret: "secret", refreshToken: "refresh", fetcher })).resolves.toBe("projected");
    await expect(projectCalendarEvent({ ...appointment, revision: 5, status: "cancelled" }, { calendarId: "studio", clientId: "id", clientSecret: "secret", refreshToken: "refresh", fetcher })).resolves.toBe("projected");
    expect(requests.filter((request) => !request.url.includes("oauth2")).map((request) => request.method)).toEqual(["POST", "POST", "DELETE"]);
    expect(await requests[1].json()).toMatchObject({ extendedProperties: { private: { appointmentId: appointment.id, revision: "3", status: "confirmed" } } });
    expect(requests[5].url).toContain(await calendarEventId(appointment.id));
  });

  it("retains retry and drift results without changing the appointment projection input", async () => {
    const original = { ...appointment };
    for (const status of [408, 429, 500]) {
      const fetcher = async (input: RequestInfo | URL) => String(input).includes("oauth2") ? Response.json({ access_token: "token" }) : new Response(null, { status });
      await expect(projectCalendarEvent(original, { calendarId: "studio", clientId: "id", clientSecret: "secret", refreshToken: "refresh", fetcher })).resolves.toBe("retry");
    }
    const missing = async (input: RequestInfo | URL) => String(input).includes("oauth2") ? Response.json({ access_token: "token" }) : new Response(null, { status: 404 });
    await expect(reconcileCalendarEvent(original, { calendarId: "studio", clientId: "id", clientSecret: "secret", refreshToken: "refresh", fetcher: missing })).resolves.toBe("drift");
    expect(original).toEqual(appointment);
  });
});

describe("manual WhatsApp links", () => {
  it("allows only consented authorized appointment context", () => {
    const link = manualWhatsAppLink({ authorized: true, consent: true, phone: "+34600037560", ...appointment, notes: "private", mediaUrl: "https://private" });
    expect(link).toContain("wa.me/34600037560"); expect(link).toContain("Ada%20Lovelace"); expect(link).not.toContain("private"); expect(link).not.toContain("https%3A%2F%2Fprivate");
  });
  it("denies missing consent, contact, or authorization", () => {
    expect(manualWhatsAppLink({ authorized: false, consent: true, phone: "+34600037560", ...appointment })).toBeNull();
    expect(manualWhatsAppLink({ authorized: true, consent: false, phone: "+34600037560", ...appointment })).toBeNull();
    expect(manualWhatsAppLink({ authorized: true, consent: true, phone: null, ...appointment })).toBeNull();
  });
});

it("drains due outbox entries and schedules retry after a transient projection failure", async () => {
  const writes: string[] = []; const database = { prepare: (query: string) => ({ bind: () => ({ all: async () => ({ results: [{ id: "outbox-1", appointment_id: appointment.id, revision: 3, attempts: 0, customer_name: appointment.customerName, artist_name: appointment.artist, scheduled_start_at: appointment.startsAt, status: appointment.status }] }), run: async () => { writes.push(query); } }) }) };
  await drainCalendarOutbox(database, async () => "retry");
  expect(writes).toHaveLength(2); expect(writes[1]).toContain("attempts = attempts + 1");
});

it("persists projected, retry, and drift state for owner reconciliation without mutating appointments", async () => {
  const writes: string[] = [];
  const database = { prepare: (query: string) => ({ bind: () => ({ all: async () => ({ results: [{ id: "outbox-1", appointment_id: appointment.id, revision: 3, attempts: 0, customer_name: appointment.customerName, artist_name: appointment.artist, scheduled_start_at: appointment.startsAt, status: appointment.status }] }), run: async () => { writes.push(query); } }) }) };
  await drainCalendarOutbox(database, async () => "projected");
  expect(writes.join(" ")).toContain("calendar_projection");
  expect(writes.join(" ")).toContain("status = 'done'");
  expect(writes.join(" ")).not.toContain("UPDATE appointments");
});

it("flags missing and mismatched external events as drift without changing CRM appointments", async () => {
  const writes: string[] = [];
  const database = { prepare: (query: string) => ({ bind: () => ({ all: async () => ({ results: [{ appointment_id: appointment.id, revision: 3, customer_name: appointment.customerName, artist_name: appointment.artist, scheduled_start_at: appointment.startsAt, status: appointment.status }] }), run: async () => { writes.push(query); } }) }) };
  await reconcileCalendarProjections(database, async () => "drift");
  expect(writes.join(" ")).toContain("calendar_projection");
  expect(writes.join(" ")).toContain("drift_at");
  expect(writes.join(" ")).not.toContain("UPDATE appointments");
});
