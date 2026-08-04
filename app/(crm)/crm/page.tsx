import Link from "next/link";
import { loadCrmAppointments } from "./data";
import { appointmentListView, appointmentTime } from "./view-model";

export default async function CrmPage() {
  const { actor, appointments } = await loadCrmAppointments();
  const view = appointmentListView(actor.role, appointments);
  return (
    <section className="crm-page" aria-labelledby="crm-title">
      <header className="crm-header"><div><p className="crm-kicker">Tonga Tattoo · privado</p><h1 id="crm-title">{view.heading}</h1><p>{view.summary}</p></div><a className="crm-action" href="#programar">{view.primaryAction}</a></header>
      {appointments.length === 0 ? <p className="crm-empty" role="status">{view.empty}</p> : <ol className="crm-list">{appointments.map((appointment) => <li key={appointment.id}><Link href={`/crm/appointments/${appointment.id}`}><strong>{appointment.customerName}</strong><span>{appointment.description}</span><time dateTime={appointment.startsAt ?? undefined}>{appointmentTime(appointment.startsAt)}</time><em>{appointment.status}</em></Link></li>)}</ol>}
    </section>
  );
}
