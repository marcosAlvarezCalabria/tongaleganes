import { planAppointmentOperation, type AppointmentOperation, type AppointmentOperationPlan, type OperationAppointment } from "../../../../studio/use-cases.ts";
import type { Actor } from "../../../../studio/ports.ts";

type Dependencies = {
  actor(headers: Headers): Promise<Actor | null>;
  list(actor: Actor): Promise<OperationAppointment[]>;
  find(id: string, actor: Actor): Promise<OperationAppointment | null>;
  save(plan: AppointmentOperationPlan): Promise<{ ok: boolean }>;
  block(input: { id: string; artistId: string; startsAt: string; endsAt: string; reason: string | null }): Promise<{ ok: boolean }>;
};

const unauthorized = () => new Response(null, { status: 401 });
const denied = () => new Response(null, { status: 404 });
const ownerOnly = () => Response.json({ kind: "forbidden", code: "owner_only", message: "Only owners can schedule." }, { status: 403 });
const input = async (request: Request) => request.json() as Promise<Record<string, unknown>>;

export function createAppointmentHandlers(dependencies: Dependencies) {
  const actor = (request: Request) => dependencies.actor(request.headers);
  return {
    async list(request: Request) {
      const current = await actor(request);
      return current ? Response.json({ appointments: await dependencies.list(current) }) : unauthorized();
    },
    async detail(request: Request, id: string) {
      const current = await actor(request);
      if (!current) return unauthorized();
      const appointment = await dependencies.find(id, current);
      return appointment ? Response.json({ appointment }) : denied();
    },
    async mutate(request: Request, id: string) {
      const current = await actor(request);
      if (!current) return unauthorized();
      const appointment = await dependencies.find(id, current);
      if (!appointment) return denied();
      const operation = await input(request) as AppointmentOperation;
      if (operation.kind === "schedule" && current.role !== "owner") return ownerOnly();
      const planned = planAppointmentOperation({ actor: current, repository: { appointment, occupiedIntervals: [] }, operation });
      if (!planned.ok) return Response.json(planned.error, { status: planned.error.kind === "forbidden" ? 403 : 400 });
      return (await dependencies.save(planned.value)).ok ? new Response(null, { status: 204 }) : Response.json({ code: "write_conflict" }, { status: 409 });
    },
    async block(request: Request) {
      const current = await actor(request);
      if (!current) return unauthorized();
      if (current.role !== "owner") return ownerOnly();
      const body = await input(request);
      if (typeof body.artistId !== "string" || typeof body.startsAt !== "string" || typeof body.endsAt !== "string") return Response.json({ code: "invalid_block" }, { status: 400 });
      const saved = await dependencies.block({ id: `block:${body.artistId}:${body.startsAt}`, artistId: body.artistId, startsAt: body.startsAt, endsAt: body.endsAt, reason: typeof body.reason === "string" ? body.reason : null });
      return saved.ok ? new Response(null, { status: 204 }) : Response.json({ code: "availability_conflict" }, { status: 409 });
    },
  };
}
