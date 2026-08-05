import { mediaHandlers } from "../../_media";
export async function POST(request: Request) { return (await mediaHandlers()).upload(request); }
