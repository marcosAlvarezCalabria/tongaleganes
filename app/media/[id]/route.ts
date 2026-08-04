import { mediaHandlers } from "../../api/_media";
export async function GET(_: Request, context: { params: Promise<{ id: string }> }) { return (await mediaHandlers()).publicRead((await context.params).id); }
