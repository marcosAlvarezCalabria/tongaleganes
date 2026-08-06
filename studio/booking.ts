export const appointmentStyles = ["fineline", "neotrad", "blackwork", "bodysuit"] as const;
export type AppointmentStyle = typeof appointmentStyles[number];

export const isAppointmentStyle = (value: unknown): value is AppointmentStyle =>
  typeof value === "string" && appointmentStyles.includes(value as AppointmentStyle);

export const replaceAppointmentStyle = (_current: AppointmentStyle, next: AppointmentStyle) => next;

export function normalizeSpanishPhone(value: string) {
  const compact = value.trim().replace(/[\s().-]/g, "");
  if (/^0034[67]\d{8}$/.test(compact)) return `+${compact.slice(2)}`;
  if (/^\+34[67]\d{8}$/.test(compact)) return compact;
  if (/^[67]\d{8}$/.test(compact)) return `+34${compact}`;
  return compact;
}

export const isValidE164Phone = (value: string) =>
  /^\+[1-9]\d{7,14}$/.test(value) && (!value.startsWith("+34") || /^\+34\d{9}$/.test(value));
