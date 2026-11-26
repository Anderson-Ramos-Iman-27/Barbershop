import "server-only";

import { createClient } from "@/lib/supabase/server";
import { signCatalogImages } from "@/lib/supabase/catalog-images";

import type { GalleryItemData } from "./types";

export async function getPublishedGalleryItems(): Promise<GalleryItemData[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gallery_items")
    .select("id, storage_bucket, storage_path, alt_text, is_published")
    .eq("is_published", true)
    .is("archived_at", null)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true })
    .limit(5);

  if (error) throw new Error("No fue posible cargar la galería publicada.");

  const images = await signCatalogImages(data.map(item => ({ bucket: item.storage_bucket, path: item.storage_path })));
  return data.map(item => {
    if (!item.storage_bucket || !item.storage_path) {
      return { id: item.id, imageUrl: null, alt: item.alt_text ?? "Fotografía pendiente", isPublished: item.is_published };
    }
    return {
      id: item.id,
      imageUrl: images.get(`${item.storage_bucket}:${item.storage_path}`) ?? null,
      alt: item.alt_text ?? "Trabajo de Original Wave",
      isPublished: item.is_published,
    };
  });
}
