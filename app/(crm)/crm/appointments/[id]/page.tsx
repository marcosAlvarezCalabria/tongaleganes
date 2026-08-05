import Link from "next/link";
import { loadCrmAppointment } from "../../data";
import { appointmentDetailView, appointmentTime } from "../../view-model";

export default async function AppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { actor, appointment } = await loadCrmAppointment((await params).id);
  const view = appointmentDetailView(actor.role, appointment);
  return <section className="crm-page" aria-labelledby="appointment-title"><Link className="crm-back" href="/crm">← Volver a citas</Link><header className="crm-header"><div><p className="crm-kicker">Cita · {view.status}</p><h1 id="appointment-title">{view.customerName}</h1><p>{appointmentTime(view.startsAt)}</p></div></header><dl className="crm-detail"><div><dt>Diseño</dt><dd>{view.description}</dd></div><div><dt>Estado</dt><dd>{view.status}</dd></div></dl><nav className="crm-actions" aria-label="Acciones de la cita">{view.actions.map((action) => <a href={`#${action.toLowerCase().replaceAll(" ", "-")}`} key={action}>{action}</a>)}</nav></section>;
}
