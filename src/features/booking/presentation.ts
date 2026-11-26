export const bookingStatusLabels = { pending: "Pendiente", confirmed: "Confirmada", rejected: "Rechazada", expired: "Vencida", cancelled: "Cancelada" } as const;
export const formatPen = (centavos: number) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(centavos / 100);
export const formatAppointment = (value: string) => new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" }).format(new Date(value));
