import { mediaHandlers } from "../../_media";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) { return (await mediaHandlers()).privateRead(request, (await context.params).id); }
