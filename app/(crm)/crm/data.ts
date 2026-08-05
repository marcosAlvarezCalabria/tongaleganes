import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getCrmActor } from "@/app/api/crm/_auth";
import { readScopedAppointment, readScopedAppointments, type D1DatabasePort } from "@/studio/adapters/d1";

async function crmContext() {
  const actor = await getCrmActor(await headers());
  if (!actor) notFound();
  const { env } = await import("cloudflare:workers");
  return { actor, database: env.DB as unknown as D1DatabasePort };
}

export async function loadCrmAppointments() {
  const { actor, database } = await crmContext();
  return { actor, appointments: await readScopedAppointments(database, actor) };
}

export async function loadCrmAppointment(id: string) {
  const { actor, database } = await crmContext();
  const appointment = await readScopedAppointment(database, actor, id);
  if (!appointment) notFound();
  return { actor, appointment };
}
