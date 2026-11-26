import { connection } from "next/server";
import AccountShell from "@/components/account/AccountShell";
import { getCurrentActor } from "@/features/auth/session";
import { getOwnAvatarUrl } from "@/features/profile/queries";

export const instant = false;
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const actor = await getCurrentActor();
  // Each page enforces its own login return path before exposing any content.
  if (!actor) return children;
  const avatarUrl = await getOwnAvatarUrl(actor.avatarPath);
  return <AccountShell actor={actor} avatarUrl={avatarUrl}>{children}</AccountShell>;
}
