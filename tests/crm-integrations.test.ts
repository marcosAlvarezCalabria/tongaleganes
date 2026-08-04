import { describe, expect, it } from "vitest";
import { calendarEventId, projectCalendarEvent, reconcileCalendarEvent } from "../studio/adapters/google-calendar";
import { drainCalendarOutbox } from "../studio/calendar-drain";
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
  expect(writes).toHaveLength(1); expect(writes[0]).toContain("attempts = attempts + 1");
});
