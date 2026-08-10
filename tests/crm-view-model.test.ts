import { describe, expect, it } from "vitest";
import { appointmentDetailView, appointmentListView } from "../app/(crm)/crm/view-model";

const appointment = {
  id: "appointment-ada",
  customerName: "Ada Lovelace",
  description: "Diseño botánico",
  status: "confirmed" as const,
  startsAt: "2026-08-15T10:00:00.000Z",
  endsAt: "2026-08-15T12:00:00.000Z",
};

describe("CRM page view models", () => {
  it("gives owners workload totals and scheduling actions", () => {
    const view = appointmentListView("owner", [appointment, { ...appointment, id: "appointment-grace", status: "submitted" }]);
    expect(view.heading).toBe("Operaciones del estudio");
    expect(view.summary).toBe("2 citas en seguimiento");
    expect(view.primaryAction).toBe("Programar cita");
  });

  it("gives artists only their permitted progress actions and an appointment detail", () => {
    const list = appointmentListView("artist", [appointment]);
    const detail = appointmentDetailView("artist", appointment);
    expect(list.primaryAction).toBe("Actualizar estado");
    expect(detail.customerName).toBe("Ada Lovelace");
    expect(detail.actions).toEqual(["Actualizar estado", "Añadir nota"]);
    expect(detail.calendarProjection).toBeNull();
  });

  it("shows owners a minimal retry or drift projection status without disclosing errors", () => {
    const detail = appointmentDetailView("owner", { ...appointment, calendarProjection: { status: "retry", revision: 3, eventId: "crm123", lastError: "timeout" } });
    expect(detail.calendarProjection).toEqual({ status: "retry", revision: 3 });
  });
});
