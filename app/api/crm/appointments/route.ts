import { crmOperationHandlers } from "../_operations";

export async function GET(request: Request) {
  return (await crmOperationHandlers()).list(request);
}
