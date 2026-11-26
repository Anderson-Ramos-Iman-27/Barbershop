import { bookingStatusLabels } from "@/features/booking/presentation";

export default function BookingStatusBadge({ status }: { status: keyof typeof bookingStatusLabels }) {
  const colors = status === "pending" ? "border-orange bg-orange text-charcoal" : status === "confirmed" ? "border-cream bg-cream text-brown" : "border-brown/30 bg-cream-deep text-charcoal";
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${colors}`}>{bookingStatusLabels[status]}</span>;
}
