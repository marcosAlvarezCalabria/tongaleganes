import { getCrmActor } from "../_auth";

export async function GET(request: Request) {
  const actor = await getCrmActor(request.headers);
  if (!actor) return new Response(null, { status: 401 });

  return Response.json({ actor: { role: actor.role }, appointments: [] });
}
