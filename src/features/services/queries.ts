import "server-only";

import type { Service } from "@/features/services/types";
import { createClient } from "@/lib/supabase/server";
import { signCatalogImages } from "@/lib/supabase/catalog-images";

export type ServiceMode = "local" | "domicilio";

export class CatalogQueryError extends Error {
  constructor(resource: string) {
    super(`No fue posible consultar ${resource}.`);
    this.name = "CatalogQueryError";
  }
}

function formatPenCentavos(value: number | null): string | null {
  if (value === null) {
    return null;
  }

  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(value / 100);
}

/** Public catalog constrained by the RLS policies of Supabase. */
export async function getPublishedServices(): Promise<Service[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select(
      "id, name, description, price_pen_centavos, duration_minutes, image_bucket, image_path, image_alt, is_active",
    )
    .eq("is_active", true)
    .eq("is_published", true)
    .is("archived_at", null)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new CatalogQueryError("los servicios publicados");
  }

  const images = await signCatalogImages(data.map(service => ({ bucket: service.image_bucket, path: service.image_path })));
  return data.map(service => {
    return ({
    id: service.id,
    name: service.name,
    description: service.description ?? "Descripción pendiente de confirmación.",
    price: formatPenCentavos(service.price_pen_centavos),
    durationMinutes: service.duration_minutes,
    imageUrl: images.get(`${service.image_bucket}:${service.image_path}`) ?? null,
    imageAlt: service.image_alt,
    isActive: service.is_active,
  });
  });
}

export async function getActiveServiceModes(): Promise<
  ReadonlyMap<string, readonly ServiceMode[]>
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_modes")
    .select("service_id, mode")
    .eq("is_active", true);

  if (error) {
    throw new CatalogQueryError("las modalidades de servicio");
  }

  const modes = new Map<string, ServiceMode[]>();
  for (const item of data) {
    modes.set(item.service_id, [...(modes.get(item.service_id) ?? []), item.mode]);
  }

  return modes;
}
