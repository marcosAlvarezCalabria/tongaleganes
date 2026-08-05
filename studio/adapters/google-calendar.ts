export type CalendarAppointment = { id: string; revision: number; customerName: string; artist: string; startsAt: string; status: string };
type CalendarConfig = { calendarId: string; clientId: string; clientSecret: string; refreshToken: string; fetcher?: typeof fetch };
type Dependencies = CalendarConfig & { fetcher: typeof fetch };
type TokenDependencies = Dependencies & { access_token: string };

export async function calendarEventId(appointmentId: string) {
  const bytes = new TextEncoder().encode(appointmentId);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return `crm${[...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

const withToken = async (config: CalendarConfig): Promise<TokenDependencies> => {
  const fetcher = config.fetcher ?? fetch;
  const response = await fetcher("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, refresh_token: config.refreshToken, grant_type: "refresh_token", scope: "https://www.googleapis.com/auth/calendar.events" }) });
  if (!response.ok) throw new Error("calendar_token_failed");
  return { ...config, fetcher, ...(await response.json() as { access_token: string }) };
};

const event = async (appointment: CalendarAppointment) => ({ id: await calendarEventId(appointment.id), summary: `${appointment.customerName} · ${appointment.artist}`, start: { dateTime: appointment.startsAt }, end: { dateTime: new Date(Date.parse(appointment.startsAt) + 3_600_000).toISOString() }, extendedProperties: { private: { appointmentId: appointment.id, revision: String(appointment.revision), status: appointment.status } } });
const endpoint = (calendarId: string, id = "") => `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events${id ? `/${id}` : ""}`;
const headers = (token: string) => ({ authorization: `Bearer ${token}`, "content-type": "application/json" });

export async function projectCalendarEvent(appointment: CalendarAppointment, config: CalendarConfig): Promise<"projected" | "retry"> {
  try {
    const { access_token, ...dependencies } = await withToken(config); const body = await event(appointment);
    let response = await dependencies.fetcher(endpoint(config.calendarId), { method: "POST", headers: headers(access_token), body: JSON.stringify(body) });
    if (response.status === 409) response = await dependencies.fetcher(endpoint(config.calendarId, body.id), { method: "PATCH", headers: headers(access_token), body: JSON.stringify(body) });
    return response.ok ? "projected" : response.status === 408 || response.status === 429 || response.status >= 500 ? "retry" : "retry";
  } catch { return "retry"; }
}

export async function reconcileCalendarEvent(appointment: CalendarAppointment, config: CalendarConfig): Promise<"aligned" | "drift"> {
  try {
    const { access_token, ...dependencies } = await withToken(config); const id = await calendarEventId(appointment.id);
    const response = await dependencies.fetcher(endpoint(config.calendarId, id), { headers: headers(access_token) }); if (!response.ok) return "drift";
    const remote = await response.json() as { extendedProperties?: { private?: { appointmentId?: string; revision?: string } } };
    const metadata = remote.extendedProperties?.private;
    return metadata?.appointmentId === appointment.id && metadata.revision === String(appointment.revision) ? "aligned" : "drift";
  } catch { return "drift"; }
}
