import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getCrmActor } from "@/app/api/crm/_auth";

export default async function CrmLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (!(await getCrmActor(await headers()))) notFound();
  return <main aria-label="Studio operations">{children}</main>;
}
