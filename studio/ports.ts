import type { BookingRequest } from "./domain";

export interface Actor {
  staffId: string;
  role: "owner" | "artist";
  artistId?: string;
}

export interface AppointmentRepository {
  createRequest(input: BookingRequest): Promise<{ appointmentId: string }>;
  appendHistory(input: { appointmentId: string; actorId: string; status: string }): Promise<void>;
}

export interface MediaStore {
  put(key: string, body: ReadableStream): Promise<void>;
}

export interface CalendarProjection {
  enqueue(appointmentId: string, revision: number): Promise<void>;
}

export interface HumanCheck {
  verify(token: string, remoteIp?: string): Promise<boolean>;
}
