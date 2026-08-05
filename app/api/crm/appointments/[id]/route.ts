import { crmOperationHandlers } from "../../_operations";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return (await crmOperationHandlers()).detail(request, (await context.params).id);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return (await crmOperationHandlers()).mutate(request, (await context.params).id);
}
