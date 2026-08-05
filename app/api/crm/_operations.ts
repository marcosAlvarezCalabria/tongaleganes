import { persistAvailabilityBlock, persistOperationPlan, readOccupiedIntervals, readScopedAppointment, readScopedAppointments, type D1DatabasePort } from "@/studio/adapters/d1";
import { createAppointmentHandlers } from "./appointments/handlers";
import { getCrmActor } from "./_auth";

export async function crmOperationHandlers() {
  const { env } = await import("cloudflare:workers");
  const database = env.DB as unknown as D1DatabasePort;
  const now = () => new Date().toISOString();
  return createAppointmentHandlers({
    actor: getCrmActor,
    list: (actor) => readScopedAppointments(database, actor),
    find: (id, actor) => readScopedAppointment(database, actor, id),
    occupied: (artistId, appointmentId) => readOccupiedIntervals(database, artistId, appointmentId),
    save: (plan) => persistOperationPlan(database, plan, now()),
    block: (block) => persistAvailabilityBlock(database, block, now()),
  });
}
