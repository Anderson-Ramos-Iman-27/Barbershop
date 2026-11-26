export type MapPoint = { latitude: number; longitude: number };
export type AddressDraft = { address_line: string; district: string; reference: string; additional_instructions: string; latitude: number | null; longitude: number | null };
export type SavedAddress = AddressDraft & { id: string };
export const emptyAddress: AddressDraft = { address_line: "", district: "", reference: "", additional_instructions: "", latitude: null, longitude: null };
export function hasPoint(value: { latitude: number | null; longitude: number | null }): value is MapPoint {
  return value.latitude !== null && value.longitude !== null && Number.isFinite(value.latitude) && Number.isFinite(value.longitude) && Math.abs(value.latitude) <= 90 && Math.abs(value.longitude) <= 180;
}
export function googleMapsRoute(point: MapPoint) {
  return `https://www.google.com/maps/dir/?${new URLSearchParams({ api: "1", destination: `${point.latitude},${point.longitude}` })}`;
}
