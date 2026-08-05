import { mediaHandlers } from "../../../../_media";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { return (await mediaHandlers()).approve(request, (await context.params).id); }
