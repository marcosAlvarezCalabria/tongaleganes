import Link from "next/link";
import { loadCrmAppointments } from "./data";
import { appointmentListView, appointmentStatusLabel, appointmentTime } from "./view-model";

export default async function CrmPage() {
  const { actor, appointments } = await loadCrmAppointments();
  const view = appointmentListView(actor.role, appointments);
  const nextAppointments = [...appointments]
    .sort((left, right) => (left.startsAt ?? left.id).localeCompare(right.startsAt ?? right.id));

  return (
    <section className="crm-page crm-dashboard" aria-labelledby="crm-title">
      <header className="crm-hero">
        <div>
          <p className="crm-kicker">Tonga Tattoo · CRM privado</p>
          <h1 id="crm-title">{view.heading}</h1>
          <p>{view.summary}. Gestiona solicitudes, agenda, clientes e integraciones desde un único panel.</p>
        </div>
        <div className="crm-hero-actions">
          <a className="crm-action" href="/book">Ver formulario público</a>
          <a className="crm-action crm-action-dark" href="#solicitudes">{view.primaryAction}</a>
        </div>
      </header>

      <div className="crm-stat-grid" aria-label="Resumen operativo">
        {view.stats.map((stat) => (
          <article className="crm-stat" data-tone={stat.tone} key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </div>

      <div className="crm-workspace-grid">
        <section className="crm-panel" aria-labelledby="pipeline-title">
          <div className="crm-panel-heading">
            <p className="crm-kicker">Flujo de trabajo</p>
            <h2 id="pipeline-title">De solicitud a sesión</h2>
          </div>
          <ol className="crm-pipeline">
            {view.pipeline.map((step) => (
              <li key={step.label}>
                <strong>{step.value}</strong>
                <div>
                  <span>{step.label}</span>
                  <p>{step.hint}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="crm-panel crm-integration-panel" aria-labelledby="integration-title">
          <div className="crm-panel-heading">
            <p className="crm-kicker">Integraciones</p>
            <h2 id="integration-title">Calendar y WhatsApp</h2>
          </div>
          <ul className="crm-integration-list">
            <li><span data-state="ok" />Google Calendar preparado para proyección de citas.</li>
            <li><span data-state="ok" />WhatsApp como siguiente contacto comercial.</li>
            <li><span data-state="ok" />Modo demo local sin login para enseÃ±arlo sin fricciÃ³n.</li>
            <li><span data-state="pending" />Cloudflare Access listo para la versiÃ³n privada.</li>
          </ul>
        </section>
      </div>

      <section className="crm-panel crm-appointments-panel" id="solicitudes" aria-labelledby="requests-title">
        <div className="crm-panel-heading crm-panel-heading-row">
          <div>
            <p className="crm-kicker">Solicitudes y citas</p>
            <h2 id="requests-title">Bandeja del estudio</h2>
          </div>
          <span>{appointments.length} registros</span>
        </div>
        {appointments.length === 0 ? (
          <p className="crm-empty" role="status">{view.empty}</p>
        ) : (
          <ol className="crm-list crm-demo-list">
            {nextAppointments.map((appointment) => (
              <li key={appointment.id} data-status={appointment.status}>
                <Link href={`/crm/appointments/${appointment.id}`}>
                  <span className="crm-status-dot" aria-hidden="true" />
                  <strong>{appointment.customerName}</strong>
                  <span>{appointment.description}</span>
                  <time dateTime={appointment.startsAt ?? undefined}>{appointmentTime(appointment.startsAt)}</time>
                  <em>{appointmentStatusLabel(appointment.status)}</em>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </section>
  );
}