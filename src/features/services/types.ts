export interface Service {
  id: string;
  name: string;
  description: string;
  price: string | null;
  durationMinutes: number | null;
  imageUrl: string | null;
  imageAlt?: string | null;
  isActive: boolean;
}
