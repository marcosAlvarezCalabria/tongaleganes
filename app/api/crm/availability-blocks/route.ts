import { crmOperationHandlers } from "../_operations";

export async function POST(request: Request) {
  return (await crmOperationHandlers()).block(request);
}
