import type { Service } from "@/features/services/types";

// Datos temporales de presentación. Sustituir por servicios obtenidos en servidor.
export const mockServices: Service[] = [
  {
    id: "mock-corte-cabello",
    name: "Corte de cabello",
    description: "Descripción pendiente de confirmación.",
    price: null,
    durationMinutes: null,
    imageUrl: null,
    isActive: true,
  },
  {
    id: "mock-arreglo-barba",
    name: "Arreglo de barba",
    description: "Descripción pendiente de confirmación.",
    price: null,
    durationMinutes: null,
    imageUrl: null,
    isActive: true,
  },
  {
    id: "mock-corte-barba",
    name: "Corte + barba",
    description: "Descripción pendiente de confirmación.",
    price: null,
    durationMinutes: null,
    imageUrl: null,
    isActive: true,
  },
];
