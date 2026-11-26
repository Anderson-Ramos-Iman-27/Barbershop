import "server-only";
import { createClient } from "./server";

/** One signing request per bucket, using this request's JWT and Storage RLS. */
export async function signCatalogImages(images: { bucket: string | null; path: string | null }[]) {
  const supabase = await createClient();
  const groups = new Map<string, Set<string>>();
  for (const image of images) if (image.bucket && image.path) {
    if (!groups.has(image.bucket)) groups.set(image.bucket, new Set());
    groups.get(image.bucket)!.add(image.path);
  }
  const urls = new Map<string, string>();
  await Promise.all([...groups].map(async ([bucket, paths]) => {
    const { data } = await supabase.storage.from(bucket).createSignedUrls([...paths], 300);
    for (const item of data ?? []) if (item.path && item.signedUrl && !item.error) urls.set(`${bucket}:${item.path}`, item.signedUrl);
  }));
  return urls;
}
