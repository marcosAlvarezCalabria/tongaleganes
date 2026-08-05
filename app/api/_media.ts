import { getCrmActor } from "@/app/api/crm/_auth";
import { readScopedAppointment, type D1DatabasePort } from "@/studio/adapters/d1";
import { validateImage, type MediaState } from "@/studio/adapters/media";

type Statement = { bind(...values: unknown[]): Statement; all<T>(): Promise<{ results: T[] }>; first<T>(): Promise<T | null>; run(): Promise<unknown> };
type Bucket = { put(key: string, body: ReadableStream, options: { httpMetadata: { contentType: string } }): Promise<unknown>; get(key: string): Promise<{ body: ReadableStream | null; httpMetadata?: { contentType?: string } } | null> };
type Images = { input(stream: ReadableStream): { transform(options: Record<string, unknown>): { output(options: { format: string; quality: number }): Promise<{ response(): Promise<Response> }> } } };
type Env = { DB: Omit<D1DatabasePort, "prepare"> & { prepare(query: string): Statement }; MEDIA: Bucket; IMAGES?: Images };
type MediaRow = { id: string; appointment_id: string; object_key: string; state: MediaState };
const hidden = () => new Response(null, { status: 404 });
const unauthorized = () => new Response(null, { status: 401 });

export async function mediaHandlers() {
  const { env } = await import("cloudflare:workers") as unknown as { env: Env };
  const find = (id: string) => env.DB.prepare("SELECT id, appointment_id, object_key, state FROM media_assets WHERE id = ?").bind(id).first<MediaRow>();
  const readObject = async (row: MediaRow) => {
    const object = await env.MEDIA.get(row.object_key);
    return object?.body ? new Response(object.body, { headers: { "content-type": object.httpMetadata?.contentType ?? "image/webp", "cache-control": "no-store" } }) : hidden();
  };
  return {
    async upload(request: Request) {
      const actor = await getCrmActor(request.headers); if (!actor) return unauthorized();
      const form = await request.formData(); const appointmentId = form.get("appointmentId"); const file = form.get("file");
      if (typeof appointmentId !== "string" || !(file instanceof File) || !await validateImage(file)) return new Response(null, { status: 400 });
      if (!await readScopedAppointment(env.DB, actor, appointmentId)) return hidden();
      const id = crypto.randomUUID(); const objectKey = `appointments/${appointmentId}/${id}`;
      const transformed = env.IMAGES ? await (await env.IMAGES.input(file.stream()).transform({ width: 2400 }).output({ format: "webp", quality: 85 })).response() : null;
      await env.MEDIA.put(objectKey, transformed?.body ?? file.stream(), { httpMetadata: { contentType: transformed ? "image/webp" : file.type } });
      await env.DB.prepare("INSERT INTO media_assets (id, appointment_id, uploader_id, object_key, state, created_at, updated_at) VALUES (?, ?, ?, ?, 'pending', ?, ?)").bind(id, appointmentId, actor.staffId, objectKey, new Date().toISOString(), new Date().toISOString()).run();
      return Response.json({ id }, { status: 201 });
    },
    async privateRead(request: Request, id: string) {
      const actor = await getCrmActor(request.headers); if (!actor) return unauthorized();
      const media = await find(id); if (!media || !await readScopedAppointment(env.DB, actor, media.appointment_id)) return hidden();
      return readObject(media);
    },
    async publicRead(id: string) { const media = await find(id); return media?.state === "approved" ? readObject(media) : hidden(); },
    async approve(request: Request, id: string) {
      const actor = await getCrmActor(request.headers); if (!actor) return unauthorized(); if (actor.role !== "owner" || !await find(id)) return hidden();
      const action = (await request.json() as { action?: string }).action; const state = action === "approve" ? "approved" : action === "reject" ? "rejected" : action === "revoke" ? "revoked" : null;
      if (!state) return new Response(null, { status: 400 });
      await env.DB.prepare("UPDATE media_assets SET state = ?, approved_by = ?, approved_at = ?, updated_at = ? WHERE id = ?").bind(state, actor.staffId, state === "approved" ? new Date().toISOString() : null, new Date().toISOString(), id).run();
      return new Response(null, { status: 204 });
    },
  };
}
