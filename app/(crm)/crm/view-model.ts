import type { AppointmentStatus } from "@/studio/domain";

export type CrmAppointmentView = {
  id: string;
  customerName: string;
  description: string;
  status: AppointmentStatus;
  startsAt: string | null;
  endsAt: string | null;
  calendarProjection?: { status: string; revision: number; eventId: string; lastError: string | null } | null;
};

type StaffRole = "owner" | "artist";
const countLabel = (count: number) => `${count} ${count === 1 ? "cita en seguimiento" : "citas en seguimiento"}`;

const statusLabels: Record<AppointmentStatus, string> = {
  submitted: "Solicitud nueva",
  confirmed: "Confirmada",
  moved: "Reprogramada",
  cancelled: "Cancelada",
  completed: "Completada",
};

export function appointmentStatusLabel(status: AppointmentStatus) {
  return statusLabels[status];
}

export function appointmentListView(role: StaffRole, appointments: CrmAppointmentView[]) {
  const pending = appointments.filter((appointment) => appointment.status === "submitted").length;
  const scheduled = appointments.filter((appointment) => appointment.startsAt && ["confirmed", "moved"].includes(appointment.status)).length;
  const completed = appointments.filter((appointment) => appointment.status === "completed").length;
  const calendarSynced = appointments.filter((appointment) => appointment.calendarProjection?.status === "synced").length;
  const unassigned = appointments.filter((appointment) => !appointment.startsAt).length;

  return {
    heading: role === "owner" ? "Panel del estudio" : "Mis citas",
    summary: countLabel(appointments.length),
    primaryAction: role === "owner" ? "Nueva cita" : "Actualizar estado",
    empty: role === "owner" ? "No hay citas pendientes. Cuando llegue una solicitud aparecerá aquí." : "No tienes citas asignadas en este momento.",
    stats: [
      { label: "Solicitudes", value: pending, tone: "gold" },
      { label: "En agenda", value: scheduled, tone: "ink" },
      { label: "Sin cerrar", value: unassigned, tone: "wine" },
      { label: "Calendar OK", value: calendarSynced, tone: "sage" },
    ],
    pipeline: [
      { label: "Entrada web", value: pending, hint: "Ideas recibidas desde /book" },
      { label: "Diseño y presupuesto", value: unassigned, hint: "Pendientes de concretar" },
      { label: "Sesiones cerradas", value: scheduled, hint: "Con fecha en agenda" },
      { label: "Trabajos finalizados", value: completed, hint: "Historial del cliente" },
    ],
  };
}

export function appointmentDetailView(role: StaffRole, appointment: CrmAppointmentView) {
  return {
    ...appointment,
    calendarProjection: role === "owner" && appointment.calendarProjection ? { status: appointment.calendarProjection.status, revision: appointment.calendarProjection.revision } : null,
    actions: role === "owner" ? ["Programar cita", "Reasignar artista"] : ["Actualizar estado", "Añadir nota"],
  };
}

export function appointmentTime(startsAt: string | null) {
  return startsAt ? new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Madrid" }).format(new Date(startsAt)) : "Por concretar";
}