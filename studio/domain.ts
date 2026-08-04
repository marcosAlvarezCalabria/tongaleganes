export type BookingMode = "request" | "instant" | "hybrid";
export type ArtistPreference = { kind: "artist"; artistId: string } | { kind: "none" };

export interface BookingRequest {
  bookingMode: BookingMode;
  customer: { name: string; email: string; phone: string };
  appointment: { preferredStartAt: string; description: string };
  artistPreference: ArtistPreference;
}

export type DomainError = { kind: "validation" | "conflict" | "forbidden"; code: string; message: string; field?: string };
export type DomainResult<T> = { ok: true; value: T } | { ok: false; error: DomainError };

const failure = <T>(kind: DomainError["kind"], code: string, message: string, field?: string): DomainResult<T> => ({
  ok: false,
  error: { kind, code, message, ...(field ? { field } : {}) },
});

export const validationResult = <T>(code: string, message: string, field?: string) => failure<T>("validation", code, message, field);
export const conflictResult = <T>(code: string, message: string) => failure<T>("conflict", code, message);
export const forbiddenResult = <T>(code: string, message: string) => failure<T>("forbidden", code, message);

export const domainFixtures = {
  requestWithoutPreference: {
    bookingMode: "request",
    customer: { name: "Ada Lovelace", email: "ada@example.com", phone: "+34600037560" },
    appointment: { preferredStartAt: "2026-08-15T10:00:00.000Z", description: "Fine line botanical design" },
    artistPreference: { kind: "none" },
  } satisfies BookingRequest,
};

const unsupportedBookingMode = () => validationResult<BookingRequest>(
  "unsupported_booking_mode",
  "Only request booking mode is supported.",
  "bookingMode",
);

export function validateBookingRequest(input: BookingRequest): DomainResult<BookingRequest> {
  if (input.bookingMode !== "request") {
    return unsupportedBookingMode();
  }

  return { ok: true, value: input };
}
