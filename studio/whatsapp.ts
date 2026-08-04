type Input = { authorized: boolean; consent: boolean; phone: string | null; customerName: string; artist: string; startsAt: string; status: string; notes?: string; mediaUrl?: string };
export function manualWhatsAppLink(input: Input) {
  if (!input.authorized || !input.consent || !input.phone?.match(/^\+[1-9]\d{7,14}$/)) return null;
  const text = `Hola ${input.customerName}, tu cita con ${input.artist} el ${input.startsAt} está ${input.status}.`;
  return `https://wa.me/${input.phone.slice(1)}?text=${encodeURIComponent(text)}`;
}
