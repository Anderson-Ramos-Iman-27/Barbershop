import "server-only";

import { CatalogQueryError } from "@/features/services/queries";
import { createClient } from "@/lib/supabase/server";

export interface PublicProfessional {
  id: string;
  displayName: string;
  bio: string | null;
}

/** Public list; the RLS policy filters inactive and archived professionals. */
export async function getPublishedProfessionals(): Promise<PublicProfessional[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("professionals")
    .select("id, display_name, bio")
    .eq("is_active", true)
    .eq("is_published", true)
    .is("archived_at", null)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw new CatalogQueryError("los profesionales publicados");
  }

  return data.map((professional) => ({
    id: professional.id,
    displayName: professional.display_name,
    bio: professional.bio,
  }));
}
