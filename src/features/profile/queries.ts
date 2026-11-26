import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const avatarBucket = "original-wave-avatars";

export const getOwnAvatarUrl = cache(async (path: string | null): Promise<string | null> => {
  if (!path) return null;
  const { data, error } = await (await createClient()).storage.from(avatarBucket).createSignedUrl(path, 300);
  return error ? null : data.signedUrl;
});
