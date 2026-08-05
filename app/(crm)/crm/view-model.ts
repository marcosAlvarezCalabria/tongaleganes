import type { AppointmentStatus } from "@/studio/domain";

export type CrmAppointmentView = {
  id: string;
  customerName: string;
  description: string;
  status: AppointmentStatus;
  startsAt: string | null;
  endsAt: string | null;
};

type StaffRole = "owner" | "artist";
const countLabel = (count: number) => `${count} ${count === 1 ? "cita en seguimiento" : "citas en seguimiento"}`;

export function appointmentListView(role: StaffRole, appointments: CrmAppointmentView[]) {
  return {
    heading: role === "owner" ? "Operaciones del estudio" : "Mis citas",
    summary: countLabel(appointments.length),
    primaryAction: role === "owner" ? "Programar cita" : "Actualizar estado",
    empty: role === "owner" ? "No hay citas pendientes. Cuando llegue una solicitud aparecerá aquí." : "No tienes citas asignadas en este momento.",
  };
}

export function appointmentDetailView(role: StaffRole, appointment: CrmAppointmentView) {
  return {
    ...appointment,
    actions: role === "owner" ? ["Programar cita", "Reasignar artista"] : ["Actualizar estado", "Añadir nota"],
  };
}

export function appointmentTime(startsAt: string | null) {
  return startsAt ? new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Madrid" }).format(new Date(startsAt)) : "Por concretar";
}
