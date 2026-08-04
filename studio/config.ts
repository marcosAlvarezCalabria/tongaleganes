import { validationResult, type BookingMode, type DomainResult } from "./domain";

export const supportedBookingMode: BookingMode = "request";

export function resolveBookingMode(mode: BookingMode): DomainResult<typeof supportedBookingMode> {
  return mode === supportedBookingMode
    ? { ok: true, value: supportedBookingMode }
    : validationResult("unsupported_booking_mode", "Only request booking mode is supported.", "bookingMode");
}
